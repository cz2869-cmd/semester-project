export const ROAST_REACTIONS = [
  { id: 'so_funny', label: 'So Funny' },
  { id: 'boring', label: 'Boring' },
  { id: 'offended', label: 'Offended' },
] as const

export type RoastReaction = (typeof ROAST_REACTIONS)[number]['id']

export type RoastRatingCounts = Record<RoastReaction, number>

export function emptyRoastCounts(): RoastRatingCounts {
  return { so_funny: 0, boring: 0, offended: 0 }
}

export function isRoastReaction(value: string): value is RoastReaction {
  return ROAST_REACTIONS.some((reaction) => reaction.id === value)
}
