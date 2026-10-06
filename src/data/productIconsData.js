/**
 * productIconsData.js
 * Biblioteca Oficial de Ícones para Produtos KUPOLA 2.0
 * Baseada no gabarito visual aprovado (categorias: Cabelo, Barba, Ferramentas, Cuidados, Diversos)
 */

export const PRODUCT_ICON_CATEGORIES = [
  { id: "todos", label: "Todos" },
  { id: "cabelo", label: "Cabelo" },
  { id: "barba", label: "Barba" },
  { id: "ferramentas", label: "Ferramentas" },
  { id: "cuidados", label: "Cuidados" },
  { id: "diversos", label: "Diversos" },
];

export const PRODUCT_ICONS = [
  // ==========================================
  // CABELO
  // ==========================================
  {
    id: "pomada",
    name: "Pomada",
    category: "cabelo",
    keywords: ["pomada", "matte", "cabelo", "fixacao", "modelador"],
  },
  {
    id: "cera",
    name: "Cera",
    category: "cabelo",
    keywords: ["cera", "modeladora", "brilho", "cabelo"],
  },
  {
    id: "gel",
    name: "Gel",
    category: "cabelo",
    keywords: ["gel", "fixador", "cola", "cabelo"],
  },
  {
    id: "shampoo",
    name: "Shampoo",
    category: "cabelo",
    keywords: ["shampoo", "anticaspa", "limpeza", "cabelo", "lavagem"],
  },
  {
    id: "condicionador",
    name: "Condicionador",
    category: "cabelo",
    keywords: ["condicionador", "hidratacao", "cabelo"],
  },
  {
    id: "spray",
    name: "Spray",
    category: "cabelo",
    keywords: ["spray", "laque", "aerosol", "fixador"],
  },
  {
    id: "creme_capilar",
    name: "Creme Capilar",
    category: "cabelo",
    keywords: ["creme", "capilar", "pentear", "cabelo"],
  },
  {
    id: "mascara_capilar",
    name: "Máscara Capilar",
    category: "cabelo",
    keywords: ["mascara", "hidratacao", "nutricao", "cabelo"],
  },
  {
    id: "tonico_capilar",
    name: "Tônico Capilar",
    category: "cabelo",
    keywords: ["tonico", "crescimento", "queda", "capilar", "fortalecedor"],
  },
  {
    id: "leave_in",
    name: "Leave-in",
    category: "cabelo",
    keywords: ["leave-in", "leavein", "finalizador", "termico"],
  },

  // ==========================================
  // BARBA
  // ==========================================
  {
    id: "oleo_barba",
    name: "Óleo para Barba",
    category: "barba",
    keywords: ["oleo", "barba", "hidratante", "brilho"],
  },
  {
    id: "balm_barba",
    name: "Balm para Barba",
    category: "barba",
    keywords: ["balm", "barba", "pomada barba", "modelador barba"],
  },
  {
    id: "shampoo_barba",
    name: "Shampoo para Barba",
    category: "barba",
    keywords: ["shampoo barba", "espuma", "limpeza barba"],
  },
  {
    id: "condicionador_barba",
    name: "Condicionador para Barba",
    category: "barba",
    keywords: ["condicionador barba", "maciez"],
  },
  {
    id: "creme_barba",
    name: "Creme para Barba",
    category: "barba",
    keywords: ["creme barbear", "shaving", "gel barbear"],
  },
  {
    id: "pente_barba",
    name: "Pente de Barba",
    category: "barba",
    keywords: ["pente madeira", "pente barba", "alinhador"],
  },
  {
    id: "escova_barba",
    name: "Escova de Barba",
    category: "barba",
    keywords: ["escova cerdas", "escova barba"],
  },
  {
    id: "cera_bigode",
    name: "Cera para Bigode",
    category: "barba",
    keywords: ["bigode", "mustache", "cera bigode"],
  },
  {
    id: "hidratante_facial",
    name: "Hidratante Facial",
    category: "barba",
    keywords: ["hidratante", "rosto", "facial", "pele"],
  },
  {
    id: "esfoliante_facial",
    name: "Esfoliante Facial",
    category: "barba",
    keywords: ["esfoliante", "scrub", "rosto", "cravos"],
  },

  // ==========================================
  // FERRAMENTAS E ACESSÓRIOS
  // ==========================================
  {
    id: "maquina_corte",
    name: "Máquina de Corte",
    category: "ferramentas",
    keywords: ["maquina", "clipper", "trimmer", "corte", "motor"],
  },
  {
    id: "tesoura",
    name: "Tesoura",
    category: "ferramentas",
    keywords: ["tesoura", "fio navalha", "desbaste", "corte"],
  },
  {
    id: "navalha",
    name: "Navalha",
    category: "ferramentas",
    keywords: ["navalha", "navalhete", "lamina", "barbear"],
  },
  {
    id: "pente",
    name: "Pente",
    category: "ferramentas",
    keywords: ["pente", "carbono", "corte", "divisor"],
  },
  {
    id: "escova",
    name: "Escova",
    category: "ferramentas",
    keywords: ["escova", "cabelo", "redonda", "secador"],
  },
  {
    id: "pincel_barba",
    name: "Pincel para Barba",
    category: "ferramentas",
    keywords: ["pincel", "espuma", "barbear classico"],
  },
  {
    id: "borrifador",
    name: "Borrifador",
    category: "ferramentas",
    keywords: ["borrifador", "spray agua", "fumaca"],
  },
  {
    id: "toalha",
    name: "Toalha",
    category: "ferramentas",
    keywords: ["toalha", "toalha quente", "pano"],
  },
  {
    id: "capa_corte",
    name: "Capa de Corte",
    category: "ferramentas",
    keywords: ["capa", "avental", "protecao"],
  },
  {
    id: "pente_maquina",
    name: "Pente de Máquina",
    category: "ferramentas",
    keywords: ["guarda", "pente especial", "graduacao", "fade"],
  },

  // ==========================================
  // HIGIENE E CUIDADOS
  // ==========================================
  {
    id: "sabonete",
    name: "Sabonete",
    category: "cuidados",
    keywords: ["sabonete", "barra", "liquido", "banho"],
  },
  {
    id: "desodorante",
    name: "Desodorante",
    category: "cuidados",
    keywords: ["desodorante", "antitranspirante", "roll-on"],
  },
  {
    id: "perfume",
    name: "Perfume",
    category: "cuidados",
    keywords: ["perfume", "colonia", "fragrancia", "parfum"],
  },
  {
    id: "hidratante",
    name: "Hidratante",
    category: "cuidados",
    keywords: ["hidratante", "locao", "corpo", "maos"],
  },
  {
    id: "protetor_solar",
    name: "Protetor Solar",
    category: "cuidados",
    keywords: ["protetor solar", "fps", "solar", "filtro"],
  },
  {
    id: "alcool_gel",
    name: "Álcool em Gel",
    category: "cuidados",
    keywords: ["alcool", "gel", "antisseptico", "higiene"],
  },
  {
    id: "lencos_umedecidos",
    name: "Lenços Umedecidos",
    category: "cuidados",
    keywords: ["lencos", "toalhas umedecidas", "limpeza rapida"],
  },
  {
    id: "talco",
    name: "Talco",
    category: "cuidados",
    keywords: ["talco", "po", "antisseptico", "acabamento"],
  },
  {
    id: "pos_barba",
    name: "Loção Pós-Barba",
    category: "cuidados",
    keywords: ["pos-barba", "aftershave", "locao", "refrescante"],
  },
  {
    id: "agua_micelar",
    name: "Água Micelar",
    category: "cuidados",
    keywords: ["agua micelar", "tonico facial", "demaquilante"],
  },

  // ==========================================
  // DIVERSOS
  // ==========================================
  {
    id: "kit",
    name: "Kit",
    category: "diversos",
    keywords: ["kit", "presente", "combo", "conjunto"],
  },
  {
    id: "caixa_embalagem",
    name: "Caixa/Embalagem",
    category: "diversos",
    keywords: ["caixa", "embalagem", "pacote", "entrega"],
  },
  {
    id: "acessorio",
    name: "Acessório",
    category: "diversos",
    keywords: ["acessorio", "gravata", "broche", "detalhe"],
  },
  {
    id: "algodao",
    name: "Algodão",
    category: "diversos",
    keywords: ["algodao", "disco", "bolinha"],
  },
  {
    id: "hastes_flexiveis",
    name: "Hastes Flexíveis",
    category: "diversos",
    keywords: ["cotonete", "hastes", "higiene ouvido"],
  },
  {
    id: "escova_limpeza",
    name: "Escova de Limpeza",
    category: "diversos",
    keywords: ["espanador", "escovinha fade", "limpeza pescoco"],
  },
  {
    id: "cadeado",
    name: "Cadeado/Segurança",
    category: "diversos",
    keywords: ["cadeado", "seguranca", "armario", "trava"],
  },
  {
    id: "suporte",
    name: "Suporte",
    category: "diversos",
    keywords: ["suporte", "dock", "base", "bancada"],
  },
  {
    id: "sacola",
    name: "Sacola",
    category: "diversos",
    keywords: ["sacola", "bag", "compra", "embalagem"],
  },
  {
    id: "outros",
    name: "Outros",
    category: "diversos",
    keywords: ["outros", "geral", "variado"],
  },
  {
    id: "produto",
    name: "Produto",
    category: "diversos",
    keywords: ["produto", "padrao", "padrao kupola", "item"],
  },
];

/**
 * Encontra o ícone pelo ID ou tenta deduzir com base no nome do produto
 */
export function getProductIconMeta(iconKeyOrName) {
  if (!iconKeyOrName) {
    return PRODUCT_ICONS.find((i) => i.id === "produto") || PRODUCT_ICONS[0];
  }

  const normalized = String(iconKeyOrName).toLowerCase().trim();

  // 1. Busca exata por ID
  const byId = PRODUCT_ICONS.find((i) => i.id === normalized);
  if (byId) return byId;

  // 2. Busca exata por nome
  const byName = PRODUCT_ICONS.find((i) => i.name.toLowerCase() === normalized);
  if (byName) return byName;

  // 3. Busca inteligente por palavras-chave
  for (const item of PRODUCT_ICONS) {
    if (item.keywords.some((kw) => normalized.includes(kw))) {
      return item;
    }
  }

  // 4. Fallback padrão "produto"
  return PRODUCT_ICONS.find((i) => i.id === "produto") || PRODUCT_ICONS[0];
}
