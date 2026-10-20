import mongoose from 'mongoose';

// Stores Nova chat history (one conversation per user per dream).
const aiConversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dream: { type: mongoose.Schema.Types.ObjectId, ref: 'Dream', default: null },
    messages: {
      type: [
        new mongoose.Schema(
          {
            role: { type: String, enum: ['user', 'assistant'], required: true },
            content: { type: String, required: true, maxlength: 4000 },
            // 'live' = AI model, 'demo' = scripted reply (no AI configured), 'safety' = fixed safety message
            mode: { type: String, enum: ['live', 'demo', 'safety'], default: 'live' },
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

aiConversationSchema.index({ user: 1, updatedAt: -1 });

export const AIConversation =
  mongoose.models.AIConversation || mongoose.model('AIConversation', aiConversationSchema);
