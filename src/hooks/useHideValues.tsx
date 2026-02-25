import { create } from "zustand";
import { persist } from "zustand/middleware";

interface HideValuesState {
  hidden: boolean;
  toggle: () => void;
}

export const useHideValues = create<HideValuesState>()(
  persist(
    (set) => ({
      hidden: false,
      toggle: () => set((s) => ({ hidden: !s.hidden })),
    }),
    { name: "seller-hide-values" }
  )
);

export const HIDDEN_PLACEHOLDER = "••••••";

/** CSS class to blur values instead of replacing them */
export const BLUR_CLASS = "select-none blur-sm";
