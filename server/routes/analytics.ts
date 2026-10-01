import express from "express";
import { db, getUnitFilter } from "../db.js";
import { todayStr, parseDateStr, formatBRL } from "../types.js";

const router = express.Router();

router.get("/dashboard/summary", (req, res) => {
  const m = (req.query.month as string) || todayStr().slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let revs = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");
  let exps = db.expenses.filter((e) => e.due_date.startsWith(m));
  let wds = db.withdrawals.filter((w) => w.date.startsWith(m));

  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
    exps = exps.filter((e) => e.barbershop_id === unitFilter || (unitFilter === "unit_centro" && e.barbershop_id === "profile"));
    wds = wds.filter((w) => w.barbershop_id === unitFilter || (unitFilter === "unit_centro" && w.barbershop_id === "profile"));
  }

  const gross = Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const gross_original = Number(revs.reduce((acc, r) => acc + (r.gross_amount || 0), 0).toFixed(2));
  const fees = Number(revs.reduce((acc, r) => acc + (r.fee_amount || 0), 0).toFixed(2));
  const net = Number(revs.reduce((acc, r) => acc + (r.net_amount || 0), 0).toFixed(2));
  const commissions = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const shop = Number(revs.reduce((acc, r) => acc + (r.shop_amount || 0), 0).toFixed(2));
  const discounts = Number(revs.reduce((acc, r) => acc + (r.discount_amount || 0), 0).toFixed(2));
  const expenses_total = Number(exps.reduce((acc, e) => acc + (e.value || 0), 0).toFixed(2));
  const expenses_paid = Number(exps.filter((e) => e.payment_date).reduce((acc, e) => acc + (e.value || 0), 0).toFixed(2));
  const withdrawals_total = Number(wds.reduce((acc, w) => acc + (w.value || 0), 0).toFixed(2));
  const profit = Number((shop - expenses_total).toFixed(2));

  const available_now = Number(revs.filter((r) => r.settlement_date <= todayStr()).reduce((acc, r) => acc + (r.net_amount || 0), 0).toFixed(2));
  const to_receive = Number(revs.filter((r) => r.settlement_date > todayStr()).reduce((acc, r) => acc + (r.net_amount || 0), 0).toFixed(2));
  const cash_balance = Number((db.settings.initial_balance + available_now - expenses_paid - withdrawals_total).toFixed(2));

  const t = todayStr();
  const revsToday = revs.filter((r) => r.date === t);
  const faturamento_diario = Number(revsToday.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const atendimentos_hoje = revsToday.length;

  res.json({
    month: m,
    gross,
    gross_original,
    discounts,
    fees,
    net,
    commissions,
    shop,
    expenses_total,
    expenses_paid,
    withdrawals: withdrawals_total,
    profit,
    available_now,
    to_receive,
    cash_balance,
    revenue_count: revs.length,
    faturamento_diario,
    atendimentos_hoje,
    faturamento_hoje: faturamento_diario,
    total_atendimentos: atendimentos_hoje,
  });
});

router.get("/financial/metrics-polling", (req, res) => {
  const t = todayStr();
  const m = (req.query.month as string) || t.slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let revsMonth = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");
  let revsToday = db.revenues.filter((r) => r.date === t && r.status === "ativo");
  if (unitFilter) {
    revsMonth = revsMonth.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
    revsToday = revsToday.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
  }
  const faturamento_diario = Number(revsToday.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const total_atendimentos_hoje = revsToday.length;
  const faturamento_mes = Number(revsMonth.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const total_atendimentos_mes = revsMonth.length;
  const comissao_hoje = Number(revsToday.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));

  res.json({
    date: t,
    month: m,
    faturamento_diario,
    faturamento: faturamento_diario,
    faturamento_hoje: faturamento_diario,
    total_atendimentos: total_atendimentos_hoje,
    atendimentos: total_atendimentos_hoje,
    atendimentos_hoje: total_atendimentos_hoje,
    comissao_hoje,
    faturamento_mes,
    total_atendimentos_mes,
    atendimentos_mes: total_atendimentos_mes,
    last_synced_at: new Date().toISOString(),
  });
});

router.get("/dashboard/money-by-origin", (req, res) => {
  const m = (req.query.month as string) || todayStr().slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let revs = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");
  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
  }
  const origins: Record<string, { name: string; available: number; to_receive: number; total: number }> = {};

  revs.forEach((r) => {
    const key = r.payment_method_name || "Outros";
    if (!origins[key]) origins[key] = { name: key, available: 0, to_receive: 0, total: 0 };
    const amt = r.net_amount || 0;
    if (r.settlement_date <= todayStr()) origins[key].available += amt;
    else origins[key].to_receive += amt;
    origins[key].total += amt;
  });

  const result = Object.values(origins).map((o) => ({
    name: o.name,
    available: Number(o.available.toFixed(2)),
    to_receive: Number(o.to_receive.toFixed(2)),
    total: Number(o.total.toFixed(2)),
  }));
  result.sort((a, b) => b.total - a.total);
  res.json(result);
});

router.get("/dashboard/forecast", (req, res) => {
  const days = Number(req.query.days || 45);
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() + days);
  const limitStr = limitDate.toISOString().split("T")[0];
  const unitFilter = getUnitFilter(req);

  let revs = db.revenues.filter((r) => r.status === "ativo" && r.settlement_date > todayStr() && r.settlement_date <= limitStr);
  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
  }

  const buckets: Record<string, number> = {};
  revs.forEach((r) => {
    buckets[r.settlement_date] = Number(((buckets[r.settlement_date] || 0) + r.net_amount).toFixed(2));
  });

  const items = Object.keys(buckets)
    .sort()
    .map((date) => ({ date, amount: buckets[date] }));
  const total = Number(items.reduce((acc, i) => acc + i.amount, 0).toFixed(2));
  res.json({ items, total });
});

router.get("/dashboard/breakeven", (req, res) => {
  const m = (req.query.month as string) || todayStr().slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let exps = db.expenses.filter((e) => e.due_date.startsWith(m));
  let revs = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");

  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
    exps = exps.filter((e) => e.barbershop_id === unitFilter || (unitFilter === "unit_centro" && e.barbershop_id === "profile"));
  }

  const expTotal = exps.reduce((acc, e) => acc + e.value, 0);
  const commTotal = revs.reduce((acc, r) => acc + r.commission_amount, 0);
  const feesTotal = revs.reduce((acc, r) => acc + r.fee_amount, 0);
  const target = Number((expTotal + commTotal + feesTotal).toFixed(2));
  const current = Number(revs.reduce((acc, r) => acc + r.paid_amount, 0).toFixed(2));
  const pct = target > 0 ? Number(((current / target) * 100).toFixed(1)) : 100;

  res.json({
    target,
    current,
    reached: current >= target,
    progress: pct,
    missing: Math.max(0, Number((target - current).toFixed(2))),
  });
});

router.get("/dashboard/cashflow", (req, res) => {
  const m = (req.query.month as string) || todayStr().slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let revs = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");
  let exps = db.expenses.filter((e) => e.due_date.startsWith(m));
  let wds = db.withdrawals.filter((w) => w.date.startsWith(m));

  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
    exps = exps.filter((e) => e.barbershop_id === unitFilter || (unitFilter === "unit_centro" && e.barbershop_id === "profile"));
    wds = wds.filter((w) => w.barbershop_id === unitFilter || (unitFilter === "unit_centro" && w.barbershop_id === "profile"));
  }

  const inflow = Number(revs.reduce((acc, r) => acc + r.net_amount, 0).toFixed(2));
  const outflow = Number((exps.reduce((acc, e) => acc + e.value, 0) + wds.reduce((acc, w) => acc + w.value, 0)).toFixed(2));
  const initial = db.settings.initial_balance;

  const days: Record<string, { date: string; in: number; out: number }> = {};
  revs.forEach((r) => {
    const d = r.date;
    if (!days[d]) days[d] = { date: d, in: 0, out: 0 };
    days[d].in += r.net_amount;
  });
  exps.forEach((e) => {
    const d = e.due_date;
    if (!days[d]) days[d] = { date: d, in: 0, out: 0 };
    days[d].out += e.value;
  });
  wds.forEach((w) => {
    const d = w.date;
    if (!days[d]) days[d] = { date: d, in: 0, out: 0 };
    days[d].out += w.value;
  });

  const series = Object.values(days)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: s.date,
      in: Number(s.in.toFixed(2)),
      out: Number(s.out.toFixed(2)),
    }));

  res.json({
    initial_balance: initial,
    inflow,
    outflow,
    balance: Number((initial + inflow - outflow).toFixed(2)),
    series,
  });
});

router.get("/dashboard/machine-comparison", (req, res) => {
  const m = (req.query.month as string) || todayStr().slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let revs = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");
  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
  }
  const map: Record<string, { name: string; sold: number; fees: number; net: number; count: number; to_receive: number }> = {};

  revs.forEach((r) => {
    const key = r.payment_method_name || "Outros";
    if (!map[key]) map[key] = { name: key, sold: 0, fees: 0, net: 0, count: 0, to_receive: 0 };
    map[key].sold += r.paid_amount;
    map[key].fees += r.fee_amount;
    map[key].net += r.net_amount;
    map[key].count += 1;
    if (r.settlement_date > todayStr()) {
      map[key].to_receive += r.net_amount;
    }
  });

  const list = Object.values(map).map((d) => ({
    name: d.name,
    sold: Number(d.sold.toFixed(2)),
    fees: Number(d.fees.toFixed(2)),
    net: Number(d.net.toFixed(2)),
    count: d.count,
    to_receive: Number(d.to_receive.toFixed(2)),
  }));
  list.sort((a, b) => b.sold - a.sold);
  res.json(list);
});

router.get("/dashboard/alerts", (req, res) => {
  const out: Array<{ id: string; type: string; title: string; message: string; target: string }> = [];
  const now = new Date(todayStr());
  const in7Days = new Date(now.getTime() + 7 * 86400000);
  const unitFilter = getUnitFilter(req);

  let exps = db.expenses;
  let revs = db.revenues;
  if (unitFilter) {
    exps = exps.filter((e) => e.barbershop_id === unitFilter || (unitFilter === "unit_centro" && e.barbershop_id === "profile"));
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
  }

  let soon = 0;
  let overdue = 0;
  exps.forEach((e) => {
    if (e.payment_date) return;
    const due = parseDateStr(e.due_date);
    if (due < now) overdue += e.value;
    else if (due <= in7Days) soon += e.value;
  });

  if (soon > 0) {
    out.push({
      id: "contas_a_vencer",
      type: "warning",
      title: "Contas a vencer",
      message: `Existem ${formatBRL(soon)} em contas vencendo nos próximos 7 dias.`,
      target: "/despesas",
    });
  }
  if (overdue > 0) {
    out.push({
      id: "contas_vencidas",
      type: "danger",
      title: "Contas vencidas",
      message: `Você possui ${formatBRL(overdue)} em contas vencidas.`,
      target: "/despesas",
    });
  }

  const waiting = revs.filter((r) => r.status === "ativo" && r.settlement_date > todayStr()).reduce((acc, r) => acc + r.net_amount, 0);
  if (waiting > 0) {
    out.push({
      id: "valores_a_receber",
      type: "info",
      title: "Valores a receber",
      message: `Você possui ${formatBRL(waiting)} em vendas aguardando liquidação.`,
      target: "/receitas",
    });
  }
  res.json(out);
});

export default router;
