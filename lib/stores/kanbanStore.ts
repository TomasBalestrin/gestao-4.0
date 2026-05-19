import { create } from "zustand";

// Mantemos o type aqui (vez de importar de kanban-card-modal-sidebar) pra evitar
// dependencia circular store -> componente. As strings espelham CardModalPane.
export type KanbanCardPane =
  | "dados"
  | "venda"
  | "chat"
  | "instagram"
  | "historico";

interface KanbanState {
  // Modal de novo lead aberto no kanban (cai sempre na 1a etapa via server).
  newLeadOpen: boolean;
  openNewLead: () => void;
  closeNewLead: () => void;

  // Card aberto no modal de detalhe (consumido pelo modal — D3.4).
  selectedCardId: string | null;
  // Pane inicial do modal quando aberto via openCard(id, pane). Ao fechar
  // volta pra null pra que a proxima abertura sem pane caia no default ("dados").
  selectedPane: KanbanCardPane | null;
  openCard: (cardId: string, pane?: KanbanCardPane) => void;
  closeCard: () => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  newLeadOpen: false,
  openNewLead: () => set({ newLeadOpen: true }),
  closeNewLead: () => set({ newLeadOpen: false }),

  selectedCardId: null,
  selectedPane: null,
  openCard: (cardId, pane) =>
    set({ selectedCardId: cardId, selectedPane: pane ?? null }),
  closeCard: () => set({ selectedCardId: null, selectedPane: null }),
}));
