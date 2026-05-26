import { motion } from "framer-motion";
import { Trophy, Gift, Medal, HeartHandshake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import SEO from "@/components/SEO";

const getBadge = (rank: number) => {
  if (rank === 1) return "🏆";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  if (rank <= 6) return "⭐";
  return "";
};

const Leaderboard = () => {
  const { data: donors = [], isLoading, refetch } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, donations_count, reward_points, shop_name")
        .gt("donations_count", 0)
        .order("donations_count", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data.map((d, i) => ({
        rank: i + 1,
        userId: d.user_id,
        name: d.full_name || "Anonymous Donor",
        shopName: d.shop_name,
        donationsCount: d.donations_count ?? 0,
        points: d.reward_points ?? 0,
        badge: getBadge(i + 1),
      }));
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Recent donations (completed donation orders) — show WHO donated WHAT
  const { data: recent = [], refetch: refetchRecent } = useQuery({
    queryKey: ["recent-donations"],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, seller_id, listing_id, updated_at, status")
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error || !orders?.length) return [];

      const sellerIds = [...new Set(orders.map((o) => o.seller_id))];
      const listingIds = [...new Set(orders.map((o) => o.listing_id))];

      const [{ data: profiles }, { data: listings }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, shop_name").in("user_id", sellerIds),
        supabase.from("listings").select("id, title, category, listing_type").in("id", listingIds),
      ]);

      const pMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);
      const lMap = new Map(listings?.map((l) => [l.id, l]) ?? []);

      return orders
        .filter((o) => {
          const l = lMap.get(o.listing_id);
          return l && (l.category === "donate" || l.listing_type === "donate");
        })
        .slice(0, 10)
        .map((o) => ({
          id: o.id,
          when: o.updated_at,
          donorName: pMap.get(o.seller_id)?.full_name || "Anonymous Donor",
          shopName: pMap.get(o.seller_id)?.shop_name,
          itemTitle: lMap.get(o.listing_id)?.title || "an item",
        }));
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("leaderboard-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        if (payload.new.donations_count !== payload.old?.donations_count) {
          refetch();
          refetchRecent();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch, refetchRecent]);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Donor Leaderboard — Top Community Givers on ShareKart"
        description="See the top donors ranked by contributions to the ShareKart community. Celebrate generous neighbors making sharing possible."
        path="/leaderboard"
      />
      <Navbar />
      <main className="container flex-1 py-8 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-accent/10 mb-4">
            <Trophy className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-3xl font-bold">Donor Leaderboard</h1>
          <p className="text-muted-foreground mt-2">Celebrating our most generous community members · Auto-updates on new donations</p>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Loading leaderboard...</div>
        ) : donors.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Gift className="h-10 w-10 mx-auto mb-4 opacity-40" />
            <p>No donations yet. Be the first to donate!</p>
          </div>
        ) : (
          <>
            {donors.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {donors.slice(0, 3).map((entry, i) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`rounded-xl border border-border bg-card p-5 text-center ${i === 0 ? "ring-2 ring-accent shadow-lg" : ""}`}
                  >
                    <div className="text-3xl mb-2">{entry.badge}</div>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mx-auto mb-2">
                      {entry.name.charAt(0)}
                    </div>
                    <h3 className="font-semibold text-sm truncate" title={entry.name}>{entry.name}</h3>
                    {entry.shopName && <p className="text-xs text-primary truncate">🏪 {entry.shopName}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{entry.donationsCount} donations</p>
                    <p className="text-sm font-bold text-accent mt-1">{entry.points} pts</p>
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        <Medal className="h-3 w-3" /> Rank #{entry.rank}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {donors.length > 3 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {donors.slice(3).map((entry, i) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0"
                  >
                    <span className="text-sm font-bold text-muted-foreground w-6 text-center">#{entry.rank}</span>
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {entry.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm">{entry.name}</span>
                      {entry.shopName && <span className="text-xs text-primary ml-2">🏪 {entry.shopName}</span>}
                      {entry.badge && <span className="text-xs text-muted-foreground ml-2">{entry.badge}</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{entry.points} pts</span>
                      <p className="text-xs text-muted-foreground">{entry.donationsCount} donations</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Recent donors feed */}
        {recent.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <HeartHandshake className="h-5 w-5 text-primary" /> Recent Donations
            </h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs flex-shrink-0">
                    {r.donorName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0 text-sm">
                    <span className="font-medium">{r.donorName}</span>
                    {r.shopName && <span className="text-xs text-primary ml-1.5">🏪 {r.shopName}</span>}
                    <span className="text-muted-foreground"> donated </span>
                    <span className="font-medium">"{r.itemTitle}"</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(r.when).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 rounded-xl bg-primary/5 border border-primary/20 p-6"
        >
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <Gift className="h-5 w-5 text-primary" /> Rewards Program
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Earn points for every donation. Top donors get featured badges, early access to items, and platform credits. Every contribution counts!
          </p>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Leaderboard;
