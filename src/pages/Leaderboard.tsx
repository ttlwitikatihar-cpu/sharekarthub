import { motion } from "framer-motion";
import { Trophy, Gift, Medal, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MOCK_LEADERBOARD } from "@/lib/mockData";

const Leaderboard = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container flex-1 py-8 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-accent/10 mb-4">
            <Trophy className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-3xl font-bold">Donor Leaderboard</h1>
          <p className="text-muted-foreground mt-2">Celebrating our most generous community members</p>
        </motion.div>

        {/* Top 3 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {MOCK_LEADERBOARD.slice(0, 3).map((entry, i) => (
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
              <h3 className="font-semibold text-sm">{entry.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{entry.donationsCount} donations</p>
              <p className="text-sm font-bold text-accent mt-1">{entry.points} pts</p>
            </motion.div>
          ))}
        </div>

        {/* Rest */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {MOCK_LEADERBOARD.slice(3).map((entry, i) => (
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
              <div className="flex-1">
                <span className="font-semibold text-sm">{entry.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{entry.badge}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold">{entry.points} pts</span>
                <p className="text-xs text-muted-foreground">{entry.donationsCount} donations</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Rewards Info */}
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
