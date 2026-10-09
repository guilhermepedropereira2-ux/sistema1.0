import express from "express";
import { db, isUserSuperAdmin, getTenantId } from "../db.js";
import { newId, nowIso, User, PERMISSIONS_CATALOG, defaultManagerPermissions } from "../types.js";
import { storage } from "../storage.js";
import {
  generateToken,
  hashPassword,
  comparePassword,
  generateTempPassword,
  sanitizeUser,
  authUser,
  requireAuth,
  requireDono,
  requireSuperAdmin,
} from "../auth.js";

const router = express.Router();

/**
 * 1. Login com verificação criptográfica de senha e geração de JWT
 */
router.post("/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ detail: "Usuário e senha são obrigatórios" });
  }

  const cleanUserQuery = username.trim().toLowerCase();
  const user = db.users.find(
    (u) =>
      u.username.toLowerCase() === cleanUserQuery ||
      (u.email && u.email.toLowerCase() === cleanUserQuery)
  );

  if (!user) {
    return res.status(401).json({ detail: "Usuário ou senha incorretos" });
  }

  if (user.active === false) {
    return res.status(401).json({ detail: "Usuário desativado. Entre em contato com o administrador." });
  }

  const isValidPassword = comparePassword(password, user.password || "");
  if (!isValidPassword) {
    return res.status(401).json({ detail: "Usuário ou senha incorretos" });
  }

  // Se a senha estiver em texto puro (legada), atualiza automaticamente para hash bcrypt
  if (user.password && !user.password.startsWith("$2a$") && !user.password.startsWith("$2b$")) {
    user.password = hashPassword(password);
  }

  const isSuper = isUserSuperAdmin(user);
  user.is_superadmin = isSuper;
  const token = generateToken(user);
  const clean = sanitizeUser(user);

  res.json({ token, user: { ...clean, is_superadmin: isSuper } });
});

/**
 * 2. Listagem de usuários para troca rápida (Exclusivo Dono / SuperAdmin)
 */
router.get("/auth/switchable-users", requireDono, (req, res) => {
  const tenantId = getTenantId(req);
  const users = db.users
    .filter((u) => u.barbershop_id === tenantId)
    .map((u) => sanitizeUser(u));
  res.json(users);
});

/**
 * 3. Troca de usuário / Impersonation (Exclusivo Dono / SuperAdmin)
 */
router.post("/auth/switch", requireDono, (req, res) => {
  const tenantId = getTenantId(req);
  const { userId } = req.body || {};
  const targetUser = db.users.find(
    (u) =>
      u.barbershop_id === tenantId &&
      (u.id === userId || u.username === userId || u.email === userId)
  );
  if (!targetUser) {
    return res.status(404).json({ detail: "Perfil de usuário não encontrado nesta barbearia" });
  }
  const token = generateToken(targetUser);
  const clean = sanitizeUser(targetUser);
  res.json({ token, user: clean });
});

/**
 * 4. Registro de nova barbearia e proprietário
 */
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
  const hashedPassword = hashPassword(password);

  try {
    await storage.createUser({
      id: userId,
      organization_id: effectiveOrgId,
      name: name || username,
      email: cleanEmail || `${username}@barbearia.com`,
      role: "owner",
      commission_rate: "0.00",
      password: hashedPassword,
    });
  } catch (e: any) {
    // Non-fatal if users table insert fails
  }

  const user: User = {
    id: userId,
    name: name || username,
    username,
    email: cleanEmail || `${username}@barbearia.com`,
    password: hashedPassword,
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

  // Registrar a nova barbearia isolada em db.barbershops
  const newBarbershop = {
    id: effectiveOrgId,
    name: (shop_name || name || "Minha Barbearia").trim(),
    slug: orgSlug,
    document: cleanDoc || "",
    phone: (shop_phone || phone || "").trim(),
    address: "",
    logo_url: "",
    opening_hours: "Segunda a Sábado das 09h às 20h",
    city: city || "São Paulo",
    state: state || "SP",
    shop_phone: (shop_phone || phone || "").trim(),
    operational_mode: "hibrido" as const,
  };
  db.barbershops.push(newBarbershop);

  // Configurações isoladas e assinatura por tenant
  db.setSettings(effectiveOrgId, {
    shop_name: newBarbershop.name,
    public_slug: orgSlug,
    operational_mode: "hibrido",
  });
  db.setSubscription(effectiveOrgId, {
    plan_id: "pro",
    status: "trialing",
    subscriptionStatus: "trialing",
    subscriptionExpiresAt: trialExpiresAtIso,
    max_barbers: 4,
    multi_unit: false,
    updated_at: nowIso(),
  });

  // Formas de pagamento padrão do novo tenant
  db.paymentMethods.push(
    {
      id: "pm_dinheiro_" + newId(),
      barbershop_id: effectiveOrgId,
      name: "Dinheiro",
      kind: "dinheiro",
      fees: { dinheiro: 0 },
      settlement_days: { dinheiro: 0 },
      active: true,
      created_at: nowIso(),
    },
    {
      id: "pm_pix_" + newId(),
      barbershop_id: effectiveOrgId,
      name: "PIX",
      kind: "pix",
      fees: { pix: 0 },
      settlement_days: { pix: 0 },
      active: true,
      created_at: nowIso(),
    },
    {
      id: "pm_cartao_" + newId(),
      barbershop_id: effectiveOrgId,
      name: "Cartão Débito / Crédito",
      kind: "maquininha",
      fees: { debito: 1.99, credito_vista: 3.15, credito_parcelado: 4.60, pix: 0.99 },
      settlement_days: { debito: 1, credito_vista: 1, credito_parcelado: 30, pix: 0 },
      active: true,
      created_at: nowIso(),
    }
  );

  // Garantir a criação da unidade Matriz isolada para o novo tenant
  const existingTenantUnit = db.units.find((u) => u.barbershop_id === effectiveOrgId);
  if (!existingTenantUnit) {
    db.units.push({
      id: `unit_${newId()}`,
      barbershop_id: effectiveOrgId,
      name: `${shop_name || name || "Minha Barbearia"} (Matriz)`,
      short_name: "Matriz",
      slug: `${orgSlug}-matriz`,
      address: "",
      phone: shop_phone || phone || "",
      city: city || "São Paulo",
      state: state || "SP",
      is_main: true,
      operational_mode: "hibrido",
      created_at: nowIso(),
    });
  }

  // Persistência imediata e garantida no disco
  db.saveToFile();

  const token = generateToken(user);
  const clean = sanitizeUser(user);
  res.json({ token, user: { ...clean, organization: createdOrg } });
});

/**
 * 5. Usuário Autenticado (/auth/me)
 */
router.get("/auth/me", requireAuth, async (req, res) => {
  const user = (req as any).user || authUser(req);
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
  const cleanUser = sanitizeUser(user);
  res.json({ ...cleanUser, is_superadmin: isSuper, organization: org });
});

/**
 * 6. Catálogo de Permissões
 */
router.get("/permissions/catalog", requireAuth, (_req, res) => {
  res.json(PERMISSIONS_CATALOG);
});

/**
 * 7. Gestão de Usuários (CRUD Protegido com RBAC e Isolamento de Tenant)
 */
router.get("/users", requireDono, (req, res) => {
  const tenantId = getTenantId(req);
  const users = db.users.filter((u) => u.barbershop_id === tenantId);
  res.json(users.map((u) => sanitizeUser(u)));
});

router.post("/users", requireDono, (req, res) => {
  const tenantId = getTenantId(req);
  const body = req.body || {};
  if (!body.name?.trim() || !body.username?.trim()) {
    return res.status(400).json({ detail: "Nome e usuário são obrigatórios" });
  }

  const cleanUsername = body.username.trim().toLowerCase();
  const cleanEmail = body.email ? body.email.trim().toLowerCase() : "";

  const existing = db.users.find(
    (u) =>
      u.username.toLowerCase() === cleanUsername ||
      (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
  );
  if (existing) {
    return res.status(400).json({ detail: "Nome de usuário ou e-mail já existe no sistema" });
  }

  const rawPassword = body.password || generateTempPassword();
  const hashedPassword = hashPassword(rawPassword);

  const user: User = {
    id: `usr_${newId()}`,
    name: body.name.trim(),
    username: body.username.trim(),
    password: hashedPassword,
    email: body.email?.trim() || `${body.username.trim()}@barbearia.com`,
    role: body.role || "barbeiro",
    roles: body.roles || [body.role || "barbeiro"],
    barbershop_id: tenantId,
    barber_id: body.barber_id,
    permissions: body.permissions || (body.role === "gerente" ? defaultManagerPermissions() : {}),
    active: body.active !== false,
    created_at: nowIso(),
  };
  db.users.push(user);
  const clean = sanitizeUser(user);
  res.json(clean);
});

router.put("/users/:id", requireAuth, (req, res) => {
  const tenantId = getTenantId(req);
  const currentUser = (req as any).user;
  const isSuper = isUserSuperAdmin(currentUser);
  const isDonoUser = currentUser.role === "dono" || currentUser.roles?.includes("dono");
  const isSelf = currentUser.id === req.params.id;

  if (!isSuper && !isDonoUser && !isSelf) {
    return res.status(403).json({ detail: "Você não tem permissão para editar este usuário" });
  }

  const idx = db.users.findIndex((u) => u.id === req.params.id && (isSuper || u.barbershop_id === tenantId));
  if (idx === -1) return res.status(404).json({ detail: "Usuário não encontrado" });

  const body = req.body || {};
  const updateData: any = { ...body };

  if (body.username) {
    const cleanUsername = body.username.trim().toLowerCase();
    const collision = db.users.find((u) => u.id !== req.params.id && u.username.toLowerCase() === cleanUsername);
    if (collision) {
      return res.status(400).json({ detail: "Nome de usuário já está em uso" });
    }
    updateData.username = body.username.trim();
  }

  // Se a senha foi fornecida, criptografa
  if (body.password) {
    updateData.password = hashPassword(body.password);
  } else {
    delete updateData.password;
  }

  // Não permite que um usuário comum altere suas próprias permissões ou roles
  if (!isSuper && !isDonoUser) {
    delete updateData.role;
    delete updateData.roles;
    delete updateData.permissions;
    delete updateData.active;
  }

  db.users[idx] = { ...db.users[idx], ...updateData };
  const clean = sanitizeUser(db.users[idx]);
  res.json(clean);
});

router.put("/users/:id/permissions", requireDono, (req, res) => {
  const tenantId = getTenantId(req);
  const isSuper = isUserSuperAdmin((req as any).user);
  const user = db.users.find((u) => u.id === req.params.id && (isSuper || u.barbershop_id === tenantId));
  if (!user) return res.status(404).json({ detail: "Usuário não encontrado" });
  user.permissions = req.body || {};
  res.json({ ok: true });
});

router.delete("/users/:id", requireDono, (req, res) => {
  const tenantId = getTenantId(req);
  const currentUser = (req as any).user;
  const isSuper = isUserSuperAdmin(currentUser);

  if (currentUser.id === req.params.id) {
    return res.status(400).json({ detail: "Não é permitido excluir o próprio usuário logado" });
  }
  const target = db.users.find((u) => u.id === req.params.id && (isSuper || u.barbershop_id === tenantId));
  if (!target) {
    return res.status(404).json({ detail: "Usuário não encontrado" });
  }
  if (isUserSuperAdmin(target)) {
    return res.status(403).json({ detail: "Não é permitido excluir o SuperAdministrador" });
  }
  db.users = db.users.filter((u) => u.id !== req.params.id);
  res.json({ ok: true });
});

router.post("/users/:id/reset-password", requireDono, (req, res) => {
  const tenantId = getTenantId(req);
  const isSuper = isUserSuperAdmin((req as any).user);
  const user = db.users.find((u) => u.id === req.params.id && (isSuper || u.barbershop_id === tenantId));
  if (!user) return res.status(404).json({ detail: "Usuário não encontrado" });
  const tempPassword = generateTempPassword();
  user.password = hashPassword(tempPassword);
  res.json({ ok: true, temporary_password: tempPassword });
});

export default router;
