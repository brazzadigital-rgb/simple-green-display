import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const trackVariants = cva(
  "group relative inline-flex shrink-0 cursor-pointer items-center rounded-lg transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-5 w-[56px]",
        md: "h-6 w-[64px]",
        lg: "h-7 w-[80px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const thumbSizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const thumbTranslateMap = {
  sm: "data-[state=checked]:translate-x-[33px] data-[state=unchecked]:translate-x-[3px]",
  md: "data-[state=checked]:translate-x-[38px] data-[state=unchecked]:translate-x-[3px]",
  lg: "data-[state=checked]:translate-x-[50px] data-[state=unchecked]:translate-x-[3px]",
};

const textSizeMap = {
  sm: "text-[8px]",
  md: "text-[9px]",
  lg: "text-[11px]",
};

interface PremiumToggle3DProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>, "children">,
    VariantProps<typeof trackVariants> {
  loading?: boolean;
}

const PremiumToggle3D = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  PremiumToggle3DProps
>(({ className, size = "md", loading = false, disabled, checked, ...props }, ref) => {
  const s = size ?? "md";

  return (
    <SwitchPrimitives.Root
      className={cn(
        trackVariants({ size }),
        // ON state: primary with inner shadow for 3D depth
        "data-[state=checked]:bg-primary data-[state=checked]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25),inset_0_-1px_2px_rgba(255,255,255,0.1)]",
        // OFF state: neutral with inner shadow
        "data-[state=unchecked]:bg-muted data-[state=unchecked]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.08),inset_0_-1px_2px_rgba(255,255,255,0.6)]",
        // Border
        "border border-border/30 data-[state=checked]:border-primary/60",
        className,
      )}
      disabled={disabled || loading}
      checked={checked}
      {...props}
      ref={ref}
    >
      {/* Embossed ON text */}
      <span
        className={cn(
          "absolute left-0 flex items-center justify-center select-none font-bold tracking-wider uppercase pointer-events-none transition-opacity duration-200",
          textSizeMap[s],
          s === "sm" ? "w-[33px]" : s === "lg" ? "w-[50px]" : "w-[38px]",
          "h-full",
          // Emboss: text-shadow simulating deboss
          "text-primary-foreground/30",
          "group-data-[state=checked]:opacity-100 group-data-[state=unchecked]:opacity-0",
        )}
        style={{
          textShadow: "0 1px 1px rgba(255,255,255,0.15), 0 -1px 1px rgba(0,0,0,0.25)",
        }}
        aria-hidden
      >
        ON
      </span>

      {/* Embossed OFF text */}
      <span
        className={cn(
          "absolute right-0 flex items-center justify-center select-none font-bold tracking-wider uppercase pointer-events-none transition-opacity duration-200",
          textSizeMap[s],
          s === "sm" ? "w-[33px]" : s === "lg" ? "w-[50px]" : "w-[38px]",
          "h-full",
          "text-muted-foreground/40",
          "group-data-[state=unchecked]:opacity-100 group-data-[state=checked]:opacity-0",
        )}
        style={{
          textShadow: "0 1px 1px rgba(255,255,255,0.5), 0 -1px 1px rgba(0,0,0,0.05)",
        }}
        aria-hidden
      >
        OFF
      </span>

      {/* Thumb */}
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none flex items-center justify-center rounded-md bg-white ring-0 transition-all duration-200 ease-out",
          // 3D shadow on thumb
          "shadow-[0_2px_6px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.1)]",
          "bg-gradient-to-b from-white to-muted/30",
          // Border
          "border border-border/20 data-[state=checked]:border-primary/30",
          // Active press
          "active:scale-95",
          thumbSizeMap[s],
          thumbTranslateMap[s],
        )}
      >
        {loading && (
          <Loader2
            className={cn(
              "animate-spin text-muted-foreground",
              s === "sm" ? "h-2.5 w-2.5" : s === "lg" ? "h-4 w-4" : "h-3 w-3",
            )}
          />
        )}
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  );
});

PremiumToggle3D.displayName = "PremiumToggle3D";

export { PremiumToggle3D };
