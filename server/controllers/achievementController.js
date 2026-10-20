import { asyncHandler } from '../utils/asyncHandler.js';
import { achievementList, getProgress } from '../services/progressService.js';

export const listAchievements = asyncHandler(async (req, res) => {
  const progress = await getProgress(req.user._id);
  res.json({ achievements: await achievementList(progress), xp: progress.xp });
});
