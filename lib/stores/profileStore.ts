import { create } from "zustand";

interface ProfileState {
  profileOpen: boolean;
  openProfile: () => void;
  closeProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profileOpen: false,
  openProfile: () => set({ profileOpen: true }),
  closeProfile: () => set({ profileOpen: false }),
}));
