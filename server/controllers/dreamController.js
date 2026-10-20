import { Dream } from '../models/Dream.js';
import { FutureProfile } from '../models/FutureProfile.js';
import { Roadmap } from '../models/Roadmap.js';
import { Milestone } from '../models/Milestone.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { levelProgress } from '../utils/xp.js';
import { dreamOut, profileOut, roadmapOut } from '../utils/serializers.js';
import { buildFutureProfile, buildRoadmap } from '../services/futureTemplate.js';
import { getProgress, grantAchievement } from '../services/progressService.js';

async function loadDreamBundle(dream) {
  const [profile, roadmap] = await Promise.all([
    FutureProfile.findOne({ dream: dream._id }),
    Roadmap.findOne({ dream: dream._id }),
  ]);
  const milestones = roadmap ? await Milestone.find({ roadmap: roadmap._id }).sort({ order: 1 }) : [];
  return {
    dream: dreamOut(dream),
    futureProfile: profileOut(profile),
    roadmap: roadmapOut(roadmap, milestones),
  };
}

export const createDream = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const dream = await Dream.create({ user: userId, ...req.body });

  try {
    const profileData = buildFutureProfile(dream);
    await FutureProfile.create({ user: userId, dream: dream._id, ...profileData });

    const roadmapData = buildRoadmap(dream);
    const roadmap = await Roadmap.create({
      user: userId,
      dream: dream._id,
      title: roadmapData.title,
      source: roadmapData.source,
    });
    await Milestone.insertMany(
      roadmapData.milestones.map((m, order) => ({
        roadmap: roadmap._id,
        user: userId,
        order,
        title: m.title,
        description: m.description,
        timeline: m.timeline,
        resources: m.resources,
        tasks: m.tasks.map((title) => ({ title })),
      }))
    );
  } catch (err) {
    // Don't leave a half-built dream behind if a later step fails.
    const partialRoadmap = await Roadmap.findOne({ dream: dream._id }).catch(() => null);
    await Promise.allSettled([
      partialRoadmap ? Milestone.deleteMany({ roadmap: partialRoadmap._id }) : null,
      Roadmap.deleteMany({ dream: dream._id }),
      FutureProfile.deleteMany({ dream: dream._id }),
      Dream.deleteOne({ _id: dream._id }),
    ]);
    throw err;
  }

  const newAchievements = [];
  const first = await grantAchievement(userId, 'first-dream');
  if (first) newAchievements.push(first);
  if ((await Dream.countDocuments({ user: userId })) >= 3) {
    const architect = await grantAchievement(userId, 'dream-architect');
    if (architect) newAchievements.push(architect);
  }

  const progress = await getProgress(userId);
  res.status(201).json({
    ...(await loadDreamBundle(dream)),
    newAchievements,
    xp: progress.xp,
    ...levelProgress(progress.xp),
  });
});

export const listDreams = asyncHandler(async (req, res) => {
  const dreams = await Dream.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ dreams: dreams.map(dreamOut) });
});

export const getDream = asyncHandler(async (req, res) => {
  const dream = await Dream.findOne({ _id: req.params.id, user: req.user._id });
  if (!dream) throw new AppError('Dream not found', 404);
  res.json(await loadDreamBundle(dream));
});

export const updateDream = asyncHandler(async (req, res) => {
  const dream = await Dream.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!dream) throw new AppError('Dream not found', 404);
  res.json({ dream: dreamOut(dream) });
});
