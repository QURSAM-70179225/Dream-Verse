// Text shown when the player interacts with something in the world. Everything is built from the
// user's own dream and roadmap (or generic copy when there is none), and is labeled as an
// imaginative simulation - never a prediction.

const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

function nextStep(roadmap) {
  const m = list(roadmap?.milestones).find((x) => (x.progress ?? 0) < 100);
  return m ? m.title : '';
}

const CREATE = { label: 'Create Your Future', to: '/create' };
const DASH = { label: 'Open your dashboard', to: '/dashboard' };

/**
 * ctx = { dream, roadmap } as returned by GET /api/progress (either may be null).
 * Returns { title, lines: string[], cta?: { label, to } }.
 */
export function describe(id, ctx = {}) {
  const dream = ctx.dream || null;
  const roadmap = ctx.roadmap || null;
  const career = dream?.career;
  const city = dream?.city;
  const skills = list(dream?.skills);
  const goals = list(dream?.goalItems).map((g) => (typeof g === 'string' ? g : g.title));
  const step = nextStep(roadmap);
  const noDream = !dream;

  switch (id) {
    case 'apt-desk':
      return {
        title: 'Your dream desk',
        lines: noDream
          ? ['This desk is waiting for your story. Tell DreamVerse about your dream career and it will appear here.']
          : [
              career ? `You are working toward: ${career}.` : 'Your dream career is not set yet.',
              skills.length ? `Skills on your list: ${skills.slice(0, 5).join(', ')}.` : '',
              step ? `Next roadmap step: ${step}.` : '',
            ].filter(Boolean),
        cta: noDream ? CREATE : DASH,
      };
    case 'apt-bed':
      return {
        title: 'Rest is part of the plan',
        lines: [
          dream?.lifestyle ? `The lifestyle you described: ${dream.lifestyle}.` : 'Good sleep and steady habits beat all-night sprints.',
          'Small, regular steps toward a goal usually go further than occasional big pushes.',
        ],
      };
    case 'apt-shelf':
      return {
        title: 'Learning shelf',
        lines: skills.length
          ? [`Books you would stock: ${skills.slice(0, 6).join(', ')}.`, 'Pick one skill and give it twenty minutes today.']
          : ['Add the skills you want to master when you create your dream and they will line this shelf.'],
        cta: skills.length ? undefined : CREATE,
      };
    case 'apt-window':
      return {
        title: city ? `A view of ${city}` : 'A view of your city',
        lines: [
          city
            ? `Beyond the glass is a skyline imagined for ${city}.`
            : 'Tell DreamVerse where you want to live and the skyline here will reflect it.',
          'This is an imaginative simulation, not a prediction of your real future.',
        ],
        cta: city ? undefined : CREATE,
      };
    case 'apt-tv':
      return {
        title: 'Vision board',
        lines: goals.length
          ? ['Goals on your board:', ...goals.slice(0, 5).map((g) => `• ${g}`)]
          : ['Your personal goals will show up here once you add them.'],
        cta: goals.length ? undefined : CREATE,
      };

    case 'off-board': {
      const ms = list(roadmap?.milestones);
      return {
        title: 'Roadmap board',
        lines: ms.length
          ? [
              ...ms.slice(0, 6).map((m) => `${m.title} - ${m.progress ?? 0}%`),
              `Overall: ${roadmap.overall ?? 0}%.`,
            ]
          : ['The board is empty because you have no roadmap yet. Create a dream and it fills in.'],
        cta: ms.length ? DASH : CREATE,
      };
    }
    case 'off-desk':
      return {
        title: 'Your workstation',
        lines: noDream
          ? ['A clean desk, ready for a purpose. Create your dream to give it one.']
          : [career ? `Dream role: ${career}.` : 'Dream role: not set yet.', step ? `Today's focus could be: ${step}.` : 'Every roadmap step is complete. Time to dream bigger?'],
        cta: noDream ? CREATE : DASH,
      };
    case 'off-meeting':
      return {
        title: 'Decision room',
        lines: [
          'This is where big choices will be weighed: take the job or start the venture, move or stay.',
          'The life decision simulator lets you choose between two paths and read one imagined way each could unfold.',
        ],
        cta: { label: 'Open the decision simulator', to: '/decisions' },
      };
    case 'off-coffee':
      return {
        title: 'Coffee machine',
        lines: ['Take five. Stepping away often makes the next hour of work better.'],
      };
    case 'off-rack':
      return {
        title: 'Server rack',
        lines: [
          'Nova, your AI mentor, runs on machines like this one.',
          'Ask Nova for your next step or a plan for the week. If no AI model is connected on the server, Nova answers in clearly labeled demo mode.',
        ],
        cta: { label: 'Chat with Nova', to: '/nova' },
      };

    case 'cafe-counter': {
      const wantsCafe = goals.some((g) => /caf[eé]/i.test(g)) || /caf[eé]/i.test(dream?.story || '');
      return {
        title: wantsCafe ? 'Your dream café' : 'Order at the counter',
        lines: wantsCafe
          ? ['You said you would like to open a café. Imagine the menu, the regulars, the morning rush.', 'A good first step: write down five things your café would be known for.']
          : ['A flat white and a quiet table. Good ideas often arrive somewhere that is not your desk.'],
      };
    }
    case 'cafe-table':
      return {
        title: 'Planning table',
        lines: [
          step ? `Pick one small action for "${step}" and do it this week.` : 'Pick one small action for this week and write it down.',
          dream?.lifestyle ? `Keep your lifestyle goal in mind: ${dream.lifestyle}.` : '',
        ].filter(Boolean),
        cta: noDream ? CREATE : DASH,
      };
    case 'cafe-window':
      return {
        title: 'Street view',
        lines: [city ? `People hurry past in ${city}. You are exactly where you want to be, in this simulation.` : 'People hurry past outside. Tell DreamVerse where your dream city is.'],
        cta: city ? undefined : CREATE,
      };

    case 'park-pond':
      return {
        title: 'Sunset pond',
        lines: [
          dream?.lifestyle ? `Your lifestyle goal: ${dream.lifestyle}.` : 'Balance matters. Plan time for rest as seriously as time for work.',
          'Still water is a good place to think about what you actually want.',
        ],
      };
    case 'park-bench':
      return {
        title: 'Park bench',
        lines: ['Sit for a minute. No goals here, just a view.', 'Imagined futures are easier to reach when the present feels calm.'],
      };
    default:
      return { title: 'Nothing here', lines: ['There is nothing to see here yet.'] };
  }
}

/** Short label for the HUD when the city is shown: the user's own city if they gave one. */
export function cityLabel(dream) {
  const city = dream?.city?.split(',')[0]?.trim();
  return city || 'Neon City';
}
