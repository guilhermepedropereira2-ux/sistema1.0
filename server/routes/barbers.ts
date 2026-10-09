import express, { Request, Response } from "express";
import { db, authUser, getUnitFilter, getTenantId, isUserSuperAdmin } from "../db.js";
import { newId, nowIso, todayStr, parseDateStr, formatBRL, Barber, CommissionPayment, Expense, User, Unit } from "../types.js";
import { persistBarber, persistExpense } from "../../src/db/sync.js";
import { storage } from "../storage.js";
import { requireAuth, requirePermission, requireDono, hashPassword } from "../auth.js";

const router = express.Router();

router.get("/barbers", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const unitFilter = getUnitFilter(req);
  let list = db.barbers.filter((b) => b.barbershop_id === tenantId);
  if (unitFilter && unitFilter !== "all") {
    const tenantHasUnit = db.units.some((u) => u.barbershop_id === tenantId && u.id === unitFilter);
    if (tenantHasUnit) {
      list = list.filter((b) => b.unit_ids?.includes(unitFilter) || b.unit_id === unitFilter || (!b.unit_id && !b.unit_ids?.length));
    }
  }
  res.json(list);
});

router.get("/barbers/ranking", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const unitFilter = getUnitFilter(req);
  const start = req.query.start as string;
  const end = req.query.end as string;

  let revs = db.revenues.filter((r) => r.barbershop_id === tenantId && r.status === "ativo");
  if (start && end) {
    revs = revs.filter((r) => r.date >= start && r.date <= end);
  } else if (start) {
    revs = revs.filter((r) => r.date >= start);
  }

  if (unitFilter && unitFilter !== "all") {
    const tenantHasUnit = db.units.some((u) => u.barbershop_id === tenantId && u.id === unitFilter);
    if (tenantHasUnit) {
      revs = revs.filter((r) => r.unit_id === unitFilter || r.barbershop_id === unitFilter);
    }
  }

  const tenantBarbers = db.barbers.filter((b) => b.barbershop_id === tenantId);
  const ranking = tenantBarbers.map((b) => {
    const bRevs = revs.filter((r) => r.barber_id === b.id);
    const atendimentos = bRevs.length;
    const servicos = Number(bRevs.filter((r) => r.item_kind !== "produto").reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
    const produtos = Number(bRevs.filter((r) => r.item_kind === "produto").reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
    const comissao = Number(bRevs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
    const total = Number(bRevs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));

    return {
      barber_id: b.id,
      name: b.name,
      photo_url: b.photo_url || null,
      atendimentos,
      servicos,
      produtos,
      comissao,
      total,
    };
  });

  ranking.sort((a, b) => b.total - a.total);
  res.json(ranking);
});

router.post("/barbers", requireAuth, requirePermission("cadastrar_barbeiros"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const sub = db.getSubscription(tenantId);
  const plan = sub.plan_id;
  let tenantUnits = db.units.filter((u) => u.barbershop_id === tenantId);
  if (tenantUnits.length === 0) {
    const mainUnit: Unit = {
      id: `unit_${newId()}`,
      barbershop_id: tenantId,
      name: "Unidade Principal (Matriz)",
      short_name: "Matriz",
      slug: `matriz-${Date.now().toString().slice(-4)}`,
      address: "",
      phone: "",
      city: "São Paulo",
      state: "SP",
      is_main: true,
      operational_mode: "hibrido",
      created_at: nowIso(),
    };
    db.units.push(mainUnit);
    tenantUnits = [mainUnit];
  }

  const tenantBarbers = db.barbers.filter((b) => b.barbershop_id === tenantId && b.active !== false);

  const maxAllowed = sub.multi_unit
    ? (sub.max_barbers || 10) * Math.max(1, tenantUnits.length)
    : (sub.max_barbers || (plan === "starter" ? 1 : plan === "pro" ? 4 : 10));

  if (tenantBarbers.length >= maxAllowed) {
    return res.status(403).json({
      detail: `Você atingiu o limite de ${maxAllowed} barbeiro(s) do seu plano (${plan.toUpperCase()}). Faça o upgrade para adicionar mais profissionais.`,
      code: "LIMIT_REACHED",
      plan,
      max_barbers: maxAllowed,
    });
  }

  const body = req.body || {};
  if (!body.name?.trim()) return res.status(400).json({ detail: "Nome do barbeiro é obrigatório" });

  const assignedUnitIds = Array.isArray(body.unit_ids) && body.unit_ids.length
    ? body.unit_ids
    : (body.unit_id ? [body.unit_id] : (tenantUnits[0]?.id ? [tenantUnits[0].id] : []));

  const barberId = newId();
  let createdUserId = undefined;

  if (body.username?.trim()) {
    const cleanUsername = body.username.trim().toLowerCase();
    const existingUser = db.users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (existingUser) {
      return res.status(400).json({ detail: "Este nome de usuário já está em uso. Por favor, escolha outro usuário." });
    }
    if (body.password) {
      const uId = `usr_${newId()}`;
      const newUser: User = {
        id: uId,
        name: body.name.trim(),
        username: body.username.trim(),
        password: hashPassword(body.password),
        email: body.email?.trim() || `${body.username.trim()}@barbearia.com`,
        role: "barbeiro",
        roles: ["barbeiro"],
        barbershop_id: tenantId,
        barber_id: barberId,
        permissions: {},
        active: body.active !== false,
        created_at: nowIso(),
      };
      createdUserId = uId;
      db.users.push(newUser);
    }
  }

  const b: Barber = {
    id: barberId,
    barbershop_id: tenantId,
    unit_id: assignedUnitIds[0] || undefined,
    unit_ids: assignedUnitIds,
    user_id: createdUserId,
    name: body.name.trim(),
    commission_percent: Number(body.commission_percent ?? 40),
    commission_type: body.commission_type || "percentual",
    commission_value: Number(body.commission_value || 0),
    commission_overrides: body.commission_overrides || {},
    phone: body.phone,
    email: body.email,
    photo_url: body.photo_url,
    join_date: body.join_date || todayStr(),
    authorized_services: Array.isArray(body.authorized_services) ? body.authorized_services : db.services.filter((s) => s.barbershop_id === tenantId).map((s) => s.id),
    authorized_products: Array.isArray(body.authorized_products) ? body.authorized_products : db.products.filter((p) => p.barbershop_id === tenantId).map((p) => p.id),
    active: body.active !== false,
    created_at: nowIso(),
  };

  db.barbers.push(b);
  persistBarber(b);
  db.logChange(`Cadastrou barbeiro '${b.name}'`, "barber", null, b);
  res.json(b);
});

router.get("/barbers/:id/report", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const barberId = req.params.id;
  const barber = db.barbers.find((x) => x.id === barberId && x.barbershop_id === tenantId);
  if (!barber) {
    return res.status(404).json({ detail: "Barbeiro não encontrado" });
  }

  const start = req.query.start as string;
  const end = req.query.end as string;

  let revs = db.revenues.filter((r) => r.barbershop_id === tenantId && r.barber_id === barberId && r.status === "ativo");
  if (start && end) {
    revs = revs.filter((r) => r.date >= start && r.date <= end);
  } else if (start) {
    revs = revs.filter((r) => r.date >= start);
  }

  const uniqueAttendanceGroups = new Set(revs.map((r) => r.sale_group_id || r.id));
  const atendimentos = uniqueAttendanceGroups.size;
  const faturamento_total = Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
  const comissao_gerada = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const comissao_paga = Number(revs.filter((r) => r.commission_paid).reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
  const comissao_pendente = Number((comissao_gerada - comissao_paga).toFixed(2));
  const total_barbearia = Number(revs.reduce((acc, r) => acc + (r.shop_amount ?? (r.paid_amount - (r.commission_amount || 0))), 0).toFixed(2));
  const descontos = Number(revs.reduce((acc, r) => acc + (r.discount_amount || 0), 0).toFixed(2));
  const taxas = Number(revs.reduce((acc, r) => acc + (r.fee_amount || 0), 0).toFixed(2));
  const valor_liquido = Number(revs.reduce((acc, r) => acc + (r.net_amount || 0), 0).toFixed(2));

  const serviceRevs = revs.filter((r) => r.item_kind !== "produto");
  const productRevs = revs.filter((r) => r.item_kind === "produto");

  const services_summary = {
    quantity: serviceRevs.reduce((acc, r) => acc + (r.quantity || 1), 0),
    paid: Number(serviceRevs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2)),
  };

  const products_summary = {
    quantity: productRevs.reduce((acc, r) => acc + (r.quantity || 1), 0),
    paid: Number(productRevs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2)),
  };

  // Group services
  const svcMap: Record<string, { name: string; quantity: number; total: number }> = {};
  serviceRevs.forEach((r) => {
    const sName = r.service_name || "Serviço";
    if (!svcMap[sName]) svcMap[sName] = { name: sName, quantity: 0, total: 0 };
    svcMap[sName].quantity += (r.quantity || 1);
    svcMap[sName].total = Number((svcMap[sName].total + (r.paid_amount || 0)).toFixed(2));
  });

  // Group products
  const prodMap: Record<string, { name: string; quantity: number; total: number }> = {};
  productRevs.forEach((r) => {
    const pName = r.service_name || "Produto";
    if (!prodMap[pName]) prodMap[pName] = { name: pName, quantity: 0, total: 0 };
    prodMap[pName].quantity += (r.quantity || 1);
    prodMap[pName].total = Number((prodMap[pName].total + (r.paid_amount || 0)).toFixed(2));
  });

  res.json({
    barber: {
      id: barber.id,
      name: barber.name,
      photo_url: barber.photo_url || null,
      commission_percent: barber.commission_percent,
      commission_type: barber.commission_type,
      commission_value: barber.commission_value,
      phone: barber.phone,
      email: barber.email,
    },
    start,
    end,
    atendimentos,
    faturamento_total,
    paid: faturamento_total,
    comissao_gerada,
    commission: comissao_gerada,
    comissao_paga,
    commission_paid: comissao_paga,
    comissao_pendente,
    commission_pending: comissao_pendente,
    total_barbearia,
    shop: total_barbearia,
    descontos,
    discounts: descontos,
    taxas,
    fees: taxas,
    valor_liquido,
    net: valor_liquido,
    services_summary,
    products_summary,
    services_breakdown: Object.values(svcMap).sort((a, b) => b.total - a.total),
    products_breakdown: Object.values(prodMap).sort((a, b) => b.total - a.total),
  });
});

router.post("/barbers/:id/pay-commissions", requireAuth, requirePermission("ver_relatorios"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const barberId = req.params.id;
  const barber = db.barbers.find((x) => x.id === barberId && x.barbershop_id === tenantId);
  if (!barber) {
    return res.status(404).json({ detail: "Barbeiro não encontrado" });
  }

  const start = req.query.start as string;
  const end = req.query.end as string;

  let revs = db.revenues.filter((r) => r.barbershop_id === tenantId && r.barber_id === barberId && r.status === "ativo" && !r.commission_paid);
  if (start && end) {
    revs = revs.filter((r) => r.date >= start && r.date <= end);
  } else if (start) {
    revs = revs.filter((r) => r.date >= start);
  }

  let total = 0;
  revs.forEach((r) => {
    r.commission_paid = true;
    r.commission_paid_date = todayStr();
    total += (r.commission_amount || 0);
  });
  total = Number(total.toFixed(2));

  db.logChange(`Pagou comissões de R$ ${total.toFixed(2)} para o barbeiro '${barber.name}'`, "commission", null, { barber_id: barber.id, total, count: revs.length });

  res.json({ ok: true, total, paid: revs.length });
});

router.get("/barbers/:id", requireAuth, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const b = db.barbers.find((x) => x.id === req.params.id && x.barbershop_id === tenantId);
  if (!b) return res.status(404).json({ detail: "Barbeiro não encontrado" });
  res.json(b);
});

router.put("/barbers/:id", requireAuth, requirePermission("editar_barbeiros"), (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const idx = db.barbers.findIndex((x) => x.id === req.params.id && x.barbershop_id === tenantId);
  if (idx === -1) return res.status(404).json({ detail: "Barbeiro não encontrado" });

  const body = req.body || {};
  const current = db.barbers[idx];
  const assignedUnitIds = Array.isArray(body.unit_ids)
    ? body.unit_ids
    : (body.unit_id ? [body.unit_id] : current.unit_ids || (current.unit_id ? [current.unit_id] : []));

  let userId = current.user_id;

  // Atualizar ou vincular usuário de acesso
  if (body.username?.trim()) {
    const cleanUsername = body.username.trim().toLowerCase();
    const collision = db.users.find((u) => u.id !== current.user_id && u.username.toLowerCase() === cleanUsername);
    if (collision) {
      return res.status(400).json({ detail: "Este nome de usuário já está em uso por outra conta." });
    }

    if (current.user_id) {
      const uIdx = db.users.findIndex((u) => u.id === current.user_id);
      if (uIdx !== -1) {
        db.users[uIdx].username = body.username.trim();
        db.users[uIdx].name = body.name?.trim() || db.users[uIdx].name;
        if (body.email) db.users[uIdx].email = body.email.trim();
        if (body.password) db.users[uIdx].password = hashPassword(body.password);
        if (body.active !== undefined) db.users[uIdx].active = body.active;
      }
    } else if (body.password) {
      const uId = `usr_${newId()}`;
      const newUser: User = {
        id: uId,
        name: body.name?.trim() || current.name,
        username: body.username.trim(),
        password: hashPassword(body.password),
        email: body.email?.trim() || `${body.username.trim()}@barbearia.com`,
        role: "barbeiro",
        roles: ["barbeiro"],
        barbershop_id: tenantId,
        barber_id: current.id,
        permissions: {},
        active: body.active !== false,
        created_at: nowIso(),
      };
      db.users.push(newUser);
      userId = uId;
    }
  }

  db.barbers[idx] = {
    ...current,
    ...body,
    barbershop_id: tenantId,
    user_id: userId,
    unit_ids: assignedUnitIds,
    unit_id: assignedUnitIds[0] || current.unit_id,
  };

  persistBarber(db.barbers[idx]);
  db.logChange(`Atualizou cadastro do barbeiro '${db.barbers[idx].name}'`, "barber", null, db.barbers[idx]);
  res.json(db.barbers[idx]);
});

router.delete("/barbers/:id", requireAuth, requireDono, (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const b = db.barbers.find((x) => x.id === req.params.id && x.barbershop_id === tenantId);
  if (!b) return res.status(404).json({ detail: "Barbeiro não encontrado" });

  db.barbers = db.barbers.filter((x) => !(x.id === req.params.id && x.barbershop_id === tenantId));
  // Remover ou desativar usuário de acesso associado ao barbeiro
  if (b.user_id || b.id) {
    db.users = db.users.filter((u) => u.id !== b.user_id && u.barber_id !== b.id);
  }

  db.logChange(`Excluiu barbeiro '${b.name}'`, "barber", b, null);
  res.json({ ok: true });
});

// ==========================================
// 2. COMISSÕES E FECHAMENTO DE REPASSES
// ==========================================
router.get("/commissions/summary", requireAuth, requirePermission("ver_relatorios"), (req: Request, res: Response) => {
  const m = (req.query.month as string) || todayStr().slice(0, 7);
  const tenantId = getTenantId(req);
  const unitFilter = getUnitFilter(req);

  let revs = db.revenues.filter((r) => r.barbershop_id === tenantId && r.date.startsWith(m) && r.status === "ativo");
  if (unitFilter) {
    revs = revs.filter((r) => r.unit_id === unitFilter || r.barbershop_id === unitFilter);
  }

  const tenantBarbers = db.barbers.filter((b) => b.barbershop_id === tenantId);

  const barbersSummary = tenantBarbers.map((b) => {
    const bRevs = revs.filter((r) => r.barber_id === b.id);
    const totalGross = Number(bRevs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
    const totalCommission = Number(bRevs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
    const paidCommission = Number(
      bRevs.filter((r) => r.commission_paid).reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2)
    );
    const pendingCommission = Number((totalCommission - paidCommission).toFixed(2));

    return {
      barber_id: b.id,
      barber_name: b.name,
      total_attendances: bRevs.length,
      total_gross: totalGross,
      total_commission: totalCommission,
      paid_commission: paidCommission,
      pending_commission: pendingCommission,
      commission_percent: b.commission_percent,
    };
  });

  const totalGenerated = Number(barbersSummary.reduce((acc, b) => acc + b.total_commission, 0).toFixed(2));
  const totalPaid = Number(barbersSummary.reduce((acc, b) => acc + b.paid_commission, 0).toFixed(2));
  const totalPending = Number(barbersSummary.reduce((acc, b) => acc + b.pending_commission, 0).toFixed(2));

  res.json({
    month: m,
    total_generated: totalGenerated,
    total_paid: totalPaid,
    total_pending: totalPending,
    barbers: barbersSummary,
  });
});

export default router;
