import type { Metadata } from 'next'

import { MemeGame } from '@/components/meme-game'

export const metadata: Metadata = {
  title: 'What Do You Meme',
  description: 'Match a random prompt to a meme before the 30 second timer runs out.',
}

export default function PlayPage() {
  return <MemeGame />
}
