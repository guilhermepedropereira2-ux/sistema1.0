import express, { Request, Response, NextFunction } from "express";
import { db, authUser, getUnitFilter, getTenantId } from "../db.js";
import { newId, nowIso, todayStr, parseDateStr, formatBRL, PaymentMethod, Revenue, Expense, Withdrawal, CashClosing } from "../types.js";
import { persistRevenue, persistExpense } from "../../src/db/sync.js";
import { calculateCommission } from "../services/commissionService.js";
import { requireAuth, requirePermission, requireDono } from "../auth.js";

const router = express.Router();

// Helper para verificar se o usuário tem permissão financeira ampla ou é modo caixa
const requireRevenuesAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user || authUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized", detail: "Autenticação obrigatória", code: "UNAUTHORIZED" });
  }
  const roles = user.roles || (user.role ? [user.role] : []);
  if (user.is_superadmin || roles.includes("dono") || roles.includes("caixa") || roles.includes("recepcao")) {
    (req as any).user = user;
    return next();
  }
  const perms = user.permissions || {};
  if (perms["ver_receitas"] || perms["ver_financeiro"]) {
    (req as any).user = user;
    return next();
  }
  return res.status(403).json({ error: "Forbidden", detail: "Acesso negado às receitas financeiras", code: "PERMISSION_DENIED" });
};

// ==========================================
// 1. FORMAS DE PAGAMENTO / MAQUININHAS
// ==========================================
router.get("/payment-methods", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const pms = db.paymentMethods.filter((p) => p.barbershop_id === tenantId);
  res.json(pms);
});

router.post("/payment-methods", requireAuth, requirePermission("alterar_taxas"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  const pm: PaymentMethod = {
    id: newId(),
    barbershop_id: tenantId,
    name: body.name || "Forma",
    kind: body.kind || "maquininha",
    fees: body.fees || {},
    settlement_days: body.settlement_days || {},
    active: body.active !== false,
    created_at: nowIso(),
  };
  db.paymentMethods.push(pm);
  db.logChange(`Adicionou forma de pagamento '${pm.name}'`, "payment_method", null, pm);
  res.json(pm);
});

router.put("/payment-methods/:id", requireAuth, requirePermission("alterar_taxas"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const idx = db.paymentMethods.findIndex((p) => p.id === req.params.id && p.barbershop_id === tenantId);
  if (idx === -1) return res.status(404).json({ detail: "Forma de pagamento não encontrada" });
  db.paymentMethods[idx] = { ...db.paymentMethods[idx], ...req.body, barbershop_id: tenantId };
  db.logChange(`Atualizou forma de pagamento '${db.paymentMethods[idx].name}'`, "payment_method", null, db.paymentMethods[idx]);
  res.json(db.paymentMethods[idx]);
});

router.delete("/payment-methods/:id", requireAuth, requirePermission("alterar_taxas"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const pm = db.paymentMethods.find((p) => p.id === req.params.id && p.barbershop_id === tenantId);
  db.paymentMethods = db.paymentMethods.filter((p) => !(p.id === req.params.id && p.barbershop_id === tenantId));
  if (pm) db.logChange(`Excluiu forma de pagamento '${pm.name}'`, "payment_method", pm, null);
  res.json({ ok: true });
});

// ==========================================
// 2. RECEITAS / ATENDIMENTOS FINANCEIROS
// ==========================================
router.get("/revenues", requireAuth, requireRevenuesAccess, (req: Request, res: Response) => {
  const { month } = req.query as { month?: string };
  const tenantId = getTenantId(req);
  const unitFilter = getUnitFilter(req);

  let revs = db.revenues.filter((r) => r.barbershop_id === tenantId);
  if (unitFilter) {
    revs = revs.filter((r) => r.unit_id === unitFilter || r.barbershop_id === unitFilter);
  }
  if (month) {
    revs = revs.filter((r) => r.date.startsWith(month));
  }
  revs.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  res.json(revs);
});

router.post("/revenues", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  const gross = Number(body.gross_amount || 0);
  const discount = Number(body.discount_amount || 0);
  if (gross <= 0) return res.status(400).json({ detail: "O valor bruto deve ser maior que zero" });
  if (discount < 0 || discount > gross) return res.status(400).json({ detail: "Desconto inválido" });

  const pm = db.paymentMethods.find((p) => p.id === body.payment_method_id && p.barbershop_id === tenantId) ||
    db.paymentMethods.find((p) => p.barbershop_id === tenantId) ||
    db.paymentMethods[0];
  const barber = db.barbers.find((b) => b.id === body.barber_id && b.barbershop_id === tenantId);
  const paymentType = body.payment_type || "dinheiro";
  const feePercent = pm?.fees?.[paymentType] || 0;

  const calc = calculateCommission({
    gross,
    discount,
    feePercent,
    barber,
    settings: db.settings,
  });

  const paid = calc.paidAmount;
  const fee = calc.feeAmount;
  const net = calc.netAmount;
  const comm = calc.commissionAmount;
  const shop = calc.shopAmount;

  const settlementDays = pm?.settlement_days?.[paymentType] || 0;
  const dateObj = parseDateStr(body.date || todayStr());
  const settlementDate = new Date(dateObj.getTime() + settlementDays * 86400000).toISOString().split("T")[0];

  const assignedUnit = getUnitFilter(req) || body.unit_id || tenantId;

  const rev: Revenue = {
    id: newId(),
    barbershop_id: tenantId,
    unit_id: assignedUnit,
    sale_group_id: body.sale_group_id || newId(),
    date: body.date || todayStr(),
    time: body.time || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    item_kind: body.item_kind || "servico",
    item_id: body.item_id,
    service_type: body.service_type || "cabelo",
    service_name: body.service_name || "Atendimento",
    quantity: Number(body.quantity || 1),
    gross_amount: gross,
    discount_amount: discount,
    paid_amount: paid,
    payment_method_id: pm?.id || "pm_default",
    payment_method_name: pm?.name || "Dinheiro",
    payment_type: paymentType,
    payment_channel: body.payment_channel || "presencial",
    payment_method: body.payment_method || pm?.name || "Dinheiro",
    fee_percent: feePercent,
    fee_amount: fee,
    net_amount: net,
    barber_id: barber?.id,
    barber_name: barber?.name,
    commission_percent: calc.effectivePercent,
    commission_amount: comm,
    shop_amount: shop,
    client_id: body.client_id,
    client_name: body.client_name,
    client_phone: body.client_phone,
    notes: body.notes,
    settlement_date: settlementDate,
    available: settlementDate <= todayStr(),
    commission_paid: false,
    status: "ativo",
    created_at: nowIso(),
  };

  db.revenues.unshift(rev);
  persistRevenue(rev);
  db.logChange(`Criou receita de ${formatBRL(paid)} (${rev.service_name})`, "revenue", null, rev);
  res.json(rev);
});

router.put("/revenues/:id", requireAuth, requirePermission("excluir_lancamentos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const idx = db.revenues.findIndex((r) => r.id === req.params.id && r.barbershop_id === tenantId);
  if (idx === -1) return res.status(404).json({ detail: "Receita não encontrada" });

  db.revenues[idx] = { ...db.revenues[idx], ...req.body, barbershop_id: tenantId };
  persistRevenue(db.revenues[idx]);
  db.logChange(`Atualizou receita #${db.revenues[idx].id.slice(-6)}`, "revenue", null, db.revenues[idx]);
  res.json(db.revenues[idx]);
});

router.post("/revenues/:id/cancel", requireAuth, requirePermission("excluir_lancamentos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const mode = (req.query.mode as string) || (req.body && req.body.mode) || "cancelado";
  if (!["ativo", "cancelado", "estornado"].includes(mode)) {
    return res.status(400).json({ detail: "Status inválido" });
  }
  const rev = db.revenues.find((r) => (r.id === req.params.id || r.sale_group_id === req.params.id) && r.barbershop_id === tenantId);
  if (!rev) return res.status(404).json({ detail: "Receita não encontrada" });

  const groupId = rev.sale_group_id;
  if (groupId) {
    db.revenues.forEach((r) => {
      if (r.barbershop_id === tenantId && (r.sale_group_id === groupId || r.id === groupId)) {
        r.status = mode;
        persistRevenue(r);
      }
    });
  } else {
    rev.status = mode;
    persistRevenue(rev);
  }
  db.logChange(`Atendimento/Receita #${rev.id.slice(-6)} marcada como ${mode}`, "revenue");
  res.json(rev);
});

router.patch("/revenues/:id/status", requireAuth, requirePermission("excluir_lancamentos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { mode } = req.body || {};
  if (!["ativo", "cancelado", "estornado"].includes(mode)) {
    return res.status(400).json({ detail: "Status inválido" });
  }
  const rev = db.revenues.find((r) => (r.id === req.params.id || r.sale_group_id === req.params.id) && r.barbershop_id === tenantId);
  if (!rev) return res.status(404).json({ detail: "Receita não encontrada" });

  const groupId = rev.sale_group_id;
  if (groupId) {
    db.revenues.forEach((r) => {
      if (r.barbershop_id === tenantId && (r.sale_group_id === groupId || r.id === groupId)) {
        r.status = mode;
        persistRevenue(r);
      }
    });
  } else {
    rev.status = mode;
    persistRevenue(rev);
  }
  db.logChange(`Atendimento/Receita #${rev.id.slice(-6)} marcada como ${mode}`, "revenue");
  res.json(rev);
});

router.delete("/revenues/:id", requireAuth, requirePermission("excluir_lancamentos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const rev = db.revenues.find((r) => (r.id === req.params.id || r.sale_group_id === req.params.id) && r.barbershop_id === tenantId);
  if (!rev) return res.status(404).json({ detail: "Receita não encontrada" });

  const groupId = rev.sale_group_id;
  if (groupId) {
    db.revenues = db.revenues.filter((r) => !(r.barbershop_id === tenantId && (r.sale_group_id === groupId || r.id === groupId)));
  } else {
    db.revenues = db.revenues.filter((r) => !(r.id === req.params.id && r.barbershop_id === tenantId));
  }
  db.logChange(`Excluiu atendimento/receita #${rev.id.slice(-6)}`, "revenue", rev, null);
  res.json({ ok: true });
});

// ==========================================
// 3. DESPESAS
// ==========================================
router.get("/expenses", requireAuth, requirePermission("ver_financeiro"), (req: Request, res: Response) => {
  const { month } = req.query as { month?: string };
  const tenantId = getTenantId(req);
  const unitFilter = getUnitFilter(req);

  let list = db.expenses.filter((e) => e.barbershop_id === tenantId);
  if (unitFilter) {
    list = list.filter((e) => e.unit_id === unitFilter || e.barbershop_id === unitFilter);
  }
  if (month) list = list.filter((e) => e.due_date.startsWith(month));
  list.sort((a, b) => b.due_date.localeCompare(a.due_date));
  res.json(list);
});

router.post("/expenses", requireAuth, requirePermission("registrar_despesas"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  const cat = db.categories.find((c) => c.id === body.category_id && c.barbershop_id === tenantId);
  const createdList: Expense[] = [];
  const assignedUnit = getUnitFilter(req) || body.unit_id || tenantId;

  const createOne = (dueDate: string, name: string) => {
    const isPaid = Boolean(body.payment_date);
    const exp: Expense = {
      id: newId(),
      barbershop_id: tenantId,
      unit_id: assignedUnit,
      name,
      value: Number(body.value || 0),
      category_id: cat?.id,
      category_name: cat?.name || "Sem categoria",
      type: body.type || "variavel",
      due_date: dueDate,
      recurrence: body.recurrence || "nenhuma",
      occurrences: body.occurrences,
      payment_method: body.payment_method,
      payment_date: body.payment_date,
      status: isPaid ? "pago" : parseDateStr(dueDate) < new Date(todayStr()) ? "vencido" : "pendente",
      created_at: nowIso(),
    };
    db.expenses.push(exp);
    createdList.push(exp);
  };

  if (body.recurrence === "mensal") {
    const occ = Math.min(Number(body.occurrences || 12), 24);
    const start = parseDateStr(body.due_date || todayStr());
    for (let i = 0; i < occ; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      const iso = d.toISOString().split("T")[0];
      createOne(iso, `${body.name || "Despesa"} (${i + 1}/${occ})`);
    }
  } else {
    createOne(body.due_date || todayStr(), body.name || "Despesa");
  }

  createdList.forEach((e) => {
    persistExpense(e);
    db.logChange(`Registrou despesa '${e.name}' (${formatBRL(e.value)})`, "expense", null, e);
  });

  res.json(createdList[0] || null);
});

router.put("/expenses/:id", requireAuth, requirePermission("registrar_despesas"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const idx = db.expenses.findIndex((e) => e.id === req.params.id && e.barbershop_id === tenantId);
  if (idx === -1) return res.status(404).json({ detail: "Despesa não encontrada" });

  const body = req.body || {};
  const isPaid = Boolean(body.payment_date);
  const dueDate = body.due_date || db.expenses[idx].due_date;
  const status = isPaid ? "pago" : parseDateStr(dueDate) < new Date(todayStr()) ? "vencido" : "pendente";

  db.expenses[idx] = {
    ...db.expenses[idx],
    ...body,
    barbershop_id: tenantId,
    status,
  };
  persistExpense(db.expenses[idx]);
  db.logChange(`Atualizou despesa '${db.expenses[idx].name}'`, "expense", null, db.expenses[idx]);
  res.json(db.expenses[idx]);
});

router.delete("/expenses/:id", requireAuth, requirePermission("excluir_lancamentos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const exp = db.expenses.find((e) => e.id === req.params.id && e.barbershop_id === tenantId);
  db.expenses = db.expenses.filter((e) => !(e.id === req.params.id && e.barbershop_id === tenantId));
  if (exp) db.logChange(`Excluiu despesa '${exp.name}'`, "expense", exp, null);
  res.json({ ok: true });
});

// ==========================================
// 4. RETIRADAS DO PROPRIETÁRIO (PRÓ-LABORE)
// ==========================================
router.get("/withdrawals", requireAuth, requirePermission("retirada_proprietario"), (req: Request, res: Response) => {
  const { month } = req.query as { month?: string };
  const tenantId = getTenantId(req);
  const unitFilter = getUnitFilter(req);

  let list = db.withdrawals.filter((w) => w.barbershop_id === tenantId);
  if (unitFilter) {
    list = list.filter((w) => w.unit_id === unitFilter || w.barbershop_id === unitFilter);
  }
  if (month) list = list.filter((w) => w.date.startsWith(month));
  list.sort((a, b) => b.date.localeCompare(a.date));
  res.json(list);
});

router.post("/withdrawals", requireAuth, requirePermission("retirada_proprietario"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  const val = Number(body.value || 0);
  if (val <= 0) return res.status(400).json({ detail: "O valor da retirada deve ser maior que zero" });

  const assignedUnit = getUnitFilter(req) || body.unit_id || tenantId;

  const w: Withdrawal = {
    id: newId(),
    barbershop_id: tenantId,
    unit_id: assignedUnit,
    date: body.date || todayStr(),
    value: val,
    reason: body.reason || "Retirada do proprietário",
    source: body.source || "dinheiro",
    created_at: nowIso(),
  };

  db.withdrawals.push(w);
  db.logChange(`Registrou retirada de ${formatBRL(w.value)}: '${w.reason}'`, "withdrawal", null, w);
  res.json(w);
});

router.delete("/withdrawals/:id", requireAuth, requirePermission("excluir_lancamentos"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const w = db.withdrawals.find((x) => x.id === req.params.id && x.barbershop_id === tenantId);
  db.withdrawals = db.withdrawals.filter((x) => !(x.id === req.params.id && x.barbershop_id === tenantId));
  if (w) db.logChange(`Excluiu retirada de ${formatBRL(w.value)}`, "withdrawal", w, null);
  res.json({ ok: true });
});

// ==========================================
// 5. FECHAMENTO DE CAIXA
// ==========================================
router.get("/cash-closings", requireAuth, requirePermission("ver_financeiro"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const list = db.cashClosings.filter((c) => c.barbershop_id === tenantId);
  list.sort((a, b) => b.date.localeCompare(a.date));
  res.json(list);
});

router.post("/cash-closings", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  const expected = (body.expected || {}) as Record<string, number>;
  const counted = (body.counted || {}) as Record<string, number>;

  const expTotal = Object.values(expected).reduce((acc: number, v: number) => acc + (Number(v) || 0), 0);
  const cntTotal = Object.values(counted).reduce((acc: number, v: number) => acc + (Number(v) || 0), 0);
  const diff = Number((cntTotal - expTotal).toFixed(2));

  const assignedUnit = getUnitFilter(req) || body.unit_id || tenantId;

  const cc: CashClosing = {
    id: newId(),
    barbershop_id: tenantId,
    unit_id: assignedUnit,
    date: body.date || todayStr(),
    expected,
    counted,
    difference: diff,
    note: body.note,
    created_at: nowIso(),
  };

  db.cashClosings.unshift(cc);
  db.logChange(`Realizou fechamento de caixa (${cc.date}) com diferença de ${formatBRL(diff)}`, "cash_closing", null, cc);
  res.json(cc);
});

export default router;
