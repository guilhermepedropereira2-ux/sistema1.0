export const brl = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export const num = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pct = (v) => `${(Number(v) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const monthLabel = (ym) => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} de ${y}`;
};

export const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = iso.length > 10 ? new Date(iso) : new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
};

export const fmtDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR");
};

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const PERIOD_OPTIONS = [
  { value: "hoje", label: "Hoje" },
  { value: "ontem", label: "Ontem" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "personalizado", label: "Personalizado" },
];

export const periodRange = (key, custom) => {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === "hoje") return { start: iso(t), end: iso(t) };
  if (key === "ontem") { const y = new Date(t); y.setDate(t.getDate() - 1); return { start: iso(y), end: iso(y) }; }
  if (key === "semana") { const s = new Date(t); s.setDate(t.getDate() - t.getDay()); return { start: iso(s), end: iso(t) }; }
  if (key === "mes_anterior") {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: iso(s), end: iso(e) };
  }
  if (key === "personalizado" && custom?.start && custom?.end) return { start: custom.start, end: custom.end };
  // mes (default)
  const s = new Date(now.getFullYear(), now.getMonth(), 1);
  const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: iso(s), end: iso(e) };
};

export const monthRange = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const s = new Date(y, m - 1, 1);
  const e = new Date(y, m, 0);
  return { start: iso(s), end: iso(e) };
};

export const PAYMENT_TYPES = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "debito", label: "Débito" },
  { value: "credito_vista", label: "Crédito à vista" },
  { value: "credito_parcelado", label: "Crédito parcelado" },
];

export const paymentTypeLabel = (v) =>
  PAYMENT_TYPES.find((p) => p.value === v)?.label || v;
