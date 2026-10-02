import express, { Request, Response } from "express";
import { authUser } from "../db.js";
import {
  createAsaasInvoice,
  getAsaasPaymentStatus,
  simulateAsaasPayment,
  activateSubscriptionFromPayment,
  pendingInvoices,
} from "../services/asaas.js";

const router = express.Router();

/**
 * 1. POST /api/asaas/invoice/create (e aliases /api/asaas/checkout/create e /api/asaas/pix/create)
 * Criação da cobrança com Link de Pagamento / Fatura Hospedada Oficial do Asaas (invoiceUrl)
 * Permite que o cliente escolha entre Pix, Cartão de Crédito ou Boleto na página oficial do Asaas.
 */
const handleCreateInvoice = async (req: Request, res: Response) => {
  try {
    const user = authUser(req);
    const {
      planId = "pro",
      name,
      email,
      cpfCnpj,
      phone,
      organizationId,
      cycle = "mensal",
      billingType = "UNDEFINED", // UNDEFINED permite Pix, Cartão e Boleto na fatura
    } = req.body || {};

    const targetOrgId = organizationId || user?.barbershop_id || "org_vintage";
    const customerName = name || user?.name || "Administrador da Barbearia";
    const customerEmail = email || user?.email || "financeiro@barbearia.com";

    const result = await createAsaasInvoice({
      planId,
      name: customerName,
      email: customerEmail,
      cpfCnpj,
      phone,
      organizationId: targetOrgId,
      cycle,
      billingType,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[Asaas Create Invoice Error]", err);
    return res.status(500).json({
      error: "Erro ao gerar cobrança com fatura do Asaas",
      message: err.message,
    });
  }
};

router.post("/asaas/invoice/create", handleCreateInvoice);
router.post("/asaas/checkout/create", handleCreateInvoice);
router.post("/asaas/pix/create", handleCreateInvoice);

/**
 * 2. GET /api/asaas/invoice/status/:paymentId (e alias /api/asaas/pix/status/:paymentId)
 * Consulta do status da cobrança no Asaas
 */
const handleGetPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const statusData = await getAsaasPaymentStatus(paymentId);

    if (!statusData) {
      return res.status(404).json({ error: "Cobrança não encontrada no Asaas" });
    }

    return res.json(statusData);
  } catch (err: any) {
    console.error("[Asaas Get Payment Status Error]", err);
    return res.status(500).json({
      error: "Erro ao consultar status da cobrança Asaas",
      message: err.message,
    });
  }
};

router.get("/asaas/invoice/status/:paymentId", handleGetPaymentStatus);
router.get("/asaas/pix/status/:paymentId", handleGetPaymentStatus);
router.get("/asaas/payment/status/:paymentId", handleGetPaymentStatus);

/**
 * 3. POST /api/asaas/invoice/simulate/:paymentId (e alias /api/asaas/pix/simulate-payment/:paymentId)
 * Simula a confirmação imediata da fatura/cobrança do Asaas
 */
const handleSimulatePayment = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const simResult = await simulateAsaasPayment(paymentId);

    if (!simResult) {
      return res.status(404).json({ error: "Cobrança não encontrada para simulação" });
    }

    return res.json(simResult);
  } catch (err: any) {
    return res.status(500).json({
      error: "Erro na simulação de pagamento",
      message: err.message,
    });
  }
};

router.post("/asaas/invoice/simulate/:paymentId", handleSimulatePayment);
router.post("/asaas/pix/simulate-payment/:paymentId", handleSimulatePayment);
router.post("/asaas/payment/simulate/:paymentId", handleSimulatePayment);

/**
 * 4. POST /api/webhook/asaas (e alias /api/webhooks/asaas)
 * Rota oficial de Webhook do Asaas para processamento 100% automatizado
 * Escuta eventos PAYMENT_RECEIVED e PAYMENT_CONFIRMED gerados por Pix, Cartão ou Boleto.
 */
const handleAsaasWebhook = async (req: Request, res: Response) => {
  try {
    const eventData = req.body || {};
    const event = eventData.event;
    const payment = eventData.payment;

    console.log(
      `[Asaas Webhook Received] Evento: ${event} | ID: ${payment?.id || "N/A"} | Método: ${
        payment?.billingType || "N/A"
      }`
    );

    // Escuta eventos de pagamento confirmado (Pix, Cartão de Crédito ou Boleto)
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      if (!payment) {
        return res
          .status(400)
          .json({ error: "Objeto 'payment' ausente no payload do webhook Asaas" });
      }

      // Procura organização alvo via externalReference, pendingInvoices ou default
      let targetOrgId = payment.externalReference || "";
      if (!targetOrgId) {
        const local = pendingInvoices.get(payment.id);
        if (local) {
          targetOrgId = local.organizationId;
        }
      }

      if (!targetOrgId) {
        targetOrgId = "org_vintage";
      }

      // Detecta plano pelo valor ou descrição
      const desc = (payment.description || "").toLowerCase();
      const val = Number(payment.value) || 169.9;
      let targetPlan: "starter" | "pro" | "premium" = "pro";

      if (desc.includes("basic") || desc.includes("starter") || val <= 85) {
        targetPlan = "starter";
      } else if (desc.includes("premium") || desc.includes("rede") || val >= 240) {
        targetPlan = "premium";
      }

      // Atualiza pagamento local caso exista
      const local = pendingInvoices.get(payment.id);
      if (local) {
        local.status = "RECEIVED";
      }

      // Ativa no banco de dados (Drizzle ORM) por 30 dias
      const updatedOrg = await activateSubscriptionFromPayment(targetOrgId, targetPlan, val);

      return res.status(200).json({
        success: true,
        message:
          "Pagamento processado com sucesso pelo Asaas. Licença ativada por 30 dias!",
        organization_id: targetOrgId,
        plan: targetPlan,
        billingType: payment.billingType,
        expires_at: updatedOrg?.subscription_expires_at,
      });
    }

    // Outros eventos (ex: PAYMENT_CREATED, PAYMENT_OVERDUE)
    return res.status(200).json({ received: true, event });
  } catch (err: any) {
    console.error("[Asaas Webhook Error]", err);
    return res.status(500).json({
      error: "Erro interno no processamento do webhook Asaas",
      message: err.message,
    });
  }
};

router.post("/webhook/asaas", handleAsaasWebhook);
router.post("/webhooks/asaas", handleAsaasWebhook);

export default router;
