// Source of truth for achievements. Granting is always decided by backend logic.
export const ACHIEVEMENTS = [
  {
    key: 'first-dream',
    title: 'First Dream Created',
    description: 'Create your first DreamVerse.',
    xp: 50,
  },
  {
    key: 'future-explorer',
    title: 'Future Explorer',
    description: 'Visit the apartment, the office and the café in your dream world.',
    xp: 75,
  },
  {
    key: 'career-starter',
    title: 'Career Starter',
    description: 'Complete your first roadmap milestone.',
    xp: 100,
  },
  {
    key: 'decision-maker',
    title: 'Decision Maker',
    description: 'Make your first life decision in the decision simulator.',
    xp: 100,
  },
  {
    key: 'goal-achiever',
    title: 'Goal Achiever',
    description: 'Complete every milestone on a roadmap.',
    xp: 150,
  },
  {
    key: 'dream-architect',
    title: 'Dream Architect',
    description: 'Create three different dreams.',
    xp: 250,
  },
];

export const achievementByKey = (key) => ACHIEVEMENTS.find((a) => a.key === key) || null;
