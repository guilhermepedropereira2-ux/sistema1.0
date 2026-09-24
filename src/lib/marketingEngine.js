/**
 * Motor de Ocupação Ociosa (Marketing Dinâmico)
 * Parte do Backlog Estratégico do SaaS Barbearia
 * 
 * Objetivo: Migrar o excesso de demanda dos sábados (gargalo de cadeiras)
 * para dias de menor movimento (terças e quartas-feiras), aumentando a
 * produtividade média semanal sem inflar custos fixos.
 */

export const DAYS_OF_WEEK = [
  { id: "domingo", name: "Domingo", index: 0, typicallyIdle: true },
  { id: "segunda", name: "Segunda-feira", index: 1, typicallyIdle: true },
  { id: "terca", name: "Terça-feira", index: 2, typicallyIdle: true },
  { id: "quarta", name: "Quarta-feira", index: 3, typicallyIdle: true },
  { id: "quinta", name: "Quinta-feira", index: 4, typicallyIdle: false },
  { id: "sexta", name: "Sexta-feira", index: 5, typicallyIdle: false },
  { id: "sabado", name: "Sábado", index: 6, typicallyIdle: false },
];

/**
 * Regras padrões do Motor de Ocupação Ociosa
 */
export const DEFAULT_IDLE_PROMOTION_RULES = [
  {
    id: "promo_terca_quarta_gold",
    name: "Terça & Quarta Gold",
    description: "Desconto dinâmico de 15% em cortes e combos realizados em terças e quartas-feiras.",
    active: true,
    targetDays: [2, 3], // Terça e Quarta
    targetHours: { start: "09:00", end: "16:00" },
    discountType: "percentage", // "percentage" | "fixed"
    discountValue: 15,
    applicableTo: ["corte", "barba", "combo"],
    badgeLabel: "15% OFF Terça e Quarta",
    whatsappCopy: (shopName, link) =>
      `🔥 Evite filas no sábado! Agende seu horário de terça ou quarta na ${shopName} e ganhe 15% OFF exclusivo: ${link}`,
  },
  {
    id: "promo_combo_barba_quarta",
    name: "Quarta da Barba Terapia",
    description: "Upgrade gratuito de hidratação ou 20% OFF na barba para agendamentos na quarta-feira.",
    active: true,
    targetDays: [3], // Quarta
    targetHours: { start: "10:00", end: "19:00" },
    discountType: "percentage",
    discountValue: 20,
    applicableTo: ["barba", "barboterapia"],
    badgeLabel: "Quarta da Barboterapia",
    whatsappCopy: (shopName, link) =>
      `💈 Quarta é dia de Barba Alinhada na ${shopName}! Garanta 20% OFF agendando online: ${link}`,
  },
];

/**
 * Avalia se determinado dia da semana ou data tem promoção ociosa ativa
 * @param {Date|string} date
 * @param {Array} rules
 * @returns {Array} regras aplicáveis
 */
export function getActiveIdlePromotions(date, rules = DEFAULT_IDLE_PROMOTION_RULES) {
  const d = date ? new Date(date) : new Date();
  const dayOfWeek = d.getDay(); // 0 = Domingo, 2 = Terça, 3 = Quarta, 6 = Sábado
  const currentTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  return rules.filter((rule) => {
    if (!rule.active) return false;
    if (!rule.targetDays.includes(dayOfWeek)) return false;
    if (rule.targetHours) {
      if (currentTime < rule.targetHours.start || currentTime > rule.targetHours.end) {
        // Se estiver fora da faixa horária mas for no mesmo dia, ainda retorna para fins informativos
      }
    }
    return true;
  });
}

/**
 * Simula o ganho de faturamento balanceado ao migrar atendimentos de sábado para dias ociosos
 * @param {Object} metrics
 * @param {number} metrics.sabadoAtendimentos
 * @param {number} metrics.tercaQuartaAtendimentos
 * @param {number} metrics.capacidadeOciosaVagas
 * @returns {Object} projeção de impacto
 */
export function simulateOccupancyMigration({
  sabadoAtendimentos = 48,
  tercaQuartaAtendimentos = 18,
  capacidadeOciosaVagas = 30,
  ticketMedio = 45,
}) {
  const migracaoEstimada = Math.min(12, capacidadeOciosaVagas);
  const faturamentoAdicional = migracaoEstimada * ticketMedio * 4; // mês
  const reducaoEsperaSabadoMinutos = 25; // minutos economizados de fila no sábado

  return {
    migracaoEstimadaSemanal: migracaoEstimada,
    faturamentoAdicionalMensal: faturamentoAdicional,
    reducaoEsperaSabadoMinutos,
    capacidadeRecuperadaPercent: Math.round((migracaoEstimada / (capacidadeOciosaVagas || 1)) * 100),
  };
}
