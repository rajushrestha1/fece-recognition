
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import { pyEncode, pyIdentify } from '../utils/callPython.js';

const router = express.Router();

// Multer storage (disk)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(process.cwd(), 'backend', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    const unique = Date.now() + '_' + Math.round(Math.random()*1e9);
    cb(null, `${base}_${unique}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { files: 4, fileSize: 5 * 1024 * 1024 }, // 5MB each
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('Only .jpg/.jpeg/.png allowed'));
    cb(null, true);
  }
});

router.post('/register', upload.array('images', 4), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already used' });

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least 1 image' });
    }

    const images = files.map(f => path.join('uploads', path.basename(f.path)));
    // Compute encodings (Python)
    const absPaths = files.map(f => path.resolve(f.path));
    const encResp = await pyEncode(absPaths);
    const encodings = encResp?.encodings || [];

    if (encodings.length === 0) {
      return res.status(400).json({ message: 'No faces found in uploaded images' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, images, encodings });

    return res.json({ message: 'Registered', user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

router.post('/login/face', async (req, res) => {
  try {
    const { image } = req.body; // data URL base64 from react-webcam
    if (!image) return res.status(400).json({ message: 'Missing image' });

    // Fetch known users + encodings
    const users = await User.find({ encodings: { $exists: true, $ne: [] } }, { encodings: 1 }).lean();
    if (users.length === 0) return res.status(400).json({ message: 'No users to match against' });

    const payloadUsers = users.map(u => ({
      userId: u._id.toString(),
      encodings: u.encodings
    }));

    const { matched, userId, distance } = await pyIdentify(image, payloadUsers, 0.5);

    if (!matched) {
      return res.status(401).json({ message: 'Face authentication failed', matched: false });
    }

    // Create JWT
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: (process.env.COOKIE_SECURE === 'true'),
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const user = await User.findById(userId).select('name email images');
    return res.json({ message: 'Login success', matched: true, distance, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    const user = await User.findById(payload.userId).select('name email images');
    if (!user) return res.status(401).json({ message: 'User not found' });
    return res.json({ user });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid session' });
  }
});

export default router;
