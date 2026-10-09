import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { newId, nowIso, User, Unit, BarbershopInfo, PaymentMethod, Barber, PERMISSIONS_CATALOG } from "../types.js";
import { generateToken, sanitizeUser, requireAuth, requireSuperAdmin } from "../auth.js";

const router = express.Router();

// GET /api/onboarding/state - Consultar o estado atual do onboarding (sempre limpo para novas contas)
router.get("/onboarding/state", (_req: Request, res: Response) => {
  const savedData = db.onboarding?.data || {};
  res.json({
    completed: db.onboarding?.completed || false,
    currentStep: db.onboarding?.currentStep || 1,
    data: savedData,
    barbershop: {
      name: savedData.barbershop?.name || "",
      phone: savedData.barbershop?.phone || "",
      city: savedData.barbershop?.city || "",
      state: savedData.barbershop?.state || "",
      address: savedData.barbershop?.address || "",
    },
  });
});

// POST /api/onboarding/step - Salvar etapa intermediária
router.post("/onboarding/step", (req: Request, res: Response) => {
  const { step, data } = req.body || {};

  if (!step || typeof step !== "number") {
    return res.status(400).json({ error: "Número da etapa inválido" });
  }

  if (!db.onboarding) {
    db.onboarding = { completed: false, currentStep: 1, data: {} };
  }

  if (data) {
    db.onboarding.data = {
      ...db.onboarding.data,
      ...data,
    };
  }

  db.onboarding.currentStep = Math.min(4, Math.max(db.onboarding.currentStep, step + 1));

  res.json({
    ok: true,
    message: `Etapa ${step} salva com sucesso`,
    state: db.onboarding,
  });
});

// POST /api/onboarding/complete - Criação REAL de NOVO TENANT com banco operacional limpo
router.post("/onboarding/complete", async (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    const barbershopData = payload.barbershop || db.onboarding?.data?.barbershop || {};
    const profileData = payload.profile || db.onboarding?.data?.profile || {};
    const operationData = payload.operation || db.onboarding?.data?.operation || { type: "equipe" };
    const planData = payload.plan || db.onboarding?.data?.plan || { id: "pro", name: "PRO", price: 79.9 };

    if (!barbershopData.name || !barbershopData.city) {
      return res.status(400).json({ error: "Nome e cidade da barbearia são obrigatórios" });
    }

    if (!profileData.name || !profileData.email) {
      return res.status(400).json({ error: "Nome e e-mail do proprietário são obrigatórios" });
    }

    if (!profileData.password || profileData.password.trim().length < 6) {
      return res.status(400).json({ error: "A senha de acesso deve ter no mínimo 6 caracteres" });
    }

    // 1. GERAR IDENTIFICADORES ÚNICOS PARA O NOVO TENANT
    const newBarbershopId = "shop_" + newId();
    const newUnitId = "unit_" + newId();
    const newUserId = "usr_" + newId();

    const slug = barbershopData.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "barbearia";

    const opMode =
      operationData.type === "solo"
        ? "agendamento"
        : operationData.type === "multiunidade"
        ? "multiunidade"
        : "hibrido";

    // 2. CRIAR E REGISTRAR A NOVA BARBEARIA
    const newBarbershop: BarbershopInfo = {
      id: newBarbershopId,
      name: barbershopData.name.trim(),
      slug: slug,
      document: "",
      phone: (barbershopData.phone || "").trim(),
      shop_phone: (barbershopData.phone || "").trim(),
      address: (barbershopData.address || "").trim(),
      logo_url: "",
      opening_hours: "Segunda a Sábado das 09h às 20h",
      city: (barbershopData.city || "").trim(),
      state: (barbershopData.state || "SP").trim().toUpperCase(),
      operational_mode: opMode,
    };
    db.barbershops.push(newBarbershop);

    // Configurações isoladas para este tenant
    db.setSettings(newBarbershopId, {
      id: "settings_" + newBarbershopId,
      barbershop_id: newBarbershopId,
      commission_base: "gross",
      discount_affects_commission: true,
      commission_on: "pago",
      initial_balance: 0.0,
      shop_name: newBarbershop.name,
      operational_mode: opMode,
      public_slug: slug,
    });

    // 3. CRIAR A UNIDADE MATRIZ DO NOVO TENANT
    const newUnit: Unit = {
      id: newUnitId,
      barbershop_id: newBarbershopId,
      name: `${newBarbershop.name} (Matriz)`,
      short_name: "Matriz",
      slug: `${slug}-matriz`,
      address: newBarbershop.address,
      phone: newBarbershop.phone,
      city: newBarbershop.city,
      state: newBarbershop.state,
      is_main: true,
      operational_mode: opMode,
      created_at: nowIso(),
    };
    db.units.push(newUnit);

    // 4. CRIAR AS FORMAS DE PAGAMENTO INICIAIS DO TENANT
    const initialPaymentMethods: PaymentMethod[] = [
      {
        id: "pm_dinheiro_" + newId(),
        barbershop_id: newBarbershopId,
        name: "Dinheiro",
        kind: "dinheiro",
        fees: { dinheiro: 0 },
        settlement_days: { dinheiro: 0 },
        active: true,
        created_at: nowIso(),
      },
      {
        id: "pm_pix_" + newId(),
        barbershop_id: newBarbershopId,
        name: "PIX",
        kind: "pix",
        fees: { pix: 0 },
        settlement_days: { pix: 0 },
        active: true,
        created_at: nowIso(),
      },
      {
        id: "pm_cartao_" + newId(),
        barbershop_id: newBarbershopId,
        name: "Cartão Débito / Crédito",
        kind: "maquininha",
        fees: { debito: 1.99, credito_vista: 3.15, credito_parcelado: 4.60, pix: 0.99 },
        settlement_days: { debito: 1, credito_vista: 1, credito_parcelado: 30, pix: 0 },
        active: true,
        created_at: nowIso(),
      },
    ];
    db.paymentMethods.push(...initialPaymentMethods);

    // 5. CONFIGURAR PLANO & TRIAL DE 7 DIAS
    const planId = planData.id === "starter" || planData.id === "basic" ? "starter" : planData.id === "premium" ? "premium" : "pro";
    const trialDays = 7;
    const expiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    const maxBarbers = planId === "starter" ? 1 : planId === "pro" ? 4 : 10;
    const multiUnit = planId === "premium";

    const tenantSub = db.setSubscription(newBarbershopId, {
      plan_id: planId,
      status: "trialing",
      subscriptionStatus: "trialing",
      subscriptionExpiresAt: expiresAt,
      max_barbers: maxBarbers,
      multi_unit: multiUnit,
      updated_at: nowIso(),
    });

    // 6. CRIAR O USUÁRIO DONO DO TENANT COM HASH DE SENHA
    const fullPermissions: Record<string, boolean> = {};
    PERMISSIONS_CATALOG.forEach((p) => {
      fullPermissions[p.key] = true;
    });

    const rawPassword = profileData.password;
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const emailPrefix = profileData.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
    let baseUsername = (profileData.username || emailPrefix || "dono").trim().toLowerCase();
    
    // Garantir unicidade estrita do username no banco
    let candidateUsername = baseUsername;
    let counter = 1;
    while (db.users.some((u) => u.username.toLowerCase() === candidateUsername)) {
      candidateUsername = `${baseUsername}${counter}`;
      counter++;
    }

    const newUser: User = {
      id: newUserId,
      name: profileData.name.trim(),
      username: candidateUsername,
      password: hashedPassword,
      email: profileData.email.trim(),
      role: "dono",
      roles: ["dono", "gerente"],
      barbershop_id: newBarbershopId,
      permissions: fullPermissions,
      active: true,
      subscriptionStatus: "trialing",
      subscriptionExpiresAt: expiresAt,
      created_at: nowIso(),
    };
    db.users.push(newUser);

    // 7. REGISTRAR CONCLUSÃO DO ONBOARDING
    db.onboarding = {
      completed: true,
      currentStep: 4,
      data: {
        barbershop: barbershopData,
        profile: profileData,
        operation: operationData,
        plan: planData,
      },
      completed_at: nowIso(),
    };

    // 8. PERSISTÊNCIA IMEDIATA NO DISCO
    db.saveToFile();

    // 9. EMITIR JWT ASSINADO REPRESENTANDO O NOVO TENANT
    const token = generateToken(newUser);

    return res.json({
      ok: true,
      message: "Nova barbearia configurada com sucesso! Teste grátis de 7 dias ativado.",
      token,
      user: sanitizeUser(newUser),
      barbershop: newBarbershop,
      unit: newUnit,
      subscription: tenantSub,
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Erro ao concluir onboarding: " + err.message });
  }
});

// POST /api/onboarding/reset - Resetar onboarding (Apenas SuperAdmin)
router.post("/onboarding/reset", requireAuth, requireSuperAdmin, (_req: Request, res: Response) => {
  db.onboarding = {
    completed: false,
    currentStep: 1,
    data: {},
  };
  db.saveToFile();
  res.json({ ok: true, message: "Onboarding resetado com sucesso" });
});

export default router;
