'use server'

import { judgeMemePickAction } from '@/app/actions/game/judge-meme-pick-action'
import {
  emptyRoastCounts,
  isRoastReaction,
  type RoastRatingCounts,
  type RoastReaction,
} from '@/lib/meme-roast-ratings'
import { createClient } from '@/utils/supabase/server'

export type RoastRatingResult = {
  ok: boolean
  reaction: RoastReaction | null
  counts: RoastRatingCounts
  message: string | null
}

const EMPTY_RESULT: RoastRatingResult = {
  ok: false,
  reaction: null,
  counts: emptyRoastCounts(),
  message: 'That rating could not be saved.',
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function reactionCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roast: string
): Promise<RoastRatingCounts> {
  const counts = emptyRoastCounts()
  await Promise.all(
    (Object.keys(counts) as RoastReaction[]).map(async (reaction) => {
      const { count } = await supabase
        .from('meme_roast_ratings')
        .select('id', { count: 'exact', head: true })
        .eq('roast', roast)
        .eq('reaction', reaction)
      counts[reaction] = count ?? 0
    })
  )
  return counts
}

export async function rateMemeRoastAction(input: {
  clientRatingId: string
  imageId: string
  prompt: string
  reaction: string
}): Promise<RoastRatingResult> {
  const clientRatingId = input.clientRatingId.trim()
  const imageId = input.imageId.trim()
  const prompt = input.prompt.trim().slice(0, 300)
  if (!isUuid(clientRatingId) || !isUuid(imageId) || !prompt || !isRoastReaction(input.reaction)) {
    return EMPTY_RESULT
  }

  try {
    const judgment = await judgeMemePickAction(imageId, prompt)
    const roast = judgment.comment.slice(0, 500)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const profileId = user && !user.is_anonymous ? user.id : null

    const row = {
      client_rating_id: clientRatingId,
      image_id: imageId,
      prompt,
      roast,
      verdict: judgment.verdict,
      reaction: input.reaction,
      profile_id: profileId,
    }

    let { error } = await supabase
      .from('meme_roast_ratings')
      .upsert(row, { onConflict: 'client_rating_id' })

    if (error && profileId && /profiles|foreign key/i.test(error.message)) {
      const retry = await supabase
        .from('meme_roast_ratings')
        .upsert({ ...row, profile_id: null }, { onConflict: 'client_rating_id' })
      error = retry.error
    }

    if (error) {
      console.error('Could not save roast rating:', error.message)
      return {
        ...EMPTY_RESULT,
        reaction: input.reaction,
        message: 'The rating could not be saved.',
      }
    }

    return {
      ok: true,
      reaction: input.reaction,
      counts: await reactionCounts(supabase, roast),
      message: null,
    }
  } catch (error) {
    console.error('Roast rating failed:', error)
    return EMPTY_RESULT
  }
}
