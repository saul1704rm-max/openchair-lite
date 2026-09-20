import { describe, expect, it } from "vitest";
import { requiredVotes, voteBase, voteResult } from "../lib/majority";

describe("majority calculations", () => {
  it("uses a strict simple majority", () => expect(requiredVotes(10, "simple")).toBe(6));
  it("rounds two-thirds up", () => expect(requiredVotes(10, "two-thirds")).toBe(7));
  it("uses Math.ceil for custom thresholds", () => expect(requiredVotes(9, "custom", 60)).toBe(6));
  it("excludes abstentions for present-and-voting", () => expect(voteBase({ id:"1", title:"", basis:"present-voting", majority:"simple", for:0, against:0, abstain:2, absent:1, createdAt:"" }, 10)).toBe(7));
  it("marks a result approved at its threshold", () => expect(voteResult({ id:"1", title:"", basis:"registered", majority:"two-thirds", for:7, against:3, abstain:0, absent:0, createdAt:"" }, 10).approved).toBe(true));
});
