import cv2
from ultralytics import YOLO

# Load YOLOv5 model (Ultralytics version)
model = YOLO("yolov5s.pt")  # auto-downloads weights if not present

# Open default camera (0)
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Cannot open camera")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Run YOLO inference
    results = model(frame, verbose=False)[0]

    person_count = 0

    # Iterate over detections
    if results.boxes is not None:
        for box in results.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])

            class_name = model.names[cls_id]

            if class_name == "person":
                person_count += 1

                x1, y1, x2, y2 = map(int, box.xyxy[0])

                # Draw bounding box
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(
                    frame,
                    f'Person {conf:.2f}',
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 255, 0),
                    2
                )

    # Display total person count
    cv2.putText(
        frame,
        f'Total Persons: {person_count}',
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 0, 255),
        3
    )

    cv2.imshow("YOLO People Counter", frame)

    # Press Q to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
