import express from "express";
import { db, authUser, getUnitFilter } from "../db.js";
import { newId, nowIso, todayStr, Unit } from "../types.js";
import { storage } from "../storage.js";
import { getPgHealth, loadFromPg, persistSubscription } from "../../src/db/sync.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Database status & sync (PostgreSQL Supabase)
router.get("/db/status", (_req, res) => {
  res.json(getPgHealth());
});

router.post("/db/sync", async (_req, res) => {
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

router.get("/organizations", async (_req, res) => {
  const orgs = await storage.getAllOrganizations();
  res.json(orgs);
});

router.get("/organizations/:id", async (req, res) => {
  const org = await storage.getOrganization(req.params.id);
  if (!org) return res.status(404).json({ error: "Organização não encontrada" });
  res.json(org);
});

router.get("/organizations/:id/appointments", async (req, res) => {
  const apts = await storage.getAppointmentsByOrg(req.params.id);
  res.json(apts);
});

router.get("/organizations/:id/subscription-transactions", async (req, res) => {
  const txs = await storage.getSubscriptionTransactionsByOrg(req.params.id);
  res.json(txs);
});

// Subscription & Plans
router.get("/subscription", async (req, res) => {
  const user = authUser(req);
  const activeBarbers = db.barbers.filter((b) => b.active !== false).length;
  const orgId = user?.barbershop_id || "org_vintage";
  const org = await storage.getOrganization(orgId);

  const now = new Date();
  if (org && org.subscription_status === "trial" && org.trial_ends_at && new Date(org.trial_ends_at) < now) {
    await storage.updateOrganizationTrialStatus(org.id, "expired");
    org.subscription_status = "expired";
    if (user) user.subscriptionStatus = "expired";
  }

  const status = org?.subscription_status || user?.subscriptionStatus || db.subscription.status || "trial";
  const expiresAt =
    org?.subscription_expires_at ||
    org?.trial_ends_at ||
    user?.subscriptionExpiresAt ||
    db.subscription.subscriptionExpiresAt;

  res.json({
    ...db.subscription,
    status,
    subscriptionStatus: status,
    subscription_status: status,
    subscriptionExpiresAt: expiresAt,
    trial_started_at: org?.trial_started_at,
    trial_ends_at: org?.trial_ends_at,
    trial_already_used: org?.trial_already_used ?? true,
    current_barbers: activeBarbers,
    current_units: db.units.length,
    organization: org,
  });
});

router.put("/subscription", async (req, res) => {
  const user = authUser(req);
  const { plan_id, status } = req.body || {};
  if (plan_id && ["starter", "pro", "premium"].includes(plan_id)) {
    const finalStatus = status || "active";
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

    db.subscription.plan_id = plan_id;
    db.subscription.status = finalStatus;
    db.subscription.subscriptionStatus = finalStatus;
    db.subscription.subscriptionExpiresAt = expiresAt;
    db.subscription.max_barbers = plan_id === "starter" ? 1 : plan_id === "pro" ? 4 : 10;
    db.subscription.multi_unit = plan_id === "premium";
    db.subscription.updated_at = nowIso();
    persistSubscription(db.subscription);

    if (user) {
      user.subscriptionStatus = finalStatus;
      user.subscriptionExpiresAt = expiresAt;
    }

    const orgId = user?.barbershop_id || "org_vintage";
    try {
      await storage.updateOrganizationSubscription(orgId, {
        plan: plan_id,
        status: finalStatus,
        subscription_status: finalStatus,
        subscription_expires_at: expiresAt,
      });
    } catch (e: any) {
      console.error("[Storage] Erro ao sincronizar alteração de plano:", e.message);
    }

    db.logChange(`Alterou plano de assinatura para '${plan_id.toUpperCase()}'`, "subscription");
  }
  res.json({
    ...db.subscription,
    current_barbers: db.barbers.filter((b) => b.active !== false).length,
    current_units: db.units.length,
  });
});

// Units (Rede / Multi-unidades)
router.get("/units", (_req, res) => {
  const currentMonth = todayStr().slice(0, 7);

  const unitsWithMetrics = db.units.map((u) => {
    const isMain = u.is_main || u.id === "unit_centro";
    const revs = db.revenues.filter(
      (r) =>
        (r.barbershop_id === u.id || (isMain && r.barbershop_id === "profile")) &&
        r.date.startsWith(currentMonth) &&
        r.status === "ativo"
    );
    const exps = db.expenses.filter(
      (e) =>
        (e.barbershop_id === u.id || (isMain && e.barbershop_id === "profile")) &&
        e.due_date.startsWith(currentMonth)
    );

    const gross = Number(revs.reduce((acc, r) => acc + (r.paid_amount || 0), 0).toFixed(2));
    const net = Number(revs.reduce((acc, r) => acc + (r.net_amount || 0), 0).toFixed(2));
    const shop = Number(revs.reduce((acc, r) => acc + (r.shop_amount || 0), 0).toFixed(2));
    const expenses_total = Number(exps.reduce((acc, e) => acc + (e.value || 0), 0).toFixed(2));
    const profit = Number((shop - expenses_total).toFixed(2));

    const barbers = db.barbers.filter(
      (b) => b.active !== false && (b.barbershop_id === u.id || (isMain && b.barbershop_id === "profile"))
    );
    const queue_waiting = db.queue.filter(
      (q) => q.status === "espera" && (q.barbershop_id === u.id || (isMain && q.barbershop_id === "profile"))
    ).length;
    const appointments_today = db.appointments.filter(
      (a) =>
        a.date === todayStr() &&
        a.status !== "cancelado" &&
        (a.barbershop_id === u.id || (isMain && a.barbershop_id === "profile"))
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
  const totalBarbers = unitsWithMetrics.reduce((acc, u) => acc + u.barbers_count, 0);

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

router.post("/units", (req, res) => {
  if (db.subscription.plan_id !== "premium") {
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

  if (db.units.length >= 5) {
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
    name: body.name.trim(),
    short_name: body.short_name || body.name.split(" ")[0],
    slug: slug || `unit-${Date.now()}`,
    address: body.address || "Endereço não informado",
    phone: body.phone || "(11) 99999-0000",
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

router.put("/units/:id", (req, res) => {
  const idx = db.units.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Unidade não encontrada." });

  db.units[idx] = { ...db.units[idx], ...req.body };
  db.logChange(`Atualizou unidade '${db.units[idx].name}'`, "unit", null, db.units[idx]);
  res.json(db.units[idx]);
});

router.delete("/units/:id", (req, res) => {
  const unit = db.units.find((u) => u.id === req.params.id);
  if (!unit) return res.status(404).json({ detail: "Unidade não encontrada." });
  if (unit.is_main) {
    return res.status(400).json({ detail: "A Unidade Matriz não pode ser excluída." });
  }
  db.units = db.units.filter((u) => u.id !== req.params.id);
  db.logChange(`Excluiu unidade '${unit.name}'`, "unit", unit, null);
  res.json({ ok: true });
});

// Settings
router.get("/settings", (_req, res) => {
  if (!db.settings.commission_base) {
    db.settings.commission_base = db.settings.commission_on === "original" ? "gross" : "net";
  }
  if (db.settings.discount_affects_commission === undefined) {
    db.settings.discount_affects_commission = true;
  }
  res.json(db.settings);
});

router.put("/settings", (req, res) => {
  const user = authUser(req);
  if (user && (user.role === "barbeiro" || user.role === "barber")) {
    return res.status(403).json({ detail: "Barbeiros não possuem permissão para alterar as configurações do sistema." });
  }

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
    body.public_slug = slug || "barbearia-vintage";
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

  db.settings = { ...db.settings, ...body };
  if (body.shop_name) {
    db.barbershop.name = body.shop_name;
  }
  db.logChange("Atualizou configurações gerais", "settings", null, db.settings);
  res.json(db.settings);
});

// Barbershop
router.get("/barbershop", (_req, res) => {
  res.json(db.barbershop);
});

router.put("/barbershop", (req, res) => {
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
router.get("/calendar", (req, res) => {
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
router.get("/history", (req, res) => {
  const limit = Number(req.query.limit || 100);
  res.json(db.history.slice(0, limit));
});

// Admin Demo Actions
router.post("/admin/seed", (_req, res) => {
  db.seed();
  res.json({ ok: true, message: "Dados de demonstração recriados" });
});

router.post("/admin/clear", (_req, res) => {
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
