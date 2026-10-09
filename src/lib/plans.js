/**
 * Arquitetura Central de Planos e Limites (SaaS Multi-Tenancy)
 * Kupola 2.0 - Matriz Oficial
 *
 * BASIC: R$ 39,90/mês | 1 barbeiro | 1 unidade
 * PRO: R$ 79,90/mês (MAIS ESCOLHIDO) | até 4 barbeiros | 1 unidade
 * PREMIUM: R$ 129,90/mês | até 10 barbeiros por unidade | multiunidade
 */

export const PLANS = {
  starter: {
    id: "starter",
    name: "BASIC",
    fullName: "Plano BASIC",
    shortName: "BASIC",
    category: "Individual",
    badge: "Plano Individual",
    tagline: "Ideal para 1 barbeiro ou cadeira individual.",
    priceText: "R$ 39,90/mês",
    pricingSub: "Cobrança mensal após o período de teste",
    trialText: "7 dias de teste grátis liberado",
    period: "mês",
    amount: 39.90,
    price: 39.90,
    maxBarbers: 1,
    max_barbers: 1,
    maxUnits: 1,
    max_units: 1,
    multiUnit: false,
    multi_unit: false,
    consolidated_dashboard: false,
    canAccessFees: false,        // Bloqueado: Gestão avançada de taxas
    canAccessDRE: false,         // Bloqueado: DRE Avançada
    canAccessMultiUnit: false,   // Bloqueado: Rede Multiunidades
    color: "#94A3B8",
    badgeBg: "bg-slate-800/80 text-slate-300 border-slate-700",
    highlights: [
      "1 barbeiro ativo",
      "1 unidade cadastrada",
      "Agenda inteligente de horários",
      "Controle financeiro essencial",
    ],
    features: [
      { text: "1 barbeiro ativo", included: true },
      { text: "1 unidade cadastrada", included: true },
      { text: "Agenda inteligente de horários", included: true },
      { text: "Cadastro de clientes e histórico", included: true },
      { text: "Controle financeiro essencial", included: true },
      { text: "Até 4 barbeiros cadastrados", included: false, badge: "Plano PRO" },
      { text: "Acessos individuais no celular para barbeiros", included: false, badge: "Plano PRO" },
      { text: "Desconto automático de taxas de cartão", included: false, badge: "Plano PRO" },
      { text: "Gestão multiunidades (Rede)", included: false, badge: "Plano PREMIUM" },
    ],
    blockedModules: [
      {
        key: "taxas",
        title: "Comparador & Simulador de Maquininhas",
        description: "Descubra qual máquina deixa mais lucro no seu bolso a cada atendimento no débito, crédito ou PIX.",
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
    name: "PRO",
    fullName: "Plano PRO",
    shortName: "PRO",
    category: "Equipe",
    badge: "MAIS ESCOLHIDO",
    tagline: "Para barbearias com até 4 barbeiros com rateio de comissões.",
    priceText: "R$ 79,90/mês",
    pricingSub: "Cobrança mensal após o período de teste",
    trialText: "7 dias de teste grátis liberado",
    subtext: "Ativação instantânea • Sem cartão de crédito",
    period: "mês",
    amount: 79.90,
    price: 79.90,
    maxBarbers: 4,
    max_barbers: 4,
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
      "Até 4 barbeiros cadastrados",
      "1 unidade cadastrada",
      "Acessos individuais no celular para cada barbeiro",
      "Cálculo e rateio automático de comissões",
      "Desconto automático de taxas de cartão",
    ],
    features: [
      { text: "Até 4 barbeiros cadastrados", included: true },
      { text: "1 unidade cadastrada", included: true },
      { text: "Acessos individuais no celular para cada barbeiro", included: true },
      { text: "Cálculo e rateio de comissões por serviço/produto", included: true },
      { text: "Desconto automático de taxas de cartão", included: true },
      { text: "Gestão de estoque & produtos", included: true },
      { text: "DRE gerencial e margem do proprietário", included: true },
      { text: "Gestão multiunidades (Rede)", included: false, badge: "Plano PREMIUM" },
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
    name: "PREMIUM",
    fullName: "Plano PREMIUM",
    shortName: "PREMIUM",
    category: "Rede & Expansão",
    badge: "Rede & Expansão",
    tagline: "Para grandes equipes e operações multiunidades.",
    priceText: "R$ 129,90/mês",
    pricingSub: "Cobrança mensal após o período de teste",
    trialText: "7 dias de teste grátis liberado",
    period: "mês",
    amount: 129.90,
    price: 129.90,
    maxBarbers: 10,
    max_barbers: 10,
    maxUnits: 10,
    max_units: 10,
    multiUnit: true,
    multi_unit: true,
    consolidated_dashboard: true,
    canAccessFees: true,
    canAccessDRE: true,
    canAccessMultiUnit: true,
    color: "#F59E0B",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    highlights: [
      "Até 10 barbeiros por unidade",
      "Gestão Multi-Unidades (Rede de Barbearias)",
      "Painel consolidado da rede",
      "DRE gerencial avançado e centro de custos",
      "Suporte prioritário dedicado",
    ],
    features: [
      { text: "Até 10 barbeiros por unidade", included: true },
      { text: "Gestão Multi-Unidades (Rede de Barbearias)", included: true },
      { text: "Painel consolidado da rede de barbearias", included: true },
      { text: "DRE gerencial avançado e centro de custos", included: true },
      { text: "Suporte prioritário e integração dedicada", included: true },
      { text: "Todas as funcionalidades do Plano PRO", included: true },
    ],
    blockedModules: [],
  },
};

// Aliases para compatibilidade
PLANS.basic = PLANS.starter;

export const getPlan = (planId) => {
  if (planId === "basic" || planId === "starter") return PLANS.starter;
  if (planId === "pro") return PLANS.pro;
  if (planId === "premium") return PLANS.premium;
  return PLANS.pro;
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

export const isBarberLimitReached = (planId, currentCount, unitsCount = 1) => {
  const plan = getPlan(planId);
  const max = plan.multi_unit ? plan.maxBarbers * Math.max(1, unitsCount) : plan.maxBarbers;
  return currentCount >= max;
};
