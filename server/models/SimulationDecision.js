import mongoose from 'mongoose';

// One life decision made in the simulator, with the imagined outcome that was shown.
const outcomeSchema = new mongoose.Schema(
  {
    headline: { type: String, default: '', maxlength: 200 },
    story: { type: String, default: '', maxlength: 900 },
    upside: { type: String, default: '', maxlength: 400 },
    challenge: { type: String, default: '', maxlength: 400 },
    nextStep: { type: String, default: '', maxlength: 300 },
  },
  { _id: false }
);

const simulationDecisionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dream: { type: mongoose.Schema.Types.ObjectId, ref: 'Dream', required: true },
    scenarioTitle: { type: String, required: true, maxlength: 200 },
    optionA: { type: String, default: '', maxlength: 300 },
    optionB: { type: String, default: '', maxlength: 300 },
    choiceKey: { type: String, enum: ['A', 'B'], default: 'A' },
    // Text of the option that was chosen.
    choice: { type: String, required: true, maxlength: 300 },
    outcome: { type: outcomeSchema, default: () => ({}) },
    // Same text as outcome.story (kept for older records).
    narrative: { type: String, default: '', maxlength: 2000 },
    // 'ai' = written by the AI model, 'template' = simple built-in text (no AI configured).
    source: { type: String, enum: ['ai', 'template'], default: 'template' },
    // Identifies the scenario, so repeating the same one cannot earn XP again.
    scenarioKey: { type: String, default: '', maxlength: 80 },
    xpAwarded: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

simulationDecisionSchema.index({ user: 1, createdAt: -1 });
simulationDecisionSchema.index({ user: 1, scenarioKey: 1 });

export const SimulationDecision =
  mongoose.models.SimulationDecision ||
  mongoose.model('SimulationDecision', simulationDecisionSchema);
