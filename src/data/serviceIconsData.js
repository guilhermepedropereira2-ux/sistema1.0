/**
 * serviceIconsData.js
 * Biblioteca Oficial de Ícones de Serviços KUPOLA 2.0
 * Padrão vetorial SaaS comercial profissional.
 * Ícones objetivos, sem rostos, sem cabeças, traço limpo 2px.
 */

export const SERVICE_ICON_CATEGORIES = [
  { id: "todos", label: "Todos" },
  { id: "cortes", label: "Cortes" },
  { id: "fade", label: "Fade" },
  { id: "barba", label: "Barba" },
  { id: "combos", label: "Combos" },
  { id: "sobrancelha", label: "Sobrancelha" },
  { id: "outros", label: "Outros" },
];

export const SERVICE_ICONS = [
  // ==========================================
  // CORTES
  // ==========================================
  {
    id: "scissors-comb",
    aliasId: "corte_tradicional",
    name: "Corte Tradicional",
    category: "cortes",
    categories: ["cortes"],
    iconType: "scissors-comb",
    keywords: ["corte", "tradicional", "tesoura", "pente", "classico", "social"],
    description: "Ícone: tesoura + pente. Corte clássico masculino.",
  },
  {
    id: "comb-clipper",
    aliasId: "corte_social",
    name: "Corte Social",
    category: "cortes",
    categories: ["cortes"],
    iconType: "comb-clipper",
    keywords: ["social", "corte", "pente", "maquina", "executivo"],
    description: "Ícone: pente + máquina. Alinhamento formal.",
  },
  {
    id: "clipper-degrade",
    aliasId: "degrade",
    name: "Degradê",
    category: "fade",
    categories: ["fade", "cortes"],
    iconType: "clipper",
    keywords: ["degrade", "fade", "maquina", "corte", "disfarce"],
    description: "Ícone: máquina de corte. Transição gradual nas laterais.",
  },
  {
    id: "clipper-low-fade",
    aliasId: "low_fade",
    name: "Low Fade",
    category: "fade",
    categories: ["fade"],
    iconType: "clipper",
    keywords: ["low fade", "fade", "baixo", "maquina", "degrade"],
    description: "Ícone: máquina de corte. Degradê na base inferior.",
  },
  {
    id: "clipper-mid-fade",
    aliasId: "mid_fade",
    name: "Mid Fade",
    category: "fade",
    categories: ["fade"],
    iconType: "clipper",
    keywords: ["mid fade", "fade", "medio", "maquina", "degrade"],
    description: "Ícone: máquina de corte. Degradê na altura média.",
  },
  {
    id: "clipper-high-fade",
    aliasId: "high_fade",
    name: "High Fade",
    category: "fade",
    categories: ["fade"],
    iconType: "clipper",
    keywords: ["high fade", "fade", "alto", "maquina", "degrade"],
    description: "Ícone: máquina de corte. Degradê alto próximo ao topo.",
  },
  {
    id: "trimmer-taper",
    aliasId: "taper_fade",
    name: "Taper Fade",
    category: "fade",
    categories: ["fade"],
    iconType: "trimmer",
    keywords: ["taper fade", "taper", "acabamento", "fade", "maquina"],
    description: "Ícone: máquina de acabamento. Disfarce pontual.",
  },
  {
    id: "razor-skin-fade",
    aliasId: "skin_fade",
    name: "Skin Fade",
    category: "fade",
    categories: ["fade"],
    iconType: "razor",
    keywords: ["skin fade", "zero", "navalha", "pele", "fade"],
    description: "Ícone: navalha. Raspado até a pele.",
  },

  // ==========================================
  // BARBA
  // ==========================================
  {
    id: "razor-barba",
    aliasId: "barba",
    name: "Barba",
    category: "barba",
    categories: ["barba"],
    iconType: "razor",
    keywords: ["barba", "navalha", "barbear", "barboterapia"],
    description: "Ícone: navalha. Alinhamento e barbear clássico.",
  },
  {
    id: "razor-comb-modelada",
    aliasId: "barba_modelada",
    name: "Barba Modelada",
    category: "barba",
    categories: ["barba"],
    iconType: "razor-comb",
    keywords: ["barba", "modelada", "navalha", "pente", "desenho"],
    description: "Ícone: navalha + pente. Design e alinhamento de barba.",
  },
  {
    id: "comb-razor-completa",
    aliasId: "barba_completa",
    name: "Barba Completa",
    category: "barba",
    categories: ["barba"],
    iconType: "comb-razor",
    keywords: ["barba", "completa", "pente", "navalha", "terapia"],
    description: "Ícone: pente + navalha. Tratamento e contorno integral.",
  },

  // ==========================================
  // COMBINAÇÕES (COMBOS)
  // ==========================================
  {
    id: "scissors-razor-combo",
    aliasId: "corte_barba",
    name: "Corte + Barba",
    category: "combos",
    categories: ["combos"],
    iconType: "scissors-razor",
    keywords: ["corte", "barba", "combo", "tesoura", "navalha"],
    description: "Ícone: tesoura + navalha. Combo completo de cabelo e barba.",
  },
  {
    id: "scissors-eyebrow-combo",
    aliasId: "corte_sobrancelha",
    name: "Corte + Sobrancelha",
    category: "combos",
    categories: ["combos", "sobrancelha"],
    iconType: "scissors-eyebrow",
    keywords: ["corte", "sobrancelha", "combo", "tesoura"],
    description: "Ícone: tesoura + símbolo de sobrancelha.",
  },
  {
    id: "combo-trio",
    aliasId: "corte_barba_sobrancelha",
    name: "Corte + Barba + Sobrancelha",
    category: "combos",
    categories: ["combos"],
    iconType: "combo-trio",
    keywords: ["corte", "barba", "sobrancelha", "combo", "trio", "completo"],
    description: "Ícone: tesoura + navalha + sobrancelha. Serviço VIP completo.",
  },

  // ==========================================
  // OUTROS & SOBRANCELHA
  // ==========================================
  {
    id: "eyebrow-single",
    aliasId: "sobrancelha",
    name: "Sobrancelha",
    category: "sobrancelha",
    categories: ["sobrancelha", "outros"],
    iconType: "eyebrow",
    keywords: ["sobrancelha", "design", "alinhamento", "pinça", "navalha"],
    description: "Ícone: símbolo de sobrancelha. Design e limpeza facial.",
  },
  {
    id: "trimmer-acabamento",
    aliasId: "acabamento",
    name: "Acabamento",
    category: "outros",
    categories: ["outros"],
    iconType: "trimmer",
    keywords: ["acabamento", "maquina", "pezinho", "contorno"],
    description: "Ícone: máquina de acabamento. Ajuste de contornos.",
  },
  {
    id: "trimmer-pezinho",
    aliasId: "pezinho",
    name: "Pezinho",
    category: "outros",
    categories: ["outros"],
    iconType: "trimmer",
    keywords: ["pezinho", "nuca", "costeleta", "maquina", "acabamento"],
    description: "Ícone: máquina de acabamento. Pezinho e alinhamento de nuca.",
  },
  {
    id: "razor-single",
    aliasId: "navalha",
    name: "Navalha",
    category: "outros",
    categories: ["outros"],
    iconType: "razor",
    keywords: ["navalha", "raspagem", "lâmina", "navalhete"],
    description: "Ícone: navalha clássica aberta.",
  },
  {
    id: "wash-service",
    aliasId: "lavagem",
    name: "Lavagem",
    category: "outros",
    categories: ["outros"],
    iconType: "wash",
    keywords: ["lavagem", "shampoo", "lavatorio", "cabelo", "agua"],
    description: "Ícone: shampoo / frasco + água.",
  },
  {
    id: "treatment-service",
    aliasId: "hidratacao",
    name: "Hidratação",
    category: "outros",
    categories: ["outros"],
    iconType: "treatment",
    keywords: ["hidratacao", "frasco", "produto", "creme", "terapia"],
    description: "Ícone: frasco de produto cosmético.",
  },
  {
    id: "pigment-service",
    aliasId: "pigmentacao",
    name: "Pigmentação",
    category: "outros",
    categories: ["outros"],
    iconType: "pigment",
    keywords: ["pigmentacao", "frasco", "aplicador", "tintura", "camuflagem"],
    description: "Ícone: frasco aplicador de pigmentação.",
  },
];

/**
 * Normaliza e busca metadados de um ícone de serviço KUPOLA.
 * Suporta busca por ID, aliasId, nome e palavras-chave.
 */
export function getServiceIconMeta(keyOrName) {
  if (!keyOrName) {
    return SERVICE_ICONS[0];
  }

  const raw = String(keyOrName).trim();
  const lower = raw.toLowerCase();

  // 1. Busca exata por id ou aliasId
  const byId = SERVICE_ICONS.find(
    (item) => item.id === raw || item.id === lower || item.aliasId === raw || item.aliasId === lower
  );
  if (byId) return byId;

  // 2. Busca exata por nome
  const byName = SERVICE_ICONS.find(
    (item) => item.name.toLowerCase() === lower
  );
  if (byName) return byName;

  // 3. Busca por tipo de ícone direto
  const byType = SERVICE_ICONS.find((item) => item.iconType === lower);
  if (byType) return byType;

  // 4. Mapeamento heurístico semântico
  if (lower.includes("barba") && lower.includes("sobrancelha")) {
    return SERVICE_ICONS.find((i) => i.id === "combo-trio") || SERVICE_ICONS[0];
  }
  if (lower.includes("corte") && lower.includes("barba")) {
    return SERVICE_ICONS.find((i) => i.id === "scissors-razor-combo") || SERVICE_ICONS[0];
  }
  if (lower.includes("barba") && lower.includes("corte")) {
    return SERVICE_ICONS.find((i) => i.id === "scissors-razor-combo") || SERVICE_ICONS[0];
  }
  if (lower.includes("sobrancelha") && lower.includes("corte")) {
    return SERVICE_ICONS.find((i) => i.id === "scissors-eyebrow-combo") || SERVICE_ICONS[0];
  }
  if (lower.includes("sobrancelha")) {
    return SERVICE_ICONS.find((i) => i.id === "eyebrow-single") || SERVICE_ICONS[0];
  }
  if (lower.includes("barba modelada")) {
    return SERVICE_ICONS.find((i) => i.id === "razor-comb-modelada") || SERVICE_ICONS[0];
  }
  if (lower.includes("barba completa") || lower.includes("barboterapia")) {
    return SERVICE_ICONS.find((i) => i.id === "comb-razor-completa") || SERVICE_ICONS[0];
  }
  if (lower.includes("barba")) {
    return SERVICE_ICONS.find((i) => i.id === "razor-barba") || SERVICE_ICONS[0];
  }
  if (lower.includes("low fade")) {
    return SERVICE_ICONS.find((i) => i.id === "clipper-low-fade") || SERVICE_ICONS[0];
  }
  if (lower.includes("mid fade")) {
    return SERVICE_ICONS.find((i) => i.id === "clipper-mid-fade") || SERVICE_ICONS[0];
  }
  if (lower.includes("high fade")) {
    return SERVICE_ICONS.find((i) => i.id === "clipper-high-fade") || SERVICE_ICONS[0];
  }
  if (lower.includes("taper")) {
    return SERVICE_ICONS.find((i) => i.id === "trimmer-taper") || SERVICE_ICONS[0];
  }
  if (lower.includes("skin fade")) {
    return SERVICE_ICONS.find((i) => i.id === "razor-skin-fade") || SERVICE_ICONS[0];
  }
  if (lower.includes("degrade") || lower.includes("fade")) {
    return SERVICE_ICONS.find((i) => i.id === "clipper-degrade") || SERVICE_ICONS[0];
  }
  if (lower.includes("social")) {
    return SERVICE_ICONS.find((i) => i.id === "comb-clipper") || SERVICE_ICONS[0];
  }
  if (lower.includes("acabamento")) {
    return SERVICE_ICONS.find((i) => i.id === "trimmer-acabamento") || SERVICE_ICONS[0];
  }
  if (lower.includes("pezinho")) {
    return SERVICE_ICONS.find((i) => i.id === "trimmer-pezinho") || SERVICE_ICONS[0];
  }
  if (lower.includes("navalha")) {
    return SERVICE_ICONS.find((i) => i.id === "razor-single") || SERVICE_ICONS[0];
  }
  if (lower.includes("lavagem") || lower.includes("shampoo")) {
    return SERVICE_ICONS.find((i) => i.id === "wash-service") || SERVICE_ICONS[0];
  }
  if (lower.includes("hidratacao") || lower.includes("tratamento")) {
    return SERVICE_ICONS.find((i) => i.id === "treatment-service") || SERVICE_ICONS[0];
  }
  if (lower.includes("pigmenta")) {
    return SERVICE_ICONS.find((i) => i.id === "pigment-service") || SERVICE_ICONS[0];
  }

  // Padrão: Corte Tradicional
  return SERVICE_ICONS[0];
}
