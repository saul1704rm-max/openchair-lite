import type { MajorityKind, Vote } from "./types";

export function requiredVotes(total: number, kind: MajorityKind, customPercent = 50): number {
  if (total <= 0) return 0;
  if (kind === "simple") return Math.floor(total / 2) + 1;
  if (kind === "absolute") return Math.floor(total / 2) + 1;
  if (kind === "two-thirds") return Math.ceil((total * 2) / 3);
  return Math.ceil(total * (customPercent / 100));
}

export function voteBase(vote: Vote, registered: number): number {
  if (vote.basis === "registered") return registered;
  if (vote.basis === "present") return Math.max(0, registered - vote.absent);
  return Math.max(0, registered - vote.absent - vote.abstain);
}

export function voteResult(vote: Vote, registered: number) {
  const base = voteBase(vote, registered);
  const needed = requiredVotes(base, vote.majority, vote.customPercent);
  return { base, needed, approved: vote.for >= needed };
}
