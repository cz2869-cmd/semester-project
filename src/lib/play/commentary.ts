/**
 * Roast-style AI commentary for the player's caption.
 * Kept local so Play works without the external caption API.
 */
export function generateAiCommentary(caption: string): string {
  const trimmed = caption.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return (
      "Bold strategy submitting radio silence. The bots are confused, " +
      "the crowd is whispering, and I am writing this with a straight face."
    );
  }

  if (words.length <= 3) {
    const shortTakes = [
      `"${trimmed}" — minimalist. Like your sleep schedule, but somehow funnier.`,
      `Short, sharp, slightly unhinged. The AI judges approve… reluctantly.`,
      `Economy of words. Maximal commitment to the bit. Respect.`,
    ];
    return pick(shortTakes);
  }

  if (words.length >= 18) {
    const longTakes = [
      `That's not a caption, that's a novella. The image filed a restraining order.`,
      `You wrote a whole TED Talk. Somewhere a meme template just clocked out early.`,
      `Ambitious word count. The punchline is in there somewhere — I can feel it.`,
    ];
    return pick(longTakes);
  }

  if (/(me when|nobody|pov|literally|bro|lmao|lol)/i.test(lower)) {
    return (
      `Classic meme dialect detected. "${trimForQuote(trimmed)}" walks so "this you?" can run.`
    );
  }

  if (/\?$/.test(trimmed)) {
    return (
      `Ending on a question? Dangerous. Now everyone has to pretend they get the bit.`
    );
  }

  const general = [
    `Judge notes: "${trimForQuote(trimmed)}" has range. Not Olympic range, but solid intramural.`,
    `The bots are taking notes. One of them just muttered "okay, that's kinda good."`,
    `I'd clap, but I'm an AI and also slightly jealous of that line.`,
    `Certified mid-to-elite chaos. The image survived. Your dignity is… pending.`,
    `If laughter were currency, this would cover snacks. Maybe even a drink.`,
  ];
  return pick(general);
}

function trimForQuote(text: string, max = 48): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function pick(options: string[]): string {
  return options[Math.floor(Math.random() * options.length)];
}
