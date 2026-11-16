export type MemeVerdict = 'good' | 'close' | 'miss'

export type MemeJudgment = {
  verdict: MemeVerdict
  comment: string
}

const THEME_LABELS: Record<string, string> = {
  school: 'school',
  money: 'money',
  phone: 'texting',
  awkward: 'being awkward',
  tired: 'being tired',
  food: 'food',
  social: 'hanging out',
  tech: 'tech failing',
  reaction: 'a reaction face',
  animal: 'a pet',
  fight: 'a fight',
}

const PROMPT_THEME_RULES: Array<{ match: string; themes: string[] }> = [
  { match: 'group project', themes: ['school'] },
  { match: 'quiz', themes: ['school'] },
  { match: 'this weekend', themes: ['social'] },
  { match: 'wi-fi', themes: ['tech'] },
  { match: 'replied all', themes: ['phone', 'awkward'] },
  { match: 'laughs at the joke', themes: ['awkward'] },
  { match: 'gradebook', themes: ['school', 'tired'] },
  { match: 'classroom', themes: ['school', 'awkward'] },
  { match: 'laptop', themes: ['tech'] },
  { match: 'left on read', themes: ['phone'] },
  { match: 'snooze', themes: ['tired'] },
  { match: 'checkout', themes: ['money'] },
  { match: 'volunteer', themes: ['awkward'] },
  { match: 'slideshow', themes: ['tech'] },
  { match: 'name mid-sentence', themes: ['awkward'] },
  { match: 'assignment at midnight', themes: ['school', 'tired'] },
  { match: 'lecture', themes: ['school'] },
  { match: 'last weekend', themes: ['social'] },
  { match: 'bank account', themes: ['money'] },
  { match: 'eye contact', themes: ['awkward', 'school'] },
  { match: 'on the exam', themes: ['school'] },
  { match: 'plan changes', themes: ['social'] },
  { match: 'explain the meme', themes: ['awkward'] },
  { match: 'phone buzzes', themes: ['phone'] },
  { match: 'group chat names', themes: ['social', 'phone'] },
  { match: 'enjoy your meal', themes: ['food', 'awkward'] },
  { match: 'fit check', themes: ['social', 'phone'] },
  { match: 'reading i did not', themes: ['school'] },
]

const IMAGE_THEME_WORDS: Record<string, string[]> = {
  school: ['student', 'teacher', 'professor', 'classroom', 'homework', 'grade', 'grades', 'exam', 'lecture', 'studying', 'notebook', 'textbook'],
  money: ['money', 'cash', 'wallet', 'bank', 'receipt', 'checkout', 'price', 'dollar', 'broke', 'atm'],
  phone: ['phone', 'smartphone', 'texting', 'cellphone', 'notification'],
  awkward: ['awkward', 'cringe', 'embarrassed', 'uncomfortable', 'nervous'],
  tired: ['sleep', 'sleeping', 'yawn', 'tired', 'exhausted', 'snooze', 'pillow', 'night'],
  food: ['food', 'pizza', 'meal', 'eating', 'restaurant', 'snack', 'burger', 'coffee', 'dinner'],
  social: ['party', 'friends', 'crowd', 'dancing', 'club'],
  tech: ['laptop', 'computer', 'wifi', 'keyboard', 'glitch', 'slideshow'],
  reaction: ['shock', 'shocked', 'surprised', 'surprise', 'staring', 'stare', 'gasp', 'crying', 'tears', 'laughing', 'smile', 'frown', 'expression'],
  animal: ['dog', 'cat', 'puppy', 'kitten', 'pet', 'retriever', 'animal'],
  fight: ['fight', 'fighting', 'confrontation', 'battle', 'punch', 'angry', 'sword', 'attack'],
}

function hasWord(text: string, word: string) {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
}

function themesInText(text: string, table: Record<string, string[]>) {
  const found = new Set<string>()
  for (const [theme, words] of Object.entries(table)) {
    if (words.some((word) => hasWord(text, word))) found.add(theme)
  }
  return found
}

function themesForPrompt(prompt: string) {
  const normalized = prompt.toLowerCase()
  const found = new Set<string>()
  for (const rule of PROMPT_THEME_RULES) {
    if (normalized.includes(rule.match)) {
      for (const theme of rule.themes) found.add(theme)
    }
  }
  if (/my face when|how i react|straight face/i.test(prompt)) found.add('reaction')
  return found
}

function collectReadableText(value: unknown, pieces: string[]) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        collectReadableText(JSON.parse(trimmed), pieces)
        return
      } catch {
        pieces.push(trimmed)
        return
      }
    }
    pieces.push(trimmed)
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) collectReadableText(item, pieces)
    return
  }

  if (!value || typeof value !== 'object') return

  const record = value as Record<string, unknown>
  for (const key of ['name', 'description', 'caption', 'text', 'summary', 'content', 'label']) {
    if (key in record) collectReadableText(record[key], pieces)
  }
}

function readableText(value: string | null | undefined) {
  const pieces: string[] = []
  collectReadableText(value, pieces)
  return pieces
    .map((piece) => piece.replace(/\s+/g, ' ').trim())
    .filter((piece) => piece.length > 2 && !piece.includes('{'))
    .join('. ')
}

function firstDetail(parts: Array<string | null | undefined>) {
  const text = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  const sentence = text.match(/^.{12,150}?[.!?]/)?.[0] ?? text.slice(0, 140)
  const cleaned = sentence
    .replace(/[.!?]+$/, '')
    .replace(/^(in this image,?\s+|the image features\s+|this image features\s+)/i, '')
    .trim()
  if (!cleaned) return ''
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function variant(seed: string, count: number) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index) * (index + 1)) % 1000003
  }
  return hash % count
}

function themeLabel(theme: string) {
  return THEME_LABELS[theme] ?? theme
}

function writeComment(
  verdict: MemeVerdict,
  score: number,
  promptTheme: string,
  imageTheme: string | null,
  seed: string
) {
  const rating = `${score}/10`
  const wanted = themeLabel(promptTheme)
  const pictured = imageTheme ? themeLabel(imageTheme) : 'something random'

  if (verdict === 'good') {
    const lines = [
      `WOW!! ${rating} this pic showed up to a ${wanted} prompt and ATE. i'm screaming!!`,
      `WAIT. ${rating} the ${wanted} assignment has been understood. no crumbs left!!`,
      `HELLO?? ${rating} you said ${wanted} and the pic said bet. iconic!!`,
    ]
    return lines[variant(seed, lines.length)]
  }

  if (verdict === 'close') {
    const lines = [
      `hmm. ${rating} the face is working overtime but the ${wanted} called out. cute try!!`,
      `okay wait. ${rating} i KINDA see the reaction. the ${wanted} part is on thin ice!!`,
      `not gonna lie ${rating} the vibe clocked in and the ${wanted} did not. almost!!`,
    ]
    return lines[variant(seed, lines.length)]
  }

  const lines = imageTheme
    ? [
        `yeah no. ${rating} the prompt is about ${wanted} and this pic is giving ${pictured}. i do NOT see the vision`,
        `i'm actually disappointed lol. ${rating} ${wanted} called and this ${pictured} pic did not pick up!!`,
        `bestie. ${rating} you cannot answer ${wanted} with ${pictured}. the vision left the chat!!`,
      ]
    : [
        `yeah no. ${rating} the prompt is about ${wanted} and this pic is not even in the group chat. i do NOT see the vision`,
        `i'm actually disappointed lol. ${rating} ${wanted} was the assignment and this pic skipped class!!`,
        `bestie. ${rating} ${wanted} asked a question and this pic answered with silence. the vision left!!`,
      ]
  return lines[variant(seed, lines.length)]
}

export function judgeMemePick(input: {
  prompt: string
  description?: string | null
  context?: string | null
  celebrity?: string | null
  captions?: Array<string | null>
}): MemeJudgment {
  const promptText = input.prompt.trim()
  const description = readableText(input.description)
  const context = readableText(input.context)
  const celebrity = readableText(input.celebrity)
  const captions = (input.captions ?? [])
    .map((caption) => readableText(caption))
    .filter(Boolean)
  const imageText = [description, context, celebrity, ...captions].filter(Boolean).join(' ')
  const detail = firstDetail([imageText])

  if (!detail) {
    return {
      verdict: 'close',
      comment: 'wait what. 4/10 i cannot even clock this meme. i do NOT see the vision',
    }
  }

  const promptThemes = themesForPrompt(promptText)
  const imageThemes = themesInText(imageText, IMAGE_THEME_WORDS)
  const shared = [...promptThemes].filter((theme) => imageThemes.has(theme))
  const specificShared = shared.filter((theme) => theme !== 'reaction')
  const promptTheme = [...promptThemes].find((theme) => theme !== 'reaction') ?? 'reaction'
  const imageTheme = [...imageThemes].find((theme) => theme !== 'reaction')
    ?? (imageThemes.has('reaction') ? 'reaction' : null)

  const verdict: MemeVerdict = specificShared.length > 0
    ? 'good'
    : shared.includes('reaction')
      ? 'close'
      : 'miss'
  const seed = `${promptText}|${imageText}|${verdict}`
  const score = verdict === 'good'
    ? 8 + variant(seed, 3)
    : verdict === 'close'
      ? 5 + variant(`${seed}|close`, 3)
      : 1 + variant(`${seed}|miss`, 4)

  return {
    verdict,
    comment: writeComment(verdict, score, promptTheme, imageTheme, seed),
  }
}
