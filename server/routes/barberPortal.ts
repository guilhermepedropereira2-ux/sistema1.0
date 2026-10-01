import express, { Request, Response } from "express";
import { db, authUser, enrichClient } from "../db.js";
import { newId, nowIso, todayStr, parseDateStr, formatBRL, Revenue, Client } from "../types.js";
import { persistRevenue, persistClient } from "../../src/db/sync.js";
import { storage } from "../storage.js";

const router = express.Router();

router.get("/barber/me", (req, res) => {
  const user = authUser(req);
  const barber = db.barbers.find((b) => b.id === user?.barber_id) || db.barbers[0];
  res.json({ user: user || db.users[0], barber });
});

router.post("/barber/atendimento", async (req, res) => {
  const user = authUser(req);
  const barber = db.barbers.find((b) => b.id === user?.barber_id) || db.barbers[0];
  const { items, payment_method_id, payment_type, payment_channel, payment_method, client_name, client_id, discount_amount, date, time } = req.body || {};

  if (!items || !items.length) {
    return res.status(400).json({ detail: "Adicione ao menos um item" });
  }

  const totalGross = items.reduce((acc: number, it: any) => acc + Number(it.price || 0) * Number(it.quantity || 1), 0);
  const discount = Number(discount_amount || 0);
  const pm = db.paymentMethods.find((p) => p.id === payment_method_id) || db.paymentMethods[0];
  const feePercent = pm?.fees[payment_type] || 0;

  const group_id = newId();
  const created: Revenue[] = [];
  let totalCommissionCalculated = 0;
  let totalNetCalculated = 0;

  items.forEach((it: any, idx: number) => {
    const itemGross = Number(it.price || 0) * Number(it.quantity || 1);
    const itemDisc = idx === items.length - 1 ? discount - idx * (discount / items.length) : discount / items.length;
    const itemPaid = Math.max(itemGross - itemDisc, 0);
    const fee = Number(((itemPaid * feePercent) / 100).toFixed(2));
    const net = Number((itemPaid - fee).toFixed(2));

    let comm = 0;
    if (barber.commission_type === "fixo") comm = barber.commission_value;
    else comm = Number(((itemPaid * barber.commission_percent) / 100).toFixed(2));
    comm = Math.min(comm, Math.max(net, 0));
    const shop = Number((net - comm).toFixed(2));

    totalCommissionCalculated += comm;
    totalNetCalculated += net;

    const rev: Revenue = {
      id: newId(),
      barbershop_id: "profile",
      sale_group_id: group_id,
      date: date || todayStr(),
      time: time || "14:00",
      item_kind: it.item_kind || "servico",
      item_id: it.item_id,
      service_type: it.item_kind === "produto" ? "produto" : "corte",
      service_name: it.name,
      quantity: Number(it.quantity || 1),
      gross_amount: itemGross,
      discount_amount: itemDisc,
      paid_amount: itemPaid,
      payment_method_id: pm.id,
      payment_method_name: pm.name,
      payment_type: payment_type || "dinheiro",
      payment_channel: payment_channel || "Caixa Físico / Gaveta",
      payment_method: payment_method || (payment_type === "dinheiro" ? "Dinheiro" : payment_type === "pix" ? "PIX" : "Cartão"),
      barber_id: barber.id,
      barber_name: barber.name,
      client_name,
      client_id,
      fee_amount: fee,
      net_amount: net,
      commission_amount: comm,
      shop_amount: shop,
      settlement_date: date || todayStr(),
      available: true,
      commission_paid: false,
      status: "ativo",
      created_at: nowIso(),
    };
    db.revenues.unshift(rev);
    created.push(rev);
  });

  // Persistência relacional do atendimento na camada de Storage (Multi-tenant)
  const targetOrgId = req.body?.organization_id || user?.barbershop_id || "org_vintage";
  try {
    let resolvedClientId = client_id;
    if (!resolvedClientId && client_name) {
      const existingClients = await storage.getClientsByOrg(targetOrgId);
      const matched = existingClients.find(
        (c) => c.name.toLowerCase() === client_name.trim().toLowerCase()
      );
      if (matched) {
        resolvedClientId = matched.id;
      } else {
        const createdClient = await storage.createClient({
          organization_id: targetOrgId,
          name: client_name.trim(),
        });
        resolvedClientId = createdClient.id;
      }
    }

    await storage.createAppointment({
      id: group_id,
      organization_id: targetOrgId,
      barber_id: barber.user_id || barber.id || "barber_gabriel",
      client_id: resolvedClientId || null,
      total_amount: String(totalGross.toFixed(2)),
      discount: String(discount.toFixed(2)),
      net_amount: String(totalNetCalculated.toFixed(2)),
      commission_amount: String(totalCommissionCalculated.toFixed(2)),
      payment_method: pm?.name || payment_type || "dinheiro",
      status: "concluido",
      date: date || todayStr(),
      time: time || "14:00",
    });
  } catch (storageErr: any) {
    console.error("[Storage] Erro ao persistir atendimento relacional:", storageErr?.message);
  }

  // Se utilizou plano de assinatura do cliente, deduz crédito e vincula
  let updatedClientPlan = undefined;
  if (req.body?.use_plan) {
    const targetCli = db.clients.find(
      (c) =>
        (client_id && c.id === client_id) ||
        (client_name && c.name.toLowerCase() === client_name.trim().toLowerCase())
    );
    if (targetCli && targetCli.has_plan && targetCli.plan) {
      if (!targetCli.plan.is_unlimited) {
        targetCli.plan.used = (targetCli.plan.used || 0) + 1;
      }
      persistClient(targetCli);
      updatedClientPlan = enrichClient(targetCli).plan;
    }
  }

  db.logChange(`Barbeiro '${barber.name}' lançou atendimento (${created.length} itens)`, "revenue");
  res.json({
    sale_group_id: group_id,
    items: created,
    total: Number(created.reduce((acc, r) => acc + r.paid_amount, 0).toFixed(2)),
    commission: Number(totalCommissionCalculated.toFixed(2)),
    plan: updatedClientPlan,
  });
});

router.get("/barber/atendimentos", (req, res) => {
  const user = authUser(req);
  const barber = db.barbers.find((b) => b.id === user?.barber_id) || db.barbers[0];
  const { start, end } = req.query as { start?: string; end?: string };

  let revs = db.revenues.filter((r) => r.barber_id === barber.id);
  if (start) revs = revs.filter((r) => r.date >= start);
  if (end) revs = revs.filter((r) => r.date <= end);

  // Group by sale_group_id or rev id
  const groups: Record<string, any> = {};
  revs.forEach((r) => {
    const gid = r.sale_group_id || r.id;
    if (!groups[gid]) {
      groups[gid] = {
        sale_group_id: gid,
        date: r.date,
        time: r.time,
        client_name: r.client_name,
        payment_method_name: r.payment_method_name,
        payment_type: r.payment_type,
        status: r.status,
        barber_name: r.barber_name,
        items: [],
        gross: 0,
        discount: 0,
        paid: 0,
        commission: 0,
        shop: 0,
      };
    }
    groups[gid].items.push({ name: r.service_name, kind: r.item_kind, quantity: r.quantity, paid: r.paid_amount });
    groups[gid].gross = Number((groups[gid].gross + r.gross_amount).toFixed(2));
    groups[gid].discount = Number((groups[gid].discount + r.discount_amount).toFixed(2));
    groups[gid].paid = Number((groups[gid].paid + r.paid_amount).toFixed(2));
    groups[gid].commission = Number((groups[gid].commission + r.commission_amount).toFixed(2));
    groups[gid].shop = Number((groups[gid].shop + r.shop_amount).toFixed(2));
  });

  const list = Object.values(groups);
  list.sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  res.json(list);
});

router.get("/barber/dashboard", (req, res) => {
  const user = authUser(req);
  let barber: any = db.barbers.find((b) => b.id === user?.barber_id);
  if (!barber && user?.email) {
    barber = db.barbers.find((b) => b.email === user.email);
  }
  if (!barber && user?.name) {
    barber = db.barbers.find((b) => b.name?.toLowerCase() === user.name?.toLowerCase());
  }
  if (!barber) {
    barber = db.barbers[0] || { id: "default_barber", name: user?.name || "Barbeiro", commission_percent: 50 };
  }

  const t = todayStr();
  const m = (req.query.month as string) || t.slice(0, 7);
  const allBarberRevs = db.revenues.filter((r) => r.barber_id === barber.id && r.status === "ativo");
  const revsToday = allBarberRevs.filter((r) => r.date === t);
  const monthRevs = allBarberRevs.filter((r) => r.date.startsWith(m));

  // Métricas do Dia
  const atendimentos_hoje = revsToday.length;
  const faturamento_hoje = Number(revsToday.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const comissao_hoje = Number(revsToday.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const descontos_hoje = Number(revsToday.reduce((acc, r) => acc + (r.discount_amount || 0), 0).toFixed(2));

  // Métricas do Mês (Visão Específica do Barbeiro)
  const comissao_mes = Number(monthRevs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const comissao_paga_mes = Number(monthRevs.filter((r) => r.commission_paid).reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const comissao_pendente_mes = Number((comissao_mes - comissao_paga_mes).toFixed(2));
  const atendimentos_mes = monthRevs.length;
  const faturamento_mes = Number(monthRevs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const ticket_medio_mes = atendimentos_mes > 0 ? Number((faturamento_mes / atendimentos_mes).toFixed(2)) : 0;

  // Serviço mais realizado no mês
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

  // Meta pessoal de comissão
  const targetCommission = 3000;
  const meta_pessoal = {
    target: targetCommission,
    current: comissao_mes,
    progress: Math.min(100, Math.round((comissao_mes / targetCommission) * 100)),
    target_atendimentos: 100,
    current_atendimentos: atendimentos_mes,
  };

  // Histórico de atendimentos do barbeiro agrupados e ordenados
  const sortedRevs = [...allBarberRevs].sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  const groups: Record<string, any> = {};
  sortedRevs.forEach((r) => {
    const gid = r.sale_group_id || r.id;
    if (!groups[gid]) {
      groups[gid] = {
        id: gid,
        sale_group_id: gid,
        date: r.date,
        time: r.time || "12:00",
        client_name: r.client_name || "Cliente sem cadastro",
        service_name: r.service_name || "Atendimento",
        gross: 0,
        paid: 0,
        paid_amount: 0,
        commission: 0,
        commission_amount: 0,
        commission_paid: Boolean(r.commission_paid),
        payment_method_name: r.payment_method_name || "Dinheiro / Pix",
        payment_type: r.payment_type || "dinheiro",
        items: [],
      };
    }
    groups[gid].items.push({
      name: r.service_name || "Atendimento",
      kind: r.item_kind || "servico",
      quantity: r.quantity || 1,
      paid: r.paid_amount || 0,
    });
    groups[gid].gross = Number((groups[gid].gross + (r.gross_amount || r.paid_amount || 0)).toFixed(2));
    groups[gid].paid = Number((groups[gid].paid + (r.paid_amount || 0)).toFixed(2));
    groups[gid].paid_amount = groups[gid].paid;
    groups[gid].commission = Number((groups[gid].commission + (r.commission_amount || 0)).toFixed(2));
    groups[gid].commission_amount = groups[gid].commission;
    if (!r.commission_paid) {
      groups[gid].commission_paid = false;
    }
  });

  const ultimos = Object.values(groups).slice(0, 10);

  res.json({
    date: t,
    month: m,
    barber_id: barber.id,
    barber_name: barber.name,
    shop_slug: db.barbershop.slug || db.settings.public_slug || "barbearia-vintage",
    // Hoje
    atendimentos: atendimentos_hoje,
    faturamento: faturamento_hoje,
    comissao: comissao_hoje,
    descontos: descontos_hoje,
    // Mês
    comissao_mes,
    comissao_paga_mes,
    comissao_pendente_mes,
    atendimentos_mes,
    faturamento_mes,
    ticket_medio_mes,
    servico_mais_realizado: topService,
    meta_pessoal,
    ultimos,
  });
});

router.get("/barber/clientes", (req, res) => {
  const user = authUser(req);
  const barber = db.barbers.find((b) => b.id === user?.barber_id) || db.barbers[0];
  const list = db.clients.map((c) => {
    const enriched = enrichClient(c);
    const revs = db.revenues.filter(
      (r) =>
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

router.get("/barber/cliente/historico", (req, res) => {
  const { name, client_id } = req.query as { name?: string; client_id?: string };
  const revs = db.revenues.filter((r) => (client_id && r.client_id === client_id) || (name && r.client_name === name));
  res.json(revs);
});

router.post("/barber/cliente/nota", (req, res) => {
  const { client_id, note } = req.body || {};
  const c = db.clients.find((x) => x.id === client_id);
  if (c) {
    c.notes = note;
  }
  res.json({ ok: true });
});

router.get("/barber/comissao", (req, res) => {
  const user = authUser(req);
  let barber: any = db.barbers.find((b) => b.id === user?.barber_id);
  if (!barber && user?.email) barber = db.barbers.find((b) => b.email === user.email);
  if (!barber && user?.name) barber = db.barbers.find((b) => b.name?.toLowerCase() === user.name?.toLowerCase());
  if (!barber) barber = db.barbers[0] || { id: "default_barber", name: user?.name || "Barbeiro", commission_percent: 50 };

  const { start, end } = req.query as { start?: string; end?: string };
  let revs = db.revenues.filter((r) => r.barber_id === barber.id && r.status === "ativo");
  if (start) revs = revs.filter((r) => r.date >= start);
  if (end) revs = revs.filter((r) => r.date <= end);

  const total = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const paid = Number(revs.filter((r) => r.commission_paid).reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const pending = Number((total - paid).toFixed(2));

  // Group by sale_group_id or rev id for detalhamento
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

  // Pagamentos de comissão efetuados
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

router.get("/barber/desempenho", (req, res) => {
  const user = authUser(req);
  let barber: any = db.barbers.find((b) => b.id === user?.barber_id);
  if (!barber && user?.email) barber = db.barbers.find((b) => b.email === user.email);
  if (!barber && user?.name) barber = db.barbers.find((b) => b.name?.toLowerCase() === user.name?.toLowerCase());
  if (!barber) barber = db.barbers[0] || { id: "default_barber", name: user?.name || "Barbeiro", commission_percent: 50 };

  const { start, end } = req.query as { start?: string; end?: string };
  let revs = db.revenues.filter((r) => r.barber_id === barber.id && r.status === "ativo");
  if (start) revs = revs.filter((r) => r.date >= start);
  if (end) revs = revs.filter((r) => r.date <= end);

  // Group by day for evolution chart
  const byDay: Record<string, { faturamento: number; comissao: number }> = {};
  revs.forEach((r) => {
    if (!byDay[r.date]) byDay[r.date] = { faturamento: 0, comissao: 0 };
    byDay[r.date].faturamento = Number((byDay[r.date].faturamento + (r.paid_amount || 0)).toFixed(2));
    byDay[r.date].comissao = Number((byDay[r.date].comissao + (r.commission_amount || 0)).toFixed(2));
  });

  const evolution = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({
      date,
      faturamento: val.faturamento,
      comissao: val.comissao,
    }));

  // Service breakdown
  const svcMap: Record<string, { quantity: number; total: number }> = {};
  revs.filter((r) => r.item_kind === "servico").forEach((r) => {
    const name = r.service_name || "Serviço";
    if (!svcMap[name]) svcMap[name] = { quantity: 0, total: 0 };
    svcMap[name].quantity += Number(r.quantity || 1);
    svcMap[name].total = Number((svcMap[name].total + (r.paid_amount || 0)).toFixed(2));
  });
  const services_breakdown = Object.entries(svcMap)
    .map(([name, val]) => ({ name, quantity: val.quantity, total: val.total }))
    .sort((a, b) => b.total - a.total);

  // Product breakdown
  const prodMap: Record<string, { quantity: number; total: number }> = {};
  revs.filter((r) => r.item_kind === "produto").forEach((r) => {
    const name = r.service_name || "Produto";
    if (!prodMap[name]) prodMap[name] = { quantity: 0, total: 0 };
    prodMap[name].quantity += Number(r.quantity || 1);
    prodMap[name].total = Number((prodMap[name].total + (r.paid_amount || 0)).toFixed(2));
  });
  const products_breakdown = Object.entries(prodMap)
    .map(([name, val]) => ({ name, quantity: val.quantity, total: val.total }))
    .sort((a, b) => b.total - a.total);

  const faturamento_total = Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const comissao_gerada = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const total_atendimentos = revs.length;
  const ticket_medio = total_atendimentos > 0 ? Number((faturamento_total / total_atendimentos).toFixed(2)) : 0;

  // Discounts
  const discounted = revs.filter((r) => (r.discount_amount || 0) > 0);
  const total_descontos = Number(revs.reduce((acc, r) => acc + (r.discount_amount || 0), 0).toFixed(2));
  const valor_original = Number(revs.reduce((acc, r) => acc + (r.gross_amount || r.paid_amount || 0), 0).toFixed(2));
  const discount_stats = {
    total: total_descontos,
    atendimentos_com_desconto: discounted.length,
    desconto_medio: discounted.length > 0 ? Number((total_descontos / discounted.length).toFixed(2)) : 0,
    percentual_vendas_com_desconto: total_atendimentos > 0 ? Number(((discounted.length / total_atendimentos) * 100).toFixed(1)) : 0,
    valor_original,
    valor_final: faturamento_total,
  };

  // Best days
  let melhor_fat = { date: start || todayStr(), value: 0 };
  let melhor_atend = { date: start || todayStr(), value: 0 };
  const dayCounts: Record<string, number> = {};
  revs.forEach((r) => {
    dayCounts[r.date] = (dayCounts[r.date] || 0) + 1;
  });
  Object.entries(byDay).forEach(([d, val]) => {
    if (val.faturamento > melhor_fat.value) melhor_fat = { date: d, value: val.faturamento };
  });
  Object.entries(dayCounts).forEach(([d, cnt]) => {
    if (cnt > melhor_atend.value) melhor_atend = { date: d, value: cnt };
  });

  const uniqueDays = Object.keys(byDay).length;
  const best_days = {
    melhor_faturamento: melhor_fat,
    melhor_atendimentos: melhor_atend,
    media_diaria_atendimentos: uniqueDays > 0 ? Number((total_atendimentos / uniqueDays).toFixed(1)) : 0,
    media_diaria_faturamento: uniqueDays > 0 ? Number((faturamento_total / uniqueDays).toFixed(2)) : 0,
  };

  // Records
  const records = {
    maior_faturamento_dia: melhor_fat.value,
    maior_atendimentos_dia: melhor_atend.value,
    maior_ticket: revs.length > 0 ? Math.max(...revs.map((r) => r.paid_amount || 0)) : 0,
    maior_comissao_dia: Object.values(byDay).length > 0 ? Math.max(...Object.values(byDay).map((v) => v.comissao)) : 0,
  };

  res.json({
    report: {
      faturamento_total,
      comissao_gerada,
      services_breakdown,
      products_breakdown,
    },
    evolution,
    atendimentos: total_atendimentos,
    total_atendimentos,
    ticket_medio,
    total_faturamento: faturamento_total,
    discount_stats,
    best_days,
    records,
    comparison: null,
  });
});

// Admin Demo Actions

export default router;
