// backend/utils/callPython.js
// ✅ ADDED / REPLACED to ensure FastAPI gets "files" form-data and identify works.

import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const BASE = process.env.FACE_SERVICE_URL || 'http://127.0.0.1:5000';

export async function pyEncode(absPaths = []) {
  // Sends multipart/form-data with repeated "files" fields
  const form = new FormData();
  for (const p of absPaths) {
    form.append('files', fs.createReadStream(p)); // field MUST be "files"
  }

  const { data } = await axios.post(`${BASE}/encode`, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return data; // { encodings: [ [128floats] | [] , ... ] }
}

export async function pyIdentify(image_base64, candidates = [], threshold = 0.5) {
  const { data } = await axios.post(`${BASE}/identify`, {
    image_base64,
    candidates,
    threshold
  }, { timeout: 30000 });

  return data; // { matched: boolean, userId?: string, distance?: number }
}
