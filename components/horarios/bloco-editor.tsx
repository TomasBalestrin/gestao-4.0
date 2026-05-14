export interface Bloco {
  inicio: string; // "HH:mm"
  fim: string; // "HH:mm"
}

export function blocosOverlap(blocos: Bloco[]): boolean {
  const sorted = [...blocos]
    .filter((b) => b.inicio && b.fim)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.inicio < sorted[i - 1]!.fim) return true;
  }
  return false;
}
