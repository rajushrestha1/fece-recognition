
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';

dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));

app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const start = async () => {
  await connectDB(process.env.MONGO_URI);
  app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
};

start();
