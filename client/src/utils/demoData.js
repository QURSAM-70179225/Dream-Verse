// Sample data shown in demo mode ("Explore with sample data"). Always labeled as sample data in
// the UI. demoPayload mirrors the shape returned by GET /api/progress.
import { levelProgress } from './xp.js';

export const demoDream = {
  career: 'AI Engineer & startup founder',
  city: 'Tokyo, Japan',
  home: 'Modern apartment with a city view',
  lifestyle: 'Creative, balanced, café-hopping weekends',
  summary:
    'A future building AI products in Tokyo, running a small café on the side, and living in a sleek apartment above the city lights.',
  goals: [
    { id: 'g1', title: 'Become an AI engineer', done: false },
    { id: 'g2', title: 'Launch my own startup', done: false },
    { id: 'g3', title: 'Open a small café', done: false },
    { id: 'g4', title: 'Learn conversational Japanese', done: true },
  ],
};

export const demoProgress = {
  xp: 1240,
  weeklyXp: [
    { day: 'Mon', xp: 80 },
    { day: 'Tue', xp: 140 },
    { day: 'Wed', xp: 40 },
    { day: 'Thu', xp: 200 },
    { day: 'Fri', xp: 120 },
    { day: 'Sat', xp: 260 },
    { day: 'Sun', xp: 90 },
  ],
};

export const demoRoadmap = [
  { id: 'm1', title: 'Learn Python', progress: 100 },
  { id: 'm2', title: 'Study maths & machine learning', progress: 65 },
  { id: 'm3', title: 'Build AI projects', progress: 30 },
  { id: 'm4', title: 'Create a portfolio', progress: 0 },
  { id: 'm5', title: 'Apply for internships', progress: 0 },
  { id: 'm6', title: 'Pursue advanced specialization', progress: 0 },
];

export const demoAchievements = [
  { id: 'a1', title: 'First Dream Created', xp: 50, earned: true },
  { id: 'a2', title: 'Future Explorer', xp: 75, earned: true },
  { id: 'a3', title: 'Career Starter', xp: 100, earned: true },
  { id: 'a4', title: 'Decision Maker', xp: 100, earned: false },
  { id: 'a5', title: 'Goal Achiever', xp: 150, earned: false },
  { id: 'a6', title: 'Dream Architect', xp: 250, earned: false },
];

export const demoPayload = {
  visited: ['apartment', 'office'],
  streak: { count: 3, best: 5, doneToday: false, todayBonus: 20 },
  xp: demoProgress.xp,
  ...levelProgress(demoProgress.xp),
  weeklyXp: demoProgress.weeklyXp,
  achievements: demoAchievements.map((a) => ({
    key: a.id,
    title: a.title,
    xp: a.xp,
    earned: a.earned,
  })),
  dream: {
    ...demoDream,
    goalItems: demoDream.goals,
    skills: ['Python', 'Machine learning', 'Product design'],
    profile: { cityTheme: 'neon-skyline', roomTheme: 'modern-apartment', source: 'sample' },
  },
  roadmap: {
    overall: Math.round(demoRoadmap.reduce((s, m) => s + m.progress, 0) / demoRoadmap.length),
    milestones: demoRoadmap,
  },
};

export const demoScenarios = [
  {
    id: 's1',
    title: 'Big tech offer vs. your own AI startup',
    choice: 'Started the startup',
    note: 'Hypothetical outcome — high risk, high learning.',
  },
  {
    id: 's2',
    title: 'Open the café now or save for a year',
    choice: 'Saved for a year',
    note: 'Hypothetical outcome — slower start, steadier footing.',
  },
];
