import { motion } from "framer-motion";

/** Branded full-screen loading state — mirrors the boot splash in index.html. */
const LoadingScreen = ({ label = "Loading ShareKart…" }: { label?: string }) => (
  <div
    role="status"
    aria-live="polite"
    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-[hsl(168,50%,98%)] via-[hsl(168,40%,96%)] to-[hsl(37,80%,96%)]"
  >
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-2xl font-black text-primary-foreground shadow-lg shadow-primary/30"
    >
      S
    </motion.div>
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${i === 1 ? "bg-accent" : "bg-primary"}`}
          animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
    <p className="text-sm font-medium text-muted-foreground tracking-wide">{label}</p>
  </div>
);

export default LoadingScreen;
