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

const RATING_CATEGORY = 'meme-roast-rating'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function missingRatingsTable(error: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || (error?.message ?? '').includes('schema cache')
}

async function seedProfileId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('humor_themes')
    .select('created_by_user_id')
    .limit(1)
    .maybeSingle()
  return data?.created_by_user_id ?? null
}

async function newsSnippetCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roast: string
): Promise<RoastRatingCounts> {
  const counts = emptyRoastCounts()
  const { data } = await supabase
    .from('news_snippets')
    .select('headline, source_url')
    .eq('category', RATING_CATEGORY)

  for (const row of data ?? []) {
    if (!row.source_url || !isRoastReaction(row.headline)) continue
    try {
      const payload = JSON.parse(row.source_url) as { roast?: string }
      if (payload.roast === roast) counts[row.headline] += 1
    } catch {
      continue
    }
  }
  return counts
}

async function saveRatingInNewsSnippets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    clientRatingId: string
    imageId: string
    prompt: string
    roast: string
    verdict: string
    reaction: RoastReaction
    profileId: string | null
  }
): Promise<RoastRatingResult> {
  const actorId = input.profileId ?? await seedProfileId(supabase)
  if (!actorId) {
    return { ...EMPTY_RESULT, reaction: input.reaction }
  }

  const sourceUrl = JSON.stringify({
    clientRatingId: input.clientRatingId,
    imageId: input.imageId,
    prompt: input.prompt,
    roast: input.roast,
    verdict: input.verdict,
    reaction: input.reaction,
    raterId: input.profileId,
  })
  const existing = await supabase
    .from('news_snippets')
    .select('id')
    .eq('category', RATING_CATEGORY)
    .ilike('source_url', `%${input.clientRatingId}%`)
    .limit(1)
    .maybeSingle()

  if (existing.error) {
    console.error('Could not look up roast rating:', existing.error.message)
    return { ...EMPTY_RESULT, reaction: input.reaction }
  }

  if (existing.data) {
    const { error } = await supabase
      .from('news_snippets')
      .update({
        headline: input.reaction,
        source_url: sourceUrl,
        is_active: false,
        modified_by_user_id: actorId,
      })
      .eq('id', existing.data.id)
      .eq('category', RATING_CATEGORY)
    if (error) {
      console.error('Could not update roast rating:', error.message)
      return { ...EMPTY_RESULT, reaction: input.reaction }
    }
  } else {
    let { error } = await supabase.from('news_snippets').insert({
      category: RATING_CATEGORY,
      headline: input.reaction,
      source_url: sourceUrl,
      is_active: false,
      created_by_user_id: actorId,
      modified_by_user_id: actorId,
    })
    if (error && input.profileId) {
      const seedId = await seedProfileId(supabase)
      if (seedId && seedId !== actorId) {
        const retry = await supabase.from('news_snippets').insert({
          category: RATING_CATEGORY,
          headline: input.reaction,
          source_url: sourceUrl,
          is_active: false,
          created_by_user_id: seedId,
          modified_by_user_id: seedId,
        })
        error = retry.error
      }
    }
    if (error) {
      console.error('Could not insert roast rating:', error.message)
      return { ...EMPTY_RESULT, reaction: input.reaction }
    }
  }

  return {
    ok: true,
    reaction: input.reaction,
    counts: await newsSnippetCounts(supabase, input.roast),
    message: null,
  }
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

    if (missingRatingsTable(error)) {
      return saveRatingInNewsSnippets(supabase, {
        clientRatingId,
        imageId,
        prompt,
        roast,
        verdict: judgment.verdict,
        reaction: input.reaction,
        profileId,
      })
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
