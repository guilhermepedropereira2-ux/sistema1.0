import express from "express";
import { db, authUser, getUnitFilter, getTenantId } from "../db.js";
import { newId, nowIso, todayStr, Unit } from "../types.js";
import { storage } from "../storage.js";
import { getPgHealth, loadFromPg, persistSubscription } from "../../src/db/sync.js";
import { requireAuth, requireDono, requireSuperAdmin, requirePermission } from "../auth.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Database status & sync (PostgreSQL Supabase)
router.get("/db/status", (_req, res) => {
  res.json(getPgHealth());
});

router.post("/db/sync", requireAuth, requireDono, async (_req, res) => {
  try {
    await loadFromPg(db);
    res.json({ ok: true, message: "Dados sincronizados com o PostgreSQL", status: getPgHealth() });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Multi-Tenant Relational Storage API
router.get("/storage/status", async (_req, res) => {
  res.json({
    storageType: storage.storageType,
    isDatabaseConnected: storage.isDatabaseConnected(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/organizations", requireSuperAdmin, async (_req, res) => {
  const orgs = await storage.getAllOrganizations();
  res.json(orgs);
});

router.get("/organizations/:id", requireSuperAdmin, async (req, res) => {
  const org = await storage.getOrganization(req.params.id);
  if (!org) return res.status(404).json({ error: "Organização não encontrada" });
  res.json(org);
});

router.get("/organizations/:id/appointments", requireSuperAdmin, async (req, res) => {
  const apts = await storage.getAppointmentsByOrg(req.params.id);
  res.json(apts);
});

router.get("/organizations/:id/subscription-transactions", requireSuperAdmin, async (req, res) => {
  const txs = await storage.getSubscriptionTransactionsByOrg(req.params.id);
  res.json(txs);
});

// Subscription & Plans
router.get("/subscription", requireAuth, async (req, res) => {
  const user = (req as any).user || authUser(req);
  const tenantId = getTenantId(req);
  const sub = db.getSubscription(tenantId);
  const activeBarbers = db.barbers.filter((b) => b.barbershop_id === tenantId && b.active !== false).length;
  const tenantUnits = db.units.filter((u) => u.barbershop_id === tenantId);

  const status = user?.subscriptionStatus || sub.status || "trialing";
  const expiresAt = user?.subscriptionExpiresAt || sub.subscriptionExpiresAt;

  res.json({
    ...sub,
    status,
    subscriptionStatus: status,
    subscription_status: status,
    subscriptionExpiresAt: expiresAt,
    current_barbers: activeBarbers,
    current_units: tenantUnits.length || 1,
  });
});

router.put("/subscription", requireAuth, requireDono, async (req, res) => {
  const user = (req as any).user || authUser(req);
  const tenantId = getTenantId(req);
  const { plan_id, status } = req.body || {};
  if (plan_id && ["starter", "pro", "premium", "basic"].includes(plan_id)) {
    const canonicalPlan = plan_id === "basic" ? "starter" : plan_id;
    const finalStatus = status || "active";
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    const maxBarbers = canonicalPlan === "starter" ? 1 : canonicalPlan === "pro" ? 4 : 10;
    const multiUnit = canonicalPlan === "premium";

    const updatedSub = db.setSubscription(tenantId, {
      plan_id: canonicalPlan,
      status: finalStatus,
      subscriptionStatus: finalStatus,
      subscriptionExpiresAt: expiresAt,
      max_barbers: maxBarbers,
      multi_unit: multiUnit,
    });

    if (user) {
      user.subscriptionStatus = finalStatus;
      user.subscriptionExpiresAt = expiresAt;
    }

    db.logChange(`Alterou plano de assinatura para '${canonicalPlan.toUpperCase()}'`, "subscription");
    const activeBarbers = db.barbers.filter((b) => b.barbershop_id === tenantId && b.active !== false).length;
    const tenantUnits = db.units.filter((u) => u.barbershop_id === tenantId);

    return res.json({
      ...updatedSub,
      current_barbers: activeBarbers,
      current_units: tenantUnits.length || 1,
    });
  }

  const currentSub = db.getSubscription(tenantId);
  const activeBarbers = db.barbers.filter((b) => b.barbershop_id === tenantId && b.active !== false).length;
  const tenantUnits = db.units.filter((u) => u.barbershop_id === tenantId);
  res.json({
    ...currentSub,
    current_barbers: activeBarbers,
    current_units: tenantUnits.length || 1,
  });
});

// Units (Rede / Multi-unidades)
router.get("/units", requireAuth, (req, res) => {
  const tenantId = getTenantId(req);
  const currentMonth = todayStr().slice(0, 7);

  const tenantUnits = db.units.filter((u) => u.barbershop_id === tenantId);

  const unitsWithMetrics = tenantUnits.map((u) => {
    const isMain = u.is_main;
    const revs = db.revenues.filter(
      (r) =>
        r.barbershop_id === tenantId &&
        (r.unit_id === u.id || (!r.unit_id && isMain)) &&
        r.date.startsWith(currentMonth) &&
        r.status === "ativo"
    );
    const exps = db.expenses.filter(
      (e) =>
        e.barbershop_id === tenantId &&
        (e.unit_id === u.id || (!e.unit_id && isMain)) &&
        e.due_date.startsWith(currentMonth)
    );

    const gross = Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
    const net = Number(revs.reduce((acc, r) => acc + (r.net_amount || 0), 0).toFixed(2));
    const shop = Number(revs.reduce((acc, r) => acc + (r.shop_amount || 0), 0).toFixed(2));
    const expenses_total = Number(exps.reduce((acc, e) => acc + (e.value || 0), 0).toFixed(2));
    const profit = Number((shop - expenses_total).toFixed(2));

    const barbers = db.barbers.filter(
      (b) =>
        b.active !== false &&
        b.barbershop_id === tenantId &&
        (b.unit_ids?.includes(u.id) || b.unit_id === u.id || (!b.unit_id && !b.unit_ids?.length && isMain))
    );
    const queue_waiting = 0;
    const appointments_today = db.appointments.filter(
      (a) =>
        a.date === todayStr() &&
        a.status !== "cancelado" &&
        a.barbershop_id === tenantId &&
        (a.unit_id === u.id || (!a.unit_id && isMain))
    ).length;

    return {
      ...u,
      gross,
      profit,
      net,
      barbers_count: barbers.length,
      revenue_count: revs.length,
      queue_waiting,
      appointments_today,
    };
  });

  const totalGross = Number(unitsWithMetrics.reduce((acc, u) => acc + u.gross, 0).toFixed(2));
  const totalProfit = Number(unitsWithMetrics.reduce((acc, u) => acc + u.profit, 0).toFixed(2));
  const totalBarbers = db.barbers.filter((b) => b.barbershop_id === tenantId && b.active !== false).length;

  res.json({
    units: unitsWithMetrics,
    network_summary: {
      total_units: unitsWithMetrics.length,
      total_gross: totalGross,
      total_profit: totalProfit,
      total_barbers: totalBarbers,
    },
  });
});

router.post("/units", requireAuth, requireDono, (req, res) => {
  const tenantId = getTenantId(req);
  const sub = db.getSubscription(tenantId);
  if (!sub.multi_unit) {
    return res.status(403).json({
      detail: "O gerenciamento de Múltiplas Unidades (Rede) está disponível exclusivamente no Plano Premium.",
      code: "PLAN_FEATURE_LOCKED",
      required_plan: "premium",
    });
  }

  const body = req.body || {};
  if (!body.name?.trim()) {
    return res.status(400).json({ detail: "Nome da unidade é obrigatório." });
  }

  const tenantUnitsCount = db.units.filter((u) => u.barbershop_id === tenantId).length;
  if (tenantUnitsCount >= 5) {
    return res.status(403).json({
      detail: "Limite máximo de 5 unidades atingido para a sua rede no Plano Premium.",
    });
  }

  const slug = (body.name || "unidade")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const newUnit: Unit = {
    id: `unit_${newId()}`,
    barbershop_id: tenantId,
    name: body.name.trim(),
    short_name: body.short_name || body.name.split(" ")[0],
    slug: slug || `unit-${Date.now()}`,
    address: body.address || "",
    phone: body.phone || "",
    city: body.city || "São Paulo",
    state: body.state || "SP",
    is_main: false,
    operational_mode: body.operational_mode || "hibrido",
    created_at: nowIso(),
  };

  db.units.push(newUnit);
  db.logChange(`Criou nova unidade da rede: '${newUnit.name}'`, "unit", null, newUnit);
  res.json(newUnit);
});

router.put("/units/:id", requireAuth, requireDono, (req, res) => {
  const tenantId = getTenantId(req);
  const idx = db.units.findIndex((u) => u.id === req.params.id && u.barbershop_id === tenantId);
  if (idx === -1) return res.status(404).json({ detail: "Unidade não encontrada." });

  db.units[idx] = { ...db.units[idx], ...req.body, barbershop_id: tenantId };
  db.logChange(`Atualizou unidade '${db.units[idx].name}'`, "unit", null, db.units[idx]);
  res.json(db.units[idx]);
});

router.delete("/units/:id", requireAuth, requireDono, (req, res) => {
  const tenantId = getTenantId(req);
  const unit = db.units.find((u) => u.id === req.params.id && u.barbershop_id === tenantId);
  if (!unit) return res.status(404).json({ detail: "Unidade não encontrada." });
  if (unit.is_main) {
    return res.status(400).json({ detail: "A Unidade Matriz não pode ser excluída." });
  }
  db.units = db.units.filter((u) => !(u.id === req.params.id && u.barbershop_id === tenantId));
  db.logChange(`Excluiu unidade '${unit.name}'`, "unit", unit, null);
  res.json({ ok: true });
});

// Settings
router.get("/settings", requireAuth, (req, res) => {
  const tenantId = getTenantId(req);
  const shop = db.barbershops.find((b) => b.id === tenantId) || db.barbershop;
  if (!db.settings.commission_base) {
    db.settings.commission_base = db.settings.commission_on === "original" ? "gross" : "net";
  }
  if (db.settings.discount_affects_commission === undefined) {
    db.settings.discount_affects_commission = true;
  }
  res.json({
    ...db.settings,
    shop_name: shop.name,
    public_slug: shop.slug,
    operational_mode: shop.operational_mode,
  });
});

router.put("/settings", requireAuth, requirePermission("alterar_configuracoes"), (req, res) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  let slug = body.public_slug || body.slug;
  if (slug) {
    slug = String(slug)
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    body.public_slug = slug || "minha-barbearia";
    db.barbershop.slug = body.public_slug;
  }

  // Handle commission calculation rules
  if (body.commission_base) {
    body.commission_base = body.commission_base === "net" ? "net" : "gross";
    body.commission_on = body.commission_base === "gross" ? "original" : "pago";
  }
  if (body.discount_affects_commission !== undefined) {
    body.discount_affects_commission = Boolean(body.discount_affects_commission);
  }

  db.settings = { ...db.settings, ...body, barbershop_id: tenantId };
  const shop = db.barbershops.find((b) => b.id === tenantId);
  if (shop && body.shop_name) {
    shop.name = body.shop_name;
  }
  db.logChange("Atualizou configurações gerais", "settings", null, db.settings);
  res.json(db.settings);
});

// Barbershop profile (Informações públicas ou administrativas)
router.get("/barbershop", (req, res) => {
  const tenantId = getTenantId(req);
  const shop = db.barbershops.find((b) => b.id === tenantId) || db.barbershop;
  res.json(shop);
});

router.put("/barbershop", requireAuth, requireDono, (req, res) => {
  const body = req.body || {};
  let slug = body.slug || body.public_slug;
  if (slug) {
    slug = String(slug)
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    body.slug = slug || "barbearia-vintage";
    db.settings.public_slug = body.slug;
  }
  db.barbershop = { ...db.barbershop, ...body };
  if (body.name) {
    db.settings.shop_name = body.name;
  }
  db.logChange("Atualizou perfil da barbearia", "barbershop", null, db.barbershop);
  res.json(db.barbershop);
});

// Calendar
router.get("/calendar", requireAuth, (req, res) => {
  const m = (req.query.month as string) || todayStr().slice(0, 7);
  const unitFilter = getUnitFilter(req);
  let exps = db.expenses.filter((e) => e.due_date.startsWith(m));
  let revs = db.revenues.filter((r) => r.date.startsWith(m) && r.status === "ativo");

  if (unitFilter) {
    revs = revs.filter((r) => r.barbershop_id === unitFilter || (unitFilter === "unit_centro" && r.barbershop_id === "profile"));
    exps = exps.filter((e) => e.barbershop_id === unitFilter || (unitFilter === "unit_centro" && e.barbershop_id === "profile"));
  }

  res.json({
    month: m,
    expenses: exps,
    revenues: revs,
  });
});

// History
router.get("/history", requireAuth, (req, res) => {
  const limit = Number(req.query.limit || 100);
  res.json(db.history.slice(0, limit));
});

// Admin Demo Actions (Protegidas por SuperAdmin ou Dono)
router.post("/admin/seed", requireSuperAdmin, (_req, res) => {
  db.seed();
  res.json({ ok: true, message: "Dados de demonstração recriados" });
});

router.post("/admin/clear", requireSuperAdmin, (_req, res) => {
  db.revenues = [];
  db.expenses = [];
  db.withdrawals = [];
  db.cashClosings = [];
  db.clients = [];
  db.queue = [];
  db.appointments = [];
  db.logChange("Todos os dados foram limpos pelo administrador", "admin");
  res.json({ ok: true, message: "Todos os dados foram limpos" });
});

export default router;
