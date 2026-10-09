export type SearchInterest = { term: string; at: number };
export const interestKey = (userId?: string) => `sharekart:searches:${userId ?? "guest"}`;
export const readInterests = (key: string): SearchInterest[] => {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(data)) return [];
    return data.filter((x): x is SearchInterest => typeof x?.term === "string" && typeof x?.at === "number" && x.at > Date.now() - 90 * 86400000).slice(0, 12);
  } catch { return []; }
};
export const addInterest = (history: SearchInterest[], term: string): SearchInterest[] => {
  const clean = term.trim().toLowerCase().slice(0, 80);
  if (clean.length < 2) return history;
  return [{ term: clean, at: Date.now() }, ...history.filter(x => x.term !== clean)].slice(0, 12);
};
export const interestScore = (text: string, history: SearchInterest[]) => {
  const normalized = text.toLowerCase();
  return history.reduce((score, entry, index) => score + (normalized.includes(entry.term) ? 20 : entry.term.split(/\s+/).filter(word => word.length > 2 && normalized.includes(word)).length * 3) / (index + 1), 0);
};