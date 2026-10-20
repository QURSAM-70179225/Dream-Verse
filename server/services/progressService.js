import { UserProgress } from '../models/UserProgress.js';
import { Achievement } from '../models/Achievement.js';
import { Dream } from '../models/Dream.js';
import { FutureProfile } from '../models/FutureProfile.js';
import { Roadmap } from '../models/Roadmap.js';
import { Milestone } from '../models/Milestone.js';
import { ACHIEVEMENTS, achievementByKey } from '../utils/achievementDefs.js';
import { env } from '../config/env.js';
import { dayKey } from '../utils/day.js';
import { streakView } from '../utils/streak.js';
import { levelProgress, weeklyXp } from '../utils/xp.js';
import { SimulationDecision } from '../models/SimulationDecision.js';
import { decisionOut, dreamOut, profileOut, roadmapOut } from '../utils/serializers.js';

export async function getProgress(userId) {
  let progress = await UserProgress.findOne({ user: userId });
  if (progress) return progress;
  try {
    progress = await UserProgress.create({ user: userId });
  } catch (err) {
    if (err.code !== 11000) throw err; // another request created it first
    progress = await UserProgress.findOne({ user: userId });
  }
  return progress;
}

export async function awardXp(userId, amount, reason) {
  await getProgress(userId);
  return UserProgress.findOneAndUpdate(
    { user: userId },
    {
      $inc: { xp: amount },
      $push: { xpLog: { $each: [{ amount, reason, at: new Date() }], $slice: -200 } },
    },
    { new: true }
  );
}

/** Grants an achievement once. Returns its definition if newly granted, otherwise null. */
export async function grantAchievement(userId, key) {
  const def = achievementByKey(key);
  if (!def) return null;
  await getProgress(userId);
  const updated = await UserProgress.findOneAndUpdate(
    { user: userId, 'achievements.key': { $ne: key } },
    {
      $inc: { xp: def.xp },
      $push: {
        achievements: { key, earnedAt: new Date() },
        xpLog: {
          $each: [{ amount: def.xp, reason: `Achievement: ${def.title}`, at: new Date() }],
          $slice: -200,
        },
      },
    },
    { new: true }
  );
  return updated ? def : null;
}

export async function seedAchievements() {
  await Promise.all(
    ACHIEVEMENTS.map((a) =>
      Achievement.updateOne({ key: a.key }, { $set: a }, { upsert: true })
    )
  );
}

export async function achievementList(progress) {
  const stored = await Achievement.find().sort({ xp: 1 }).lean();
  const defs = stored.length ? stored : ACHIEVEMENTS;
  const earned = new Map(progress.achievements.map((a) => [a.key, a.earnedAt]));
  return defs.map((a) => ({
    key: a.key,
    title: a.title,
    description: a.description,
    xp: a.xp,
    earned: earned.has(a.key),
    earnedAt: earned.get(a.key) || null,
  }));
}

/** Everything the dashboard needs in one object. */
export async function buildProgressPayload(userId, tz = 'UTC') {
  const progress = await getProgress(userId);
  const dream = await Dream.findOne({ user: userId }).sort({ createdAt: -1 });

  let dreamPayload = null;
  let roadmapPayload = null;
  if (dream) {
    const [profile, roadmap] = await Promise.all([
      FutureProfile.findOne({ dream: dream._id }),
      Roadmap.findOne({ dream: dream._id }),
    ]);
    const milestones = roadmap ? await Milestone.find({ roadmap: roadmap._id }).sort({ order: 1 }) : [];
    dreamPayload = {
      ...dreamOut(dream),
      summary: profile?.summary || '',
      goalItems: dream.goals.map((title, i) => ({ id: `goal-${i}`, title, done: false })),
      profile: profileOut(profile),
    };
    roadmapPayload = roadmapOut(roadmap, milestones);
  }

  const recent = await SimulationDecision.find({ user: userId }).sort({ createdAt: -1 }).limit(3);

  return {
    visited: progress.visited || [],
    streak: streakView(progress.streak, dayKey(new Date(), tz), env.game.streakStepXp),
    decisions: recent.map(decisionOut),
    xp: progress.xp,
    ...levelProgress(progress.xp),
    weeklyXp: weeklyXp(progress.xpLog, new Date(), tz),
    achievements: await achievementList(progress),
    dream: dreamPayload,
    roadmap: roadmapPayload,
  };
}
