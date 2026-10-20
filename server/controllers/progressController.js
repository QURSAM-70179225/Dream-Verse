import { Milestone } from '../models/Milestone.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UserProgress } from '../models/UserProgress.js';
import { WORLD_INTERIORS, XP } from '../utils/xp.js';
import { milestoneOut } from '../utils/serializers.js';
import { awardXp, buildProgressPayload, getProgress, grantAchievement } from '../services/progressService.js';
import { recordActivity } from '../services/streakService.js';

export const getProgressSummary = asyncHandler(async (req, res) => {
  res.json(await buildProgressPayload(req.user._id, req.tz));
});

// Ticks or un-ticks one task. XP and achievements are decided here, never by the client.
export const updateMilestoneTask = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { taskId, done } = req.body;

  const milestone = await Milestone.findOne({ _id: req.params.id, user: userId });
  if (!milestone) throw new AppError('Milestone not found', 404);

  const task = milestone.tasks.id(taskId);
  if (!task) throw new AppError('Task not found in this milestone', 404);

  task.done = done;
  task.completedAt = done ? task.completedAt || new Date() : null;

  const awardTaskXp = done && !task.xpAwarded;
  if (awardTaskXp) task.xpAwarded = true;

  milestone.recalc();
  const justCompleted = milestone.progress === 100 && !milestone.xpAwarded;
  if (justCompleted) milestone.xpAwarded = true;

  await milestone.save();

  let xpGained = 0;
  const newAchievements = [];

  let streak = { counted: false, count: 0, best: 0, xpGained: 0 };
  if (awardTaskXp) {
    await awardXp(userId, XP.task, 'Completed a roadmap task');
    xpGained += XP.task;
    streak = await recordActivity(userId, req.tz);
    xpGained += streak.xpGained;
  }

  if (justCompleted) {
    await awardXp(userId, XP.milestone, `Completed milestone: ${milestone.title}`);
    xpGained += XP.milestone;

    const starter = await grantAchievement(userId, 'career-starter');
    if (starter) {
      newAchievements.push(starter);
      xpGained += starter.xp;
    }

    const unfinished = await Milestone.countDocuments({
      roadmap: milestone.roadmap,
      progress: { $lt: 100 },
    });
    if (unfinished === 0) {
      const achiever = await grantAchievement(userId, 'goal-achiever');
      if (achiever) {
        newAchievements.push(achiever);
        xpGained += achiever.xp;
      }
    }
  }

  res.json({
    milestone: milestoneOut(milestone),
    xpGained,
    streak,
    newAchievements,
    progress: await buildProgressPayload(userId, req.tz),
  });
});

const PLACE_NAMES = { apartment: 'the apartment', office: 'the office', cafe: 'the café' };

// The browser reports that an interior of the 3D world was entered. The server keeps the list of
// visited places, gives XP only for the first visit to each, and grants Future Explorer once all
// of them are visited. (The browser is trusted to say where it went, so the stakes are small:
// 10 XP per place, three places in total.)
export const recordVisit = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { location } = req.body;
  await getProgress(userId);

  const updated = await UserProgress.findOneAndUpdate(
    { user: userId, visited: { $ne: location } },
    {
      $addToSet: { visited: location },
      $inc: { xp: XP.visit },
      $push: {
        xpLog: {
          $each: [{ amount: XP.visit, reason: `First visit: ${PLACE_NAMES[location]}`, at: new Date() }],
          $slice: -200,
        },
      },
    },
    { new: true }
  );

  let xpGained = 0;
  const newAchievements = [];
  let streak = { counted: false, count: 0, best: 0, xpGained: 0 };
  if (updated) {
    xpGained += XP.visit;
    streak = await recordActivity(userId, req.tz);
    xpGained += streak.xpGained;
    if (WORLD_INTERIORS.every((place) => updated.visited.includes(place))) {
      const explorer = await grantAchievement(userId, 'future-explorer');
      if (explorer) {
        newAchievements.push(explorer);
        xpGained += explorer.xp;
      }
    }
  }

  const progress = updated || (await getProgress(userId));
  res.json({
    firstVisit: Boolean(updated),
    xpGained,
    streak,
    newAchievements,
    visited: progress.visited,
    remaining: WORLD_INTERIORS.filter((place) => !progress.visited.includes(place)),
  });
});
