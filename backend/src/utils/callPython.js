
import axios from 'axios';

const PY_URL = process.env.PY_SERVICE_URL || 'http://127.0.0.1:8000';

export const pyEncode = async (paths=[]) => {
  const { data } = await axios.post(`${PY_URL}/encode`, { paths });
  return data; // { encodings: [[...], ...] }
};

export const pyIdentify = async (imageBase64, users, tolerance=0.5) => {
  const { data } = await axios.post(`${PY_URL}/identify`, {
    image_base64: imageBase64,
    users,
    tolerance
  });
  return data; // { matched, userId, distance, best_index }
};
