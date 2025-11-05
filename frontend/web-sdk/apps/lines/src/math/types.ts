export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Extreme';

export interface QuoteReq {
  amount: number;
  difficulty: Difficulty;
  streak: number;
}

export interface Quote {
  step: number;
  multiplier: number;
  winProb: number;
  payout: number;
}

export interface PlayReq extends QuoteReq {
  clientSeed?: string;
  nonce?: number;
}

export interface PlayResult {
  win: boolean;
  payout: number;
  newStreak: number;
  step: number;
  multiplier: number;
}
