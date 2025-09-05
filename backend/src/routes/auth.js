// backend/src/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import { pyEncode, pyIdentify } from '../utils/callPython.js';

const router = express.Router();

/** Ensure uploads directory exists */
const uploadsDir = path.join(process.cwd(), 'backend', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/** Disk storage for registration uploads */
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    const safeBase = (file.originalname || 'image')
      .replace(/\s+/g, '_')
      .replace(/[^\w\-\.]/g, '');
    cb(null, `${Date.now()}_${safeBase}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  if (/^image\//.test(file.mimetype)) return cb(null, true);
  cb(new Error('Only image files are allowed'));
}

const upload = multer({
  storage: diskStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 4 }
});

/** Memory storage for face-login */
const memoryStorage = multer.memoryStorage();
const memoryUpload = multer({ storage: memoryStorage });

/** Helper: sign JWT */
function signToken(userId) {
  const secret = process.env.JWT_SECRET || 'devsecret';
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
}

/** REGISTER */
router.post('/register', upload.array('images', 4), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Please upload at least one face image' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already in use' });

    const absPaths = req.files.map(f => path.resolve(f.path));

    let encResp;
    try {
      encResp = await pyEncode(absPaths); // send files to Python
    } catch (e) {
      console.error('pyEncode error:', e?.response?.data || e.message);
      return res.status(500).json({ message: 'Face encoding service error. Is face-service running?' });
    }

    const encodings = (encResp?.encodings || []).filter(arr => Array.isArray(arr) && arr.length > 0);
    if (encodings.length === 0) {
      for (const p of absPaths) { try { fs.unlinkSync(p); } catch {} }
      return res.status(422).json({ message: 'No faces detected in the uploaded image(s). Try clearer, front-facing photos.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const stored = await User.create({
      name,
      email,
      passwordHash,
      images: absPaths.map(p => path.relative(process.cwd(), p)),
      encodings
    });

    const token = signToken(stored._id.toString());

    return res
      .cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 })
      .json({ message: 'Registered successfully', user: { id: stored._id, name: stored.name, email: stored.email } });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Registration failed while importing image', error: err?.message });
  }
});

/** LOGIN (email/password) */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signToken(user._id.toString());
    return res
      .cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 })
      .json({ message: 'Logged in', user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ message: 'Login failed' });
  }
});

/** FACE LOGIN */
router.post('/login/face', memoryUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No face image uploaded' });

    const users = await User.find({}, { encodings: 1, _id: 1 }).lean();

    const payload = users
      .filter(u => u._id && Array.isArray(u.encodings))
      .map(u => ({ userId: u._id.toString(), encodings: u.encodings }));

    const image_base64 = `data:image/jpeg;base64,${req.file.buffer.toString('base64')}`;

    let result;
    try {
      result = await pyIdentify(image_base64, payload, 0.5);
      console.log('pyIdentify result:', result);
    } catch (err) {
      console.error('pyIdentify call failed:', err?.response?.data || err.message);
      return res.status(500).json({ message: 'Face identify service error', error: err.message });
    }

    if (!result || !result.matched || !result.userId) {
      return res.status(401).json({ message: 'No face match detected' });
    }

    const token = signToken(result.userId);
    const user = await User.findById(result.userId).select('name email images');

    return res
      .cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*3600*1000 })
      .json({ message: 'Logged in by face', user, distance: result.distance, matched: true });

  } catch (err) {
    console.error('Face login error:', err);
    return res.status(500).json({ message: 'Face login failed', error: err.message });
  }
});

/** Get current user */
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });
    const secret = process.env.JWT_SECRET || 'devsecret';
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.userId).select('name email images');
    if (!user) return res.status(401).json({ message: 'User not found' });
    return res.json({ user });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid session' });
  }
});

/** Multer error handler */
router.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') return res.status(400).json({ message: `Upload error: ${err.message}` });
  if (err && /Only image files are allowed/i.test(err.message)) return res.status(400).json({ message: err.message });
  next(err);
});

export default router;
