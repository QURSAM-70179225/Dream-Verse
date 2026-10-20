// Rule-based version used when AI is off (and as the starting point before AI personalization).
// Everything produced here is labeled source: 'template' so the app is honest that it is not AI.

// Theme ids the 3D world knows how to render (see client/src/world/data/locations.js).
export const CITY_THEME_IDS = ['neon-city', 'neon-skyline', 'coastal-glow', 'forest-retreat'];
export const ROOM_THEME_IDS = ['modern-apartment', 'cozy-loft', 'minimal-zen', 'garden-house'];

const CITY_THEMES = [
  { match: /tokyo|japan|osaka|seoul|shanghai|hong kong|singapore|dubai/i, theme: 'neon-skyline' },
  { match: /beach|coast|island|bali|miami|malibu|hawaii|lisbon/i, theme: 'coastal-glow' },
  { match: /mountain|alps|forest|countryside|village|cabin/i, theme: 'forest-retreat' },
];

const ROOM_THEMES = [
  { match: /cozy|loft|warm/i, theme: 'cozy-loft' },
  { match: /minimal|zen|clean/i, theme: 'minimal-zen' },
  { match: /garden|villa|house/i, theme: 'garden-house' },
];

const pick = (table, text, fallback) => table.find((t) => t.match.test(text))?.theme || fallback;

export function buildFutureProfile(dream) {
  const career = dream.career || '';
  const city = dream.city || '';
  const parts = [
    career ? `A future building a career as ${career}` : 'A future shaped by your own story',
    city ? ` in ${city}` : '',
    dream.home ? `, living in ${dream.home}` : '',
    dream.lifestyle ? `, with a lifestyle that is ${dream.lifestyle}` : '',
    '.',
  ];
  const field = career || 'your field';

  return {
    career,
    cityTheme: pick(CITY_THEMES, city, 'neon-city'),
    roomTheme: pick(ROOM_THEMES, `${dream.home} ${dream.lifestyle}`, 'modern-apartment'),
    lifestyle: dream.lifestyle || '',
    summary: parts.join('').slice(0, 800),
    source: 'template',
    scenarios: [
      {
        title: 'Two opportunities arrive',
        optionA: `Join an established organization in ${field}`,
        optionB: 'Start your own venture and learn by doing',
      },
      {
        title: 'Where should your energy go this year?',
        optionA: 'Build deep skills first, then take bigger steps',
        optionB: 'Take a bold early step toward your biggest goal',
      },
    ],
  };
}

export function buildRoadmap(dream) {
  const goal = dream.career || 'your dream';
  const skills = dream.skills?.length ? dream.skills.slice(0, 3).join(', ') : 'the core skills';

  return {
    title: dream.career ? `Roadmap: ${dream.career}` : 'Roadmap: your dream future',
    source: 'template',
    milestones: [
      {
        title: 'Learn the fundamentals',
        description: `Get comfortable with the basics of ${goal}.`,
        timeline: 'Months 1–2',
        resources: [
          { title: 'Browse learning paths on roadmap.sh', url: 'https://roadmap.sh/' },
          { title: 'Free courses on Khan Academy', url: 'https://www.khanacademy.org/' },
        ],
        tasks: [
          `Write down what a typical week looks like in ${goal}`,
          `Pick one beginner course covering ${skills}`,
          'Schedule 3 study sessions per week',
          'Finish the first module of your course',
        ],
      },
      {
        title: 'Study core knowledge in depth',
        description: 'Move from basics to the concepts professionals rely on every day.',
        timeline: 'Months 3–5',
        resources: [
          { title: 'Online courses on Coursera', url: 'https://www.coursera.org/' },
          { title: 'Courses on edX', url: 'https://www.edx.org/' },
        ],
        tasks: [
          'List the 5 core concepts you must master',
          'Complete an intermediate course or book',
          'Explain one hard concept in your own words',
        ],
      },
      {
        title: 'Build real projects',
        description: 'Apply what you know by making things you can show.',
        timeline: 'Months 5–8',
        resources: [
          { title: 'Project ideas and open source on GitHub', url: 'https://github.com/' },
          { title: 'Learn in public with freeCodeCamp', url: 'https://www.freecodecamp.org/' },
        ],
        tasks: [
          'Choose a small first project',
          'Ship the first version of it',
          'Ask someone for feedback and improve it',
          'Start a second, more ambitious project',
        ],
      },
      {
        title: 'Create a portfolio',
        description: 'Gather your best work in one place others can find and judge.',
        timeline: 'Months 8–9',
        resources: [{ title: 'Publish your work on GitHub Pages', url: 'https://pages.github.com/' }],
        tasks: [
          'Pick your 3 best pieces of work',
          'Write a short story for each: problem, approach, result',
          'Publish your portfolio online',
        ],
      },
      {
        title: 'Get real-world experience',
        description: 'Apply for internships, roles or clients and learn from the real thing.',
        timeline: 'Months 9–12',
        resources: [{ title: 'Search roles on LinkedIn Jobs', url: 'https://www.linkedin.com/jobs/' }],
        tasks: [
          'Prepare a one-page résumé or profile',
          'Apply to 10 opportunities',
          'Practice interviewing with a friend',
        ],
      },
      {
        title: 'Pursue advanced specialization',
        description: 'Choose a direction to go deep in and become known for it.',
        timeline: 'Year 2+',
        resources: [{ title: 'Find mentors and communities on Meetup', url: 'https://www.meetup.com/' }],
        tasks: [
          'Pick one area to specialize in',
          'Find a mentor or community in that area',
          'Set a 12-month growth goal',
        ],
      },
    ],
  };
}
