import { create } from "zustand";

interface KanbanState {
  // Etapa cujo botão "novo card" foi acionado (consumido pelo modal — D3.4).
  newCardEtapaId: string | null;
  openNewCard: (etapaId: string) => void;
  closeNewCard: () => void;

  // Card aberto no modal de detalhe (consumido pelo modal — D3.4).
  selectedCardId: string | null;
  openCard: (cardId: string) => void;
  closeCard: () => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  newCardEtapaId: null,
  openNewCard: (etapaId) => set({ newCardEtapaId: etapaId }),
  closeNewCard: () => set({ newCardEtapaId: null }),

  selectedCardId: null,
  openCard: (cardId) => set({ selectedCardId: cardId }),
  closeCard: () => set({ selectedCardId: null }),
}));
