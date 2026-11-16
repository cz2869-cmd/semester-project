export type PlayMode = "party" | "bots";

export type PlayPhase =
  | "lobby"
  | "loading"
  | "caption"
  | "reveal"
  | "results";

export type FunnyRating = "funny" | "not_funny" | null;

export type PlayPlayer = {
  id: string;
  name: string;
  isBot: boolean;
  avatarHue: number;
};

export type PlaySubmission = {
  playerId: string;
  caption: string;
  rating: FunnyRating;
  submittedAtMs: number;
};

export type PlayRoundImage = {
  id: string;
  url: string;
};
