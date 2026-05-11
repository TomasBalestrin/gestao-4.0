import { create } from "zustand";

interface NotificationState {
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  toggleDropdown: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  dropdownOpen: false,
  setDropdownOpen: (open) => set({ dropdownOpen: open }),
  toggleDropdown: () => set((s) => ({ dropdownOpen: !s.dropdownOpen })),
}));
