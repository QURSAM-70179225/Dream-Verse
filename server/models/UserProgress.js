import mongoose from 'mongoose';

const userProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    xp: { type: Number, default: 0, min: 0 },
    achievements: {
      type: [
        new mongoose.Schema(
          {
            key: { type: String, required: true },
            earnedAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    // Interior locations of the 3D world the user has visited (recorded by the server).
    visited: { type: [String], default: [] },
    // Consecutive days with at least one useful action (day keys are in the user's time zone).
    streak: {
      count: { type: Number, default: 0, min: 0 },
      best: { type: Number, default: 0, min: 0 },
      lastDay: { type: String, default: '' },
    },
    // Recent XP events (capped to the last 200) used for the weekly chart.
    xpLog: {
      type: [
        new mongoose.Schema(
          {
            amount: { type: Number, required: true },
            reason: { type: String, default: '', maxlength: 200 },
            at: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const UserProgress =
  mongoose.models.UserProgress || mongoose.model('UserProgress', userProgressSchema);
