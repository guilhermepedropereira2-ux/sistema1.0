/**
 * attendanceFilters.js
 * Módulo de regras e funções de filtragem da página Atendimentos KUPOLA 2.0.
 * Preparado para desacoplamento da interface e futura integração com API / Backend.
 */

// Data de referência do sistema KUPOLA 2.0 (ou data atual)
export const SYSTEM_REFERENCE_DATE = "2026-10-06";

/**
 * Converte string 'YYYY-MM-DD' para objeto Date sem problemas de fuso horário.
 */
export function parseDate(dateStr) {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Retorna string 'YYYY-MM-DD' a partir de Date.
 */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Calcula o intervalo de datas conforme o período pré-definido.
 */
export function getRangeForPeriod(period, refDateStr = SYSTEM_REFERENCE_DATE) {
  const ref = parseDate(refDateStr);

  switch (period) {
    case "hoje": {
      return { start: refDateStr, end: refDateStr };
    }
    case "ontem": {
      const yesterday = new Date(ref);
      yesterday.setDate(yesterday.getDate() - 1);
      const str = formatDate(yesterday);
      return { start: str, end: str };
    }
    case "7dias": {
      const past7 = new Date(ref);
      past7.setDate(past7.getDate() - 6);
      return { start: formatDate(past7), end: refDateStr };
    }
    case "30dias": {
      const past30 = new Date(ref);
      past30.setDate(past30.getDate() - 29);
      return { start: formatDate(past30), end: refDateStr };
    }
    default:
      return null;
  }
}

/**
 * Filtra a lista de atendimentos combinando todos os critérios ativos.
 */
export function filterAttendances(attendances = [], filters = {}) {
  const {
    period = "hoje",
    customStartDate = "",
    customEndDate = "",
    barberFilter = "all",
    paymentFilter = "all",
    statusFilter = "all",
    serviceFilter = "all",
    searchQuery = "",
  } = filters;

  return attendances.filter((att) => {
    // 1. Filtro de Período / Data
    if (period === "personalizado") {
      if (customStartDate && att.date < customStartDate) return false;
      if (customEndDate && att.date > customEndDate) return false;
    } else {
      const range = getRangeForPeriod(period);
      if (range) {
        if (att.date < range.start || att.date > range.end) {
          return false;
        }
      }
    }

    // 2. Filtro de Barbeiro
    if (barberFilter !== "all") {
      if (att.barberId !== barberFilter && att.barberName?.toLowerCase() !== barberFilter.toLowerCase()) {
        return false;
      }
    }

    // 3. Filtro de Status
    if (statusFilter !== "all") {
      if (att.status !== statusFilter) {
        return false;
      }
    }

    // 4. Filtro de Forma de Pagamento
    if (paymentFilter !== "all") {
      const p = paymentFilter.toLowerCase();
      const attMethod = (att.paymentMethod || "").toLowerCase();
      const attType = (att.paymentType || "").toLowerCase();

      if (p === "pix" && !attType.includes("pix") && !attMethod.includes("pix")) {
        return false;
      }
      if (p === "dinheiro" && !attType.includes("dinheiro") && !attMethod.includes("dinheiro")) {
        return false;
      }
      if (p === "ton" && !attType.includes("ton") && !attMethod.includes("ton")) {
        return false;
      }
      if (p === "stone" && !attType.includes("stone") && !attMethod.includes("stone")) {
        return false;
      }
      if (p === "infinitepay" && !attType.includes("infinitepay") && !attMethod.includes("infinitepay")) {
        return false;
      }
      if (p === "card" && !attType.includes("card") && !attMethod.includes("cartão")) {
        return false;
      }
    }

    // 5. Filtro de Serviço
    if (serviceFilter !== "all") {
      const s = serviceFilter.toLowerCase();
      const hasService = att.services?.some((srv) => srv.toLowerCase().includes(s));
      const hasLabel = att.serviceLabel?.toLowerCase().includes(s);
      if (!hasService && !hasLabel) {
        return false;
      }
    }

    // 6. Busca textual por cliente, barbeiro, serviço ou observações
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const clientMatch = att.clientName?.toLowerCase().includes(q);
      const barberMatch = att.barberName?.toLowerCase().includes(q);
      const serviceMatch = att.services?.some((srv) => srv.toLowerCase().includes(q)) || att.serviceLabel?.toLowerCase().includes(q);
      const notesMatch = att.notes?.toLowerCase().includes(q);
      if (!clientMatch && !barberMatch && !serviceMatch && !notesMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calcula a quantidade de filtros avançados ativos (diferentes do padrão).
 */
export function countActiveAdvancedFilters(filters = {}) {
  let count = 0;
  if (filters.statusFilter && filters.statusFilter !== "all") count++;
  if (filters.serviceFilter && filters.serviceFilter !== "all") count++;
  if (filters.barberFilter && filters.barberFilter !== "all") count++;
  if (filters.paymentFilter && filters.paymentFilter !== "all") count++;
  if (filters.period === "personalizado" && (filters.customStartDate || filters.customEndDate)) count++;
  return count;
}
