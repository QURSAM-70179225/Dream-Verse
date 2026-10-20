import mongoose from 'mongoose';

// Achievement definitions (mirrored from utils/achievementDefs.js on server start).
const achievementSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 300 },
    xp: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const Achievement =
  mongoose.models.Achievement || mongoose.model('Achievement', achievementSchema);
