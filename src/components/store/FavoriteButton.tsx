import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useWishlist } from "@/hooks/useWishlist";

interface FavoriteButtonProps {
  productId: string;
  variantId?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

export function FavoriteButton({
  productId,
  variantId = null,
  size = "md",
  className = "",
  showLabel = false,
}: FavoriteButtonProps) {
  const { isFavorited, toggle } = useWishlist();
  const active = isFavorited(productId, variantId);

  const sizeMap = {
    sm: { btn: "w-8 h-8", icon: "w-3.5 h-3.5" },
    md: { btn: "w-9 h-9", icon: "w-4 h-4" },
    lg: { btn: "w-11 h-11", icon: "w-5 h-5" },
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggle(productId, variantId);
  };

  return (
    <motion.button
      onClick={handleClick}
      className={`${sizeMap[size].btn} rounded-full flex items-center justify-center gap-2 transition-all duration-200 ${
        showLabel ? "w-auto px-4" : ""
      } ${className}`}
      whileTap={{ scale: 0.85 }}
      title={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <motion.div
        animate={active ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Heart
          className={`${sizeMap[size].icon} transition-all duration-200 ${
            active
              ? "fill-primary text-primary drop-shadow-[0_0_6px_hsla(345,45%,25%,0.4)]"
              : "text-current"
          }`}
        />
      </motion.div>
      {showLabel && (
        <span className="text-sm font-sans font-medium">
          {active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        </span>
      )}
    </motion.button>
  );
}
