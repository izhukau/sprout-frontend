s\specthin\miniconda3\lib\site-packages (from python-dateutil>=2.7->matplotlib->mediapipe) (1.17.0)
PS D:\.projects\hackeurope\hackeurope_backend> pip install websockets==12.0 --no-cache-dir --default-timeout=100 
Collecting websockets==12.0
  Downloading websockets-12.0-py3-none-any.whl.metadata (6.6 kB)
Downloading websockets-12.0-py3-none-any.whl (118 kB)
Installing collected packages: websockets
Successfully installed websockets-12.0
PS D:\.projects\hackeurope\hackeurope_backend> python backend.py                                                
WebSocket Server started on ws://localhost:8765
Next.js Frontend Connected!
connection handler failed
Traceback (most recent call last):
  File "C:\Users\Specthin\miniconda3\Lib\site-packages\websockets\legacy\server.py", line 236, in handler
    await self.ws_handler(self)
  File "D:\.projects\hackeurope\hackeurope_backend\backend.py", line 9, in track_hands
    mp_hands = mp.solutions.hands
               ^^^^^^^^^^^^
AttributeError: module 'mediapipe' has no attribute 'solutions'
Next.js Frontend Connected!
connection handler failed
Traceback (most recent call last):
  File "C:\Users\Specthin\miniconda3\Lib\site-packages\websockets\legacy\server.py", line 236, in handler
    await self.ws_handler(self)
  File "D:\.projects\hackeurope\hackeurope_backend\backend.py", line 9, in track_hands
    mp_hands = mp.solutions.hands
               ^^^^^^^^^^^^
AttributeError: module 'mediapipe' has no attribute 'solutions'
Next.js Frontend Connected!
connection handler failed
Traceback (most recent call last):
  File "C:\Users\Specthin\miniconda3\Lib\site-packages\websockets\legacy\server.py", line 236, in handler
    await self.ws_handler(self)
  File "D:\.projects\hackeurope\hackeurope_backend\backend.py", line 9, in track_hands
    mp_hands = mp.solutions.hands
               ^^^^^^^^^^^^
AttributeError: module 'mediapipe' has no attribute 'solutions'
Next.js Frontend Connected!
connection handler failed
Traceback (most recent call last):
  File "C:\Users\Specthin\miniconda3\Lib\site-packages\websockets\legacy\server.py", line 236, in handler
    await self.ws_handler(self)
  File "D:\.projects\hackeurope\hackeurope_backend\backend.py", line 9, in track_hands
    mp_hands = mp.solutions.hands
               ^^^^^^^^^^^^
AttributeError: module 'mediapipe' has no attribute 'solutions'
Next.js Frontend Connected!
connection handler failed
Traceback (most recent call last):
  File "C:\Users\Specthin\miniconda3\Lib\site-packages\websockets\legacy\server.py", line 236, in handler
    await self.ws_handler(self)
  File "D:\.projects\hackeurope\hackeurope_backend\backend.py", line 9, in track_hands
    mp_hands = mp.solutions.hands
               ^^^^^^^^^^^^
AttributeError: module 'mediapipe' has no attribute 'solutions'
Next.js Frontend Connected!
connection handler failed
Traceback (most recent call last):
  File "C:\Users\Specthin\miniconda3\Lib\site-packages\websockets\legacy\server.py", line 236, in handler
    await self.ws_handler(self)
  File "D:\.projects\hackeurope\hackeurope_backend\backend.py", line 9, in track_hands
    mp_hands = mp.solutions.hands
               ^^^^^^^^^^^^
AttributeError: module 'mediapipe' has no attribute 'solutions'
Next.js Frontend Connected!
connection handler failed
Traceback (most recent call last):
  File "C:\Users\Specthin\miniconda3\Lib\site-packages\websockets\legacy\server.py", line 236, in handler
    await self.ws_handler(self)
  File "D:\.projects\hackeurope\hackeurope_backend\backend.py", line 9, in track_hands
    mp_hands = mp.solutions.hands
               ^^^^^^^^^^^^
AttributeError: module 'mediapipe' has no attribute 'solutions'




LAST TIME THIS CODE WORKED PERFECTLY, USE ITS TECHNIQUES:


import cv2
import numpy as np
import mediapipe as mp
import math

# Initialize MediaPipe Legacy API
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7, min_tracking_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)
canvas = None
prev_x, prev_y = 0, 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)

    if canvas is None:
        canvas = np.zeros_like(frame)

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hands.process(rgb_frame)

    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:
            h, w, c = frame.shape
            
            # 1. Get coordinates for Thumb (4), Index (8), and Middle Finger (12)
            thumb_x = int(hand_landmarks.landmark[4].x * w)
            thumb_y = int(hand_landmarks.landmark[4].y * h)
            
            index_x = int(hand_landmarks.landmark[8].x * w)
            index_y = int(hand_landmarks.landmark[8].y * h)
            
            middle_x = int(hand_landmarks.landmark[12].x * w)
            middle_y = int(hand_landmarks.landmark[12].y * h)

            # 2. Calculate distances for both gestures
            draw_distance = math.hypot(index_x - thumb_x, index_y - thumb_y)
            erase_distance = math.hypot(middle_x - thumb_x, middle_y - thumb_y)

            mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            
            # Draw hover indicators
            cv2.circle(frame, (index_x, index_y), 8, (0, 255, 0), -1)   # Green for draw hover
            cv2.circle(frame, (middle_x, middle_y), 8, (0, 0, 255), -1) # Red for erase hover

            # 3. Gesture Logic
            if draw_distance < 40:
                # DRAWING MODE (Blue line)
                if prev_x == 0 and prev_y == 0:
                    prev_x, prev_y = index_x, index_y
                
                cv2.line(canvas, (prev_x, prev_y), (index_x, index_y), (255, 0, 0), 5)
                prev_x, prev_y = index_x, index_y
                
            elif erase_distance < 40:
                # ERASING MODE (Thick Black line)
                if prev_x == 0 and prev_y == 0:
                    prev_x, prev_y = middle_x, middle_y
                
                # Draw black on the canvas to "erase"
                cv2.line(canvas, (prev_x, prev_y), (middle_x, middle_y), (0, 0, 0), 50)
                
                # Draw a white circle on the video feed to show the size of the eraser
                cv2.circle(frame, (middle_x, middle_y), 25, (255, 255, 255), 2)
                prev_x, prev_y = middle_x, middle_y
                
            else:
                # HOVERING MODE
                prev_x, prev_y = 0, 0
    else:
        prev_x, prev_y = 0, 0

    # 4. Blending Logic (Unchanged)
    gray_canvas = cv2.cvtColor(canvas, cv2.COLOR_BGR2GRAY)
    _, inv_mask = cv2.threshold(gray_canvas, 1, 255, cv2.THRESH_BINARY_INV)
    frame_bg = cv2.bitwise_and(frame, frame, mask=inv_mask)
    combined = cv2.bitwise_or(frame_bg, canvas)

    cv2.imshow("Virtual Air Canvas", combined)

    key = cv2.waitKey(1) & 0xFF
    if key == ord('c'):
        canvas = np.zeros_like(frame)
    if key == 27:
        break

cap.release()
cv2.destroyAllWindows()