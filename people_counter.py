# Import the OpenCV library for image/video processing
import cv2

# Import YOLO from the Ultralytics package for object detection
from ultralytics import YOLO

# ------------------------------
# 1️⃣ Load YOLO Model
# ------------------------------
# 'yolov5s.pt' is the small version of YOLOv5 pre-trained on COCO dataset
# If weights are not present locally, it will automatically download them.
model = YOLO("yolov5s.pt")  

# ------------------------------
# 2️⃣ Open the camera
# ------------------------------
# cv2.VideoCapture(0) opens the default camera (0). If you have multiple cameras,
# you can change 0 to 1, 2, etc.
cap = cv2.VideoCapture(0)

# Check if camera opened successfully
if not cap.isOpened():
    print("❌ Cannot open camera")
    exit()  # Exit the program if camera cannot be accessed

# ------------------------------
# 3️⃣ Main Loop: Read frames continuously
# ------------------------------
while True:
    # Capture a single frame from the camera
    ret, frame = cap.read()

    # ret is a boolean: True if frame is read correctly
    if not ret:
        break  # Stop the loop if frame is not captured

    # ------------------------------
    # 4️⃣ Run YOLO inference on the frame
    # ------------------------------
    # verbose=False prevents printing detailed model info
    results = model(frame, verbose=False)[0]  # [0] gives results for this frame

    # Initialize person counter
    person_count = 0

    # ------------------------------
    # 5️⃣ Iterate over detected objects
    # ------------------------------
    # results.boxes contains all detected bounding boxes in the frame
    if results.boxes is not None:
        for box in results.boxes:
            # Get the class ID of the detected object (integer)
            cls_id = int(box.cls[0])

            # Get confidence score (how sure the model is) as float
            conf = float(box.conf[0])

            # Get the class name corresponding to class ID
            class_name = model.names[cls_id]

            # Check if the detected object is a person
            if class_name == "person":
                person_count += 1  # Increment person counter

                # Get bounding box coordinates
                # box.xyxy[0] gives [x1, y1, x2, y2] in float
                x1, y1, x2, y2 = map(int, box.xyxy[0])  # Convert to integers

                # Draw bounding box around the person
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

                # Put label above the box with confidence
                cv2.putText(
                    frame,
                    f'Person {conf:.2f}',  # Show confidence up to 2 decimal places
                    (x1, y1 - 10),  # Position text slightly above the box
                    cv2.FONT_HERSHEY_SIMPLEX,  # Font type
                    0.5,  # Font scale (size)
                    (0, 255, 0),  # Green color
                    2  # Thickness
                )

    # ------------------------------
    # 6️⃣ Display total number of people
    # ------------------------------
    cv2.putText(
        frame,
        f'Total Persons: {person_count}',  # Text showing count
        (20, 40),  # Position in frame
        cv2.FONT_HERSHEY_SIMPLEX,
        1,  # Font scale
        (0, 0, 255),  # Red color
        3  # Thickness
    )

    # ------------------------------
    # 7️⃣ Show the frame with bounding boxes
    # ------------------------------
    cv2.imshow("YOLO People Counter", frame)

    # Press 'q' key to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# ------------------------------
# 8️⃣ Release resources
# ------------------------------
cap.release()  # Release the camera
cv2.destroyAllWindows()  # Close all OpenCV windows
