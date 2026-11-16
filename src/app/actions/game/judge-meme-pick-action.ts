'use server'

import { judgeMemePick, type MemeJudgment } from '@/lib/meme-judge'
import { createClient } from '@/utils/supabase/server'

const EMPTY_JUDGMENT: MemeJudgment = {
  verdict: 'close',
  comment: 'The judge could not read this meme. The pick still counts.',
}

export async function judgeMemePickAction(
  imageId: string,
  prompt: string
): Promise<MemeJudgment> {
  const cleanPrompt = prompt.trim().slice(0, 300)
  if (!imageId || !cleanPrompt) return EMPTY_JUDGMENT

  try {
    const supabase = await createClient()
    const { data: image, error: imageError } = await supabase
      .from('images')
      .select('image_description, additional_context, celebrity_recognition')
      .eq('id', imageId)
      .eq('is_common_use', true)
      .maybeSingle()

    if (imageError || !image) {
      console.error('Meme judge could not load the image:', imageError?.message)
      return EMPTY_JUDGMENT
    }

    const { data: captions, error: captionError } = await supabase
      .from('captions')
      .select('content')
      .eq('image_id', imageId)
      .eq('is_public', true)
      .limit(8)

    if (captionError) {
      console.error('Meme judge could not load captions:', captionError.message)
    }

    return judgeMemePick({
      prompt: cleanPrompt,
      description: image.image_description,
      context: image.additional_context,
      celebrity: image.celebrity_recognition,
      captions: (captions ?? []).map((caption) => caption.content),
    })
  } catch (error) {
    console.error('Meme judge failed:', error)
    return EMPTY_JUDGMENT
  }
}
