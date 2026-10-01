/**
 * paymentChannels.js
 * Configurações e regras de negócio para a hierarquia Canal -> Método de Pagamento.
 * 
 * Regras:
 * 1. Campo 1: "Meio de Recebimento" (Canal/Destino)
 *    - Caixa Físico / Dinheiro (padrão do sistema)
 *    - Maquininhas ativas da barbearia (carregadas dinamicamente: Ton, Stone, InfinitePay, Maquininha Balcão, etc.)
 *    - Fallback: "Outra Maquininha / Cartão" se nenhuma maquininha estiver cadastrada
 *    - Pix Direto / Conta Bancária (se houver conta/chave cadastrada)
 * 
 * 2. Campo 2: "Forma de Pagamento" (Modalidade)
 *    - Se "Caixa Físico / Dinheiro":
 *        Fixa automaticamente em: "Dinheiro" (cash)
 *    - Se qualquer Maquininha cadastrada (ou fallback):
 *        Exibe apenas modalidades de terminal/maquininha:
 *          * Cartão de Crédito (credit_card)
 *          * Cartão de Débito (debit_card)
 *          * Pix no Terminal (terminal_pix)
 *    - Se "Pix Direto / Conta Bancária":
 *        Fixa automaticamente em: "Pix Direto" (direct_pix)
 */

export const TERMINAL_PAYMENT_METHODS = [
  { id: "credit_card", label: "Cartão de Crédito", legacyType: "credito_vista" },
  { id: "debit_card", label: "Cartão de Débito", legacyType: "debito" },
  { id: "terminal_pix", label: "Pix no Terminal", legacyType: "pix" },
];

export const CASH_PAYMENT_METHODS = [
  { id: "cash", label: "Dinheiro", legacyType: "dinheiro" },
];

export const DIRECT_PIX_PAYMENT_METHODS = [
  { id: "direct_pix", label: "Pix Direto", legacyType: "pix" },
];

/**
 * Constrói dinamicamente a lista de canais/meios de recebimento com base nas formas cadastradas da barbearia
 * @param {Array} paymentMethods Lista de payment_methods da barbearia retornadas por /api/payment-methods
 * @returns {{ channels: Array, hasMachines: boolean, hasPix: boolean }}
 */
export function buildDynamicChannels(paymentMethods = [], options = {}) {
  const { isBarber = false } = options;
  const safeMethods = Array.isArray(paymentMethods) ? paymentMethods : [];

  // 1. Caixa Físico / Dinheiro (padrão do sistema)
  const cashPm = safeMethods.find((p) => p.active !== false && p.kind === "dinheiro");
  const channels = [
    {
      id: "caixa_fisico",
      name: "Caixa Físico / Dinheiro",
      kind: "cash",
      pmId: cashPm?.id || "pm_dinheiro",
    },
  ];

  // 2. Maquininhas ativas da barbearia
  const activeMachines = safeMethods.filter(
    (p) => p.active !== false && (p.kind === "maquininha" || p.kind === "cartao")
  );

  const hasMachines = activeMachines.length > 0;

  if (hasMachines) {
    activeMachines.forEach((m) => {
      channels.push({
        id: m.id,
        name: m.name,
        kind: "terminal",
        pmId: m.id,
        fees: m.fees || {},
        settlement_days: m.settlement_days || {},
        isCustomMachine: true,
      });
    });
  } else if (!isBarber) {
    // Fallback Seguro exclusivo para Dono/Admin: Se a barbearia ainda não tiver nenhuma maquininha cadastrada
    channels.push({
      id: "outra_maquininha",
      name: "Outra Maquininha / Cartão",
      kind: "terminal",
      pmId: null,
      isFallback: true,
    });
  }

  // 3. Pix Direto / Conta Bancária
  const pixPm = safeMethods.find(
    (p) => p.active !== false && (p.kind === "pix" || p.kind === "conta" || p.kind === "banco")
  );
  const hasPix = !!pixPm || safeMethods.length === 0;

  if (hasPix) {
    const pixName = pixPm?.name && pixPm.name !== "PIX"
      ? `Pix Direto / Conta Bancária (${pixPm.name})`
      : "Pix Direto / Conta Bancária";

    channels.push({
      id: "pix_direto",
      name: pixName,
      kind: "transfer",
      pmId: pixPm?.id || "pm_pix",
    });
  }

  return {
    channels,
    hasMachines,
    hasPix,
  };
}

/**
 * Retorna as formas de pagamento disponíveis com base no canal selecionado
 */
export function getAvailableMethodsForChannel(channelId, paymentMethods = []) {
  if (!channelId || channelId === "caixa_fisico") {
    return CASH_PAYMENT_METHODS;
  }
  if (channelId === "pix_direto") {
    return DIRECT_PIX_PAYMENT_METHODS;
  }

  // Verifica se o canal é um payment method do tipo dinheiro ou pix
  if (Array.isArray(paymentMethods)) {
    const pm = paymentMethods.find((p) => p.id === channelId);
    if (pm) {
      if (pm.kind === "dinheiro") return CASH_PAYMENT_METHODS;
      if (pm.kind === "pix") return DIRECT_PIX_PAYMENT_METHODS;
    }
  }

  // Se for qualquer maquininha (cadastrada ou fallback)
  return TERMINAL_PAYMENT_METHODS;
}

/**
 * Retorna o método de pagamento padrão para um canal
 */
export function getDefaultMethodForChannel(channelId, paymentMethods = []) {
  const available = getAvailableMethodsForChannel(channelId, paymentMethods);
  return available[0]?.id || "cash";
}

/**
 * Mapeia (channelId, methodId) para o legacy payment_type usado nas taxas e conciliações
 */
export function toLegacyPaymentType(channelId, methodId) {
  if (channelId === "caixa_fisico" || methodId === "cash" || methodId === "dinheiro") {
    return "dinheiro";
  }
  if (
    channelId === "pix_direto" ||
    methodId === "direct_pix" ||
    methodId === "terminal_pix" ||
    methodId === "pix"
  ) {
    return "pix";
  }
  if (methodId === "debit_card" || methodId === "debito") {
    return "debito";
  }
  if (
    methodId === "credit_card" ||
    methodId === "credito_vista" ||
    methodId === "credito_parcelado"
  ) {
    return "credito_vista";
  }
  return "dinheiro";
}

/**
 * Retorna rótulo amigável combinando canal e método
 * Ex: "Stone - Cartão de Crédito" ou "Caixa Físico / Dinheiro"
 */
export function formatChannelMethodLabel(channelName, methodName) {
  if (!channelName && !methodName) return "Dinheiro";
  if (!channelName) return methodName || "Dinheiro";
  if (!methodName) return channelName;

  const lowerCh = channelName.toLowerCase();
  if (lowerCh.includes("caixa") || lowerCh.includes("gaveta")) {
    return `${channelName} (Dinheiro)`;
  }
  if (lowerCh.includes("pix direto") || lowerCh.includes("conta bancária") || lowerCh.includes("transferência")) {
    return `${channelName} (Pix Direto)`;
  }
  return `${channelName} (${methodName})`;
}

/**
 * Retorna o nome amigável do método a partir do ID
 */
export function getMethodNameById(methodId) {
  const all = [
    ...CASH_PAYMENT_METHODS,
    ...TERMINAL_PAYMENT_METHODS,
    ...DIRECT_PIX_PAYMENT_METHODS,
  ];
  const found = all.find((m) => m.id === methodId);
  if (found) return found.label;
  if (methodId === "dinheiro" || methodId === "cash") return "Dinheiro";
  if (methodId === "pix" || methodId === "direct_pix") return "Pix Direto";
  if (methodId === "terminal_pix") return "Pix no Terminal";
  if (methodId === "debito" || methodId === "debit_card") return "Cartão de Débito";
  if (
    methodId === "credito_vista" ||
    methodId === "credito_parcelado" ||
    methodId === "credit_card"
  ) {
    return "Cartão de Crédito";
  }
  return methodId || "Dinheiro";
}

/**
 * Retorna o nome amigável do canal a partir do ID e da lista de maquininhas/métodos
 */
export function getChannelNameById(channelId, paymentMethods = []) {
  if (!channelId || channelId === "caixa_fisico") {
    return "Caixa Físico / Dinheiro";
  }
  if (channelId === "pix_direto") {
    return "Pix Direto / Conta Bancária";
  }
  if (channelId === "outra_maquininha") {
    return "Outra Maquininha / Cartão";
  }

  // Procura na lista de métodos passada
  if (Array.isArray(paymentMethods) && paymentMethods.length > 0) {
    const found = paymentMethods.find((p) => p.id === channelId);
    if (found) return found.name;
  }

  // Compatibilidade com IDs legados
  const legacyMap = {
    infinitepay: "InfinitePay",
    stone: "Stone",
    mercadopago: "Terminal POS",
    pagbank_outra: "PagBank / Outra Maquininha",
    ton: "Ton",
    pm_stone: "Stone",
    pm_ton: "Ton",
    pm_infinitepay: "InfinitePay",
    pm_dinheiro: "Caixa Físico / Dinheiro",
    pm_pix: "Pix Direto / Conta Bancária",
  };

  if (legacyMap[channelId]) {
    return legacyMap[channelId];
  }

  // Se o channelId já for um nome legível (ex: "Stone Barbearia")
  return channelId;
}
