import express, { Request, Response, NextFunction } from "express";
import { db, authUser, getUnitFilter } from "../db.js";
import { newId, nowIso, todayStr, parseDateStr, formatBRL, PaymentMethod, Revenue, Expense, Withdrawal, CashClosing } from "../types.js";
import { persistRevenue, persistExpense } from "../../src/db/sync.js";
import { calculateCommission } from "../services/commissionService.js";

const router = express.Router();


// Payment Methods
const requirePaymentMethodsAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = authUser(req);
  if (!user) {
    return res.status(401).json({ detail: "Autenticação obrigatória" });
  }

  const roles = user.roles || (user.role ? [user.role] : []);
  const isBarber = roles.some((r: string) => ["barbeiro", "barber"].includes(r));
  const isAllowed = roles.some((r: string) => ["dono", "admin", "owner", "gerente", "manager"].includes(r));

  if (isBarber || !isAllowed) {
    return res.status(403).json({
      error: "Forbidden",
      detail: "Acesso negado. Apenas administradores e gerentes podem cadastrar ou alterar maquininhas e formas de pagamento.",
    });
  }

  next();
};

router.get("/payment-methods", (req, res) => {
  res.json(db.paymentMethods);
});

router.post("/payment-methods", requirePaymentMethodsAdmin, (req, res) => {
  const body = req.body || {};
  const pm: PaymentMethod = {
    id: newId(),
    barbershop_id: "profile",
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

router.put("/payment-methods/:id", requirePaymentMethodsAdmin, (req, res) => {
  const idx = db.paymentMethods.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Forma de pagamento não encontrada" });
  db.paymentMethods[idx] = { ...db.paymentMethods[idx], ...req.body };
  db.logChange(`Atualizou forma de pagamento '${db.paymentMethods[idx].name}'`, "payment_method", null, db.paymentMethods[idx]);
  res.json(db.paymentMethods[idx]);
});

router.delete("/payment-methods/:id", requirePaymentMethodsAdmin, (req, res) => {
  const pm = db.paymentMethods.find((p) => p.id === req.params.id);
  db.paymentMethods = db.paymentMethods.filter((p) => p.id !== req.params.id);
  if (pm) db.logChange(`Excluiu forma de pagamento '${pm.name}'`, "payment_method", pm, null);
  res.json({ ok: true });
});

router.get("/revenues", (req, res) => {
  const { month } = req.query as { month?: string };
  const unitFilter = getUnitFilter(req);
  let revs = [...db.revenues];
  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
  }
  if (month) {
    revs = revs.filter((r) => r.date.startsWith(month));
  }
  revs.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  res.json(revs);
});

router.post("/revenues", (req, res) => {
  const body = req.body || {};
  const gross = Number(body.gross_amount || 0);
  const discount = Number(body.discount_amount || 0);
  if (gross <= 0) return res.status(400).json({ detail: "O valor bruto deve ser maior que zero" });
  if (discount < 0 || discount > gross) return res.status(400).json({ detail: "Desconto inválido" });

  const pm = db.paymentMethods.find((p) => p.id === body.payment_method_id) || db.paymentMethods[0];
  const barber = db.barbers.find((b) => b.id === body.barber_id);
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

  const settlementDays = pm?.settlement_days[body.payment_type] || 0;
  const dateObj = parseDateStr(body.date || todayStr());
  const settlementDate = new Date(dateObj.getTime() + settlementDays * 86400000).toISOString().split("T")[0];

  const rev: Revenue = {
    id: newId(),
    barbershop_id: (getUnitFilter(req) || barber?.barbershop_id || "unit_centro"),
    date: body.date || todayStr(),
    time: body.time || "12:00",
    item_kind: body.item_kind || (body.service_type === "produto" ? "produto" : "servico"),
    item_id: body.item_id,
    weekday: dateObj.getDay(),
    service_type: body.service_type || "corte",
    service_name: body.service_name || "Corte",
    quantity: Number(body.quantity || 1),
    gross_amount: gross,
    discount_amount: discount,
    paid_amount: paid,
    payment_method_id: pm.id,
    payment_method_name: pm.name,
    payment_type: body.payment_type || "dinheiro",
    payment_channel: body.payment_channel || "Caixa Físico / Gaveta",
    payment_method: body.payment_method || (body.payment_type === "dinheiro" ? "Dinheiro" : body.payment_type === "pix" ? "PIX" : "Cartão"),
    barber_id: barber?.id,
    barber_name: barber?.name || "",
    client_name: body.client_name,
    client_id: body.client_id,
    fee_amount: fee,
    net_amount: net,
    commission_amount: comm,
    shop_amount: shop,
    settlement_date: settlementDate,
    available: settlementDate <= todayStr(),
    commission_paid: false,
    status: "ativo",
    note: body.note,
    created_at: nowIso(),
  };

  db.revenues.unshift(rev);
  persistRevenue(rev);
  db.logChange(`Registrou receita de ${formatBRL(paid)} (${rev.service_name})`, "revenue", null, rev);
  res.json(rev);
});

router.post("/revenues/:id/cancel", (req, res) => {
  const rev = db.revenues.find((r) => r.id === req.params.id);
  if (!rev) return res.status(404).json({ detail: "Receita não encontrada" });
  const mode = (req.query.mode as string) || "cancelado";
  rev.status = mode;
  persistRevenue(rev);
  db.logChange(`Receita #${rev.id.slice(-6)} marcada como ${mode}`, "revenue");
  res.json(rev);
});

router.delete("/revenues/:id", (req, res) => {
  const rev = db.revenues.find((r) => r.id === req.params.id);
  db.revenues = db.revenues.filter((r) => r.id !== req.params.id);
  if (rev) db.logChange(`Excluiu receita #${rev.id.slice(-6)}`, "revenue", rev, null);
  res.json({ ok: true });
});

// Expenses
router.get("/expenses", (req, res) => {
  const { month } = req.query as { month?: string };
  const unitFilter = getUnitFilter(req);
  let list = [...db.expenses];
  if (unitFilter) {
    list = list.filter((e) => e.barbershop_id === unitFilter || (unitFilter === "unit_centro" && e.barbershop_id === "profile"));
  }
  if (month) list = list.filter((e) => e.due_date.startsWith(month));
  list.sort((a, b) => b.due_date.localeCompare(a.due_date));
  res.json(list);
});

router.post("/expenses", (req, res) => {
  const body = req.body || {};
  const cat = db.categories.find((c) => c.id === body.category_id);
  const createdList: Expense[] = [];
  const assignedUnit = getUnitFilter(req) || body.barbershop_id || "unit_centro";

  const createOne = (dueDate: string, name: string) => {
    const isPaid = Boolean(body.payment_date);
    const exp: Expense = {
      id: newId(),
      barbershop_id: assignedUnit,
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
      const due = d.toISOString().split("T")[0];
      createOne(due, `${body.name} (${i + 1}/${occ})`);
    }
  } else {
    createOne(body.due_date || todayStr(), body.name);
  }

  createdList.forEach((e) => persistExpense(e));
  db.logChange(`Cadastrou despesa '${body.name}' (${formatBRL(body.value)})`, "expense", null, createdList[0]);
  res.json(createdList[0]);
});

router.put("/expenses/:id", (req, res) => {
  const idx = db.expenses.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Despesa não encontrada" });
  db.expenses[idx] = { ...db.expenses[idx], ...req.body };
  persistExpense(db.expenses[idx]);
  res.json(db.expenses[idx]);
});

router.post("/expenses/:id/pay", (req, res) => {
  const exp = db.expenses.find((e) => e.id === req.params.id);
  if (!exp) return res.status(404).json({ detail: "Despesa não encontrada" });
  exp.payment_date = req.body?.payment_date || todayStr();
  exp.status = "pago";
  persistExpense(exp);
  db.logChange(`Marcou despesa '${exp.name}' como paga`, "expense");
  res.json(exp);
});

router.delete("/expenses/:id", (req, res) => {
  db.expenses = db.expenses.filter((e) => e.id !== req.params.id);
  res.json({ ok: true });
});

// Withdrawals
router.get("/withdrawals", (req, res) => {
  const { month } = req.query as { month?: string };
  const unitFilter = getUnitFilter(req);
  let list = [...db.withdrawals];
  if (unitFilter) {
    list = list.filter((w) => w.barbershop_id === unitFilter || (unitFilter === "unit_centro" && w.barbershop_id === "profile"));
  }
  if (month) list = list.filter((w) => w.date.startsWith(month));
  res.json(list);
});

router.post("/withdrawals", (req, res) => {
  const body = req.body || {};
  const w: Withdrawal = {
    id: newId(),
    barbershop_id: (getUnitFilter(req) || body.barbershop_id || "unit_centro"),
    date: body.date || todayStr(),
    value: Number(body.value || 0),
    reason: body.reason || "",
    source: body.source || "dinheiro",
    created_at: nowIso(),
  };
  db.withdrawals.push(w);
  db.logChange(`Retirada do proprietário de ${formatBRL(w.value)}`, "withdrawal", null, w);
  res.json(w);
});

router.delete("/withdrawals/:id", (req, res) => {
  db.withdrawals = db.withdrawals.filter((w) => w.id !== req.params.id);
  res.json({ ok: true });
});

// Cash Closings
router.get("/cash-closings", (req, res) => {
  res.json(db.cashClosings);
});

router.get("/cash-closings/expected", (req, res) => {
  const d = (req.query.day as string) || todayStr();
  const revs = db.revenues.filter((r) => r.date === d && r.status === "ativo");
  const expected: Record<string, number> = {};

  revs.forEach((r) => {
    const channel = r.payment_channel || (r.payment_type === "dinheiro" ? "Caixa Físico / Gaveta" : r.payment_method_name || "Outro Meio");
    const method = r.payment_method || (r.payment_type === "dinheiro" ? "Dinheiro" : r.payment_type === "pix" ? "PIX" : "Cartão");
    const key = `${channel} - ${method}`;
    expected[key] = (expected[key] || 0) + r.paid_amount;
  });

  // Se vazio, fornece ao menos o Caixa Físico
  if (Object.keys(expected).length === 0) {
    expected["Caixa Físico / Gaveta - Dinheiro"] = 0;
  }

  Object.keys(expected).forEach((k) => (expected[k] = Number(expected[k].toFixed(2))));
  res.json({ date: d, expected });
});

router.post("/cash-closings", (req, res) => {
  const body = req.body || {};
  const d = body.date || todayStr();
  const counted = body.counted || {};
  const revs = db.revenues.filter((r) => r.date === d && r.status === "ativo");

  const expected: Record<string, number> = {};
  revs.forEach((r) => {
    const channel = r.payment_channel || (r.payment_type === "dinheiro" ? "Caixa Físico / Gaveta" : r.payment_method_name || "Outro Meio");
    const method = r.payment_method || (r.payment_type === "dinheiro" ? "Dinheiro" : r.payment_type === "pix" ? "PIX" : "Cartão");
    const key = `${channel} - ${method}`;
    expected[key] = (expected[key] || 0) + r.paid_amount;
  });

  if (Object.keys(expected).length === 0) {
    expected["Caixa Físico / Gaveta - Dinheiro"] = 0;
  }

  let expTotal = 0;
  let countTotal = 0;
  Object.keys(expected).forEach((k) => {
    expected[k] = Number(expected[k].toFixed(2));
    expTotal += expected[k];
  });
  Object.keys(counted).forEach((k) => {
    countTotal += Number(counted[k] || 0);
  });

  const diff = Number((countTotal - expTotal).toFixed(2));
  const cc: CashClosing = {
    id: newId(),
    barbershop_id: "profile",
    date: d,
    expected,
    counted,
    difference: diff,
    note: body.note,
    created_at: nowIso(),
  };
  db.cashClosings.unshift(cc);
  db.logChange(`Fechamento de caixa do dia ${d} registrado`, "cash_closing", null, cc);
  res.json(cc);
});


export default router;
