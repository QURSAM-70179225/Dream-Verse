import mongoose from 'mongoose';

const roadmapSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dream: { type: mongoose.Schema.Types.ObjectId, ref: 'Dream', required: true, unique: true },
    title: { type: String, required: true, maxlength: 200 },
    source: { type: String, enum: ['template', 'ai'], default: 'template' },
  },
  { timestamps: true }
);

export const Roadmap = mongoose.models.Roadmap || mongoose.model('Roadmap', roadmapSchema);
