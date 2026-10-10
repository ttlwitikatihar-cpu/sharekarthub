import { describe, it, expect } from "vitest";
import { addInterest, interestScore, readInterests } from "@/lib/search-interests";

describe("search-based recommendations", () => {
  it("deduplicates and caps search history", () => {
    let history = Array.from({ length: 14 }, (_, n) => ({ term: `term ${n}`, at: Date.now() }));
    history = addInterest(history, "  TERM 2 ");
    expect(history).toHaveLength(12);
    expect(history[0].term).toBe("term 2");
    expect(history.filter(x => x.term === "term 2")).toHaveLength(1);
  });
  it("ranks matching listings above unrelated listings", () => {
    const history = [{ term: "charger", at: Date.now() }];
    expect(interestScore("Original phone charger", history)).toBeGreaterThan(interestScore("Blue pen", history));
  });
  it("handles invalid storage and expires old searches", () => {
    localStorage.setItem("qa-search", "{}");
    expect(readInterests("qa-search")).toEqual([]);
    localStorage.setItem("qa-search", JSON.stringify([{ term: "old", at: 1 }, { term: "current", at: Date.now() }]));
    expect(readInterests("qa-search").map(x => x.term)).toEqual(["current"]);
    localStorage.removeItem("qa-search");
  });
});