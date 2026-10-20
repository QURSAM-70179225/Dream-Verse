// Built-in outcome used when no AI is configured. It is deliberately generic and the app labels it
// as a template, never as a personalized prediction.

export function templateOutcome({ scenario, choiceKey, nextTask }) {
  const chosen = choiceKey === 'A' ? scenario.optionA : scenario.optionB;
  const other = choiceKey === 'A' ? scenario.optionB : scenario.optionA;
  return {
    headline: 'One possible path',
    story: `You chose "${chosen}". This path could bring new experiences and faster learning in that direction, while you give up some of what "${other}" would have offered. Nothing here is certain: it is one imagined way things might go.`,
    upside: 'Committing to one direction can make progress feel clearer and build momentum.',
    challenge: 'Every choice has trade-offs and uncertainty, so keep a way to adjust if things change.',
    nextStep: nextTask || 'Write down one small action you can take this week toward this choice.',
    source: 'template',
  };
}
