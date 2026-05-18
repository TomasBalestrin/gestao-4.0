import { toast } from "sonner";

// Feedback padronizado: sucesso verde por 3s, erro vermelho persistente
// (o usuário fecha no X). Use no lugar de toast.success/toast.error.
export function notifySuccess(message: string) {
  toast.success(message, { duration: 3000 });
}

export function notifyError(message: string) {
  toast.error(message, { duration: Infinity });
}

export function notifyInfo(message: string) {
  toast(message, { duration: 3000 });
}
