import type { MajorityKind, Vote } from "./types";

export function requiredVotes(
  total: number,
  kind: MajorityKind,
  customPercent = 50,
): number {
  if (total <= 0) return 0;
  if (kind === "simple" || kind === "absolute") return Math.floor(total / 2) + 1;
  if (kind === "two-thirds") return Math.ceil((total * 2) / 3);
  return Math.ceil(total * (customPercent / 100));
}

export function voteBase(
  vote: Vote,
  registered: number,
  present = registered - vote.absent,
): number {
  // An absolute majority is always calculated against the full roll call.
  if (vote.majority === "absolute" || vote.basis === "registered") return registered;
  if (vote.basis === "present") return Math.max(0, present);
  return Math.max(0, present - vote.abstain);
}

export function voteResult(
  vote: Vote,
  registered: number,
  present = registered - vote.absent,
) {
  const base = voteBase(vote, registered, present);
  const needed = requiredVotes(base, vote.majority, vote.customPercent);
  return { base, needed, approved: vote.for >= needed };
}
