// A small, deterministic safety net that runs BEFORE any model is called, in every mode.
// If a message suggests the user may be thinking about harming themselves, Nova answers with a
// fixed, caring message instead of improvising.

const CRISIS_PATTERNS = [
  /\bsuicid/i,
  /\bkill(ing)? myself\b/i,
  /\bend(ing)? (my|it all|my own) life\b/i,
  /\bend it all\b/i,
  /\bwant(ed)? to die\b/i,
  /\bdon'?t want to (live|be alive|exist)\b/i,
  /\bno reason to (live|go on)\b/i,
  /\b(hurt|harm|cut)(ting)? myself\b/i,
  /\bself[- ]?harm/i,
];

export const detectCrisis = (text) => CRISIS_PATTERNS.some((re) => re.test(String(text ?? '')));

export const CRISIS_REPLY = `I'm really sorry you're carrying something this heavy. You deserve support from a real person right now, more than a planning app can give.

If you might act on these thoughts, or you are in immediate danger, please contact your local emergency number now. Many countries also have free, confidential crisis lines, and findahelpline.com can help you find one near you.

If you can, tell someone you trust how you are feeling today, even with just one sentence. I'm still here to talk, and your goals and dreams can wait until you feel safer.`;
