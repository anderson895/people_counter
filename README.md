# People Counter — Extended

Extended from the original single-camera people counter to support:
- Multiple rooms / large areas (multi-camera per room)
- 15-minute occupancy logging to SQLite
- Live web dashboard (real-time count, last log, 1-hour average)
- CSV report download with date range and room selection

## Quick Start

```bash
pip install -r requirements.txt
python people_counter.py
# Open http://localhost:5000
```

## Configure rooms & cameras

Edit the `ROOMS` list near the top of `people_counter.py`:

```python
ROOMS = [
    {
        "id":      "lobby",
        "name":    "Lobby",
        "cameras": [0],        # USB webcam index
    },
    {
        "id":      "main_hall",
        "name":    "Main Hall",
        "cameras": [1, 2],     # two cameras — counts are summed
    },
]
```

**Camera sources:**
| Value | Type |
|-------|------|
| `0`, `1`, `2` | USB webcam |
| `"rtsp://user:pass@ip/stream"` | IP / RTSP camera |
| `"videos/test.mp4"` | Video file |

## Files

```
people_counter-main/
├── people_counter.py   ← main file (run this)
├── open_camera.py      ← original camera test utility
├── requirements.txt
├── yolov5su.pt         ← YOLO model weights
├── occupancy.db        ← created automatically on first run
├── note.txt
└── templates/
    └── index.html      ← dashboard UI
```
