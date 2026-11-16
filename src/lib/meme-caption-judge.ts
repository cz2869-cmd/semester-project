import type { MemeJudgment } from "@/lib/meme-judge";

/**
 * Roast-style AI judge for player-written captions (caption battle rounds).
 */
export function judgeCaption(caption: string): MemeJudgment {
  const trimmed = caption.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const lower = trimmed.toLowerCase();
  const seed = trimmed.toLowerCase();

  if (!trimmed) {
    return {
      verdict: "miss",
      comment:
        "yeah no. 1/10 you submitted the sound of silence. the meme is confused and so am i!!",
    };
  }

  if (words.length <= 3) {
    return {
      verdict: "close",
      comment: pick(seed, [
        `okay wait. 6/10 "${trimQuote(trimmed)}" is short and unhinged. almost ate!!`,
        `hmm. 5/10 economy of words. the punchline is on thin ice!!`,
        `HELLO?? 7/10 short captions only work if they slap. this one kinda did!!`,
      ]),
    };
  }

  if (/(me when|pov|nobody|literally|my face when)/i.test(lower)) {
    return {
      verdict: "good",
      comment: pick(seed, [
        `WOW!! 9/10 classic meme dialect. "${trimQuote(trimmed)}" showed up and ATE!!`,
        `WAIT. 8/10 the caption understood the assignment. no crumbs left!!`,
        `HELLO?? 9/10 you said the vibe out loud and the room felt it!!`,
      ]),
    };
  }

  if (words.length >= 20) {
    return {
      verdict: "close",
      comment: pick(seed, [
        `okay wait. 5/10 that is a novella not a caption. cute try!!`,
        `hmm. 4/10 the punchline got lost in the essay. almost!!`,
      ]),
    };
  }

  return {
    verdict: "good",
    comment: pick(seed, [
      `WOW!! 8/10 "${trimQuote(trimmed)}" has range. i am screaming!!`,
      `WAIT. 7/10 the bots are taking notes. iconic-adjacent!!`,
      `HELLO?? 8/10 certified chaos. the image survived. your dignity is pending!!`,
    ]),
  };
}

function trimQuote(text: string, max = 42): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function pick(seed: string, lines: string[]): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 1000003;
  }
  return lines[hash % lines.length];
}

export function scoreFromVerdict(
  verdict: MemeJudgment["verdict"],
  seed: string
): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 1000003;
  }
  if (verdict === "good") return 8 + (hash % 3);
  if (verdict === "close") return 5 + (hash % 3);
  return 1 + (hash % 4);
}
