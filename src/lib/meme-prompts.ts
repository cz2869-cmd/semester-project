const clauses = [
  'the group project doc is still blank on the night it is due',
  'the professor says the quiz is today',
  'someone asks what I did this weekend',
  'the Wi-Fi drops in the middle of an upload',
  'I realize I replied all',
  'nobody laughs at the joke',
  'I open the gradebook at 2 a.m.',
  'I walk into the wrong classroom',
  'my laptop hits 2 percent during a presentation',
  'I get left on read',
  'the alarm goes off and I hit snooze anyway',
  'I see the total at checkout',
  'I volunteer and regret it immediately',
  'the slideshow refuses to load',
  'I forget someone\'s name mid-sentence',
  'the group decides to start the assignment at midnight',
  'I pretend I understood the lecture',
  'someone brings up last weekend',
  'I check my bank account after a night out',
  'the professor makes direct eye contact',
  'I hear that this will be on the exam',
  'the plan changes five minutes before we leave',
  'I try to explain the meme out loud',
  'my phone buzzes in a quiet room',
  'the group chat names me specifically',
  'I answer "you too" to "enjoy your meal"',
  'the fit check gets zero replies',
  'I recognize the reading I did not do',
]

const frames: Array<(clause: string) => string> = [
  (clause) => `When ${clause}`,
  (clause) => `My face when ${clause}`,
  (clause) => `Trying to keep a straight face when ${clause}`,
  (clause) => `The group chat right after ${clause}`,
  (clause) => `How I react when ${clause}`,
]

export const MEME_PROMPT_COUNT = frames.length * clauses.length

export const ROUND_SECONDS = 30

function promptAt(index: number) {
  const frame = frames[Math.floor(index / clauses.length)]
  const clause = clauses[index % clauses.length]
  return frame(clause)
}

export function generateMemePrompt(
  previous?: string,
  random: () => number = Math.random
): string {
  if (MEME_PROMPT_COUNT === 0) {
    return 'When the plan changes at the last minute'
  }

  const roll = Math.min(Math.max(random(), 0), 0.999999)
  let index = Math.floor(roll * MEME_PROMPT_COUNT)

  if (previous && MEME_PROMPT_COUNT > 1 && promptAt(index) === previous) {
    const step = 1 + Math.floor(Math.min(Math.max(random(), 0), 0.999999) * (MEME_PROMPT_COUNT - 1))
    index = (index + step) % MEME_PROMPT_COUNT
  }

  return promptAt(index)
}
