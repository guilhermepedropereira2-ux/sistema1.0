import express, { Request, Response } from "express";
import { db, authUser, getUnitFilter } from "../db.js";
import { newId, nowIso, todayStr, parseDateStr, formatBRL, Barber, CommissionPayment, Expense, User } from "../types.js";
import { persistBarber, persistExpense } from "../../src/db/sync.js";
import { storage } from "../storage.js";

const router = express.Router();

router.get("/barbers", (req, res) => {
  const unitFilter = getUnitFilter(req);
  if (unitFilter) {
    const filtered = db.barbers.filter(
      (b) => b.barbershop_id === unitFilter || (unitFilter === "unit_centro" && b.barbershop_id === "profile")
    );
    return res.json(filtered);
  }
  res.json(db.barbers);
});

router.post("/barbers", (req, res) => {
  const plan = db.subscription.plan_id;
  const unitFilter = getUnitFilter(req) || "unit_centro";

  // Checagem de limite por plano
  if (plan === "starter") {
    const currentCount = db.barbers.filter((b) => b.active !== false).length;
    if (currentCount >= 1) {
      return res.status(403).json({
        detail: "Você atingiu o limite de 1 barbeiro do Plano Básico (Starter). Faça o upgrade para o Plano Pro para adicionar até 4 barbeiros.",
        code: "LIMIT_REACHED",
        plan: "starter",
        max_barbers: 1,
      });
    }
  } else if (plan === "pro") {
    const currentCount = db.barbers.filter((b) => b.active !== false).length;
    if (currentCount >= 4) {
      return res.status(403).json({
        detail: "Você atingiu o limite de 4 barbeiros do Plano Pro. Faça o upgrade para o Plano Premium para adicionar até 10 barbeiros e gerenciar filiais.",
        code: "LIMIT_REACHED",
        plan: "pro",
        max_barbers: 4,
      });
    }
  } else if (plan === "premium") {
    const inUnitCount = db.barbers.filter(
      (b) => b.active !== false && (b.barbershop_id === unitFilter || (unitFilter === "unit_centro" && b.barbershop_id === "profile"))
    ).length;
    if (inUnitCount >= 10) {
      return res.status(403).json({
        detail: "Você atingiu o limite de 10 barbeiros nesta unidade no Plano Premium.",
        code: "LIMIT_REACHED",
        plan: "premium",
        max_barbers: 10,
      });
    }
  }

  const body = req.body || {};
  const b: Barber = {
    id: newId(),
    barbershop_id: unitFilter || "unit_centro",
    name: body.name,
    commission_percent: Number(body.commission_percent ?? 40),
    commission_type: body.commission_type || "percentual",
    commission_value: Number(body.commission_value || 0),
    commission_overrides: body.commission_overrides || {},
    phone: body.phone,
    email: body.email,
    photo_url: body.photo_url,
    join_date: body.join_date || todayStr(),
    authorized_services: body.authorized_services || db.services.map((s) => s.id),
    authorized_products: body.authorized_products || db.products.map((p) => p.id),
    active: body.active !== false,
    created_at: nowIso(),
  };
  if (body.username && body.password) {
    const u: User = {
      id: newId(),
      name: b.name,
      username: body.username,
      password: body.password,
      email: b.email,
      role: "barbeiro",
      roles: ["barbeiro"],
      barbershop_id: "profile",
      barber_id: b.id,
      permissions: {},
      active: true,
      created_at: nowIso(),
    };
    db.users.push(u);
    b.user_id = u.id;
  }
  db.barbers.push(b);
  persistBarber(b);
  db.logChange(`Cadastrou barbeiro '${b.name}'`, "barber", null, b);
  res.json(b);
});

router.put("/barbers/:id", (req, res) => {
  const idx = db.barbers.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Barbeiro não encontrado" });
  db.barbers[idx] = { ...db.barbers[idx], ...req.body };
  persistBarber(db.barbers[idx]);
  db.logChange(`Atualizou barbeiro '${db.barbers[idx].name}'`, "barber", null, db.barbers[idx]);
  res.json(db.barbers[idx]);
});

router.delete("/barbers/:id", (req, res) => {
  const b = db.barbers.find((x) => x.id === req.params.id);
  db.barbers = db.barbers.filter((x) => x.id !== req.params.id);
  if (b) db.logChange(`Excluiu barbeiro '${b.name}'`, "barber", b, null);
  res.json({ ok: true });
});

router.get("/barbers/:id/report", (req, res) => {
  const barber = db.barbers.find((b) => b.id === req.params.id);
  if (!barber) return res.status(404).json({ detail: "Barbeiro não encontrado" });

  const { start, end } = req.query as { start?: string; end?: string };
  let revs = db.revenues.filter((r) => r.barber_id === barber.id && r.status === "ativo");
  if (start) revs = revs.filter((r) => r.date >= start);
  if (end) revs = revs.filter((r) => r.date <= end);

  const services_count = revs.filter((r) => r.item_kind === "servico").reduce((acc, r) => acc + (r.quantity || 1), 0);
  const products_count = revs.filter((r) => r.item_kind === "produto").reduce((acc, r) => acc + (r.quantity || 1), 0);
  const services_paid = Number(revs.filter((r) => r.item_kind === "servico").reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const products_paid = Number(revs.filter((r) => r.item_kind === "produto").reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));

  const gross = Number(revs.reduce((acc, r) => acc + (r.gross_amount || 0), 0).toFixed(2));
  const discounts = Number(revs.reduce((acc, r) => acc + (r.discount_amount || 0), 0).toFixed(2));
  const paid = Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const fees = Number(revs.reduce((acc, r) => acc + (r.fee_amount || 0), 0).toFixed(2));
  const net = Number(revs.reduce((acc, r) => acc + (r.net_amount || 0), 0).toFixed(2));
  const commission = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const commission_paid = Number(revs.filter((r) => r.commission_paid).reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const commission_pending = Number((commission - commission_paid).toFixed(2));
  const shop = Number(revs.reduce((acc, r) => acc + (r.shop_amount || 0), 0).toFixed(2));

  // Breakdowns por serviço e por produto
  const servicesMap: Record<string, { name: string; quantity: number; total: number }> = {};
  const productsMap: Record<string, { name: string; quantity: number; total: number }> = {};
  revs.forEach((r) => {
    const map = r.item_kind === "produto" ? productsMap : servicesMap;
    const key = r.service_name || "Outro";
    if (!map[key]) {
      map[key] = { name: key, quantity: 0, total: 0 };
    }
    map[key].quantity += (r.quantity || 1);
    map[key].total = Number((map[key].total + (r.paid_amount || 0)).toFixed(2));
  });

  const services_breakdown = Object.values(servicesMap).sort((a, b) => b.total - a.total);
  const products_breakdown = Object.values(productsMap).sort((a, b) => b.total - a.total);

  res.json({
    barber,
    atendimentos: revs.length,
    services_count,
    products_count,
    services_summary: {
      quantity: services_count,
      paid: services_paid,
    },
    products_summary: {
      quantity: products_count,
      paid: products_paid,
    },
    services_breakdown,
    products_breakdown,
    faturamento_total: paid,
    comissao_gerada: commission,
    total_barbearia: shop,
    comissao_paga: commission_paid,
    comissao_pendente: commission_pending,
    descontos: discounts,
    taxas: fees,
    valor_liquido: net,
    gross,
    discounts,
    paid,
    fees,
    net,
    commission,
    commission_paid,
    commission_pending,
    shop,
    revenues: revs,
  });
});

// ---------------- Commissions Management & Settlement ----------------
router.get("/commissions/summary", (req, res) => {
  const { start, end, barber_id, period } = req.query as {
    start?: string;
    end?: string;
    barber_id?: string;
    period?: string;
  };

  const unitFilter = getUnitFilter(req);
  let revs = db.revenues.filter((r) => r.status === "ativo");
  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
  }
  if (start) revs = revs.filter((r) => r.date >= start);
  if (end) revs = revs.filter((r) => r.date <= end);

  // Group by barber
  let barbers = [...db.barbers];
  if (barber_id && barber_id !== "todos") {
    barbers = barbers.filter((b) => b.id === barber_id);
  }

  const barberSummaries = barbers.map((b) => {
    const barberRevs = revs.filter((r) => r.barber_id === b.id);
    const totalFaturado = Number(barberRevs.reduce((acc, r) => acc + (r.gross_amount ?? r.paid_amount ?? 0), 0).toFixed(2));
    const totalComissaoGerada = Number(barberRevs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
    const totalComissaoPaga = Number(barberRevs.filter((r) => r.commission_paid).reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
    const saldoPendente = Number(Math.max(0, totalComissaoGerada - totalComissaoPaga).toFixed(2));

    return {
      barber_id: b.id,
      barber_name: b.name,
      photo_url: b.photo_url || null,
      role: (b as any).role || "Barbeiro Profissional",
      commission_percent: b.commission_percent || 40,
      atendimentos_total: barberRevs.length,
      faturamento_total: totalFaturado,
      comissao_gerada: totalComissaoGerada,
      comissao_paga: totalComissaoPaga,
      saldo_pendente: saldoPendente,
      atendimentos: barberRevs.map((r) => ({
        id: r.id,
        date: r.date,
        time: r.time,
        client_name: r.client_name || "Cliente Balcão",
        service_name: r.service_name || (r.item_kind === "produto" ? "Produto" : "Corte / Barba"),
        item_kind: r.item_kind,
        gross_amount: r.gross_amount ?? r.paid_amount,
        commission_percent: (r as any).commission_percent || b.commission_percent || 40,
        commission_amount: r.commission_amount,
        commission_paid: Boolean(r.commission_paid),
        commission_paid_date: r.commission_paid_date,
        payment_method_name: r.payment_method_name || "Pix",
        payment_type: r.payment_type || "pix",
      })),
    };
  });

  const totalFaturadoGeral = Number(barberSummaries.reduce((acc, b) => acc + b.faturamento_total, 0).toFixed(2));
  const totalComissaoGeral = Number(barberSummaries.reduce((acc, b) => acc + b.comissao_gerada, 0).toFixed(2));
  const totalPagaGeral = Number(barberSummaries.reduce((acc, b) => acc + b.comissao_paga, 0).toFixed(2));
  const totalPendenteGeral = Number(barberSummaries.reduce((acc, b) => acc + b.saldo_pendente, 0).toFixed(2));
  const totalAtendimentosGeral = barberSummaries.reduce((acc, b) => acc + b.atendimentos_total, 0);

  let paymentsHistory = [...(db.commissionPayments || [])];
  if (barber_id && barber_id !== "todos") {
    paymentsHistory = paymentsHistory.filter((p) => p.barber_id === barber_id);
  }
  paymentsHistory.sort((a, b) => (b.date + b.created_at).localeCompare(a.date + a.created_at));

  res.json({
    period: period || "mes",
    start: start || "",
    end: end || "",
    summary: {
      faturamento_total: totalFaturadoGeral,
      comissao_gerada: totalComissaoGeral,
      comissao_paga: totalPagaGeral,
      saldo_pendente: totalPendenteGeral,
      atendimentos_total: totalAtendimentosGeral,
    },
    barbers: barberSummaries,
    historico_liquidacoes: paymentsHistory,
  });
});

router.post("/commissions/pay", (req, res) => {
  const { barber_id, amount, payment_method, payment_date, period_start, period_end, notes } = req.body || {};
  const barber = db.barbers.find((b) => b.id === barber_id);
  if (!barber) return res.status(404).json({ detail: "Barbeiro não encontrado" });

  const payVal = Number(amount);
  if (!payVal || payVal <= 0) {
    return res.status(400).json({ detail: "Informe um valor de comissão válido maior que zero." });
  }

  const payDate = payment_date || todayStr();
  const payMethod = payment_method || "pix";
  const assignedUnit = getUnitFilter(req) || "unit_centro";

  // Mark pending revenues as paid up to amount
  let remainingToPay = payVal;
  let paidCount = 0;
  db.revenues.forEach((r) => {
    if (r.barber_id === barber.id && r.status === "ativo" && !r.commission_paid) {
      if ((!period_start || r.date >= period_start) && (!period_end || r.date <= period_end)) {
        if (remainingToPay > 0) {
          r.commission_paid = true;
          r.commission_paid_date = payDate;
          paidCount++;
          remainingToPay -= r.commission_amount;
        }
      }
    }
  });

  // Ensure category exists for Outflow/Expenses
  let cat = db.categories.find((c) => c.name.toLowerCase().includes("comiss") && c.type === "despesa");
  if (!cat) {
    cat = {
      id: "cat_comissoes",
      barbershop_id: "profile",
      name: "Comissões dos Barbeiros",
      group: "Pessoal",
      type: "despesa",
      color: "#10b981",
      created_at: nowIso(),
    };
    db.categories.push(cat);
  }

  // Register in Expenses (Fluxo de Caixa & Despesas Operacionais)
  const methodLabel = payMethod === "pix" ? "PIX" : payMethod === "dinheiro" ? "Dinheiro" : payMethod === "transferencia" ? "Transferência" : "Débito";
  const exp: Expense = {
    id: newId(),
    barbershop_id: assignedUnit,
    name: `Comissão Barbeiro: ${barber.name} (${methodLabel})`,
    value: payVal,
    category_id: cat.id,
    category_name: cat.name,
    type: "variavel",
    due_date: payDate,
    recurrence: "nenhuma",
    payment_method: payMethod,
    payment_date: payDate,
    status: "pago",
    created_at: nowIso(),
  };
  db.expenses.push(exp);
  persistExpense(exp);

  // Register in Commission Payments History
  const payment: CommissionPayment = {
    id: newId(),
    barbershop_id: assignedUnit,
    barber_id: barber.id,
    barber_name: barber.name,
    amount: payVal,
    payment_method: payMethod,
    date: payDate,
    paid_count: paidCount,
    period_start: period_start || undefined,
    period_end: period_end || undefined,
    notes: notes || `Quitação de comissões acumuladas`,
    expense_id: exp.id,
    created_at: nowIso(),
  };
  if (!db.commissionPayments) db.commissionPayments = [];
  db.commissionPayments.unshift(payment);

  db.logChange(`Quitou comissões de ${barber.name}: ${formatBRL(payVal)} via ${methodLabel}`, "commission");

  res.json({ ok: true, payment, expense: exp, paid_count: paidCount, total: payVal });
});

router.post("/barbers/:id/pay-commissions", (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  const { payment_method, payment_date, notes } = req.body || {};
  const barber = db.barbers.find((b) => b.id === req.params.id);
  if (!barber) return res.status(404).json({ detail: "Barbeiro não encontrado" });

  let count = 0;
  let paidTotal = 0;
  const payDate = payment_date || todayStr();
  const payMethod = payment_method || "pix";

  db.revenues.forEach((r) => {
    if (r.barber_id === barber.id && r.status === "ativo" && !r.commission_paid) {
      if ((!start || r.date >= start) && (!end || r.date <= end)) {
        r.commission_paid = true;
        r.commission_paid_date = payDate;
        count++;
        paidTotal += r.commission_amount;
      }
    }
  });

  if (paidTotal > 0) {
    let cat = db.categories.find((c) => c.name.toLowerCase().includes("comiss") && c.type === "despesa");
    if (!cat) {
      cat = {
        id: "cat_comissoes",
        barbershop_id: "profile",
        name: "Comissões dos Barbeiros",
        group: "Pessoal",
        type: "despesa",
        color: "#10b981",
        created_at: nowIso(),
      };
      db.categories.push(cat);
    }
    const exp: Expense = {
      id: newId(),
      barbershop_id: "unit_centro",
      name: `Comissão Barbeiro: ${barber.name} (${payMethod.toUpperCase()})`,
      value: paidTotal,
      category_id: cat.id,
      category_name: cat.name,
      type: "variavel",
      due_date: payDate,
      recurrence: "nenhuma",
      payment_method: payMethod,
      payment_date: payDate,
      status: "pago",
      created_at: nowIso(),
    };
    db.expenses.push(exp);
    persistExpense(exp);

    const payment: CommissionPayment = {
      id: newId(),
      barbershop_id: "unit_centro",
      barber_id: barber.id,
      barber_name: barber.name,
      amount: paidTotal,
      payment_method: payMethod,
      date: payDate,
      paid_count: count,
      period_start: start || undefined,
      period_end: end || undefined,
      notes: notes || `Quitação de comissões`,
      expense_id: exp.id,
      created_at: nowIso(),
    };
    if (!db.commissionPayments) db.commissionPayments = [];
    db.commissionPayments.unshift(payment);
  }

  db.logChange(`Pagou comissões de ${barber.name} (${formatBRL(paidTotal)})`, "commission");
  res.json({ ok: true, paid_count: count, total: paidTotal });
});

router.get("/barbers/ranking", (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  const ranking = db.barbers.map((b) => {
    let revs = db.revenues.filter((r) => r.barber_id === b.id && r.status === "ativo");
    if (start) revs = revs.filter((r) => r.date >= start);
    if (end) revs = revs.filter((r) => r.date <= end);

    const faturamento = Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
    const comissao = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
    return {
      barber_id: b.id,
      barber_name: b.name,
      atendimentos: revs.length,
      faturamento,
      comissao,
    };
  });
  ranking.sort((a, b) => b.faturamento - a.faturamento);
  res.json(ranking);
});

// Categories

export default router;
