import { create } from "zustand";

interface KanbanState {
  // Modal de novo lead aberto no kanban (cai sempre na 1a etapa via server).
  newLeadOpen: boolean;
  openNewLead: () => void;
  closeNewLead: () => void;

  // Card aberto no modal de detalhe (consumido pelo modal — D3.4).
  selectedCardId: string | null;
  openCard: (cardId: string) => void;
  closeCard: () => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  newLeadOpen: false,
  openNewLead: () => set({ newLeadOpen: true }),
  closeNewLead: () => set({ newLeadOpen: false }),

  selectedCardId: null,
  openCard: (cardId) => set({ selectedCardId: cardId }),
  closeCard: () => set({ selectedCardId: null }),
}));
