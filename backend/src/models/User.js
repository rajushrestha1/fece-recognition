
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  images: [{ type: String }], // file paths saved by multer
  encodings: { type: [[Number]], default: [] }, // 128-d vectors (one per uploaded image)
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
