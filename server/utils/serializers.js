const idOf = (doc) => doc._id.toString();

export const statusFromProgress = (progress) =>
  progress >= 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started';

export function dreamOut(d) {
  return {
    id: idOf(d),
    career: d.career,
    city: d.city,
    home: d.home,
    lifestyle: d.lifestyle,
    skills: d.skills,
    goals: d.goals,
    story: d.story,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function profileOut(p) {
  if (!p) return null;
  return {
    id: idOf(p),
    career: p.career,
    cityTheme: p.cityTheme,
    roomTheme: p.roomTheme,
    lifestyle: p.lifestyle,
    summary: p.summary,
    source: p.source,
    disclaimer: p.disclaimer,
    scenarios: (p.scenarios || []).map((s) => ({
      id: idOf(s),
      title: s.title,
      optionA: s.optionA,
      optionB: s.optionB,
    })),
  };
}

export function milestoneOut(m) {
  return {
    id: idOf(m),
    order: m.order,
    title: m.title,
    description: m.description,
    timeline: m.timeline,
    resources: (m.resources || []).map((r) => ({ title: r.title, url: r.url })),
    tasks: (m.tasks || []).map((t) => ({ id: idOf(t), title: t.title, done: t.done })),
    progress: m.progress,
    status: statusFromProgress(m.progress),
  };
}

export function roadmapOut(roadmap, milestones) {
  if (!roadmap) return null;
  const overall = milestones.length
    ? Math.round(milestones.reduce((s, m) => s + m.progress, 0) / milestones.length)
    : 0;
  return {
    id: idOf(roadmap),
    title: roadmap.title,
    source: roadmap.source,
    overall,
    milestones: milestones.map(milestoneOut),
  };
}

export function messageOut(m) {
  return { role: m.role, content: m.content, mode: m.mode || 'live', at: m.at };
}

export function decisionOut(d) {
  return {
    id: idOf(d),
    scenarioTitle: d.scenarioTitle,
    optionA: d.optionA,
    optionB: d.optionB,
    choiceKey: d.choiceKey,
    choice: d.choice,
    outcome: {
      headline: d.outcome?.headline || '',
      story: d.outcome?.story || d.narrative || '',
      upside: d.outcome?.upside || '',
      challenge: d.outcome?.challenge || '',
      nextStep: d.outcome?.nextStep || '',
    },
    source: d.source,
    xpAwarded: d.xpAwarded,
    createdAt: d.createdAt,
  };
}
