import type { PlayPlayer } from "@/lib/play/types";

export const BOT_PLAYERS: PlayPlayer[] = [
  { id: "bot-pixel", name: "PixelPunch", isBot: true, avatarHue: 42 },
  { id: "bot-roast", name: "RoastMaster", isBot: true, avatarHue: 12 },
  { id: "bot-cap", name: "Captrix", isBot: true, avatarHue: 200 },
  { id: "bot-meme", name: "MemeBot9000", isBot: true, avatarHue: 280 },
];

const BOT_CAPTIONS = [
  "Me pretending I understood the assignment",
  "When the group chat goes quiet after your joke",
  "This is my villain origin story, but make it unpaid internship",
  "My brain at 3am vs my brain during the midterm",
  "Sir, this is a Wendy's, but spiritually",
  "The face you make when Outlook says 'reply all'",
  "Main character energy on a side-quest budget",
  "If confidence was a crime, I'd still get community service",
  "Plot twist: the real meme was the friends we left on read",
  "Currently buffering... please hold for emotional damage",
  "I came. I saw. I overthought it.",
  "This image has the same vibe as my GPA: unexplained",
  "Living proof that sleep is a social construct",
  "Not me romanticizing a Monday like it's a rom-com",
  "The audacity was free and I took extras",
  "My last two brain cells fighting for custody",
  "Casually surviving with Excel and denial",
  "When someone says 'quick question' and it's a thesis",
  "I fear no man, but that email subject line...",
  "Certified professional at looking busy",
  "Emotionally unavailable, but available for snacks",
  "This is fine. Everything is fine. Send help.",
  "Built different. Mostly out of stress and iced coffee.",
  "My motivation left and took the charger",
];

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = items[i];
    items[i] = items[j];
    items[j] = temp;
  }
  return items;
}

/** Pick unique captions for each bot in a round. */
export function generateBotCaptions(botCount = BOT_PLAYERS.length): string[] {
  const pool = shuffleInPlace([...BOT_CAPTIONS]);
  return pool.slice(0, Math.min(botCount, pool.length));
}

/** Stagger when bots "finish" writing during the 30s window. */
export function botFinishDelaysMs(botCount: number, roundMs: number): number[] {
  const earliest = Math.floor(roundMs * 0.35);
  const latest = Math.floor(roundMs * 0.92);
  return Array.from({ length: botCount }, () => {
    return earliest + Math.floor(Math.random() * (latest - earliest));
  }).sort((a, b) => a - b);
}
