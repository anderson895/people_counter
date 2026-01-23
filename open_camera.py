import cv2

cap = cv2.VideoCapture(0)

while True:
    cv2.imshow('Camera', cap.read()[1])
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
