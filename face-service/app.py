# face-service/app.py
# ✅ ADDED / UPDATED to accept multipart 'files' and provide /identify
import io, base64
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import numpy as np
import face_recognition
from PIL import Image

app = FastAPI(title="Face Recognition Service")

class EncodeResp(BaseModel):
  encodings: List[List[float]]  # one 128-float list per file; [] when not detected

class Candidate(BaseModel):
  userId: str
  encodings: List[List[float]]  # list of 128-float lists

class IdentifyReq(BaseModel):
  image_base64: str
  candidates: List[Candidate]
  threshold: Optional[float] = 0.5

class IdentifyResp(BaseModel):
  matched: bool
  userId: Optional[str] = None
  distance: Optional[float] = None

@app.post('/encode', response_model=EncodeResp)
async def encode(files: List[UploadFile] = File(...)):
  results = []
  for file in files:
    try:
      img_bytes = await file.read()
      # Validate that it's an image
      Image.open(io.BytesIO(img_bytes)).verify()

      img = face_recognition.load_image_file(io.BytesIO(img_bytes))
      locs = face_recognition.face_locations(img, model='hog')
      if not locs:
        results.append([])
        continue
      enc = face_recognition.face_encodings(img, known_face_locations=locs)
      if not enc:
        results.append([])
        continue
      # take the first face per image for registration flow
      results.append(enc[0].tolist())
    except Exception as e:
      results.append([])  # keep alignment with inputs
  return {"encodings": results}

@app.post('/identify', response_model=IdentifyResp)
def identify(payload: IdentifyReq):
  try:
    # decode base64 (strip data URL prefix if present)
    b64 = payload.image_base64
    if ',' in b64:
      b64 = b64.split(',', 1)[1]
    img_bytes = base64.b64decode(b64)
    img = face_recognition.load_image_file(io.BytesIO(img_bytes))
    locs = face_recognition.face_locations(img, model='hog')
    if not locs:
      raise HTTPException(status_code=400, detail="No face detected in provided image")
    encs = face_recognition.face_encodings(img, known_face_locations=locs)
    if not encs:
      raise HTTPException(status_code=400, detail="Face encoding failed")
    q = encs[0]  # query encoding

    # compute minimal distance among all candidates
    best_user, best_dist = None, 1e9
    for c in payload.candidates:
      for e in c.encodings:
        e_np = np.array(e, dtype=np.float64)
        d = np.linalg.norm(q - e_np)
        if d < best_dist:
          best_dist = d
          best_user = c.userId

    if best_user is None:
      return {"matched": False}
    return {"matched": best_dist <= (payload.threshold or 0.5), "userId": best_user, "distance": float(best_dist)}
  except HTTPException:
    raise
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Identify error: {str(e)}")
