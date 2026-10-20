import { FutureProfile } from '../models/FutureProfile.js';
import { Milestone } from '../models/Milestone.js';
import { Roadmap } from '../models/Roadmap.js';
import { SimulationDecision } from '../models/SimulationDecision.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { exclusive } from '../utils/exclusive.js';
import { customScenarioKey, normalizeText as norm } from '../utils/scenarioKey.js';
import { decisionOut } from '../utils/serializers.js';
import { MAX_XP_DECISIONS_PER_DAY, XP, levelProgress } from '../utils/xp.js';
import { detectCrisis } from '../services/ai/aiSafety.js';
import { cleanText } from '../services/ai/aiParse.js';
import { requireDream } from '../services/dreamLookup.js';
import { simulateDecision } from '../services/aiService.js';
import { awardXp, getProgress, grantAchievement } from '../services/progressService.js';
import { dayKey } from '../utils/day.js';
import { recordActivity } from '../services/streakService.js';


async function firstOpenTask(dreamId) {
  const roadmap = await Roadmap.findOne({ dream: dreamId });
  if (!roadmap) return '';
  const milestones = await Milestone.find({ roadmap: roadmap._id }).sort({ order: 1 });
  for (const m of milestones) {
    const task = m.tasks.find((t) => !t.done);
    if (task) return task.title;
  }
  return '';
}

export const makeDecision = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { dreamId, scenarioId, choice: choiceKey } = req.body;

  const dream = await requireDream(userId, dreamId, 'Create a dream first, then play the decision simulator.');
  const profile = await FutureProfile.findOne({ dream: dream._id });

  let scenario;
  let scenarioKey;
  if (scenarioId) {
    const saved = profile?.scenarios?.id(scenarioId);
    if (!saved) throw new AppError('Scenario not found', 404);
    scenario = { title: saved.title, optionA: saved.optionA, optionB: saved.optionB };
    scenarioKey = `s:${scenarioId}`;
  } else {
    scenario = {
      title: cleanText(req.body.title),
      optionA: cleanText(req.body.optionA),
      optionB: cleanText(req.body.optionB),
    };
    if (detectCrisis(`${scenario.title} ${scenario.optionA} ${scenario.optionB}`)) {
      throw new AppError(
        'This simulator is for planning life and career decisions. If you are going through something painful, please reach out to someone you trust or to local emergency services.',
        400
      );
    }
    if (norm(scenario.optionA) === norm(scenario.optionB)) {
      throw new AppError('The two options need to be different.', 400);
    }
    scenarioKey = customScenarioKey(scenario.title, scenario.optionA, scenario.optionB);
  }

  const result = await exclusive(`decision:${userId}`, async () => {
    const nextTask = await firstOpenTask(dream._id);
    const { mode, outcome } = await simulateDecision({ dream, profile, scenario, choiceKey, nextTask });

    // XP once per scenario and at most a few times a day, so the simulator cannot be farmed.
    const repeated = await SimulationDecision.exists({ user: userId, scenarioKey });
    // "Today" is the user's own calendar day (time zone from the browser).
    const recent = await SimulationDecision.find({
      user: userId,
      xpAwarded: { $gt: 0 },
      createdAt: { $gte: new Date(Date.now() - 48 * 3600 * 1000) },
    })
      .select('createdAt')
      .lean();
    const today = dayKey(new Date(), req.tz);
    const rewardedToday = recent.filter((d) => dayKey(d.createdAt, req.tz) === today).length;
    let noXpReason = null;
    if (repeated) noXpReason = 'repeat';
    else if (rewardedToday >= MAX_XP_DECISIONS_PER_DAY) noXpReason = 'daily-cap';
    const xpAwarded = noXpReason ? 0 : XP.decision;

    const { source, ...outcomeFields } = outcome;
    const chosen = choiceKey === 'A' ? scenario.optionA : scenario.optionB;
    const decision = await SimulationDecision.create({
      user: userId,
      dream: dream._id,
      scenarioTitle: scenario.title,
      optionA: scenario.optionA,
      optionB: scenario.optionB,
      choiceKey,
      choice: chosen,
      outcome: outcomeFields,
      narrative: outcomeFields.story,
      source,
      scenarioKey,
      xpAwarded,
    });

    let xpGained = 0;
    const newAchievements = [];
    if (xpAwarded) {
      await awardXp(userId, xpAwarded, `Life decision: ${scenario.title.slice(0, 80)}`);
      xpGained += xpAwarded;
    }
    const maker = await grantAchievement(userId, 'decision-maker');
    if (maker) {
      newAchievements.push(maker);
      xpGained += maker.xp;
    }
    const streak = await recordActivity(userId, req.tz);
    xpGained += streak.xpGained;
    return { mode, decision, xpGained, newAchievements, noXpReason, streak };
  });

  const progress = await getProgress(userId);
  res.status(201).json({
    mode: result.mode,
    decision: decisionOut(result.decision),
    xpGained: result.xpGained,
    noXpReason: result.noXpReason,
    newAchievements: result.newAchievements,
    streak: result.streak,
    xp: progress.xp,
    ...levelProgress(progress.xp),
  });
});

export const decisionHistory = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.dreamId) {
    await requireDream(req.user._id, req.query.dreamId);
    filter.dream = req.query.dreamId;
  }
  const items = await SimulationDecision.find(filter).sort({ createdAt: -1 }).limit(req.query.limit);
  res.json({ decisions: items.map(decisionOut) });
});
