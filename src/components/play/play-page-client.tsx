"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Heart, Loader2, Sparkles, Timer, Users } from "lucide-react";

import { judgeMemePickAction } from "@/app/actions/game/judge-meme-pick-action";
import { rateMemeRoastAction } from "@/app/actions/game/rate-meme-roast-action";
import { fetchCommonUseImagesAction } from "@/app/actions/images";
import { fetchPlayImageAction } from "@/app/actions/play/fetch-play-image-action";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  BOT_PLAYERS,
  botFinishDelaysMs,
  generateBotCaptions,
} from "@/lib/play/bots";
import type { PlayPlayer, PlayRoundImage } from "@/lib/play/types";
import {
  judgeCaption,
  scoreFromVerdict,
} from "@/lib/meme-caption-judge";
import type { MemeJudgment } from "@/lib/meme-judge";
import { generateMemePrompt, ROUND_SECONDS } from "@/lib/meme-prompts";
import {
  emptyRoastCounts,
  ROAST_REACTIONS,
  type RoastRatingCounts,
  type RoastReaction,
} from "@/lib/meme-roast-ratings";
import { cn } from "@/lib/utils";

const ROUND_MS = ROUND_SECONDS * 1000;
const REVEAL_SECONDS = 15;
const REVEAL_MS = REVEAL_SECONDS * 1000;
const HUMAN_ID = "you";
const MEMES_PER_ROUND = 24;

type RoundKind = "caption" | "pick";
type PlayPhase =
  | "lobby"
  | "loading"
  | "caption"
  | "pick"
  | "reveal"
  | "results";

type Meme = { id: string; url: string };

type Submission = {
  playerId: string;
  caption: string;
  imageUrl: string;
  imageId: string | null;
  score: number;
  judgment: MemeJudgment | null;
  hearted: boolean;
};

type Props = { displayName: string };

export function PlayPageClient({ displayName }: Props) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<PlayPhase>("lobby");
  const [roundKind, setRoundKind] = useState<RoundKind>("caption");
  const [image, setImage] = useState<PlayRoundImage | null>(null);
  const [prompt, setPrompt] = useState("");
  const [pickMemes, setPickMemes] = useState<Meme[]>([]);
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_MS);
  const [botsReady, setBotsReady] = useState<Record<string, boolean>>({});
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [revealOrder, setRevealOrder] = useState<Submission[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [judging, setJudging] = useState(false);
  const [roastReaction, setRoastReaction] = useState<RoastReaction | null>(
    null
  );
  const [roastCounts, setRoastCounts] =
    useState<RoastRatingCounts>(emptyRoastCounts());
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [revealTimeLeftMs, setRevealTimeLeftMs] = useState(REVEAL_MS);

  const captionDraftRef = useRef("");
  const selectedMemeRef = useRef<Meme | null>(null);
  const humanLockedRef = useRef(false);
  const botCaptionsRef = useRef<string[]>([]);
  const botPicksRef = useRef<Meme[]>([]);
  const roundStartedAt = useRef<number | null>(null);
  const revealAdvanceRef = useRef<(force?: boolean) => void>(() => {});

  useEffect(() => {
    captionDraftRef.current = captionDraft;
  }, [captionDraft]);

  useEffect(() => {
    selectedMemeRef.current = selectedMeme;
  }, [selectedMeme]);

  const humanPlayer: PlayPlayer = useMemo(
    () => ({
      id: HUMAN_ID,
      name: displayName || "You",
      isBot: false,
      avatarHue: 48,
    }),
    [displayName]
  );

  const players = useMemo(
    () => [humanPlayer, ...BOT_PLAYERS],
    [humanPlayer]
  );

  const playerById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  useEffect(() => {
    if (phase !== "caption" && phase !== "pick") return;

    roundStartedAt.current = Date.now();
    humanLockedRef.current = false;
    setTimeLeftMs(ROUND_MS);
    setBotsReady({});

    const delays = botFinishDelaysMs(BOT_PLAYERS.length, ROUND_MS);
    const botTimers = BOT_PLAYERS.map((bot, index) =>
      window.setTimeout(() => {
        setBotsReady((prev) => ({ ...prev, [bot.id]: true }));
      }, delays[index])
    );

    const tick = window.setInterval(() => {
      const started = roundStartedAt.current ?? Date.now();
      const remaining = Math.max(0, ROUND_MS - (Date.now() - started));
      setTimeLeftMs(remaining);
      if (remaining <= 0) window.clearInterval(tick);
    }, 100);

    const endTimer = window.setTimeout(() => {
      void finishRound();
    }, ROUND_MS);

    return () => {
      botTimers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(tick);
      window.clearTimeout(endTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, image?.id, prompt]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const current = revealOrder[revealIndex];
    if (!current || current.playerId !== HUMAN_ID) return;
    if (current.judgment) return;

    let cancelled = false;
    setJudging(true);

    const run = async () => {
      let judgment: MemeJudgment;
      if (roundKind === "caption") {
        judgment = judgeCaption(current.caption);
      } else if (current.imageId) {
        judgment = await judgeMemePickAction(current.imageId, prompt);
      } else {
        judgment = {
          verdict: "miss",
          comment: "The judge could not read this meme.",
        };
      }

      if (cancelled) return;
      const score = scoreFromVerdict(
        judgment.verdict,
        `${current.playerId}|${current.caption}|${current.imageId}`
      );
      setRevealOrder((prev) =>
        prev.map((item, index) =>
          index === revealIndex ? { ...item, judgment, score } : item
        )
      );
      setSubmissions((prev) =>
        prev.map((item) =>
          item.playerId === current.playerId
            ? { ...item, judgment, score }
            : item
        )
      );
      setJudging(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [phase, revealIndex, revealOrder, roundKind, prompt]);

  async function startBotMatch() {
    setPhase("loading");
    setCaptionDraft("");
    setSelectedMeme(null);
    setSubmissions([]);
    setRevealOrder([]);
    setRevealIndex(0);
    setRoastReaction(null);
    setRoastCounts(emptyRoastCounts());
    setRatingId(null);
    setImage(null);
    setPrompt("");
    setPickMemes([]);

    const kind: RoundKind = Math.random() < 0.5 ? "caption" : "pick";
    setRoundKind(kind);

    try {
      if (kind === "caption") {
        const nextImage = await fetchPlayImageAction();
        botCaptionsRef.current = generateBotCaptions(BOT_PLAYERS.length);
        setImage(nextImage);
        setPhase("caption");
      } else {
        const nextPrompt = generateMemePrompt();
        const memes = await loadRoundMemes();
        if (memes.length < 5) {
          throw new Error(
            "Not enough memes in the library yet. Restore course images."
          );
        }
        botPicksRef.current = BOT_PLAYERS.map(
          (_, index) => memes[(index * 3 + 1) % memes.length]
        );
        setPrompt(nextPrompt);
        setPickMemes(memes);
        setPhase("pick");
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Couldn’t start the round",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      setPhase("lobby");
    }
  }

  async function finishRound() {
    if (humanLockedRef.current) return;
    humanLockedRef.current = true;

    let built: Submission[] = [];

    if (roundKind === "caption" && image) {
      const humanCaption = captionDraftRef.current.trim();
      const humanJudgment = judgeCaption(humanCaption);
      built = [
        {
          playerId: HUMAN_ID,
          caption: humanCaption || "(blank stare)",
          imageUrl: image.url,
          imageId: image.id.startsWith("fallback") ? null : image.id,
          score: scoreFromVerdict(humanJudgment.verdict, humanCaption),
          judgment: humanJudgment,
          hearted: false,
        },
        ...BOT_PLAYERS.map((bot, index) => {
          const caption = botCaptionsRef.current[index] ?? "…";
          const judgment = judgeCaption(caption);
          return {
            playerId: bot.id,
            caption,
            imageUrl: image.url,
            imageId: image.id.startsWith("fallback") ? null : image.id,
            score: scoreFromVerdict(judgment.verdict, `${bot.id}|${caption}`),
            judgment,
            hearted: false,
          };
        }),
      ];
    } else {
      const humanPick = selectedMemeRef.current;
      const humanBase: Submission = {
        playerId: HUMAN_ID,
        caption: prompt,
        imageUrl: humanPick?.url ?? "",
        imageId: humanPick?.id ?? null,
        score: humanPick ? 5 : 1,
        judgment: null,
        hearted: false,
      };
      built = [
        humanBase,
        ...BOT_PLAYERS.map((bot, index) => {
          const pick = botPicksRef.current[index];
          return {
            playerId: bot.id,
            caption: prompt,
            imageUrl: pick?.url ?? "",
            imageId: pick?.id ?? null,
            score: 4 + ((index * 2) % 5),
            judgment: null,
            hearted: false,
          };
        }),
      ];

      // Score bot picks with the real judge when possible
      const judged = await Promise.all(
        built.map(async (item) => {
          if (!item.imageId) return item;
          try {
            const judgment = await judgeMemePickAction(item.imageId, prompt);
            return {
              ...item,
              judgment,
              score: scoreFromVerdict(
                judgment.verdict,
                `${item.playerId}|${item.imageId}`
              ),
            };
          } catch {
            return item;
          }
        })
      );
      built = judged;
    }

    setSubmissions(built);
    setRevealOrder(shuffle(built));
    setRevealIndex(0);
    setRatingId(crypto.randomUUID());
    setRoastReaction(null);
    setBotsReady(Object.fromEntries(BOT_PLAYERS.map((b) => [b.id, true])));
    setPhase("reveal");
  }

  async function rateRoast(reaction: RoastReaction) {
    const current = revealOrder[revealIndex];
    if (!current || current.playerId !== HUMAN_ID || !ratingId || ratingBusy) {
      return;
    }
    setRatingBusy(true);
    setRoastReaction(reaction);
    try {
      if (current.imageId && current.judgment) {
        const result = await rateMemeRoastAction({
          clientRatingId: ratingId,
          imageId: current.imageId,
          prompt: roundKind === "pick" ? prompt : current.caption,
          reaction,
        });
        if (result.ok) setRoastCounts(result.counts);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setRatingBusy(false);
    }
  }

  function toggleBotHeart() {
    const current = revealOrder[revealIndex];
    if (!current || current.playerId === HUMAN_ID) return;

    const nextHearted = !current.hearted;
    setRevealOrder((prev) =>
      prev.map((item, index) =>
        index === revealIndex ? { ...item, hearted: nextHearted } : item
      )
    );
    setSubmissions((prev) =>
      prev.map((item) =>
        item.playerId === current.playerId
          ? { ...item, hearted: nextHearted }
          : item
      )
    );
  }

  function goNextReveal(force = false) {
    const current = revealOrder[revealIndex];
    if (!current) return;
    if (!force && current.playerId === HUMAN_ID) {
      if (judging || !current.judgment) return;
      if (!roastReaction) return;
    }
    if (revealIndex >= revealOrder.length - 1) {
      setPhase("results");
      return;
    }
    setRevealIndex((i) => i + 1);
    setRoastReaction(null);
  }

  revealAdvanceRef.current = goNextReveal;

  useEffect(() => {
    if (phase !== "reveal") return;

    const startedAt = Date.now();
    setRevealTimeLeftMs(REVEAL_MS);

    const tick = window.setInterval(() => {
      const remaining = Math.max(0, REVEAL_MS - (Date.now() - startedAt));
      setRevealTimeLeftMs(remaining);
      if (remaining <= 0) {
        window.clearInterval(tick);
        revealAdvanceRef.current(true);
      }
    }, 100);

    return () => window.clearInterval(tick);
  }, [phase, revealIndex]);

  const secondsLeft = Math.ceil(timeLeftMs / 1000);
  const timerUrgent = secondsLeft <= 5;
  const revealSecondsLeft = Math.ceil(revealTimeLeftMs / 1000);
  const currentReveal = revealOrder[revealIndex];
  const currentPlayer = currentReveal
    ? playerById[currentReveal.playerId]
    : null;
  const podium = [...submissions]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <div className="w-full max-w-3xl mx-auto pb-16">
      <AnimatePresence mode="wait">
        {phase === "lobby" && (
          <motion.section
            key="lobby"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-8"
          >
            <header className="text-center space-y-3 pt-4">
              <p className="text-sm uppercase tracking-[0.2em] text-primary">
                Play
              </p>
              <h1
                className="text-3xl sm:text-4xl font-bold
                           font-[family-name:var(--font-poppins)]"
              >
                Choose a game mode
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Caption a meme or match a prompt to a photo — rounds mix both.
              </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <ModeCard
                title="Party"
                description="Play with other signed-up users in a live party."
                icon={<Users className="w-7 h-7" />}
                disabled
                badge="Coming soon"
              />
              <ModeCard
                title="Vs Bots"
                description={
                  "Face 4 bots. Half the time you write a caption; " +
                  "half the time you pick the matching meme."
                }
                icon={<Bot className="w-7 h-7" />}
                onClick={startBotMatch}
                cta="Start match"
              />
            </div>
          </motion.section>
        )}

        {phase === "loading" && (
          <motion.section
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-4 py-24"
          >
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Dealing a fresh round…</p>
          </motion.section>
        )}

        {phase === "caption" && image && (
          <CaptionRound
            imageUrl={image.url}
            captionDraft={captionDraft}
            setCaptionDraft={setCaptionDraft}
            secondsLeft={secondsLeft}
            timerUrgent={timerUrgent}
            botsReady={botsReady}
            onLock={() => void finishRound()}
          />
        )}

        {phase === "pick" && (
          <PickRound
            prompt={prompt}
            memes={pickMemes}
            selected={selectedMeme}
            onSelect={setSelectedMeme}
            secondsLeft={secondsLeft}
            timerUrgent={timerUrgent}
            botsReady={botsReady}
            onLock={() => void finishRound()}
          />
        )}

        {phase === "reveal" && currentReveal && currentPlayer && (
          <motion.section
            key={`reveal-${revealIndex}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="flex flex-col gap-6"
          >
            <div
              className="flex items-center justify-between text-sm
                         text-muted-foreground"
            >
              <span>
                Meme {revealIndex + 1} of {revealOrder.length}
              </span>
              <span className="flex items-center gap-3">
                <span>
                  {roundKind === "caption"
                    ? "Caption battle"
                    : "Prompt match"}
                </span>
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    revealSecondsLeft <= 5
                      ? "text-destructive"
                      : "text-foreground"
                  )}
                >
                  {revealSecondsLeft}s
                </span>
              </span>
            </div>

            <MemeCard
              imageUrl={currentReveal.imageUrl}
              caption={
                roundKind === "caption"
                  ? currentReveal.caption
                  : prompt
              }
              player={currentPlayer}
              highlight={currentPlayer.id === HUMAN_ID}
              showPromptLabel={roundKind === "pick"}
            />

            {currentPlayer.id === HUMAN_ID ? (
              <div className="border border-primary/40 bg-primary/5 p-4 space-y-3">
                <div
                  className="flex items-center gap-2 text-primary text-sm
                             font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  AI judge roast
                </div>
                {judging || !currentReveal.judgment ? (
                  <p className="text-sm text-muted-foreground">
                    The judge is writing a roast…
                  </p>
                ) : (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm leading-relaxed"
                  >
                    {currentReveal.judgment.comment}
                  </motion.p>
                )}
                {currentReveal.judgment && !judging ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      How was this roast?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ROAST_REACTIONS.map((option) => (
                        <Button
                          key={option.id}
                          type="button"
                          size="sm"
                          variant={
                            roastReaction === option.id
                              ? "default"
                              : "outline"
                          }
                          disabled={ratingBusy}
                          onClick={() => void rateRoast(option.id)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    {roastReaction ? (
                      <p className="text-xs text-muted-foreground">
                        So Funny {roastCounts.so_funny} · Boring{" "}
                        {roastCounts.boring} · Offended{" "}
                        {roastCounts.offended}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Leave a heart if you laughed
                </p>
                <Button
                  type="button"
                  size="lg"
                  variant={currentReveal.hearted ? "default" : "outline"}
                  className="gap-2"
                  onClick={toggleBotHeart}
                  aria-pressed={currentReveal.hearted}
                  aria-label={
                    currentReveal.hearted ? "Unheart meme" : "Heart meme"
                  }
                >
                  <Heart
                    className={cn(
                      "w-5 h-5",
                      currentReveal.hearted && "fill-current"
                    )}
                  />
                  {currentReveal.hearted ? "Hearted" : "Heart"}
                </Button>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => goNextReveal(false)}
                disabled={
                  currentPlayer.id === HUMAN_ID &&
                  (judging || !currentReveal.judgment || !roastReaction)
                }
              >
                {revealIndex >= revealOrder.length - 1
                  ? "See podium"
                  : "Next meme"}
              </Button>
            </div>
          </motion.section>
        )}

        {phase === "results" && (
          <motion.section
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            <header className="text-center space-y-2">
              <h2
                className="text-2xl sm:text-3xl font-bold
                           font-[family-name:var(--font-poppins)]"
              >
                Podium
              </h2>
              <p className="text-muted-foreground">
                Ranked by the AI judge
                {roundKind === "caption"
                  ? " on captions"
                  : " on prompt matches"}
                .
              </p>
            </header>

            <PodiumBoard podium={podium} playerById={playerById} />

            <ul className="space-y-3">
              {[...submissions]
                .sort((a, b) => b.score - a.score)
                .map((submission, index) => {
                  const player = playerById[submission.playerId];
                  return (
                    <li
                      key={submission.playerId}
                      className={cn(
                        "flex items-start gap-3 border p-3",
                        submission.playerId === HUMAN_ID &&
                          "border-primary/50 bg-primary/5"
                      )}
                    >
                      <span
                        className="w-8 shrink-0 text-sm font-bold
                                   text-muted-foreground"
                      >
                        #{index + 1}
                      </span>
                      <PlayerAvatar player={player} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium truncate">
                            {player?.name}
                            {submission.playerId === HUMAN_ID
                              ? " (you)"
                              : ""}
                          </span>
                          <span className="flex items-center gap-2 text-sm">
                            {submission.playerId !== HUMAN_ID &&
                            submission.hearted ? (
                              <Heart
                                className="w-4 h-4 text-primary fill-current"
                                aria-label="Hearted"
                              />
                            ) : null}
                            <span className="tabular-nums">
                              {submission.score}/10
                            </span>
                          </span>
                        </div>
                        {roundKind === "caption" ? (
                          <p className="text-sm text-muted-foreground">
                            {submission.caption}
                          </p>
                        ) : null}
                        {submission.judgment &&
                        submission.playerId === HUMAN_ID ? (
                          <p className="text-xs text-primary">
                            {submission.judgment.comment}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={startBotMatch}>Play again vs bots</Button>
              <Button variant="outline" onClick={() => setPhase("lobby")}>
                Back to modes
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function CaptionRound({
  imageUrl,
  captionDraft,
  setCaptionDraft,
  secondsLeft,
  timerUrgent,
  botsReady,
  onLock,
}: {
  imageUrl: string;
  captionDraft: string;
  setCaptionDraft: (value: string) => void;
  secondsLeft: number;
  timerUrgent: boolean;
  botsReady: Record<string, boolean>;
  onLock: () => void;
}) {
  return (
    <motion.section
      key="caption"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-6"
    >
      <RoundHeader
        label="Write a caption"
        secondsLeft={secondsLeft}
        timerUrgent={timerUrgent}
      />
      <div
        className="relative w-full aspect-[4/3] bg-muted/30 border
                   border-foreground/10 overflow-hidden flex items-center
                   justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Round meme image"
          className="max-w-full max-h-full object-contain"
        />
      </div>
      <BotStatusRow botsReady={botsReady} />
      <div className="space-y-3">
        <label className="text-sm font-medium" htmlFor="play-caption">
          Your caption
        </label>
        <Textarea
          id="play-caption"
          value={captionDraft}
          onChange={(e) => setCaptionDraft(e.target.value)}
          placeholder="Make it funny. You’ve got 30 seconds…"
          maxLength={180}
          className="min-h-[110px] text-base"
          autoFocus
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {captionDraft.length}/180
          </span>
          <Button onClick={onLock} disabled={!captionDraft.trim()}>
            Lock in
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

function PickRound({
  prompt,
  memes,
  selected,
  onSelect,
  secondsLeft,
  timerUrgent,
  botsReady,
  onLock,
}: {
  prompt: string;
  memes: Meme[];
  selected: Meme | null;
  onSelect: (meme: Meme) => void;
  secondsLeft: number;
  timerUrgent: boolean;
  botsReady: Record<string, boolean>;
  onLock: () => void;
}) {
  const progress = (secondsLeft / ROUND_SECONDS) * 100;
  return (
    <motion.section
      key="pick"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-6"
    >
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <motion.p
            key={prompt}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0 flex-1 font-[family-name:var(--font-poppins)]
                       text-xl sm:text-2xl font-bold"
          >
            {prompt}
          </motion.p>
          <p
            className={cn(
              "w-14 shrink-0 text-right font-mono text-3xl tabular-nums",
              timerUrgent ? "text-destructive" : "text-foreground"
            )}
          >
            {secondsLeft}s
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden bg-muted">
          <div
            className={cn(
              "h-full transition-[width] duration-200",
              timerUrgent ? "bg-destructive" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <BotStatusRow botsReady={botsReady} />

      <div className="grid grid-cols-2 gap-3 pb-16 sm:grid-cols-3">
        {memes.map((meme) => (
          <button
            key={meme.id}
            type="button"
            aria-pressed={selected?.id === meme.id}
            onClick={() => onSelect(meme)}
            className={cn(
              "relative aspect-[4/3] overflow-hidden border-2 bg-muted",
              "text-left transition-transform",
              selected?.id === meme.id
                ? "border-primary scale-[1.02]"
                : "border-border hover:border-primary/60"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meme.url}
              alt="Meme choice"
              className="h-full w-full object-contain p-2"
            />
            <span
              className={cn(
                "absolute bottom-2 right-2 px-2 py-0.5 text-[11px] font-medium",
                selected?.id === meme.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/90 text-foreground"
              )}
            >
              {selected?.id === meme.id ? "Picked" : "Pick"}
            </span>
          </button>
        ))}
      </div>

      <div className="sticky bottom-3 z-20 flex justify-end">
        <Button onClick={onLock} disabled={!selected} size="lg">
          Lock it in
        </Button>
      </div>
    </motion.section>
  );
}

function RoundHeader({
  label,
  secondsLeft,
  timerUrgent,
}: {
  label: string;
  secondsLeft: number;
  timerUrgent: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bot className="w-4 h-4" />
        <span>{label} · Vs 4 bots</span>
      </div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 border font-mono text-lg",
          timerUrgent
            ? "border-destructive text-destructive"
            : "border-primary text-primary"
        )}
      >
        <Timer className="w-4 h-4" />
        <span>{secondsLeft}s</span>
      </div>
    </div>
  );
}

function BotStatusRow({ botsReady }: { botsReady: Record<string, boolean> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {BOT_PLAYERS.map((bot) => (
        <div
          key={bot.id}
          className={cn(
            "flex items-center gap-2 border px-2 py-2 text-xs",
            botsReady[bot.id]
              ? "border-primary/60 bg-primary/5"
              : "border-foreground/10"
          )}
        >
          <PlayerAvatar player={bot} size="sm" />
          <div className="min-w-0">
            <div className="truncate font-medium">{bot.name}</div>
            <div className="text-muted-foreground">
              {botsReady[bot.id] ? "Locked in" : "Typing…"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ModeCard({
  title,
  description,
  icon,
  onClick,
  cta,
  disabled,
  badge,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onClick?: () => void;
  cta?: string;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "text-left border p-5 space-y-4 transition-colors",
        disabled
          ? "opacity-60 cursor-not-allowed border-foreground/10"
          : "border-foreground/15 hover:border-primary hover:bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-primary">{icon}</div>
        {badge && (
          <span
            className="text-[10px] uppercase tracking-wider text-muted-foreground
                       border border-foreground/15 px-2 py-0.5"
          >
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {cta && !disabled && (
        <span className="inline-block text-sm font-medium text-primary">
          {cta} →
        </span>
      )}
    </button>
  );
}

function MemeCard({
  imageUrl,
  caption,
  player,
  highlight,
  showPromptLabel,
}: {
  imageUrl: string;
  caption: string;
  player: PlayPlayer;
  highlight?: boolean;
  showPromptLabel?: boolean;
}) {
  return (
    <div
      className={cn(
        "border overflow-hidden",
        highlight ? "border-primary" : "border-foreground/10"
      )}
    >
      <div
        className="relative w-full aspect-[4/3] bg-muted/30 flex items-center
                   justify-center"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Meme"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <p className="text-sm text-muted-foreground">No meme locked in</p>
        )}
      </div>
      <div className="p-4 space-y-3 border-t border-foreground/10">
        <div className="flex items-center gap-2">
          <PlayerAvatar player={player} size="sm" />
          <span className="text-sm font-medium">
            {player.name}
            {!player.isBot ? " (you)" : ""}
          </span>
        </div>
        <p className="text-lg sm:text-xl font-medium leading-snug text-center">
          {showPromptLabel ? (
            <span className="block text-xs uppercase tracking-wide
                             text-muted-foreground mb-2">
              Prompt
            </span>
          ) : null}
          {caption || "(blank stare)"}
        </p>
      </div>
    </div>
  );
}

function PodiumBoard({
  podium,
  playerById,
}: {
  podium: Submission[];
  playerById: Record<string, PlayPlayer>;
}) {
  const first = podium[0];
  const second = podium[1];
  const third = podium[2];
  const slots = [
    { place: 2, entry: second, height: "h-24", label: "2nd" },
    { place: 1, entry: first, height: "h-36", label: "1st" },
    { place: 3, entry: third, height: "h-16", label: "3rd" },
  ];

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6 px-2">
      {slots.map(({ place, entry, height, label }) => {
        const player = entry ? playerById[entry.playerId] : undefined;
        return (
          <div
            key={place}
            className="flex w-28 sm:w-36 flex-col items-center gap-2"
          >
            <div className="text-center min-h-[3rem]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="text-sm font-semibold truncate max-w-full">
                {player?.name ?? "—"}
                {entry?.playerId === HUMAN_ID ? " (you)" : ""}
              </p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {entry ? `${entry.score}/10` : ""}
              </p>
            </div>
            <div
              className={cn(
                "w-full border border-foreground/15 flex items-end justify-center pb-3",
                height,
                place === 1
                  ? "bg-primary/20 border-primary"
                  : "bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "font-[family-name:var(--font-poppins)] font-bold",
                  place === 1 ? "text-3xl text-primary" : "text-2xl"
                )}
              >
                {place}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlayerAvatar({
  player,
  size = "md",
}: {
  player?: PlayPlayer;
  size?: "sm" | "md";
}) {
  if (!player) return null;
  const dim = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-center font-bold text-black",
        dim
      )}
      style={{ backgroundColor: `hsl(${player.avatarHue} 90% 55%)` }}
      aria-hidden
    >
      {player.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

async function loadRoundMemes(): Promise<Meme[]> {
  const firstPage = await fetchCommonUseImagesAction(
    undefined,
    "",
    1,
    MEMES_PER_ROUND
  );
  const pageCount = Math.max(
    1,
    Math.ceil(firstPage.totalCount / MEMES_PER_ROUND)
  );
  const page =
    pageCount === 1 ? 1 : 1 + Math.floor(Math.random() * pageCount);
  let round = firstPage;
  if (page !== 1) {
    try {
      round = await fetchCommonUseImagesAction(
        undefined,
        "",
        page,
        MEMES_PER_ROUND
      );
    } catch (error) {
      console.error("Failed to load a later meme page:", error);
    }
  }

  return shuffle(
    round.images
      .filter((image): image is Meme => Boolean(image.id && image.url))
      .map((image) => ({ id: image.id, url: image.url }))
  );
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}
