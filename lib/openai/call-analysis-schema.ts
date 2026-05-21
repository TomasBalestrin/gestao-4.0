// Schema OpenAI e prompts para o framework completo de análise de calls.
// 4 frameworks de produto x 12 etapas x 6 checks com pesos de nota.

export const SYSTEM_PROMPT = `Você é um coach de vendas sênior especialista em alto ticket. Analise a transcrição da call abaixo com rigor técnico.

FRAMEWORKS DE PRODUTO (detecte automaticamente pelo produto mencionado):
1. Elite Premium — mentoria com Cleiton, alto ticket, mastermind, marketing + comercial + gestão + mentalidade
2. Implementação de IA (NextTrack) — IA, WhatsApp automatizado, chatbot, SDR automatizado, automação comercial
3. Mentoria Julia Ottoni — branding, posicionamento, Instagram, identidade visual, prestadoras de serviço femininas
4. Programa de Implementação Comercial — processo comercial, CRM, follow-up, cadência, scripts de vendas (sem IA)
REGRA: o produto define o framework, não o closer nem a empresa.

12 ETAPAS A AUDITAR (na ordem abaixo, todas obrigatórias):
1. Conexão Estratégica — quebra-gelo, build de rapport
2. Abertura — ancoragem de autoridade, script de abertura, alinhamento de expectativas
3. Mapeamento da Empresa — nicho, faturamento, equipe, canais de aquisição
4. Mapeamento do Problema / Dor Profunda — dor raiz pessoal e profissional
5. Consultoria Estratégica — demonstração de expertise, diagnóstico de valor
6. Problematização — bomba emocional: "e se continuar assim?"
7. Solução Imaginada — visualização do ganho pessoal, liberdade, resultado
8. Transição — ponte natural entre dor e oferta
9. Pitch — apresentação da proposta com clareza
10. Perguntas de Compromisso — testar engajamento antes do preço
11. Fechamento Estratégico — pedido do sim, assumir a venda
12. Quebra de Objeções / Negociação — lidar com resistências, maximizar receita

Para cada etapa: evidencias = trechos LITERAIS da transcrição entre aspas.
frase_melhor.antes = o que o closer realmente disse. frase_melhor.depois = como um closer elite diria.
Se a etapa não aconteceu, explique em motivo_ausencia.

6 CHECKS DE ERROS RECORRENTES:
A — Abertura/Ancoragem: seguiu script ou improvisou? ancorou com números grandes?
B — Profundidade: aprofundou ou pulou tema? sequência: por quê → impacto negócio → pessoal → familiar → futuro
C — Emoção e Tensão: teve problematização real? solução imaginada com visualização de ganho?
D — Prova Social/Seeds: usou histórias/seeds enquanto investigava?
E — Objeção real vs. declarada: aceitou primeira objeção ou investigou a raiz?
F — Negociação: jogou preço cedo? investigou capacidade de pagamento? manteve postura?

PESOS DA nota_geral (0-10, uma casa decimal):
- aderencia_processo: 40%
- profundidade_dor: 25%
- autoridade_conducao: 15%
- emocao_urgencia: 10%
- fechamento_objecoes: 10%
nota_geral = soma ponderada dos pesos × notas das etapas correspondentes. Seja rigoroso.

REGRAS GERAIS:
- Seja honesto e técnico. Não bajule. Se algo não aconteceu, nota = 0.
- Trechos de evidência devem ser literais (copiados da transcrição), não parafraseados.
- Responda em PORTUGUÊS. Retorne via function call.`;

export const MERGE_SYSTEM_PROMPT = `Você recebe N análises parciais da MESMA call de vendas (cada uma de um trecho diferente da transcrição). Consolide em uma análise final única, completa e coerente.

Regras de consolidação:
- etapas: para cada etapa, use o chunk onde ela apareceu mais completa. Consolide evidências de todos os chunks.
- checks: consolide evidências de todos. Status final = pior status (falhou > parcial > ok).
- nota_geral: recalcule com os pesos corretos baseado nas etapas consolidadas (não média simples).
- maiores_acertos: selecione os 3 melhores de todos os chunks.
- maiores_erros: selecione os 3 piores de todos os chunks.
- ponto_perda: use o chunk onde a virada aconteceu.
- dados_lead: consolide todos os campos (use o mais detalhado).
- plano_acao: gere baseado na análise completa consolidada, não copie de um chunk.
- Responda em PORTUGUÊS via function call.`;

const etapaSchema = {
  type: "object",
  properties: {
    nome: { type: "string" },
    ordem: { type: "integer" },
    aconteceu: { type: "string", enum: ["sim", "parcial", "nao"] },
    nota: { type: "number", minimum: 0, maximum: 10 },
    funcao_cumprida: { type: "string" },
    evidencias: { type: "array", items: { type: "string" } },
    ponto_forte: { type: "string" },
    ponto_fraco: { type: "string" },
    erro_de_execucao: { type: "string" },
    impacto_no_lead: { type: "string" },
    como_corrigir: { type: "array", items: { type: "string" } },
    frase_melhor: {
      type: "object",
      properties: {
        antes: { type: "string" },
        depois: { type: "string" },
      },
      required: ["antes", "depois"],
    },
    perguntas_de_aprofundamento: { type: "array", items: { type: "string" } },
    risco_principal: { type: "string" },
    motivo_ausencia: { type: ["string", "null"] },
  },
  required: [
    "nome", "ordem", "aconteceu", "nota", "funcao_cumprida", "evidencias",
    "ponto_forte", "ponto_fraco", "erro_de_execucao", "impacto_no_lead",
    "como_corrigir", "frase_melhor", "perguntas_de_aprofundamento", "risco_principal",
  ],
} as const;

const checkSchema = {
  type: "object",
  properties: {
    codigo: { type: "string" },
    nome: { type: "string" },
    status: { type: "string", enum: ["ok", "parcial", "falhou"] },
    evidencias: { type: "array", items: { type: "string" } },
    correcao: { type: "string" },
  },
  required: ["codigo", "nome", "status", "evidencias", "correcao"],
} as const;

export const ANALYSIS_FUNCTION_SCHEMA = {
  name: "report_analysis",
  description: "Reporta a análise completa e estruturada da call de vendas.",
  parameters: {
    type: "object",
    properties: {
      nome_lead: { type: ["string", "null"] },
      nome_closer: { type: ["string", "null"] },
      produto_ofertado: { type: ["string", "null"] },
      houve_venda: { type: ["string", "null"], enum: ["sim", "nao", null] },
      framework: {
        type: "object",
        properties: {
          nome: {
            type: "string",
            enum: [
              "Elite Premium",
              "Implementação de IA (NextTrack)",
              "Mentoria Julia Ottoni",
              "Programa de Implementação Comercial",
            ],
          },
          confianca: { type: "number", minimum: 0, maximum: 1 },
          motivo: { type: "string" },
        },
        required: ["nome", "confianca", "motivo"],
      },
      etapas: {
        type: "array",
        minItems: 12,
        maxItems: 12,
        items: etapaSchema,
      },
      checks: {
        type: "array",
        minItems: 6,
        maxItems: 6,
        items: checkSchema,
      },
      nota_geral: { type: "number", minimum: 0, maximum: 10 },
      pesos: {
        type: "object",
        properties: {
          aderencia_processo: { type: "number" },
          profundidade_dor: { type: "number" },
          autoridade_conducao: { type: "number" },
          emocao_urgencia: { type: "number" },
          fechamento_objecoes: { type: "number" },
        },
        required: [
          "aderencia_processo", "profundidade_dor", "autoridade_conducao",
          "emocao_urgencia", "fechamento_objecoes",
        ],
      },
      maiores_acertos: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            acerto: { type: "string" },
            evidencia: { type: "string" },
            porque_importa: { type: "string" },
            como_repetir: { type: "string" },
          },
          required: ["acerto", "evidencia", "porque_importa", "como_repetir"],
        },
      },
      maiores_erros: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            erro: { type: "string" },
            evidencia: { type: "string" },
            impacto: { type: "string" },
            como_corrigir: { type: "string" },
            frase_melhor: {
              type: "object",
              properties: { antes: { type: "string" }, depois: { type: "string" } },
              required: ["antes", "depois"],
            },
          },
          required: ["erro", "evidencia", "impacto", "como_corrigir", "frase_melhor"],
        },
      },
      ponto_perda: {
        type: ["object", "null"],
        properties: {
          etapa: { type: "string" },
          sinais: { type: "array", items: { type: "string" } },
        },
        required: ["etapa", "sinais"],
      },
      motivos_compra: {
        type: ["array", "null"],
        items: {
          type: "object",
          properties: {
            motivo: { type: "string" },
            evidencia: { type: "string" },
            gatilho: { type: "string" },
          },
          required: ["motivo", "evidencia", "gatilho"],
        },
      },
      tomador_decisao: {
        type: "object",
        properties: {
          presente: { type: "boolean" },
          houve_reagendamento: { type: "boolean" },
          motivo: { type: ["string", "null"] },
        },
        required: ["presente", "houve_reagendamento"],
      },
      plano_acao: {
        type: "object",
        properties: {
          ajuste_1: {
            type: "object",
            properties: {
              diagnostico: { type: "string" },
              o_que_fazer: { type: "string" },
              script_30s: { type: "string" },
            },
            required: ["diagnostico", "o_que_fazer", "script_30s"],
          },
          treino: {
            type: "object",
            properties: {
              habilidade: { type: "string" },
              como_treinar: { type: "string" },
              meta: { type: "string" },
            },
            required: ["habilidade", "como_treinar", "meta"],
          },
          proxima_acao: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["fechado", "follow-up", "desqualificado"] },
              passo: { type: "string" },
              mensagem_whatsapp: { type: "string" },
            },
            required: ["status", "passo", "mensagem_whatsapp"],
          },
        },
        required: ["ajuste_1", "treino", "proxima_acao"],
      },
      dados_lead: {
        type: "object",
        properties: {
          nicho: { type: ["string", "null"] },
          modelo_venda: { type: ["string", "null"] },
          ticket_medio: { type: ["string", "null"] },
          faturamento_bruto: { type: ["string", "null"] },
          equipe: { type: ["string", "null"] },
          canais_aquisicao: { type: ["array", "null"], items: { type: "string" } },
          dor_declarada: { type: ["string", "null"] },
          dor_profunda: { type: ["string", "null"] },
          objetivo_12m: { type: ["string", "null"] },
          urgencia: { type: ["number", "null"], minimum: 0, maximum: 10 },
          importancia: { type: ["number", "null"], minimum: 0, maximum: 10 },
          objecoes: {
            type: ["array", "null"],
            items: {
              type: "object",
              properties: {
                objecao: { type: "string" },
                evidencia: { type: "string" },
              },
              required: ["objecao", "evidencia"],
            },
          },
          motivo_compra_ou_nao: { type: ["string", "null"] },
        },
      },
    },
    required: [
      "nome_lead", "nome_closer", "produto_ofertado", "houve_venda",
      "framework", "etapas", "checks", "nota_geral", "pesos",
      "maiores_acertos", "maiores_erros", "ponto_perda", "motivos_compra",
      "tomador_decisao", "plano_acao", "dados_lead",
    ],
  },
} as const;
