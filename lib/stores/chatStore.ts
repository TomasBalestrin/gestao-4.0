import { create } from "zustand";

interface ChatState {
  openChatLeadId: string | null;
  openChat: (leadId: string) => void;
  closeChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  openChatLeadId: null,
  openChat: (leadId) => set({ openChatLeadId: leadId }),
  closeChat: () => set({ openChatLeadId: null }),
}));
