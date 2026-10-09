import express, { Request, Response } from "express";
import { db, authUser, enrichClient, getTenantId } from "../db.js";
import { newId, nowIso, todayStr, parseDateStr, formatBRL, Revenue, Client } from "../types.js";
import { persistRevenue, persistClient } from "../../src/db/sync.js";
import { storage } from "../storage.js";
import { calculateCommission } from "../services/commissionService.js";
import { requireAuth, sanitizeUser } from "../auth.js";

const router = express.Router();

function getBarberForUser(req: Request, user: any) {
  const tenantId = getTenantId(req);
  let barber = db.barbers.find((b) => b.barbershop_id === tenantId && (b.id === user?.barber_id || b.user_id === user?.id));
  if (!barber && user?.email) {
    barber = db.barbers.find((b) => b.barbershop_id === tenantId && b.email === user.email);
  }
  if (!barber && user?.name) {
    barber = db.barbers.find((b) => b.barbershop_id === tenantId && b.name?.toLowerCase() === user.name?.toLowerCase());
  }
  return barber || null;
}

router.get("/barber/me", requireAuth, (req, res) => {
  const user = (req as any).user || authUser(req);
  const barber = getBarberForUser(req, user);
  res.json({ user: sanitizeUser(user), barber });
});

router.post("/barber/atendimento", requireAuth, async (req, res) => {
  const user = (req as any).user || authUser(req);
  const tenantId = getTenantId(req);
  let barber = null;
  if (req.body?.barber_id) {
    barber = db.barbers.find((b) => b.id === req.body.barber_id && b.barbershop_id === tenantId);
  }
  if (!barber) {
    barber = getBarberForUser(req, user);
  }
  if (!barber) {
    barber = db.barbers.find((b) => b.barbershop_id === tenantId) || {
      id: user?.barber_id || user?.id || "b_temp",
      name: user?.name || "Barbeiro",
      commission_percent: 50,
    };
  }
  const { items, payment_method_id, payment_type, payment_channel, payment_method, client_name, client_id, discount_amount, date, time } = req.body || {};

  if (!items || !items.length) {
    return res.status(400).json({ detail: "Adicione ao menos um item" });
  }

  const totalGross = items.reduce((acc: number, it: any) => acc + Number(it.price || 0) * Number(it.quantity || 1), 0);
  const discount = Number(discount_amount || 0);
  const pm = db.paymentMethods.find((p) => p.id === payment_method_id && p.barbershop_id === tenantId) ||
    db.paymentMethods.find((p) => p.barbershop_id === tenantId) ||
    db.paymentMethods[0];
  const feePercent = pm?.fees?.[payment_type] || 0;

  const group_id = newId();
  const created: Revenue[] = [];
  let totalCommissionCalculated = 0;
  let totalNetCalculated = 0;

  items.forEach((it: any, idx: number) => {
    const itemGross = Number(it.price || 0) * Number(it.quantity || 1);
    const itemDisc = idx === items.length - 1 ? discount - idx * (discount / items.length) : discount / items.length;
    const isProduct = it.kind === "produto" || it.item_kind === "produto";

    const calc = calculateCommission({
      gross: itemGross,
      discount: itemDisc,
      feePercent,
      barber,
      settings: db.settings,
    });

    totalCommissionCalculated += calc.commissionAmount;
    totalNetCalculated += calc.netAmount;

    const settlementDays = pm?.settlement_days?.[payment_type] || 0;
    const dateObj = parseDateStr(date || todayStr());
    const settlementDate = new Date(dateObj.getTime() + settlementDays * 86400000).toISOString().split("T")[0];

    const rev: Revenue = {
      id: newId(),
      barbershop_id: tenantId,
      unit_id: (barber as any)?.unit_id || (barber as any)?.unit_ids?.[0] || tenantId,
      sale_group_id: group_id,
      date: date || todayStr(),
      time: time || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      item_kind: isProduct ? "produto" : "servico",
      item_id: it.item_id || it.id,
      service_type: isProduct ? "produto" : "cabelo",
      service_name: it.name || (isProduct ? "Produto" : "Serviço"),
      quantity: Number(it.quantity || 1),
      gross_amount: Number(itemGross.toFixed(2)),
      discount_amount: Number(itemDisc.toFixed(2)),
      paid_amount: calc.paidAmount,
      payment_method_id: pm?.id || "pm_dinheiro",
      payment_method_name: pm?.name || "Dinheiro",
      payment_type: payment_type || "dinheiro",
      payment_channel: payment_channel || "presencial",
      payment_method: payment_method || pm?.name || "Dinheiro",
      fee_percent: feePercent,
      fee_amount: calc.feeAmount,
      net_amount: calc.netAmount,
      barber_id: barber?.id,
      barber_name: barber?.name,
      commission_percent: calc.commissionRate,
      commission_amount: calc.commissionAmount,
      shop_amount: calc.shopAmount,
      client_id,
      client_name: client_name || "Cliente sem cadastro",
      settlement_date: settlementDate,
      available: settlementDate <= todayStr(),
      commission_paid: false,
      status: "ativo",
      created_at: nowIso(),
    };

    db.revenues.unshift(rev);
    created.push(rev);
    persistRevenue(rev);
  });

  // Client handling
  if (client_name && client_name !== "Cliente Balcão" && client_name !== "Cliente sem cadastro") {
    let cl = db.clients.find((c) => c.barbershop_id === tenantId && (c.id === client_id || c.name.toLowerCase() === client_name.toLowerCase()));
    if (!cl) {
      cl = {
        id: newId(),
        barbershop_id: tenantId,
        name: client_name.trim(),
        has_plan: false,
        created_at: nowIso(),
      };
      db.clients.unshift(cl);
      persistClient(cl);
    }
  }

  const servicesCount = created.filter((r) => r.item_kind !== "produto").reduce((acc, r) => acc + (r.quantity || 1), 0);
  const productsCount = created.filter((r) => r.item_kind === "produto").reduce((acc, r) => acc + (r.quantity || 1), 0);

  res.json({
    ok: true,
    group_id,
    created_count: created.length,
    atendimentos_count: 1,
    services_count: servicesCount,
    products_count: productsCount,
    total_paid: Number((totalGross - discount).toFixed(2)),
    total_commission: Number(totalCommissionCalculated.toFixed(2)),
    total_net: Number(totalNetCalculated.toFixed(2)),
    total: Number((totalGross - discount).toFixed(2)),
    commission: Number(totalCommissionCalculated.toFixed(2)),
  });
});

router.get("/barber/atendimentos", requireAuth, (req, res) => {
  const user = (req as any).user || authUser(req);
  const tenantId = getTenantId(req);
  const barber = getBarberForUser(req, user);
  if (!barber) {
    return res.json([]);
  }

  const { start, end, month } = req.query as { start?: string; end?: string; month?: string };
  let revs = db.revenues.filter((r) => r.barbershop_id === tenantId && r.barber_id === barber.id && r.status === "ativo");

  if (month) revs = revs.filter((r) => r.date.startsWith(month));
  if (start) revs = revs.filter((r) => r.date >= start);
  if (end) revs = revs.filter((r) => r.date <= end);

  // Group by sale_group_id
  const groups: Record<string, any> = {};
  revs.forEach((r) => {
    const gid = r.sale_group_id || r.id;
    if (!groups[gid]) {
      groups[gid] = {
        id: gid,
        sale_group_id: gid,
        date: r.date,
        time: r.time || "12:00",
        client_name: r.client_name || "Cliente sem cadastro",
        client_id: r.client_id,
        payment_method_name: r.payment_method_name || "Dinheiro / Pix",
        payment_type: r.payment_type || "dinheiro",
        status: r.status,
        commission_paid: Boolean(r.commission_paid),
        items: [],
        gross: 0,
        discount: 0,
        paid: 0,
        commission: 0,
        net: 0,
      };
    }
    groups[gid].items.push({
      id: r.id,
      name: r.service_name || "Serviço",
      kind: r.item_kind || "servico",
      quantity: r.quantity || 1,
      price: r.gross_amount || 0,
      paid: r.paid_amount || 0,
      commission: r.commission_amount || 0,
    });
    groups[gid].gross = Number((groups[gid].gross + (r.gross_amount || 0)).toFixed(2));
    groups[gid].discount = Number((groups[gid].discount + (r.discount_amount || 0)).toFixed(2));
    groups[gid].paid = Number((groups[gid].paid + (r.paid_amount || 0)).toFixed(2));
    groups[gid].commission = Number((groups[gid].commission + (r.commission_amount || 0)).toFixed(2));
    groups[gid].net = Number((groups[gid].net + (r.net_amount || 0)).toFixed(2));
  });

  const list = Object.values(groups);
  list.sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  res.json(list);
});

router.get("/barber/dashboard", requireAuth, (req, res) => {
  const user = (req as any).user || authUser(req);
  const tenantId = getTenantId(req);
  const barber = getBarberForUser(req, user);

  if (!barber) {
    return res.json({
      barber_id: "",
      barber_name: user?.name || "Barbeiro",
      atendimentos_hoje: 0,
      faturamento_hoje: 0,
      comissao_hoje: 0,
      descontos_hoje: 0,
      comissao_mes: 0,
      comissao_paga_mes: 0,
      comissao_pendente_mes: 0,
      atendimentos_mes: 0,
      faturamento_mes: 0,
      ticket_medio_mes: 0,
      topService: { name: "Nenhum", count: 0 },
      meta_pessoal: { target: 3000, current: 0, progress: 0, target_atendimentos: 100, current_atendimentos: 0 },
      atendimentos: [],
      history: [],
    });
  }

  const t = todayStr();
  const m = (req.query.month as string) || t.slice(0, 7);
  const allBarberRevs = db.revenues.filter((r) => r.barbershop_id === tenantId && r.barber_id === barber.id && r.status === "ativo");
  const revsToday = allBarberRevs.filter((r) => r.date === t);
  const monthRevs = allBarberRevs.filter((r) => r.date.startsWith(m));

  const atendimentos_hoje = new Set(revsToday.map((r) => r.sale_group_id || r.id)).size;
  const faturamento_hoje = Number(revsToday.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const comissao_hoje = Number(revsToday.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const descontos_hoje = Number(revsToday.reduce((acc, r) => acc + (r.discount_amount || 0), 0).toFixed(2));

  const comissao_mes = Number(monthRevs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const comissao_paga_mes = Number(monthRevs.filter((r) => r.commission_paid).reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const comissao_pendente_mes = Number((comissao_mes - comissao_paga_mes).toFixed(2));
  const atendimentos_mes = new Set(monthRevs.map((r) => r.sale_group_id || r.id)).size;
  const faturamento_mes = Number(monthRevs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const ticket_medio_mes = atendimentos_mes > 0 ? Number((faturamento_mes / atendimentos_mes).toFixed(2)) : 0;

  const serviceCounts: Record<string, number> = {};
  monthRevs.forEach((r) => {
    const sName = r.service_name || "Serviço";
    serviceCounts[sName] = (serviceCounts[sName] || 0) + (r.quantity || 1);
  });
  let topService = { name: "Nenhum", count: 0 };
  Object.entries(serviceCounts).forEach(([name, count]) => {
    if (count > topService.count) {
      topService = { name, count };
    }
  });

  const targetCommission = 3000;
  const meta_pessoal = {
    target: targetCommission,
    current: comissao_mes,
    progress: Math.min(100, Math.round((comissao_mes / targetCommission) * 100)),
    target_atendimentos: 100,
    current_atendimentos: atendimentos_mes,
  };

  // Agrupa os lançamentos por atendimento (sale_group_id ou id) para o Fluxo de Atendimentos
  const groups: Record<string, any> = {};
  allBarberRevs.forEach((r) => {
    const gid = r.sale_group_id || r.id;
    if (!groups[gid]) {
      groups[gid] = {
        id: gid,
        sale_group_id: gid,
        barber_name: barber.name,
        service_name: r.service_name,
        client_name: r.client_name || "Cliente sem cadastro",
        date: r.date,
        time: r.time || "12:00",
        payment_method_name: r.payment_method_name || (r.payment_type === "pix" ? "PIX" : "Dinheiro"),
        payment_type: r.payment_type || "dinheiro",
        paid: 0,
        paid_amount: 0,
        commission: 0,
        commission_amount: 0,
        commission_paid: Boolean(r.commission_paid),
        items: [],
        services: [],
        products: [],
      };
    }
    const isProd = r.item_kind === "produto" || r.service_type === "produto";
    const sName = r.service_name || (isProd ? "Produto" : "Serviço");
    const itemObj = {
      id: r.id,
      name: sName,
      kind: isProd ? "produto" : "servico",
      quantity: r.quantity || 1,
      paid: Number(r.paid_amount || r.gross_amount || 0),
      gross: Number(r.gross_amount || r.paid_amount || 0),
      discount: Number(r.discount_amount || 0),
      commission: Number(r.commission_amount || 0),
    };
    groups[gid].items.push(itemObj);
    if (isProd) {
      groups[gid].products.push(itemObj);
    } else {
      groups[gid].services.push(itemObj);
    }
    groups[gid].paid = Number((groups[gid].paid + (r.paid_amount || r.gross_amount || 0)).toFixed(2));
    groups[gid].paid_amount = groups[gid].paid;
    groups[gid].commission = Number((groups[gid].commission + (r.commission_amount || 0)).toFixed(2));
    groups[gid].commission_amount = groups[gid].commission;
  });

  const sortedAtendimentos = Object.values(groups).map((g) => {
    const allNames = g.items.map((i: any) => `${i.quantity > 1 ? `${i.quantity}x ` : ""}${i.name}`);
    return {
      ...g,
      service_name: allNames.join(" + ") || "Atendimento",
    };
  });
  sortedAtendimentos.sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));

  const ultimos = sortedAtendimentos.slice(0, 20);

  res.json({
    barber_id: barber.id,
    barber_name: barber.name,
    commission_percent: barber.commission_percent,
    atendimentos_hoje,
    faturamento_hoje,
    comissao_hoje,
    descontos_hoje,
    comissao_mes,
    comissao_paga_mes,
    comissao_pendente_mes,
    atendimentos_mes,
    faturamento_mes,
    ticket_medio_mes,
    topService,
    meta_pessoal,
    ultimos,
  });
});

router.get("/barber/clientes", requireAuth, (req, res) => {
  const user = (req as any).user || authUser(req);
  const tenantId = getTenantId(req);
  const barber = getBarberForUser(req, user);
  if (!barber) return res.json([]);

  const tenantClients = db.clients.filter((c) => c.barbershop_id === tenantId);
  const list = tenantClients.map((c) => {
    const enriched = enrichClient(c);
    const revs = db.revenues.filter(
      (r) =>
        r.barbershop_id === tenantId &&
        (r.client_id === c.id ||
          (r.client_name && r.client_name.toLowerCase() === c.name.toLowerCase())) &&
        r.barber_id === barber.id
    );
    return {
      ...enriched,
      atendimentos: revs.length,
      total: Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2)),
      last_date: revs[0]?.date || null,
    };
  });
  res.json(list);
});

router.get("/barber/cliente/historico", requireAuth, (req, res) => {
  const tenantId = getTenantId(req);
  const { name, client_id } = req.query as { name?: string; client_id?: string };
  const revs = db.revenues.filter((r) => r.barbershop_id === tenantId && ((client_id && r.client_id === client_id) || (name && r.client_name === name)));
  res.json(revs);
});

router.post("/barber/cliente/nota", requireAuth, (req, res) => {
  const tenantId = getTenantId(req);
  const { client_id, note } = req.body || {};
  const c = db.clients.find((x) => x.id === client_id && x.barbershop_id === tenantId);
  if (c) {
    c.notes = note;
  }
  res.json({ ok: true });
});

router.get("/barber/comissao", requireAuth, (req, res) => {
  const user = (req as any).user || authUser(req);
  const tenantId = getTenantId(req);
  const barber = getBarberForUser(req, user);

  if (!barber) {
    return res.json({
      total: 0,
      gerada: 0,
      paid: 0,
      paga: 0,
      pending: 0,
      pendente: 0,
      items: [],
      detalhamento: [],
      historico_pagamentos: [],
    });
  }

  const { start, end } = req.query as { start?: string; end?: string };
  let revs = db.revenues.filter((r) => r.barbershop_id === tenantId && r.barber_id === barber.id && r.status === "ativo");
  if (start) revs = revs.filter((r) => r.date >= start);
  if (end) revs = revs.filter((r) => r.date <= end);

  const total = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const paid = Number(revs.filter((r) => r.commission_paid).reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const pending = Number((total - paid).toFixed(2));

  const groups: Record<string, any> = {};
  revs.forEach((r) => {
    const gid = r.sale_group_id || r.id;
    if (!groups[gid]) {
      groups[gid] = {
        sale_group_id: gid,
        date: r.date,
        time: r.time || "12:00",
        client_name: r.client_name || "Cliente sem cadastro",
        payment_method_name: r.payment_method_name || "Dinheiro / Pix",
        payment_type: r.payment_type || "dinheiro",
        status: r.status,
        commission_paid: Boolean(r.commission_paid),
        items: [],
        gross: 0,
        discount: 0,
        paid: 0,
        commission: 0,
      };
    }
    groups[gid].items.push({ name: r.service_name || "Atendimento", kind: r.item_kind || "servico", quantity: r.quantity || 1, paid: r.paid_amount || 0 });
    groups[gid].gross = Number((groups[gid].gross + (r.gross_amount || 0)).toFixed(2));
    groups[gid].discount = Number((groups[gid].discount + (r.discount_amount || 0)).toFixed(2));
    groups[gid].paid = Number((groups[gid].paid + (r.paid_amount || 0)).toFixed(2));
    groups[gid].commission = Number((groups[gid].commission + (r.commission_amount || 0)).toFixed(2));
  });

  const detalhamento = Object.values(groups);
  detalhamento.sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));

  const paidRevs = revs.filter((r) => r.commission_paid && r.commission_paid_date);
  const byPaidDate: Record<string, number> = {};
  paidRevs.forEach((r) => {
    const d = r.commission_paid_date || r.date;
    byPaidDate[d] = Number(((byPaidDate[d] || 0) + (r.commission_amount || 0)).toFixed(2));
  });
  const historico_pagamentos = Object.entries(byPaidDate).map(([date, amount]) => ({ date, amount }));

  res.json({
    total,
    gerada: total,
    paid,
    paga: paid,
    pending,
    pendente: pending,
    items: revs,
    detalhamento,
    historico_pagamentos,
  });
});

router.get("/barber/desempenho", requireAuth, (req, res) => {
  const user = (req as any).user || authUser(req);
  const tenantId = getTenantId(req);
  const barber = getBarberForUser(req, user);

  if (!barber) {
    return res.json({
      faturamento_total: 0,
      comissao_total: 0,
      atendimentos_total: 0,
      ticket_medio: 0,
      evolution: [],
      comparativo_servicos: [],
    });
  }

  const { start, end } = req.query as { start?: string; end?: string };
  let revs = db.revenues.filter((r) => r.barbershop_id === tenantId && r.barber_id === barber.id && r.status === "ativo");
  if (start) revs = revs.filter((r) => r.date >= start);
  if (end) revs = revs.filter((r) => r.date <= end);

  const byDay: Record<string, { faturamento: number; comissao: number }> = {};
  revs.forEach((r) => {
    if (!byDay[r.date]) byDay[r.date] = { faturamento: 0, comissao: 0 };
    byDay[r.date].faturamento = Number((byDay[r.date].faturamento + (r.paid_amount || 0)).toFixed(2));
    byDay[r.date].comissao = Number((byDay[r.date].comissao + (r.commission_amount || 0)).toFixed(2));
  });

  const evolution = Object.entries(byDay).map(([date, vals]) => ({
    date,
    faturamento: vals.faturamento,
    comissao: vals.comissao,
  }));

  const faturamento_total = Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const comissao_total = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const atendimentos_total = revs.length;
  const ticket_medio = atendimentos_total > 0 ? Number((faturamento_total / atendimentos_total).toFixed(2)) : 0;

  res.json({
    faturamento_total,
    comissao_total,
    atendimentos_total,
    ticket_medio,
    evolution,
    comparativo_servicos: [],
  });
});

export default router;
