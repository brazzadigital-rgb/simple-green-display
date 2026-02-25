import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame } from "lucide-react";

interface Props {
  endsAt: string;
  title?: string;
}

export function ShowcaseCountdown({ endsAt, title }: Props) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);
  const prevSeconds = useRef(0);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); return; }
      const newTime = {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      };
      prevSeconds.current = timeLeft.seconds;
      setTimeLeft(newTime);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (expired) return null;

  const blocks = [
    { label: "Dias", value: timeLeft.days },
    { label: "Horas", value: timeLeft.hours },
    { label: "Min", value: timeLeft.minutes },
    { label: "Seg", value: timeLeft.seconds },
  ];

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 6;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full py-5 md:py-8 relative overflow-hidden"
    >
      {/* Animated background mesh */}
      <div className="absolute inset-0 bg-mesh opacity-50" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="container relative z-10">
        <div className="flex flex-col items-center gap-4 md:gap-5">
          {/* Title with icon */}
          {title && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2"
            >
              {isUrgent ? (
                <Flame className="w-4 h-4 text-destructive animate-pulse" />
              ) : (
                <Clock className="w-4 h-4 text-accent" />
              )}
              <p
                className="text-2xl md:text-4xl leading-tight capitalize"
                style={{ fontFamily: "'Tangerine', cursive", fontWeight: 700 }}
              >
                {(() => {
                  const words = (title || "").toLowerCase().split(" ");
                  const lastWord = words.pop();
                  return (
                    <>
                      <span className="text-foreground">{words.join(" ")} </span>
                      <span className="text-primary">{lastWord}</span>
                    </>
                  );
                })()}
              </p>
              {isUrgent && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  Últimas horas!
                </span>
              )}
            </motion.div>
          )}

          {/* Countdown blocks */}
          <div className="flex items-center gap-2 md:gap-3">
            {blocks.map((b, i) => (
              <div key={b.label} className="flex items-center gap-2 md:gap-3">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * i, type: "spring", stiffness: 200 }}
                  className="relative group"
                >
                  {/* Glow behind on hover */}
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-500" />

                  <div className={`
                    relative flex flex-col items-center justify-center
                    min-w-[60px] md:min-w-[80px] h-[72px] md:h-[90px]
                    rounded-2xl border backdrop-blur-sm
                    ${isUrgent
                      ? "bg-destructive/5 border-destructive/20"
                      : "bg-card/80 border-border/50"
                    }
                    shadow-premium group-hover:shadow-premium-lg
                    transition-all duration-300
                  `}>
                    {/* Shimmer line at top */}
                    <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={b.value}
                        initial={{ y: -12, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 12, opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={`
                          font-display text-2xl md:text-4xl font-bold leading-none
                          ${isUrgent ? "text-destructive" : "text-foreground"}
                        `}
                      >
                        {String(b.value).padStart(2, "0")}
                      </motion.span>
                    </AnimatePresence>

                    <span className="font-sans text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1.5">
                      {b.label}
                    </span>
                  </div>
                </motion.div>

                {/* Separator dots */}
                {i < blocks.length - 1 && (
                  <div className="flex flex-col gap-1.5">
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="w-1.5 h-1.5 rounded-full bg-accent/60"
                    />
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="w-1.5 h-1.5 rounded-full bg-accent/60"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
