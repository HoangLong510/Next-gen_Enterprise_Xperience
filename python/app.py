from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import numpy as np
from io import BytesIO
from PIL import Image , ImageOps

app = Flask(__name__)
CORS(app)

COMPANY_LATITUDE = 10.8003328
COMPANY_LONGITUDE = 106.7450368
MAX_DISTANCE_KM = 10.0  # 1 km

def haversine(lat1, lon1, lat2, lon2):
    from math import radians, sin, cos, sqrt, atan2
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

def _to_rgb_np(file_storage):
    try:
        img = Image.open(BytesIO(file_storage.read()))
        img = ImageOps.exif_transpose(img).convert("RGB")  # ⇦ thêm exif_transpose
        return np.array(img)
    except Exception as e:
        print("DEBUG: cannot read/convert image:", e)
        return None

@app.route('/api/face-verify', methods=['POST'])
def face_verify():
    # Có thể linh hoạt nhận 'image' hoặc 'imageFile' nếu FE gửi khác key
    live_file = request.files.get('image') or request.files.get('imageFile')
    known_file = request.files.get('known_image')
    if not live_file or not known_file:
        print("DEBUG: missing files. got keys:", list(request.files.keys()))
        return jsonify({'error': 'Missing image or known_image files'}), 400

    # Parse lat/lon
    try:
        latitude = float(request.form.get('latitude'))
        longitude = float(request.form.get('longitude'))
    except (TypeError, ValueError):
        print("DEBUG: invalid lat/lon:", request.form.get('latitude'), request.form.get('longitude'))
        return jsonify({'error': 'Invalid or missing latitude/longitude'}), 400

    # Geofence trước
    distance = haversine(latitude, longitude, COMPANY_LATITUDE, COMPANY_LONGITUDE)
    if distance > MAX_DISTANCE_KM:
        return jsonify({'error': 'Out of allowed location range', 'distance_km': distance}), 403

    # Đọc ảnh
    live_np = _to_rgb_np(live_file)
    if live_np is None:
        return jsonify({'error': 'Invalid live image data'}), 400
    known_np = _to_rgb_np(known_file)
    if known_np is None:
        return jsonify({'error': 'Invalid known image data'}), 400

    # Encode khuôn mặt
    live_enc = face_recognition.face_encodings(live_np)
    if not live_enc:
        print("DEBUG: no face in LIVE image")
        return jsonify({'error': 'No face found in live image'}), 400

    known_enc = face_recognition.face_encodings(known_np)
    if not known_enc:
        print("DEBUG: no face in KNOWN image")
        return jsonify({'error': 'No face found in known image'}), 400

    # So khớp
    match = face_recognition.compare_faces([known_enc[0]], live_enc[0], tolerance=0.6)[0]

    return jsonify({
        'match': bool(match),
        'distance_km': float(distance),
        'location_ok': True
    }), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)