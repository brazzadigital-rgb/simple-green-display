import { motion } from "framer-motion";

export default function TrackingLoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-xl mx-auto mt-8 space-y-4"
    >
      <p className="text-center font-sans text-xs text-muted-foreground animate-pulse">
        Buscando atualizações…
      </p>
      {[1, 2].map((i) => (
        <div
          key={i}
          className="bg-card rounded-2xl border border-[hsl(30,20%,90%)] p-6 space-y-3"
        >
          <div className="h-4 w-1/3 rounded-full bg-[hsl(30,20%,92%)] animate-pulse" />
          <div className="h-3 w-2/3 rounded-full bg-[hsl(30,20%,94%)] animate-pulse" />
          <div className="h-3 w-1/2 rounded-full bg-[hsl(30,20%,94%)] animate-pulse" />
          {i === 2 && (
            <>
              <div className="h-3 w-3/4 rounded-full bg-[hsl(30,20%,94%)] animate-pulse mt-4" />
              <div className="h-3 w-1/2 rounded-full bg-[hsl(30,20%,94%)] animate-pulse" />
              <div className="h-3 w-2/3 rounded-full bg-[hsl(30,20%,94%)] animate-pulse" />
            </>
          )}
        </div>
      ))}
    </motion.div>
  );
}
