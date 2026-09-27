/**
 * Arquitetura Central de Planos e Limites (SaaS Multi-Tenancy)
 * KingPro - Sincronizado estritamente com a Landing Page
 */

export const PLANS = {
  starter: {
    id: "starter",
    name: "Plano Basic",
    fullName: "Plano Basic",
    shortName: "Basic",
    category: "Profissional Solo",
    badge: "Profissional Solo",
    tagline: "Ideal para 1 barbeiro ou cadeira individual.",
    priceText: "Valores sob consulta",
    pricingSub: "Consulte condições especiais no lançamento",
    trialText: "Comece com 7 dias de acesso liberado",
    period: "mês",
    amount: 79.90,
    price: 79.90,
    maxBarbers: 1,
    max_barbers: 1,
    maxUnits: 1,
    max_units: 1,
    multiUnit: false,
    multi_unit: false,
    consolidated_dashboard: false,
    canAccessFees: false,        // Bloqueado: Maquininhas & Taxas
    canAccessDRE: false,         // Bloqueado: DRE Avançada
    canAccessMultiUnit: false,   // Bloqueado: Rede Multi-Lojas
    color: "#94A3B8",
    badgeBg: "bg-slate-800/80 text-slate-300 border-slate-700",
    highlights: [
      "Até 1 barbeiro / cadeira",
      "Lançamentos e cortes ilimitados",
      "Fechamento diário e mensal automático",
      "Histórico financeiro essencial",
    ],
    features: [
      { text: "Até 1 barbeiro / cadeira", included: true },
      { text: "Lançamentos e cortes ilimitados", included: true },
      { text: "Fechamento diário e mensal automático", included: true },
      { text: "Histórico financeiro essencial", included: true },
      { text: "2 a 5 barbeiros cadastrados", included: false, badge: "Plano Pro" },
      { text: "Acessos individuais no celular para barbeiros", included: false, badge: "Plano Pro" },
      { text: "Desconto automático de taxas de cartão", included: false, badge: "Plano Pro" },
      { text: "Painel consolidado multiunidades", included: false, badge: "Plano Premium" },
    ],
    blockedModules: [
      {
        key: "taxas",
        title: "Comparador & Simulador de Maquininhas",
        description: "Descubra qual máquina deixa mais lucro no seu bolso a cada corte no débito, crédito ou PIX.",
        upgradeTo: "pro",
      },
      {
        key: "dre",
        title: "DRE Financeira & Margem Real do Proprietário",
        description: "Apuração gerencial de receitas líquidas, margem de contribuição e lucro do proprietário.",
        upgradeTo: "pro",
      },
      {
        key: "multi_unidades",
        title: "Gestão Multi-Unidades (Rede de Barbearias)",
        description: "Controle centralizado com seletor de lojas e visão consolidada de faturamento e lucro.",
        upgradeTo: "premium",
      },
    ],
  },
  pro: {
    id: "pro",
    name: "Plano Pro",
    fullName: "Plano Pro",
    shortName: "Pro",
    category: "Equipas em Expansão",
    badge: "Mais Escolhido",
    tagline: "Para barbearias de 2 a 5 barbeiros com rateio de comissões.",
    priceText: "Valores sob consulta",
    pricingSub: "Condições exclusivas para novas barbearias",
    trialText: "Comece com 7 dias de acesso liberado",
    subtext: "Ativação instantânea • Sem cartão de crédito",
    period: "mês",
    amount: 169.90,
    price: 169.90,
    maxBarbers: 5,
    max_barbers: 5,
    maxUnits: 1,
    max_units: 1,
    multiUnit: false,
    multi_unit: false,
    consolidated_dashboard: false,
    canAccessFees: true,         // Liberado
    canAccessDRE: true,          // Liberado
    canAccessMultiUnit: false,   // Bloqueado
    color: "#D4AF37",
    badgeBg: "bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30",
    highlights: [
      "2 a 5 barbeiros cadastrados",
      "Acessos individuais no celular para cada barbeiro",
      "Rateio personalizado por serviço ou produto",
      "Desconto automático de taxas de cartão",
      "Exportação de relatórios em PDF para Pix",
    ],
    features: [
      { text: "2 a 5 barbeiros cadastrados", included: true },
      { text: "Acessos individuais no celular para cada barbeiro", included: true },
      { text: "Rateio personalizado por serviço ou produto", included: true },
      { text: "Desconto automático de taxas de cartão", included: true },
      { text: "Exportação de relatórios em PDF para Pix", included: true },
      { text: "Gestão de estoque & produtos", included: true },
      { text: "Painel consolidado multiunidades", included: false, badge: "Plano Premium" },
    ],
    blockedModules: [
      {
        key: "multi_unidades",
        title: "Gestão Multi-Unidades (Rede de Barbearias)",
        description: "Controle filiais, comissões isoladas por loja e visão unificada do negócio.",
        upgradeTo: "premium",
      },
    ],
  },
  premium: {
    id: "premium",
    name: "Plano Premium",
    fullName: "Plano Premium",
    shortName: "Premium",
    category: "Grandes Operações",
    badge: "Grandes Operações",
    tagline: "Para 6+ cadeiras ou estabelecimentos multiunidades.",
    priceText: "Valores sob consulta",
    pricingSub: "Atendimento personalizado para redes",
    trialText: "Comece com 7 dias de acesso liberado",
    period: "mês",
    amount: 299.90,
    price: 299.90,
    maxBarbers: 999,
    max_barbers: 999,
    maxUnits: 5,
    max_units: 5,
    multiUnit: true,
    multi_unit: true,
    consolidated_dashboard: true,
    canAccessFees: true,
    canAccessDRE: true,
    canAccessMultiUnit: true,
    color: "#F59E0B",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    highlights: [
      "Barbeiros ilimitados (6+ cadeiras)",
      "Painel consolidado multiunidades",
      "DRE gerencial avançado e centro de custos",
      "Suporte prioritário e integração dedicada",
    ],
    features: [
      { text: "Barbeiros ilimitados (6+ cadeiras)", included: true },
      { text: "Painel consolidado multiunidades", included: true },
      { text: "DRE gerencial avançado e centro de custos", included: true },
      { text: "Suporte prioritário e integração dedicada", included: true },
      { text: "Todas as funcionalidades do Plano Pro", included: true },
    ],
    blockedModules: [],
  },
};

// Aliases para máxima compatibilidade
PLANS.basic = PLANS.starter;

export const getPlan = (planId) => {
  if (planId === "basic") return PLANS.starter;
  return PLANS[planId] || PLANS.pro;
};

export const canAccessFeature = (planId, featureKey) => {
  const plan = getPlan(planId);
  if (featureKey === "fees" || featureKey === "taxas" || featureKey === "maquininhas") {
    return plan.canAccessFees;
  }
  if (featureKey === "dre" || featureKey === "fluxo_dre") {
    return plan.canAccessDRE;
  }
  if (featureKey === "multi_unit" || featureKey === "rede" || featureKey === "multi_unidades") {
    return plan.canAccessMultiUnit;
  }
  return true;
};

export const isBarberLimitReached = (planId, currentCount) => {
  const plan = getPlan(planId);
  return currentCount >= plan.maxBarbers;
};
