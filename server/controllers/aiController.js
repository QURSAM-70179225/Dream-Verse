import { AIConversation } from '../models/AIConversation.js';
import { FutureProfile } from '../models/FutureProfile.js';
import { Milestone } from '../models/Milestone.js';
import { Roadmap } from '../models/Roadmap.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { exclusive } from '../utils/exclusive.js';
import { messageOut, profileOut, roadmapOut } from '../utils/serializers.js';
import { findDream, requireDream as requireDreamBase } from '../services/dreamLookup.js';
import { buildFutureProfile } from '../services/futureTemplate.js';
import { aiMode, generateFutureProfile, generateRoadmapPlan, novaChat } from '../services/aiService.js';

const HISTORY_FOR_MODEL = 10; // recent messages sent to the model
const HISTORY_STORED = 60; // messages kept per conversation

const requireDream = (userId, dreamId) =>
  requireDreamBase(userId, dreamId, 'Create a dream first, then ask the AI to personalize it.');

async function loadRoadmap(dreamId) {
  const roadmap = await Roadmap.findOne({ dream: dreamId });
  const milestones = roadmap ? await Milestone.find({ roadmap: roadmap._id }).sort({ order: 1 }) : [];
  return { roadmap, milestones };
}

export const aiStatus = asyncHandler(async (_req, res) => {
  res.json({ mode: aiMode() });
});

export const generateFuture = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const dream = await requireDream(userId, req.body.dreamId);

  const out = await exclusive(`future:${userId}`, async () => {
    const result = await generateFutureProfile(dream);
    if (result.mode === 'demo') return { result };

    const saved = await FutureProfile.findOneAndUpdate(
      { dream: dream._id },
      { $set: { ...result.profile, user: userId, dream: dream._id } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return { result, saved };
  });

  if (out.result.mode === 'demo') {
    const existing =
      (await FutureProfile.findOne({ dream: dream._id })) ||
      (await FutureProfile.create({ user: userId, dream: dream._id, ...buildFutureProfile(dream) }));
    return res.json({
      mode: 'demo',
      updated: false,
      message: 'AI is not connected on this server, so nothing was changed. Add AI_API_KEY to turn it on.',
      futureProfile: profileOut(existing),
    });
  }

  return res.json({ mode: 'live', updated: true, futureProfile: profileOut(out.saved) });
});

export const generateRoadmap = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const dream = await requireDream(userId, req.body.dreamId);

  const { roadmap, milestones } = await loadRoadmap(dream._id);

  // Replacing a roadmap would erase ticked tasks (and let XP be earned twice), so it is only
  // allowed while nothing has been done yet.
  const hasProgress = milestones.some((m) => m.xpAwarded || m.tasks.some((t) => t.done || t.xpAwarded));
  if (hasProgress) {
    throw new AppError(
      'This roadmap already has progress, and replacing it would erase that progress. Create a new dream to get a fresh AI roadmap.',
      409
    );
  }

  const profile = await FutureProfile.findOne({ dream: dream._id });

  const out = await exclusive(`roadmap:${userId}`, async () => {
    const result = await generateRoadmapPlan(dream, profile);
    if (result.mode === 'demo') return { result };

    const plan = result.roadmap;
    const target =
      roadmap ||
      (await Roadmap.create({ user: userId, dream: dream._id, title: plan.title, source: 'ai' }));

    // Insert the new milestones first, then remove the old ones, so a failure never leaves the
    // user without a roadmap.
    const created = await Milestone.insertMany(
      plan.milestones.map((m, order) => ({
        roadmap: target._id,
        user: userId,
        order,
        title: m.title,
        description: m.description,
        timeline: m.timeline,
        resources: m.resources,
        tasks: m.tasks.map((title) => ({ title })),
      }))
    );
    try {
      await Milestone.deleteMany({ _id: { $in: milestones.map((m) => m._id) } });
      target.title = plan.title;
      target.source = 'ai';
      await target.save();
    } catch (err) {
      await Milestone.deleteMany({ _id: { $in: created.map((m) => m._id) } }).catch(() => {});
      throw err;
    }
    return { result, target, created };
  });

  if (out.result.mode === 'demo') {
    return res.json({
      mode: 'demo',
      updated: false,
      message: 'AI is not connected on this server, so nothing was changed. Add AI_API_KEY to turn it on.',
      roadmap: roadmapOut(roadmap, milestones),
    });
  }

  const fresh = await Milestone.find({ roadmap: out.target._id }).sort({ order: 1 });
  return res.json({ mode: 'live', updated: true, roadmap: roadmapOut(out.target, fresh) });
});

export const chat = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { message, dreamId } = req.body;

  const dream = await findDream(userId, dreamId);
  const dreamKey = dream ? dream._id : null;

  const existing = await AIConversation.findOne({ user: userId, dream: dreamKey });
  const history = (existing?.messages || []).slice(-HISTORY_FOR_MODEL);

  let profile = null;
  let roadmapData = null;
  if (dream) {
    profile = await FutureProfile.findOne({ dream: dream._id });
    const { roadmap, milestones } = await loadRoadmap(dream._id);
    roadmapData = roadmapOut(roadmap, milestones);
  }

  const answer = await novaChat({
    dream,
    profile,
    roadmap: roadmapData,
    history,
    message,
  });

  // Saved only after a successful answer, so a failed request leaves no half conversation.
  const now = new Date();
  const userMsg = { role: 'user', content: message, at: now };
  const novaMsg = { role: 'assistant', content: answer.reply, mode: answer.mode, at: new Date() };
  await AIConversation.findOneAndUpdate(
    { user: userId, dream: dreamKey },
    { $push: { messages: { $each: [userMsg, novaMsg], $slice: -HISTORY_STORED } } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ mode: answer.mode, reply: messageOut(novaMsg) });
});

export const getConversation = asyncHandler(async (req, res) => {
  const dream = await findDream(req.user._id, req.query.dreamId);
  const convo = await AIConversation.findOne({ user: req.user._id, dream: dream ? dream._id : null });
  res.json({
    mode: aiMode(),
    hasDream: Boolean(dream),
    messages: (convo?.messages || []).map(messageOut),
  });
});

export const clearConversation = asyncHandler(async (req, res) => {
  const dream = await findDream(req.user._id, req.query.dreamId);
  await AIConversation.deleteOne({ user: req.user._id, dream: dream ? dream._id : null });
  res.json({ cleared: true });
});
