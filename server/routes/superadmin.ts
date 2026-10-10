import express, { Request, Response, NextFunction } from "express";
import { db, authUser, isUserSuperAdmin } from "../db.js";
import { storage } from "../storage.js";
import { nowIso } from "../types.js";

const router = express.Router();

/**
 * Middleware Estrito de Autenticação e Autorização SuperAdmin
 */
const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = authUser(req);
  if (!user || !isUserSuperAdmin(user)) {
    return res.status(403).json({
      error: "Acesso Negado",
      detail: "Área exclusiva para o SuperAdministrador (Master) da plataforma Kupola.",
      code: "SUPERADMIN_FORBIDDEN",
    });
  }
  next();
};

// Dicionário em memória para ciclos de pagamento de cada organização (mensal, trimestral, anual)
const orgBillingCycles: Record<string, "mensal" | "trimestral" | "anual"> = {
  org_vintage: "mensal",
  org_1790184531333_pqop: "mensal",
  org_1790184532586_apji: "trimestral",
  org_72byadfmukh876b: "anual",
  org_pf01yzumukho6zk: "mensal",
};

/**
 * 1. Verificação de permissões do usuário atual
 */
router.get("/superadmin/check", (req: Request, res: Response) => {
  const user = authUser(req);
  const isSuper = isUserSuperAdmin(user);
  if (!user || !isSuper) {
    return res.status(403).json({ is_superadmin: false, detail: "Não autorizado" });
  }
  return res.json({ is_superadmin: true, user: { id: user.id, name: user.name, email: user.email } });
});

/**
 * 2. Métricas Globais da Plataforma (SaaS Overview)
 */
router.get("/superadmin/metrics", requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const orgs = await storage.getAllOrganizations();
    const existingIds = new Set(orgs.map((o) => o.id));

    // Mesclar barbearias de db.barbershops se não estiverem em storage
    // Alias determinístico aprovado: 'demo_vintage' e 'org_vintage' representam a mesma barbearia de demonstração
    if (Array.isArray(db.barbershops)) {
      for (const b of db.barbershops) {
        const isAlreadyRepresented =
          existingIds.has(b.id) ||
          (b.id === "demo_vintage" && existingIds.has("org_vintage"));

        if (!isAlreadyRepresented) {
          const sub = db.getSubscription(b.id);
          orgs.push({
            id: b.id,
            name: b.name,
            slug: b.slug || b.id,
            document: b.document || null,
            plan: (sub?.plan_id === "starter" ? "basic" : sub?.plan_id) || "pro",
            status: "active",
            subscription_status: (sub?.status === "trialing" ? "trial" : sub?.status) || "trial",
            trial_started_at: null,
            trial_ends_at: sub?.subscriptionExpiresAt ? new Date(sub.subscriptionExpiresAt) : null,
            trial_already_used: true,
            subscription_expires_at: sub?.subscriptionExpiresAt ? new Date(sub.subscriptionExpiresAt) : null,
            created_at: new Date(),
          });
          existingIds.add(b.id);
        }
      }
    }

    const now = new Date();

    let totalSubscribers = 0;
    let totalTrials = 0;
    let totalExpired = 0;
    let totalSuspended = 0;

    const planDistribution = {
      basic: 0,
      pro: 0,
      premium: 0,
      unknown: 0,
    };

    const cycleDistribution = {
      mensal: 0,
      trimestral: 0,
      anual: 0,
    };

    // Preços oficiais verificados em src/lib/plans.js
    const OFFICIAL_PLAN_PRICES: Record<string, number> = {
      basic: 39.9,
      pro: 79.9,
      premium: 129.9,
    };

    let estimatedMRR = 0;
    let potentialTrialMRR = 0;
    let unknownPlansCount = 0;
    const unknownPlansList: Array<{ orgId: string; rawPlan: any }> = [];

    for (const org of orgs) {
      const isSuspended = org.status === "suspended";
      const isExpired =
        org.status === "expired" ||
        org.subscription_status === "expired" ||
        (org.subscription_expires_at && new Date(org.subscription_expires_at) < now && org.subscription_status !== "active");
      const isTrial = org.subscription_status === "trial" && !isExpired && !isSuspended;
      const isPayingSubscriber =
        org.subscription_status === "active" &&
        org.status !== "suspended" &&
        !isExpired;

      if (isSuspended) {
        totalSuspended++;
      } else if (isExpired) {
        totalExpired++;
      } else if (isTrial) {
        totalTrials++;
      } else if (isPayingSubscriber) {
        totalSubscribers++;
      }

      // Distribuição por plano
      const rawPlan = (org.plan || "").toLowerCase().trim();
      let normalizedPlan: "basic" | "pro" | "premium" | "unknown" = "unknown";
      if (rawPlan === "basic" || rawPlan === "starter" || rawPlan === "solo") {
        normalizedPlan = "basic";
        planDistribution.basic++;
      } else if (rawPlan === "pro") {
        normalizedPlan = "pro";
        planDistribution.pro++;
      } else if (rawPlan === "premium" || rawPlan === "rede") {
        normalizedPlan = "premium";
        planDistribution.premium++;
      } else {
        normalizedPlan = "unknown";
        planDistribution.unknown++;
        unknownPlansCount++;
        unknownPlansList.push({ orgId: org.id, rawPlan: org.plan });
      }

      // Ciclo
      const cycle = orgBillingCycles[org.id] || "mensal";
      cycleDistribution[cycle]++;

      // Cálculo de MRR estrito: somente assinantes ativos pagantes, excluindo trials
      if (isPayingSubscriber) {
        if (normalizedPlan in OFFICIAL_PLAN_PRICES) {
          estimatedMRR += OFFICIAL_PLAN_PRICES[normalizedPlan];
        } else {
          console.warn(`[SuperAdmin MRR] Organização ${org.id} possui assinatura ativa mas plano não reconhecido: '${org.plan}'. Omitido do MRR.`);
        }
      }

      // Cálculo de potencial hipotético em trial (separado do MRR principal)
      if (isTrial) {
        if (normalizedPlan in OFFICIAL_PLAN_PRICES) {
          potentialTrialMRR += OFFICIAL_PLAN_PRICES[normalizedPlan];
        }
      }
    }

    const activeAccounts = Math.max(0, orgs.length - totalSuspended);

    res.json({
      totalOrganizations: orgs.length,
      totalSubscribers,
      totalTrials,
      totalExpired,
      totalSuspended,
      accountStatus: {
        active: activeAccounts,
        blocked: totalSuspended,
      },
      subscriptionStatus: {
        trial: totalTrials,
        active: totalSubscribers,
        expired: totalExpired,
        canceled: totalSuspended,
      },
      planDistribution,
      cycleDistribution,
      estimatedMRR: Number(estimatedMRR.toFixed(2)),
      estimatedARR: Number((estimatedMRR * 12).toFixed(2)),
      financialSummary: {
        hasConfirmedGateway: false,
        confirmedRevenue: 0,
        projectedMonthlyRate: Number(estimatedMRR.toFixed(2)),
        potentialTrialMonthlyRate: Number(potentialTrialMRR.toFixed(2)),
        potentialTrialNote: "Receita potencial hipotética caso 100% dos períodos de teste (trials) sejam convertidos nos planos indicados. Não integra o MRR oficial.",
        statusNote: "Valores representam projeção teórica de assinaturas ativas. Integração com gateway de pagamento pendente (nenhuma cobrança liquidada).",
        unknownPlansCount,
      },
      timestamp: nowIso(),
    });
  } catch (err: any) {
    console.error("[SuperAdmin Metrics Error]", err);
    res.status(500).json({ error: "Erro ao calcular métricas do SuperAdmin", message: err.message });
  }
});

/**
 * 3. Lista Completa de Barbearias Cadastradas
 */
router.get("/superadmin/organizations", requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const orgs = await storage.getAllOrganizations();
    const existingIds = new Set(orgs.map((o) => o.id));

    // Mesclar barbearias de db.barbershops se não estiverem em storage
    // Alias determinístico aprovado: 'demo_vintage' e 'org_vintage' representam a mesma barbearia de demonstração
    if (Array.isArray(db.barbershops)) {
      for (const b of db.barbershops) {
        const isAlreadyRepresented =
          existingIds.has(b.id) ||
          (b.id === "demo_vintage" && existingIds.has("org_vintage"));

        if (!isAlreadyRepresented) {
          const sub = db.getSubscription(b.id);
          orgs.push({
            id: b.id,
            name: b.name,
            slug: b.slug || b.id,
            document: b.document || null,
            plan: (sub?.plan_id === "starter" ? "basic" : sub?.plan_id) || "pro",
            status: "active",
            subscription_status: (sub?.status === "trialing" ? "trial" : sub?.status) || "trial",
            trial_started_at: null,
            trial_ends_at: sub?.subscriptionExpiresAt ? new Date(sub.subscriptionExpiresAt) : null,
            trial_already_used: true,
            subscription_expires_at: sub?.subscriptionExpiresAt ? new Date(sub.subscriptionExpiresAt) : null,
            created_at: new Date(),
          });
          existingIds.add(b.id);
        }
      }
    }

    const now = new Date();

    const list = orgs.map((org) => {
      // Procura e-mail de dono associado
      const matchingUser = db.users.find(
        (u) =>
          u.barbershop_id === org.id ||
          (org.id === "org_vintage" && (u.role === "dono" || u.role === "owner"))
      );

      const isSuspended = org.status === "suspended";
      const isExpired =
        org.status === "expired" ||
        org.subscription_status === "expired" ||
        (org.subscription_expires_at && new Date(org.subscription_expires_at) < now && org.subscription_status !== "active");
      const isTrial = org.subscription_status === "trial" && !isExpired && !isSuspended;

      let computedStatus: "ativo" | "teste" | "vencido" | "suspenso" = "ativo";
      if (isSuspended) computedStatus = "suspenso";
      else if (isExpired) computedStatus = "vencido";
      else if (isTrial) computedStatus = "teste";

      const cycle = orgBillingCycles[org.id] || "mensal";

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        document: org.document || "-",
        plan: (org.plan === "starter" ? "basic" : org.plan) || "pro",
        status: computedStatus,
        raw_status: org.status,
        account_status: isSuspended ? "bloqueada" : "ativa",
        subscription_status: isSuspended ? "cancelada" : isExpired ? "vencida" : isTrial ? "teste" : "ativa",
        billing_cycle: cycle,
        owner_name: matchingUser?.name || "Administrador",
        owner_email: matchingUser?.email || "contato@" + org.slug + ".com",
        trial_ends_at: org.trial_ends_at ? new Date(org.trial_ends_at).toISOString() : null,
        subscription_expires_at: org.subscription_expires_at
          ? new Date(org.subscription_expires_at).toISOString()
          : null,
        created_at: org.created_at ? new Date(org.created_at).toISOString() : nowIso(),
      };
    });

    res.json(list);
  } catch (err: any) {
    console.error("[SuperAdmin Organizations Error]", err);
    res.status(500).json({ error: "Erro ao buscar barbearias", message: err.message });
  }
});

/**
 * 4. Ações Rápidas do SuperAdmin sobre uma Barbearia
 */
router.post("/superadmin/organizations/:id/action", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, days, plan, status, cycle } = req.body || {};

    const org = await storage.getOrganization(id);
    if (!org) {
      return res.status(404).json({ error: "Barbearia não encontrada" });
    }

    if (action === "extend_trial") {
      const addedDays = Number(days) || 7;
      const currentExpiry = org.trial_ends_at ? new Date(org.trial_ends_at) : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newTrialEnds = new Date(baseDate.getTime() + addedDays * 86400000);

      const updated = await storage.updateOrganizationSubscription(org.id, {
        plan: org.plan,
        status: "active",
        subscription_status: "trial",
        trial_ends_at: newTrialEnds,
        subscription_expires_at: newTrialEnds,
      });

      db.logChange(
        `SuperAdmin estendeu o teste de '${org.name}' por +${addedDays} dias (até ${newTrialEnds.toLocaleDateString()}).`,
        "subscription",
        null,
        updated,
        "SuperAdmin"
      );

      return res.json({ success: true, message: `Período de teste estendido em ${addedDays} dias.`, organization: updated });
    }

    if (action === "change_plan") {
      const targetPlan = (plan || "pro").toLowerCase();
      const updated = await storage.updateOrganizationSubscription(org.id, {
        plan: targetPlan,
        status: org.status === "expired" ? "active" : org.status,
        subscription_status: "active",
        subscription_expires_at: new Date(Date.now() + 30 * 86400000),
      });

      db.logChange(
        `SuperAdmin alterou o plano de '${org.name}' para '${targetPlan.toUpperCase()}'.`,
        "subscription",
        org.plan,
        targetPlan,
        "SuperAdmin"
      );

      return res.json({ success: true, message: `Plano alterado para ${targetPlan.toUpperCase()}.`, organization: updated });
    }

    if (action === "toggle_status") {
      const newStatus = status === "suspended" ? "suspended" : "active";
      const newSubStatus = newStatus === "suspended" ? "past_due" : "active";
      const updated = await storage.updateOrganizationSubscription(org.id, {
        plan: org.plan,
        status: newStatus,
        subscription_status: newSubStatus,
      });

      db.logChange(
        `SuperAdmin alterou o status de '${org.name}' para '${newStatus.toUpperCase()}'.`,
        "subscription",
        org.status,
        newStatus,
        "SuperAdmin"
      );

      return res.json({ success: true, message: `Status alterado para ${newStatus === 'active' ? 'Ativo' : 'Suspenso'}.`, organization: updated });
    }

    if (action === "change_cycle") {
      const targetCycle = cycle === "trimestral" ? "trimestral" : cycle === "anual" ? "anual" : "mensal";
      orgBillingCycles[org.id] = targetCycle;

      return res.json({ success: true, message: `Ciclo de faturamento alterado para ${targetCycle}.`, cycle: targetCycle });
    }

    return res.status(400).json({ error: "Ação não reconhecida" });
  } catch (err: any) {
    console.error("[SuperAdmin Action Error]", err);
    res.status(500).json({ error: "Erro ao executar ação de SuperAdmin", message: err.message });
  }
});

export default router;
