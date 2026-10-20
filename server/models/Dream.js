import mongoose from 'mongoose';

const dreamSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    career: { type: String, trim: true, maxlength: 200, default: '' },
    city: { type: String, trim: true, maxlength: 200, default: '' },
    home: { type: String, trim: true, maxlength: 200, default: '' },
    lifestyle: { type: String, trim: true, maxlength: 200, default: '' },
    skills: { type: [{ type: String, trim: true, maxlength: 60 }], default: [] },
    goals: { type: [{ type: String, trim: true, maxlength: 60 }], default: [] },
    story: { type: String, trim: true, maxlength: 600, default: '' },
  },
  { timestamps: true }
);

dreamSchema.index({ user: 1, createdAt: -1 });

export const Dream = mongoose.models.Dream || mongoose.model('Dream', dreamSchema);
