export type Language = "en" | "es";
export type MotionStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type MajorityKind = "simple" | "absolute" | "two-thirds" | "custom";

export interface Delegation {
  id: string;
  name: string;
  present: boolean;
}
export interface Speaker {
  delegationId: string;
  status: "queued" | "speaking" | "done";
  elapsedSeconds: number;
}
export interface Motion {
  id: string;
  type: string;
  proposer: string;
  topic: string;
  duration: number;
  speakerTime: number;
  status: MotionStatus;
  notes: string;
  createdAt: string;
}
export interface SessionEvent {
  id: string;
  at: string;
  type: "speaker" | "motion" | "vote" | "caucus" | "note" | "session";
  description: string;
  delegation?: string;
}
export interface Vote {
  id: string;
  title: string;
  basis: "registered" | "present" | "present-voting";
  majority: MajorityKind;
  customPercent?: number;
  for: number;
  against: number;
  abstain: number;
  absent: number;
  createdAt: string;
}
export interface Caucus {
  id: string;
  topic: string;
  totalSeconds: number;
  speakerSeconds: number;
  proposer: string;
  participantIds: string[];
  active: boolean;
}
export interface TimerState {
  running: boolean;
  endsAt?: number;
  remainingSeconds: number;
}
export interface Session {
  version: 1;
  id: string;
  conference: string;
  committee: string;
  topic: string;
  date: string;
  language: Language;
  chair?: string;
  defaultSpeechSeconds: number;
  soundEnabled: boolean;
  delegations: Delegation[];
  speakers: Speaker[];
  motions: Motion[];
  votes: Vote[];
  caucuses: Caucus[];
  events: SessionEvent[];
  timer: TimerState;
  updatedAt: string;
}
