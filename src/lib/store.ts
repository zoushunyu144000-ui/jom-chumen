import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CategoryId } from "@/lib/types";
import { DEFAULT_PLACE, type SelectedPlace } from "@/lib/places";

type AppState = {
  place: SelectedPlace;
  category: CategoryId;
  query: string;
  ticketCodes: string[];
  applyCodes: string[];
  hydrated: boolean;
  setPlace: (place: SelectedPlace) => void;
  setCategory: (category: CategoryId) => void;
  setQuery: (query: string) => void;
  addTicket: (code: string) => void;
  addApply: (code: string) => void;
  setHydrated: (hydrated: boolean) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      place: DEFAULT_PLACE,
      category: "all",
      query: "",
      ticketCodes: [],
      applyCodes: [],
      hydrated: false,
      setPlace: (place) => set({ place }),
      setCategory: (category) => set({ category }),
      setQuery: (query) => set({ query }),
      addTicket: (code) =>
        set((state) => ({
          ticketCodes: [code, ...state.ticketCodes.filter((c) => c !== code)],
          applyCodes: [code, ...state.applyCodes.filter((c) => c !== code)],
        })),
      addApply: (code) =>
        set((state) => ({
          applyCodes: [code, ...state.applyCodes.filter((c) => c !== code)],
        })),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "jom-app",
      skipHydration: true,
      partialize: (state) => ({
        place: state.place,
        category: state.category,
        ticketCodes: state.ticketCodes,
        applyCodes: state.applyCodes,
      }),
    },
  ),
);

export function rehydrateAppStore() {
  const result = useAppStore.persist.rehydrate();
  void Promise.resolve(result).then(() => {
    useAppStore.getState().setHydrated(true);
  });
}
