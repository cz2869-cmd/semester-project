'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { judgeMemePickAction } from '@/app/actions/game/judge-meme-pick-action'
import { fetchCommonUseImagesAction } from '@/app/actions/images'
import { Button } from '@/components/ui/button'
import { generateMemePrompt, ROUND_SECONDS } from '@/lib/meme-prompts'
import { cn } from '@/lib/utils'

type Meme = {
  id: string
  url: string
}

type Phase = 'ready' | 'loading' | 'playing' | 'locked' | 'missed'

const MEMES_PER_ROUND = 36

function shuffleMemes(memes: Meme[]) {
  const copy = [...memes]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = current
  }
  return copy
}

async function loadRoundMemes(): Promise<Meme[]> {
  const firstPage = await fetchCommonUseImagesAction(undefined, '', 1, MEMES_PER_ROUND)
  const pageCount = Math.max(1, Math.ceil(firstPage.totalCount / MEMES_PER_ROUND))
  const page = pageCount === 1 ? 1 : 1 + Math.floor(Math.random() * pageCount)
  let round = firstPage
  if (page !== 1) {
    try {
      round = await fetchCommonUseImagesAction(undefined, '', page, MEMES_PER_ROUND)
    } catch (error) {
      console.error('Failed to load a later meme page, using the first page:', error)
    }
  }

  const memes = round.images
    .filter((image): image is Meme => Boolean(image.id && image.url))
    .map((image) => ({ id: image.id, url: image.url }))

  return shuffleMemes(memes)
}

function MemeChoice({
  meme,
  selected,
  disabled,
  onSelect,
}: {
  meme: Meme
  selected: boolean
  disabled: boolean
  onSelect: (meme: Meme) => void
}) {
  const [failed, setFailed] = useState(false)

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={() => onSelect(meme)}
      className={cn(
        'relative aspect-[4/3] overflow-hidden rounded-2xl border-2 bg-muted text-left transition-transform',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-primary scale-[1.02]'
          : 'border-border hover:border-primary/60'
      )}
    >
      {failed ? (
        <span className="flex h-full items-center justify-center px-3 text-center text-xs text-muted-foreground">
          This meme could not load
        </span>
      ) : (
        <img
          src={meme.url}
          alt="Meme choice"
          className="h-full w-full object-contain p-2"
          onError={() => setFailed(true)}
        />
      )}
      <span
        className={cn(
          'absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[11px] font-medium',
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-background/90 text-foreground'
        )}
      >
        {selected ? 'Picked' : 'Pick'}
      </span>
    </button>
  )
}

export function MemeGame() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [prompt, setPrompt] = useState('')
  const [memes, setMemes] = useState<Meme[]>([])
  const [selected, setSelected] = useState<Meme | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS)
  const [secondsLeftAtEnd, setSecondsLeftAtEnd] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [judgment, setJudgment] = useState<string | null>(null)
  const [judging, setJudging] = useState(false)
  const promptRef = useRef('')
  const selectedRef = useRef<Meme | null>(null)
  const startingRef = useRef(false)
  selectedRef.current = selected

  useEffect(() => {
    if (phase !== 'locked' || !selected) return

    let cancelled = false
    setJudging(true)
    setJudgment(null)

    judgeMemePickAction(selected.id, prompt)
      .then((result) => {
        if (!cancelled) setJudgment(result.comment)
      })
      .catch((judgeError) => {
        console.error('Failed to judge meme pick:', judgeError)
        if (!cancelled) {
          setJudgment('The judge could not finish a comment. Your pick still counts.')
        }
      })
      .finally(() => {
        if (!cancelled) setJudging(false)
      })

    return () => {
      cancelled = true
    }
  }, [phase, selected, prompt])

  useEffect(() => {
    if (phase !== 'playing' || endsAt == null) return

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (Date.now() >= endsAt) {
        setSecondsLeftAtEnd(0)
        setPhase(selectedRef.current ? 'locked' : 'missed')
      }
    }

    tick()
    const intervalId = window.setInterval(tick, 200)
    return () => window.clearInterval(intervalId)
  }, [phase, endsAt])

  const startRound = async () => {
    if (startingRef.current) return
    startingRef.current = true
    setPhase('loading')
    setError(null)
    setSelected(null)
    setMemes([])
    setJudgment(null)
    setJudging(false)

    const nextPrompt = generateMemePrompt(promptRef.current)

    try {
      const roundMemes = await loadRoundMemes()
      if (roundMemes.length === 0) {
        setError('No memes are in the library yet. Restore the course images, then start a round.')
        setPhase('ready')
        return
      }

      promptRef.current = nextPrompt
      setPrompt(nextPrompt)
      setMemes(roundMemes)
      setSecondsLeft(ROUND_SECONDS)
      setEndsAt(Date.now() + ROUND_SECONDS * 1000)
      setPhase('playing')
    } catch (loadError) {
      console.error('Failed to start meme round:', loadError)
      setError('The meme library could not be loaded. Check the Supabase connection and try again.')
      setPhase('ready')
    } finally {
      startingRef.current = false
    }
  }

  const lockIn = () => {
    if (!selected || endsAt == null) return
    const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
    setSecondsLeft(remaining)
    setSecondsLeftAtEnd(remaining)
    setPhase('locked')
  }

  const urgent = secondsLeft <= 10
  const progress = (secondsLeft / ROUND_SECONDS) * 100

  return (
    <section className="flex flex-col gap-6 pb-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl sm:text-4xl">What Do You Meme</h1>
        <p className="max-w-2xl text-muted-foreground">
          A solo round. A prompt appears, then you have {ROUND_SECONDS} seconds to
          scroll the meme library and pick the one that fits.
        </p>
      </div>

      {phase === 'ready' || phase === 'loading' ? (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Pick one meme before the timer ends. You can change your pick until you lock it in.
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button onClick={startRound} disabled={phase === 'loading'}>
            {phase === 'loading' ? 'Dealing the round...' : 'Start round'}
          </Button>
        </div>
      ) : null}

      {phase === 'playing' ? (
        <>
          <div className="sticky top-0 z-20 border-b border-border bg-background/95 py-4 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <motion.p
                key={prompt}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="min-w-0 flex-1 font-display text-xl sm:text-2xl"
              >
                {prompt}
              </motion.p>
              <p
                className={cn(
                  'w-14 shrink-0 text-right font-display text-3xl tabular-nums',
                  urgent ? 'text-destructive' : 'text-foreground'
                )}
              >
                {secondsLeft}s
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-200',
                  urgent ? 'bg-destructive' : 'bg-primary'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-16 sm:grid-cols-3 lg:grid-cols-4">
            {memes.map((meme) => (
              <MemeChoice
                key={meme.id}
                meme={meme}
                selected={selected?.id === meme.id}
                disabled={false}
                onSelect={setSelected}
              />
            ))}
          </div>

          <div className="sticky bottom-3 z-20 flex justify-end">
            <Button onClick={lockIn} disabled={!selected} size="lg">
              Lock it in
            </Button>
          </div>
        </>
      ) : null}

      {phase === 'locked' && selected ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
        >
          <p className="text-sm text-muted-foreground">
            {secondsLeftAtEnd > 0
              ? `Locked in with ${secondsLeftAtEnd}s left.`
              : 'Locked in as the clock hit zero.'}
          </p>
          <h2 className="font-display text-2xl">{prompt}</h2>
          <img
            src={selected.url}
            alt="Selected meme"
            className="max-h-[480px] w-full rounded-xl bg-muted object-contain"
          />
          <div className="rounded-xl bg-muted px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Judge
            </p>
            {judging || !judgment ? (
              <p className="mt-1 text-sm text-muted-foreground">Looking at the meme...</p>
            ) : (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="mt-1"
              >
                {judgment}
              </motion.p>
            )}
          </div>
          <Button onClick={startRound} className="self-start">
            Play again
          </Button>
        </motion.div>
      ) : null}

      {phase === 'missed' ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6"
        >
          <h2 className="font-display text-2xl">Time&apos;s up</h2>
          <p className="text-muted-foreground">
            The timer ran out before a meme was picked. The prompt was: {prompt}
          </p>
          <Button onClick={startRound}>Play again</Button>
        </motion.div>
      ) : null}
    </section>
  )
}
