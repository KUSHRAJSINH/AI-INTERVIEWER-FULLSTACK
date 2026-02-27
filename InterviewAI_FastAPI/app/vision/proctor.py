"""import cv2
import numpy as np
from ultralytics import YOLO
import mediapipe as mp


#load yolo model


yolo_model=YOLO("yolov8n.pt")



#load mediapipe facemesh

mp_face_mesh=mp.solutions.face_mesh
face_mesh=mp_face_mesh.FaceMesh(static_image_mode=False)


def analyze_frame(image_bytes):
    nparr=np.frombuffer(image_bytes,np.uint8)
    frame=cv2.imdecode(nparr,cv2.IMREAD_COLOR)
    results=yolo_model(frame)
    person_count=0
    phone_detected=False


    for r in results:
        for box in r.boxes:
            class_id = int(box.cls[0])
            label = yolo_model.names[class_id]

            if label == "person":
                person_count += 1
            if label == "cell phone":
                phone_detected = True


                phone_detected = True

    # FaceMesh for gaze / head pose
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    face_results = face_mesh.process(rgb_frame)

    looking_away = False

    if face_results.multi_face_landmarks:
        landmarks = face_results.multi_face_landmarks[0]

        # Simple head pose approximation using nose landmark
        nose = landmarks.landmark[1]
        if nose.x < 0.3 or nose.x > 0.7:
            looking_away = True

    return {
        "person_count": person_count,
        "phone_detected": phone_detected,
        "looking_away": looking_away
    }"""


import cv2
import numpy as np
from ultralytics import YOLO
import mediapipe as mp

# -------------------------
# Load YOLO (Nano version ONLY)
# -------------------------
yolo_model = YOLO("yolov8n.pt")

# -------------------------
# Load MediaPipe FaceMesh (optimized for CPU)
# -------------------------
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# -------------------------
# Main Frame Analyzer
# -------------------------
def analyze_frame(image_bytes):

    # Decode image safely
    nparr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        return {
            "person_count": 0,
            "phone_detected": False,
            "looking_away": False
        }

    # Resize frame for CPU efficiency
    frame = cv2.resize(frame, (640, 480))

    # -------------------------
    # YOLO Detection (optimized)
    # -------------------------
    results = yolo_model(
        frame,
        imgsz=320,        # smaller image size = faster
        conf=0.5,         # confidence threshold
        verbose=False
    )

    person_count = 0
    phone_detected = False

    for r in results:
        for box in r.boxes:
            class_id = int(box.cls[0])
            label = yolo_model.names[class_id]

            if label == "person":
                person_count += 1

            elif label == "cell phone":
                phone_detected = True

    # -------------------------
    # FaceMesh for Gaze Detection
    # -------------------------
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    face_results = face_mesh.process(rgb_frame)

    looking_away = False

    if face_results.multi_face_landmarks:
        landmarks = face_results.multi_face_landmarks[0]

        # Nose and eye landmarks
        nose = landmarks.landmark[1]
        left_eye = landmarks.landmark[33]
        right_eye = landmarks.landmark[263]

        # Eye center
        eye_center_x = (left_eye.x + right_eye.x) / 2

        # If nose deviates too much from eye center → looking away
        if nose.x < eye_center_x - 0.08:
            looking_away = True
        elif nose.x > eye_center_x + 0.08:
            looking_away = True

    return {
        "person_count": person_count,
        "phone_detected": phone_detected,
        "looking_away": looking_away
    }