# People Counter — Occupancy Monitor

A YOLO-based people counter with real-time WebSocket dashboard, 15-minute logging, and CSV report downloads.

---

## Project Structure

```
people_counter-main/
├── people_counter.py       ← backend (run this)
├── requirements.txt        ← Python dependencies
├── open_camera.py          ← camera test utility
├── yolov5su.pt             ← YOLO model weights
├── occupancy.db            ← auto-created on first run
└── frontend/               ← React + TypeScript dashboard
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── index.css
    │   ├── types/index.ts
    │   ├── hooks/
    │   │   └── useOccupancySocket.ts
    │   └── components/
    │       ├── RoomCard.tsx
    │       └── LogTab.tsx
    │       └── ReportTab.tsx
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── tsconfig.json
```

---

## Setup

### 1. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 2. Install frontend dependencies
```bash
cd frontend
npm install
```

---

## Running

### Start the backend
```bash
python people_counter.py
```

### Start the frontend (development)
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser.

> The frontend proxies `/api` and `/ws` requests to the Flask backend on port 5000.

### Frontend (production build)
```bash
cd frontend
npm run build
```
Then open **http://localhost:5000** — Flask will serve the built files from `/static`.

---

## Configure rooms & cameras

Edit the `ROOMS` list near the top of `people_counter.py`:

```python
ROOMS = [
    {
        "id":      "area_1",
        "name":    "Area 1",
        "cameras": [0],        # USB webcam index
    },
    # Add more areas:
    # {
    #     "id":      "area_2",
    #     "name":    "Area 2",
    #     "cameras": [1],
    # },
]
```

**Camera sources:**

| Value | Type |
|-------|------|
| `0`, `1`, `2` … | USB webcam |
| `"rtsp://user:pass@ip/stream"` | IP / RTSP camera |
| `"videos/test.mp4"` | Video file (for testing) |

Multiple cameras per room are supported — counts are summed automatically.

---

## Dashboard features

| Tab | Description |
|-----|-------------|
| **Dashboard** | Live count per room, last logged value, 1-hour average |
| **Log** | Table of every 15-minute snapshot |
| **Reports** | Download CSV with custom date range and room selection |

---

## How real-time works

The frontend connects via **WebSocket** (`/ws/status`) and receives a push every **0.5 seconds** — no polling needed. The connection status is shown in the top bar (Live / Connecting / Disconnected).

---

## Controls

- Press **`q`** on any OpenCV window to quit the program.