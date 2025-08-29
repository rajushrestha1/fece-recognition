
import base64
import io
from typing import List, Optional, Dict, Any
from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
import face_recognition

app = FastAPI(title="Face Recognition Service")

class EncodeReq(BaseModel):
    paths: List[str]

class EncodeResp(BaseModel):
    encodings: List[List[float]]

class IdentifyUser(BaseModel):
    userId: str
    encodings: List[List[float]]

class IdentifyReq(BaseModel):
    image_base64: str
    users: List[IdentifyUser]
    tolerance: Optional[float] = 0.5

class IdentifyResp(BaseModel):
    matched: bool
    userId: Optional[str] = None
    distance: Optional[float] = None
    best_index: Optional[int] = None

@app.get("/health")
def health():
    return {"ok": True}

def _data_url_to_image_bytes(data_url: str) -> bytes:
    # Expecting 'data:image/jpeg;base64,...'
    if "," in data_url:
        _, b64data = data_url.split(",", 1)
    else:
        b64data = data_url
    return base64.b64decode(b64data)

@app.post("/encode", response_model=EncodeResp)
def encode(req: EncodeReq):
    out = []
    for p in req.paths:
        try:
            img = face_recognition.load_image_file(p)
            encs = face_recognition.face_encodings(img)
            if len(encs) > 0:
                out.append(encs[0].tolist())
        except Exception as e:
            # skip problematic image
            pass
    return {"encodings": out}

@app.post("/identify", response_model=IdentifyResp)
def identify(req: IdentifyReq):
    # Decode incoming image
    try:
        img_bytes = _data_url_to_image_bytes(req.image_base64)
    except Exception as e:
        return {"matched": False}

    # Convert to numpy array via face_recognition's helper
    try:
        # face_recognition can load from file paths; for bytes we need PIL
        from PIL import Image
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_np = np.array(img)
    except Exception as e:
        return {"matched": False}

    encs = face_recognition.face_encodings(img_np)
    if len(encs) == 0:
        return {"matched": False}
    target = encs[0]

    best_user = None
    best_dist = None
    best_idx = None

    # Compare against all users' encodings
    for u in req.users:
        for idx, known_vec in enumerate(u.encodings):
            known = np.array(known_vec)
            dist = np.linalg.norm(known - target)
            # or use face_recognition.face_distance([known], target)[0]
            if (best_dist is None) or (dist < best_dist):
                best_dist = dist
                best_user = u.userId
                best_idx = idx

    if best_dist is not None and best_dist <= (req.tolerance or 0.5):
        return {"matched": True, "userId": best_user, "distance": float(best_dist), "best_index": best_idx}
    else:
        return {"matched": False, "distance": float(best_dist) if best_dist is not None else None}
