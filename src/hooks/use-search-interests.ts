import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { addInterest, interestKey, readInterests } from "@/lib/search-interests";

export const useSearchInterests = (search: string) => {
  const { user } = useAuth();
  const key = interestKey(user?.id);
  const [stored, setStored] = useState(() => ({ key, history: readInterests(key) }));
  useEffect(() => { setStored({ key, history: readInterests(key) }); }, [key]);
  useEffect(() => {
    if (search.trim().length < 2) return;
    const timer = window.setTimeout(() => {
      const history = addInterest(readInterests(key), search);
      try { localStorage.setItem(key, JSON.stringify(history)); } catch { /* Storage can be unavailable. */ }
      setStored({ key, history });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [search, key]);
  const clear = () => {
    try { localStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
    setStored({ key, history: [] });
  };
  return { history: stored.key === key ? stored.history : [], clear };
};