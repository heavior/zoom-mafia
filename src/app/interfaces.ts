export interface IGame {
  civiliansWin: boolean;
  countdown: number;
  dayNumber: number;
  gameOn: boolean;
  gameState: string;
  lastGameState: string;
  host: string;
  news: any;
  tiebreakerVoted: any;
}

export interface IPlayer {
  isAlive: boolean;
  isCandidate: boolean;
  isOnline: boolean;
  name: string;
  number: number;
  role: string;
  votedBy: IVoter[];
}

export interface ITitles {
  guiltyTitle: string;
  notGuiltyTitle: string;
}

export interface IVoter {
  name: string;
  number: number;
  role: string|null;
}

export interface IYou {
  isAlive: boolean;
  name: string;
  number: number;
  role: string;
  userId: string;
}
