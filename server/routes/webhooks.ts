import express, { Request, Response } from "express";
import { db } from "../db.js";
import { newId, nowIso, User } from "../types.js";
import { persistSubscription } from "../../src/db/sync.js";
import { storage } from "../storage.js";

const router = express.Router();

interface ProvisionPayload {
  email: string;
  name: string;
  phone?: string;
  plan_id?: string;
  shop_name?: string;
  platform?: "kiwify" | "hotmart" | "kirvano" | "generic";
  transaction_id?: string;
  order_status?: string;
}

/**
 * Função de Provisionamento e Ativação Centralizada para Webhooks de Pagamento Externo
 */
async function provisionExternalOwner(data: ProvisionPayload) {
  const email = (data.email || "").trim().toLowerCase();
  const name = (data.name || "Dono Kupola").trim();
  const phone = (data.phone || "").trim();
  const platform = data.platform || "generic";
  const txId = data.transaction_id || `tx_${newId()}`;

  // Resolução do plano
  let targetPlan: "starter" | "pro" | "premium" = "pro";
  const rawPlan = (data.plan_id || "").toLowerCase();
  if (rawPlan.includes("basic") || rawPlan.includes("starter") || rawPlan.includes("solo")) {
    targetPlan = "starter";
  } else if (rawPlan.includes("premium") || rawPlan.includes("rede")) {
    targetPlan = "premium";
  } else {
    targetPlan = "pro";
  }

  const expiresAtIso = new Date(Date.now() + 30 * 86400000).toISOString();
  const maxBarbers = targetPlan === "starter" ? 1 : targetPlan === "pro" ? 5 : 999;
  const multiUnit = targetPlan === "premium";

  // 1. Verifica se usuário com este e-mail já existe
  let user = db.users.find((u) => u.email?.toLowerCase() === email);

  if (user) {
    // Usuário já cadastrado -> Reativa e atualiza plano
    user.subscriptionStatus = "active";
    user.subscriptionExpiresAt = expiresAtIso;
    user.role = "dono";

    db.subscription.plan_id = targetPlan;
    db.subscription.status = "active";
    db.subscription.subscriptionStatus = "active";
    db.subscription.subscriptionExpiresAt = expiresAtIso;
    db.subscription.max_barbers = maxBarbers;
    db.subscription.multi_unit = multiUnit;
    db.subscription.updated_at = nowIso();
    persistSubscription(db.subscription);

    const orgId = user.barbershop_id || "profile";
    try {
      await storage.updateOrganizationSubscription(orgId, {
        plan: targetPlan,
        status: "active",
        subscription_status: "active",
        subscription_expires_at: expiresAtIso,
      });
      await storage.createSubscriptionTransaction({
        organization_id: orgId,
        payment_id: txId,
        status: "approved",
        amount: targetPlan === "starter" ? "79.90" : targetPlan === "premium" ? "299.90" : "169.90",
      });
    } catch (e: any) {
      console.warn("[Storage] Warning ao atualizar organização existente:", e?.message);
    }

    db.logChange(
      `Webhook [${platform.toUpperCase()}]: Assinatura de '${user.email}' reativada com plano '${targetPlan.toUpperCase()}'.`,
      "subscription"
    );

    return {
      success: true,
      action: "updated",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        plan: targetPlan,
      },
    };
  }

  // 2. Novo usuário Dono -> Provisionar conta do zero
  const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "dono";
  let finalUsername = baseUsername;
  let counter = 1;
  while (db.users.some((u) => u.username === finalUsername)) {
    finalUsername = `${baseUsername}${counter}`;
    counter++;
  }

  const generatedPassword = `Kupola@${Math.floor(1000 + Math.random() * 9000)}`;
  const newUserId = `usr_dono_${newId()}`;
  const newOrgId = `org_${newId()}`;
  const shopTitle = data.shop_name?.trim() || `Barbearia ${name.split(" ")[0]}`;

  const newUser: User = {
    id: newUserId,
    username: finalUsername,
    password: generatedPassword,
    role: "dono",
    roles: ["dono"],
    barbershop_id: newOrgId,
    permissions: {},
    active: true,
    name: name,
    email: email,
    subscriptionStatus: "active",
    subscriptionExpiresAt: expiresAtIso,
    created_at: nowIso(),
  };

  db.users.push(newUser);

  // Atualiza barbershop e assinatura do banco
  db.barbershop.name = shopTitle;
  if (phone) db.barbershop.phone = phone;

  db.subscription.plan_id = targetPlan;
  db.subscription.status = "active";
  db.subscription.subscriptionStatus = "active";
  db.subscription.subscriptionExpiresAt = expiresAtIso;
  db.subscription.max_barbers = maxBarbers;
  db.subscription.multi_unit = multiUnit;
  db.subscription.updated_at = nowIso();
  persistSubscription(db.subscription);

  try {
    await storage.createOrganization({
      id: newOrgId,
      name: shopTitle,
      slug: finalUsername,
      plan: targetPlan,
      status: "active",
      subscription_status: "active",
      subscription_expires_at: new Date(expiresAtIso),
    });
    await storage.createSubscriptionTransaction({
      organization_id: newOrgId,
      payment_id: txId,
      status: "approved",
      amount: targetPlan === "starter" ? "79.90" : targetPlan === "premium" ? "299.90" : "169.90",
    });
  } catch (e: any) {
    console.warn("[Storage] Warning ao provisionar nova organização:", e?.message);
  }

  db.logChange(
    `Webhook [${platform.toUpperCase()}]: Novo Dono '${name}' (${email}) provisionado com plano '${targetPlan.toUpperCase()}'.`,
    "subscription"
  );

  return {
    success: true,
    action: "created",
    credentials: {
      username: finalUsername,
      temporary_password: generatedPassword,
    },
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      plan: targetPlan,
    },
  };
}

/**
 * 1. Webhook Oficial Kiwify
 * Disparado em eventos de compra aprovada (order_status === 'paid' ou 'approved')
 */
router.post("/webhooks/kiwify", async (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    const orderStatus = (payload.order_status || payload.status || "").toLowerCase();
    
    // Apenas processa pedidos pagos/aprovados
    if (orderStatus && !["paid", "approved", "completed"].includes(orderStatus)) {
      return res.status(200).json({ received: true, ignored: true, reason: `Status '${orderStatus}' não requer ativação` });
    }

    const customer = payload.Customer || payload.customer || {};
    const product = payload.Product || payload.product || payload.Subscription?.plan || {};

    const buyerEmail = customer.email || payload.email || "";
    const buyerName = customer.full_name || customer.name || payload.name || "Dono Kupola";
    const buyerPhone = customer.mobile || customer.phone || "";
    const productName = product.name || product.product_name || payload.plan || "Pro";
    const transactionId = payload.order_id || payload.transaction_id || payload.order_ref;

    if (!buyerEmail) {
      return res.status(400).json({ error: "E-mail do comprador não fornecido no payload da Kiwify" });
    }

    const result = await provisionExternalOwner({
      email: buyerEmail,
      name: buyerName,
      phone: buyerPhone,
      plan_id: productName,
      platform: "kiwify",
      transaction_id: String(transactionId || ""),
      order_status: orderStatus,
    });

    return res.status(200).json({ received: true, ...result });
  } catch (err: any) {
    console.error("[Webhook Kiwify Error]", err);
    return res.status(500).json({ error: "Erro interno ao processar webhook Kiwify", message: err.message });
  }
});

/**
 * 2. Webhook Oficial Hotmart
 * Disparado em eventos de 'PURCHASE_APPROVED' ou similar
 */
router.post("/webhooks/hotmart", async (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    const event = (payload.event || "").toUpperCase();

    if (event && !event.includes("APPROVED") && !event.includes("COMPLETE")) {
      return res.status(200).json({ received: true, ignored: true, reason: `Evento '${event}' ignorado` });
    }

    const buyer = payload.data?.buyer || payload.buyer || {};
    const product = payload.data?.product || payload.product || {};
    const purchase = payload.data?.purchase || payload.purchase || {};

    const buyerEmail = buyer.email || payload.email || "";
    const buyerName = buyer.name || "Dono Kupola";
    const buyerPhone = buyer.checkout_phone || buyer.phone || "";
    const productName = product.name || "Pro";
    const transactionId = purchase.transaction || payload.transaction;

    if (!buyerEmail) {
      return res.status(400).json({ error: "E-mail do comprador não fornecido no payload da Hotmart" });
    }

    const result = await provisionExternalOwner({
      email: buyerEmail,
      name: buyerName,
      phone: buyerPhone,
      plan_id: productName,
      platform: "hotmart",
      transaction_id: String(transactionId || ""),
    });

    return res.status(200).json({ received: true, ...result });
  } catch (err: any) {
    console.error("[Webhook Hotmart Error]", err);
    return res.status(500).json({ error: "Erro interno ao processar webhook Hotmart", message: err.message });
  }
});

/**
 * 3. Webhook Oficial Kirvano
 * Disparado em eventos de 'sale.approved'
 */
router.post("/webhooks/kirvano", async (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    const event = (payload.event || "").toLowerCase();

    if (event && !event.includes("approved") && !event.includes("paid")) {
      return res.status(200).json({ received: true, ignored: true, reason: `Evento '${event}' ignorado` });
    }

    const customer = payload.customer || {};
    const product = payload.product || {};

    const buyerEmail = customer.email || payload.email || "";
    const buyerName = customer.name || "Dono Kupola";
    const buyerPhone = customer.phone || "";
    const productName = product.name || "Pro";
    const transactionId = payload.sale_id || payload.id;

    if (!buyerEmail) {
      return res.status(400).json({ error: "E-mail do comprador não fornecido no payload da Kirvano" });
    }

    const result = await provisionExternalOwner({
      email: buyerEmail,
      name: buyerName,
      phone: buyerPhone,
      plan_id: productName,
      platform: "kirvano",
      transaction_id: String(transactionId || ""),
    });

    return res.status(200).json({ received: true, ...result });
  } catch (err: any) {
    console.error("[Webhook Kirvano Error]", err);
    return res.status(500).json({ error: "Erro interno ao processar webhook Kirvano", message: err.message });
  }
});

/**
 * 4. Webhook Unificado / API Direta de Provisionamento
 * Endpoint padrão para testes ou integrações diretas
 */
router.post("/webhooks/provision", async (req: Request, res: Response) => {
  try {
    const { email, name, phone, plan_id, shop_name, platform, transaction_id } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "O campo 'email' é obrigatório para provisionar a conta." });
    }

    const result = await provisionExternalOwner({
      email,
      name: name || "Dono Kupola",
      phone,
      plan_id: plan_id || "pro",
      shop_name,
      platform: platform || "generic",
      transaction_id,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: "Erro ao provisionar usuário", message: err.message });
  }
});

router.get("/webhooks/health", (req, res) => {
  res.json({
    status: "online",
    platforms: ["kiwify", "hotmart", "kirvano", "provision"],
    mode: "external_distribution",
  });
});

export default router;
