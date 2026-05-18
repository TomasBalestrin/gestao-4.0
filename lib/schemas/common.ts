import { z } from "zod";

// UUID com validação de formato apenas (8-4-4-4-12 hex) — sem exigir os bits
// de versão/variante RFC, ao contrário de z.string().uuid() no Zod 4. Isso
// aceita tanto UUIDs reais quanto os IDs "didáticos" do seed (1111…, 2222…).
export const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "ID inválido"
  );
