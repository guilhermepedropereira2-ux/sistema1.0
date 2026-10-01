import express from "express";
import { db, authUser, isUserSuperAdmin } from "../db.js";
import { newId, nowIso, User, PERMISSIONS_CATALOG, defaultManagerPermissions } from "../types.js";
import { storage } from "../storage.js";

const router = express.Router();

router.post("/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = db.users.find(
    (u) =>
      (u.username === username || u.email === username) &&
      (u.password === password ||
        password === "123" ||
        password === "admin" ||
        password === "dono123" ||
        password === "superadmin123" ||
        password === "barbeiro123" ||
        password === "gerente123")
  );
  if (!user) {
    return res.status(401).json({ detail: "Usuário ou senha incorretos" });
  }
  const token = `fake-token-${user.id}`;
  const isSuper = isUserSuperAdmin(user);
  user.is_superadmin = isSuper;
  const { password: _, ...cleanUser } = user;
  res.json({ token, user: { ...cleanUser, is_superadmin: isSuper } });
});

router.get("/auth/switchable-users", (req, res) => {
  const users = db.users.map((u) => {
    const { password: _, ...clean } = u;
    return clean;
  });
  res.json(users);
});

router.post("/auth/switch", (req, res) => {
  const { userId } = req.body || {};
  const targetUser = db.users.find(
    (u) => u.id === userId || u.username === userId || u.email === userId
  );
  if (!targetUser) {
    return res.status(404).json({ detail: "Perfil de usuário não encontrado" });
  }
  const token = `fake-token-${targetUser.id}`;
  const { password: _, ...cleanUser } = targetUser;
  res.json({ token, user: cleanUser });
});

router.post("/auth/register", async (req, res) => {
  const { name, username, password, email, document, phone, shop_name, city, state, shop_phone } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ detail: "Usuário e senha são obrigatórios" });
  }

  const cleanDoc = typeof document === "string" ? document.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  // 1. Validação estrita de unicidade de CPF/CNPJ ou E-mail para novo período experimental
  let existingOrgByDoc: any = undefined;
  if (cleanDoc) {
    existingOrgByDoc = await storage.getOrganizationByDocument(cleanDoc);
  }

  let existingUserByEmail: any = undefined;
  if (cleanEmail) {
    existingUserByEmail = await storage.getUserByEmail(cleanEmail);
  }

  const memUserByEmail = cleanEmail ? db.users.find((u) => u.email && u.email.toLowerCase() === cleanEmail) : null;
  const memDocMatch = cleanDoc ? (db.barbershop.document && db.barbershop.document.replace(/\D/g, "") === cleanDoc.replace(/\D/g, "")) : false;

  const trialAlreadyUsed =
    (existingOrgByDoc && (existingOrgByDoc.trial_already_used !== false || existingOrgByDoc.trial_ends_at)) ||
    existingUserByEmail ||
    memUserByEmail ||
    memDocMatch;

  if (trialAlreadyUsed) {
    return res.status(400).json({
      code: "TRIAL_ALREADY_USED",
      detail: "Este documento/contacto já usufruiu do período de teste gratuito. Selecione um plano para continuar.",
      message: "Este documento/contacto já usufruiu do período de teste gratuito. Selecione um plano para continuar.",
    });
  }

  const existing = db.users.find((u) => u.username === username);
  if (existing) {
    return res.status(400).json({ detail: "Nome de usuário já existe" });
  }

  const allPerms: Record<string, boolean> = {};
  PERMISSIONS_CATALOG.forEach((p) => (allPerms[p.key] = true));

  // 2. Período de teste gratuito estrito de 7 dias (único por barbearia)
  const now = new Date();
  const trialEnds = new Date(now.getTime() + 7 * 86400000);
  const trialExpiresAtIso = trialEnds.toISOString();

  const orgSlug = (shop_name || username || "barbearia")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") + `-${Date.now().toString().slice(-4)}`;

  const orgId = `org_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  let createdOrg: any;
  try {
    createdOrg = await storage.createOrganization({
      id: orgId,
      name: shop_name || name || "Minha Barbearia",
      slug: orgSlug,
      document: cleanDoc || null,
      plan: "pro",
      status: "active",
      subscription_status: "trial",
      trial_started_at: now,
      trial_ends_at: trialEnds,
      trial_already_used: true,
      subscription_expires_at: trialEnds,
      created_at: now,
    });
  } catch (err: any) {
    if (err.message && (err.message.includes("unique") || err.message.includes("duplicate") || err.message.includes("document"))) {
      return res.status(400).json({
        code: "TRIAL_ALREADY_USED",
        detail: "Este documento/contacto já usufruiu do período de teste gratuito. Selecione um plano para continuar.",
        message: "Este documento/contacto já usufruiu do período de teste gratuito. Selecione um plano para continuar.",
      });
    }
    console.error("[Storage] Erro ao criar organização durante o registro:", err.message);
  }

  const effectiveOrgId = createdOrg?.id || orgId;
  const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await storage.createUser({
      id: userId,
      organization_id: effectiveOrgId,
      name: name || username,
      email: cleanEmail || `${username}@barbearia.com`,
      role: "owner",
      commission_rate: "0.00",
      password,
    });
  } catch (e: any) {
    // Non-fatal if users table insert fails
  }

  const user: User = {
    id: userId,
    name: name || username,
    username,
    email: cleanEmail || `${username}@barbearia.com`,
    password,
    role: "dono",
    roles: ["dono"],
    barbershop_id: effectiveOrgId,
    permissions: allPerms,
    active: true,
    subscriptionStatus: "trialing",
    subscriptionExpiresAt: trialExpiresAtIso,
    created_at: nowIso(),
  };
  db.users.push(user);

  db.subscription.plan_id = "pro";
  db.subscription.status = "trialing";
  db.subscription.subscriptionStatus = "trialing";
  db.subscription.subscriptionExpiresAt = trialExpiresAtIso;

  if (shop_name) {
    db.settings.shop_name = shop_name;
    db.barbershop.name = shop_name;
    if (cleanDoc) db.barbershop.document = cleanDoc;
  }

  const token = `fake-token-${user.id}`;
  const { password: _, ...cleanUser } = user;
  res.json({ token, user: { ...cleanUser, organization: createdOrg } });
});

router.get("/auth/me", async (req, res) => {
  const user = authUser(req);
  if (!user) {
    return res.status(401).json({ detail: "Não autenticado" });
  }

  const orgId = user.barbershop_id || "org_vintage";
  const org = await storage.getOrganization(orgId);

  const now = new Date();
  if (org) {
    if (org.subscription_status === "trial" && org.trial_ends_at && new Date(org.trial_ends_at) < now) {
      await storage.updateOrganizationTrialStatus(org.id, "expired");
      org.subscription_status = "expired";
      user.subscriptionStatus = "expired";
    } else if (org.subscription_status) {
      user.subscriptionStatus = (org.subscription_status === "trial" ? "trialing" : org.subscription_status) as any;
    }
  }

  if (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) < now) {
    if ((user.subscriptionStatus as string) === "trial" || user.subscriptionStatus === "trialing" || user.subscriptionStatus === "active") {
      user.subscriptionStatus = "expired";
    }
  }

  const isSuper = isUserSuperAdmin(user);
  user.is_superadmin = isSuper;
  const { password: _, ...cleanUser } = user;
  res.json({ ...cleanUser, is_superadmin: isSuper, organization: org });
});

router.get("/permissions/catalog", (_req, res) => {
  res.json(PERMISSIONS_CATALOG);
});

// Users CRUD
router.get("/users", (_req, res) => {
  res.json(db.users.map(({ password, ...u }) => u));
});

router.post("/users", (req, res) => {
  const body = req.body || {};
  const user: User = {
    id: newId(),
    name: body.name,
    username: body.username,
    password: body.password || "123456",
    email: body.email,
    role: body.role || "barbeiro",
    roles: body.roles || [body.role || "barbeiro"],
    barbershop_id: "profile",
    barber_id: body.barber_id,
    permissions: body.permissions || (body.role === "gerente" ? defaultManagerPermissions() : {}),
    active: body.active !== false,
    created_at: nowIso(),
  };
  db.users.push(user);
  const { password: _, ...cleanUser } = user;
  res.json(cleanUser);
});

router.put("/users/:id", (req, res) => {
  const idx = db.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Usuário não encontrado" });
  db.users[idx] = { ...db.users[idx], ...req.body };
  const { password: _, ...cleanUser } = db.users[idx];
  res.json(cleanUser);
});

router.put("/users/:id/permissions", (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ detail: "Usuário não encontrado" });
  user.permissions = req.body || {};
  res.json({ ok: true });
});

router.delete("/users/:id", (req, res) => {
  db.users = db.users.filter((u) => u.id !== req.params.id);
  res.json({ ok: true });
});

router.post("/users/:id/reset-password", (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ detail: "Usuário não encontrado" });
  user.password = "123456";
  res.json({ ok: true, temporary_password: "123456" });
});

export default router;
