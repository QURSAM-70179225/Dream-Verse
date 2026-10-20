import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  done: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  // Set the first time XP is granted for this task so un-ticking and re-ticking can't farm XP.
  xpAwarded: { type: Boolean, default: false },
});

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    url: { type: String, default: '', maxlength: 500 },
  },
  { _id: false }
);

const milestoneSchema = new mongoose.Schema(
  {
    roadmap: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: Number, required: true, min: 0 },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 600 },
    timeline: { type: String, default: '', maxlength: 100 },
    resources: { type: [resourceSchema], default: [] },
    tasks: { type: [taskSchema], default: [] },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    // Set once when the milestone-completion XP bonus has been granted.
    xpAwarded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

milestoneSchema.index({ roadmap: 1, order: 1 });

milestoneSchema.virtual('status').get(function status() {
  if (this.progress >= 100) return 'completed';
  if (this.progress > 0) return 'in-progress';
  return 'not-started';
});

milestoneSchema.methods.recalc = function recalc() {
  const total = this.tasks.length;
  const done = this.tasks.filter((t) => t.done).length;
  this.progress = total === 0 ? 0 : Math.round((done / total) * 100);
  return this.progress;
};

export const Milestone = mongoose.models.Milestone || mongoose.model('Milestone', milestoneSchema);
