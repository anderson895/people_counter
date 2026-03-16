# ============================================================
#  people_counter.py  –  Extended Occupancy Counter
#  Original: single-camera people counter using YOLOv5
#  Extended: multi-room / multi-camera + 15-min logging
#            + React/TS frontend via WebSocket (real-time)
#            + CSV report download
# ============================================================
#
#  HOW TO RUN
#  ----------
#  Backend:
#    pip install -r requirements.txt
#    python people_counter.py
#
#  Frontend (dev):
#    cd frontend && npm install && npm run dev
#    Open http://localhost:3000
#
#  Frontend (production build):
#    cd frontend && npm run build
#    Open http://localhost:5000  (Flask serves /static)
#
# ============================================================

import threading
import time
import sqlite3
import csv
import io
import json
import logging
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime, timedelta

import cv2
from flask import Flask, jsonify, request, Response, send_from_directory
from flask_sock import Sock
from ultralytics import YOLO

# ============================================================
#  CONFIGURATION  ← edit this section
# ============================================================

ROOMS = [
    {
        "id":      "area_1",
        "name":    "Area 1",
        "cameras": [0],       # USB webcam index 0
    },
    # Add more areas below:
    # {
    #     "id":      "area_2",
    #     "name":    "Area 2",
    #     "cameras": [1],
    # },
]

YOLO_MODEL           = "yolov5su.pt"
CONF_THRESHOLD       = 0.4
FRAME_SKIP           = 3
LOG_INTERVAL_MINUTES = 15
DB_PATH              = "occupancy.db"
DASHBOARD_PORT       = 5000
DASHBOARD_HOST       = "0.0.0.0"

# How often to push WebSocket updates (seconds)
# Lower = more real-time, higher = less CPU
WS_PUSH_INTERVAL = 0.5

# ============================================================
#  SETUP
# ============================================================

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

app  = Flask(__name__, static_folder="static", static_url_path="/assets")
sock = Sock(app)

model      = None
model_lock = threading.Lock()

current_counts: dict = defaultdict(int)
camera_counts:  dict = defaultdict(int)
last_boxes:     dict = defaultdict(list)
state_lock = threading.Lock()

# Connected WebSocket clients
ws_clients: set = set()
ws_lock = threading.Lock()

# ============================================================
#  DATABASE
# ============================================================

@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS occupancy_log (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                ts        TEXT    NOT NULL,
                room_id   TEXT    NOT NULL,
                room_name TEXT    NOT NULL,
                count     INTEGER NOT NULL DEFAULT 0
            )
        """)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_ts_room ON occupancy_log (ts, room_id)"
        )


def log_snapshot(room_id: str, room_name: str, count: int):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO occupancy_log (ts, room_id, room_name, count) VALUES (?,?,?,?)",
            (ts, room_id, room_name, count),
        )


def get_recent_logs(n: int = 40):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM occupancy_log ORDER BY ts DESC LIMIT ?", (n,)
        ).fetchall()
    return [dict(r) for r in rows]


def get_hourly_avg():
    since = (datetime.now() - timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT room_id, room_name, ROUND(AVG(count), 1) AS avg_count
            FROM occupancy_log WHERE ts >= ?
            GROUP BY room_id
            """,
            (since,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_last_log_per_room():
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT ol.*
            FROM occupancy_log ol
            INNER JOIN (
                SELECT room_id, MAX(ts) AS max_ts
                FROM occupancy_log GROUP BY room_id
            ) latest ON ol.room_id = latest.room_id AND ol.ts = latest.max_ts
            ORDER BY ol.room_id
            """
        ).fetchall()
    return [dict(r) for r in rows]


def get_report_rows(room_ids: list, start_dt: str, end_dt: str):
    with get_conn() as conn:
        if room_ids:
            ph   = ",".join("?" * len(room_ids))
            rows = conn.execute(
                f"SELECT ts,room_id,room_name,count FROM occupancy_log "
                f"WHERE ts BETWEEN ? AND ? AND room_id IN ({ph}) "
                f"ORDER BY ts,room_id",
                (start_dt, end_dt, *room_ids),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT ts,room_id,room_name,count FROM occupancy_log "
                "WHERE ts BETWEEN ? AND ? ORDER BY ts,room_id",
                (start_dt, end_dt),
            ).fetchall()
    return [dict(r) for r in rows]


# ============================================================
#  WEBSOCKET PUSH HELPERS
# ============================================================

def build_status_payload() -> dict:
    """Build the JSON payload sent to every WebSocket client."""
    with state_lock:
        live = dict(current_counts)

    last_by_room = {r["room_id"]: r for r in get_last_log_per_room()}
    avg_by_room  = {r["room_id"]: r for r in get_hourly_avg()}

    rooms_out = []
    for room in ROOMS:
        rid  = room["id"]
        last = last_by_room.get(rid, {})
        avg  = avg_by_room.get(rid, {})
        rooms_out.append({
            "id":          rid,
            "name":        room["name"],
            "live_count":  live.get(rid, 0),
            "last_logged": last.get("ts", "—"),
            "last_count":  last.get("count", "—"),
            "avg_count":   avg.get("avg_count", "—"),
        })

    return {
        "rooms":       rooms_out,
        "server_time": datetime.now().strftime("%H:%M:%S"),
    }


def broadcast(payload: dict):
    """Send payload to all connected WS clients; remove dead ones."""
    data = json.dumps(payload)
    dead = set()
    with ws_lock:
        clients = set(ws_clients)
    for ws in clients:
        try:
            ws.send(data)
        except Exception:
            dead.add(ws)
    if dead:
        with ws_lock:
            ws_clients.difference_update(dead)


def ws_broadcaster():
    """Background thread: push status every WS_PUSH_INTERVAL seconds."""
    while True:
        time.sleep(WS_PUSH_INTERVAL)
        with ws_lock:
            if not ws_clients:
                continue
        try:
            broadcast(build_status_payload())
        except Exception as e:
            log.warning(f"Broadcast error: {e}")


# ============================================================
#  CAMERA THREAD
# ============================================================

def camera_worker(room_id: str, camera_src):
    cam_key     = f"{room_id}::{camera_src}"
    room_name   = next(r["name"] for r in ROOMS if r["id"] == room_id)
    window_name = f"{room_name}  [cam {camera_src}]"
    log.info(f"[{cam_key}] Camera thread started")

    while True:
        cap = cv2.VideoCapture(camera_src)
        if not cap.isOpened():
            log.warning(f"[{cam_key}] Cannot open – retrying in 5 s")
            time.sleep(5)
            continue

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                log.warning(f"[{cam_key}] Frame read failed – reopening")
                break

            frame_idx += 1

            if frame_idx % FRAME_SKIP == 0:
                with model_lock:
                    results = model(frame, verbose=False, conf=CONF_THRESHOLD)[0]

                boxes = []
                if results.boxes is not None:
                    for box in results.boxes:
                        if model.names[int(box.cls[0])] == "person":
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            conf = float(box.conf[0])
                            boxes.append((x1, y1, x2, y2, conf))

                with state_lock:
                    last_boxes[cam_key] = boxes
                    camera_counts[cam_key] = len(boxes)
                    room_cfg = next(r for r in ROOMS if r["id"] == room_id)
                    total = sum(
                        camera_counts.get(f"{room_id}::{src}", 0)
                        for src in room_cfg["cameras"]
                    )
                    current_counts[room_id] = total

            # Draw on every frame (smooth window)
            with state_lock:
                boxes_to_draw = list(last_boxes[cam_key])

            for (x1, y1, x2, y2, conf) in boxes_to_draw:
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(
                    frame, f"Person {conf:.2f}",
                    (x1, max(y1 - 10, 15)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2
                )

            cv2.putText(
                frame,
                f"{room_name}  |  Total Persons: {len(boxes_to_draw)}",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3
            )
            cv2.putText(
                frame, datetime.now().strftime("%Y-%m-%d  %H:%M:%S"),
                (20, frame.shape[0] - 15),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1
            )

            cv2.imshow(window_name, frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                log.info("'q' pressed – shutting down")
                cv2.destroyAllWindows()
                import os; os._exit(0)

        cap.release()
        cv2.destroyWindow(window_name)
        time.sleep(2)


# ============================================================
#  LOGGING THREAD
# ============================================================

def logging_worker():
    log.info("Logging thread started")
    while True:
        now    = datetime.now()
        next_q = ((now.minute // LOG_INTERVAL_MINUTES) + 1) * LOG_INTERVAL_MINUTES
        if next_q >= 60:
            next_snap = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        else:
            next_snap = now.replace(minute=next_q, second=0, microsecond=0)

        wait = (next_snap - datetime.now()).total_seconds()
        log.info(f"Next snapshot in {int(wait)} s  ({next_snap.strftime('%H:%M')})")
        time.sleep(max(wait, 1))

        with state_lock:
            snapshot = dict(current_counts)

        for room in ROOMS:
            rid   = room["id"]
            count = snapshot.get(rid, 0)
            log_snapshot(rid, room["name"], count)
            log.info(f"  Logged  {room['name']:20s}  {count:>4} people")


# ============================================================
#  FLASK ROUTES
# ============================================================

@sock.route('/ws/status')
def ws_status(ws):
    """WebSocket endpoint – client connects, receives live pushes."""
    with ws_lock:
        ws_clients.add(ws)
    log.info(f"WS client connected  (total: {len(ws_clients)})")
    try:
        # Send initial payload immediately on connect
        ws.send(json.dumps(build_status_payload()))
        # Keep alive – wait for client disconnect
        while True:
            msg = ws.receive(timeout=30)
            if msg is None:
                break   # client closed
    except Exception:
        pass
    finally:
        with ws_lock:
            ws_clients.discard(ws)
        log.info(f"WS client disconnected  (total: {len(ws_clients)})")


# REST fallback (used by ReportTab and LogTab)
@app.route("/api/status")
def api_status():
    return jsonify(build_status_payload())


@app.route("/api/recent_logs")
def api_recent_logs():
    return jsonify(get_recent_logs(40))


@app.route("/api/report")
def api_report():
    start   = request.args.get("start", "")
    end     = request.args.get("end", "")
    rooms_q = request.args.get("rooms", "all")

    if not start or not end:
        return jsonify({"error": "start and end are required"}), 400

    room_ids = [] if rooms_q == "all" else [r.strip() for r in rooms_q.split(",")]
    rows     = get_report_rows(room_ids, f"{start} 00:00:00", f"{end} 23:59:59")

    out = io.StringIO()
    w   = csv.DictWriter(out, fieldnames=["ts", "room_id", "room_name", "count"])
    w.writeheader()
    w.writerows(rows)

    return Response(
        out.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition":
                 f'attachment; filename="occupancy_{start}_to_{end}.csv"'},
    )


# Serve React build (production)
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    import os
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    if path and os.path.exists(os.path.join(static_dir, path)):
        return send_from_directory(static_dir, path)
    return send_from_directory(static_dir, "index.html")


# ============================================================
#  MAIN
# ============================================================

def start_threads():
    for room in ROOMS:
        for cam_src in room["cameras"]:
            threading.Thread(
                target=camera_worker,
                args=(room["id"], cam_src),
                daemon=True,
                name=f"cam-{room['id']}-{cam_src}",
            ).start()

    threading.Thread(target=logging_worker,  daemon=True, name="logger").start()
    threading.Thread(target=ws_broadcaster,  daemon=True, name="ws-push").start()


if __name__ == "__main__":
    log.info("Initialising database …")
    init_db()

    log.info(f"Loading YOLO model: {YOLO_MODEL}")
    model = YOLO(YOLO_MODEL)

    log.info("Starting camera, logging & WebSocket threads …")
    start_threads()

    log.info(f"Backend  → http://localhost:{DASHBOARD_PORT}")
    log.info(f"Frontend → cd frontend && npm run dev  (http://localhost:3000)")
    app.run(
        host=DASHBOARD_HOST,
        port=DASHBOARD_PORT,
        debug=False,
        use_reloader=False,
    )
