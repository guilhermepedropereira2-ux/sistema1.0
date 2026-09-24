import crypto from "crypto";

export interface ProcessPaymentParams {
  token: string;
  issuer_id?: string | number;
  payment_method_id: string;
  transaction_amount: number;
  installments?: number;
  payer: {
    email: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
  description?: string;
  plan_id?: string;
}

export interface PaymentResponse {
  success: boolean;
  status: "approved" | "in_process" | "rejected" | "error";
  status_detail?: string;
  id?: string | number;
  message: string;
  detail?: any;
  plan_id?: string;
}

export const STATUS_DETAIL_MESSAGES: Record<string, string> = {
  accredited: "Pagamento aprovado com sucesso! Sua assinatura foi ativada.",
  pending_contingency: "O pagamento está sendo processado. Em breve você receberá a confirmação por e-mail.",
  pending_review_manual: "O pagamento está em análise manual pelo Mercado Pago. Aguarde alguns instantes.",
  cc_rejected_bad_filled_card_number: "Número de cartão inválido. Verifique os dígitos digitados.",
  cc_rejected_bad_filled_date: "Data de validade incorreta.",
  cc_rejected_bad_filled_security_code: "Código de segurança (CVV) inválido.",
  cc_rejected_bad_filled_other: "Dados do cartão preenchidos incorretamente.",
  cc_rejected_insufficient_amount: "Saldo ou limite insuficiente no cartão.",
  cc_rejected_call_for_authorize: "Pagamento não autorizado. Por favor, entre em contato com o banco emissor do cartão para liberar a transação.",
  cc_rejected_card_disabled: "Cartão desabilitado para pagamentos na internet.",
  cc_rejected_duplicated_payment: "Transação duplicada. Aguarde alguns minutos antes de tentar novamente.",
  cc_rejected_high_risk: "Pagamento recusado pela análise de risco da operadora. Tente outro cartão de crédito.",
  cc_rejected_max_attempts: "Limite de tentativas excedido. Tente novamente mais tarde.",
  cc_rejected_other_reason: "Pagamento recusado pela operadora do cartão.",
};

export interface CreatePreferenceParams {
  planId: string;
  planName: string;
  price: number;
  organizationId?: string;
  email?: string;
  appUrl?: string;
}

export interface PreferenceResponse {
  success: boolean;
  init_point?: string;
  sandbox_init_point?: string;
  preferenceId?: string;
  message?: string;
  detail?: any;
}

export async function createMercadoPagoPreference(
  params: CreatePreferenceParams
): Promise<PreferenceResponse> {
  const accessToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();
  const rawAppUrl =
    params.appUrl ||
    process.env.APP_URL ||
    "https://ais-dev-cl5cbxkmcbmir4nhsmk53n-4429763136.us-west2.run.app";
  const appUrl = rawAppUrl.replace(/\/+$/, "");

  // Se não houver token configurado no ambiente, fornecemos init_point de fallback seguro / simulação
  if (!accessToken) {
    console.warn(
      "[MercadoPago] MERCADO_PAGO_ACCESS_TOKEN não configurado. Gerando preference simulada para desenvolvimento."
    );
    const mockPrefId = `pref_sim_${Date.now()}`;
    const mockInitPoint = `${appUrl}/checkout/success?collection_status=approved&preference_id=${mockPrefId}&plan_id=${params.planId}&org_id=${params.organizationId || "org_vintage"}&simulated=true`;

    return {
      success: true,
      init_point: mockInitPoint,
      sandbox_init_point: mockInitPoint,
      preferenceId: mockPrefId,
      message: "Modo Demonstração / Teste Ativo (sem ACCESS_TOKEN configurado).",
    };
  }

  const payload = {
    items: [
      {
        id: params.planId,
        title: `Assinatura ${params.planName} - KortePro`,
        description: `Acesso completo ao plano ${params.planName} no sistema KortePro`,
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(params.price),
      },
    ],
    payer: {
      email: params.email || "financeiro@barbearia.com",
    },
    payment_methods: {
      // Aceita Pix, cartões de crédito e cartões de débito.
      // O Mercado Pago permite todos por padrão, excluindo apenas outros se configurado.
      excluded_payment_types: [] as { id: string }[],
      installments: 12,
    },
    back_urls: {
      success: `${appUrl}/checkout/success`,
      failure: `${appUrl}/checkout/failure`,
      pending: `${appUrl}/checkout/pending`,
    },
    auto_return: "approved",
    external_reference: JSON.stringify({
      planId: params.planId,
      organizationId: params.organizationId || "org_vintage",
      timestamp: Date.now(),
    }),
    statement_descriptor: "KORTEPRO",
  };

  try {
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[MercadoPago Preference Error]", data);
      return {
        success: false,
        message:
          data.message ||
          data.cause?.[0]?.description ||
          "Não foi possível criar a preferência de checkout no Mercado Pago.",
        detail: data,
      };
    }

    return {
      success: true,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point || data.init_point,
      preferenceId: data.id,
    };
  } catch (err: any) {
    console.error("[MercadoPago Exception]", err);
    return {
      success: false,
      message: `Erro na comunicação com a API do Mercado Pago: ${err.message}`,
    };
  }
}

export async function processMercadoPagoPayment(
  params: ProcessPaymentParams,
  idempotencyKey?: string
): Promise<PaymentResponse> {
  // Suporte a pagamentos simulados/testes de desenvolvimento
  if (params.token?.startsWith("sim_") || params.token === "test_simulated_token") {
    return {
      success: true,
      status: "approved",
      status_detail: "accredited",
      id: `sim_${Date.now()}`,
      message: "Ambiente de Testes: Pagamento simulado aprovado com sucesso.",
      plan_id: params.plan_id || "pro",
    };
  }

  const accessToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();

  // Se não houver token configurado, avisa com clareza
  if (!accessToken) {
    return {
      success: false,
      status: "error",
      message: "Credencial MERCADO_PAGO_ACCESS_TOKEN não configurada no servidor (.env). Defina seu token de acesso para processar transações reais.",
    };
  }

  // Gera identificador único por tentativa (X-Idempotency-Key)
  const uniqueIdempotencyKey = idempotencyKey || crypto.randomUUID();

  const payload: any = {
    token: params.token,
    payment_method_id: params.payment_method_id,
    transaction_amount: Number(params.transaction_amount),
    installments: Number(params.installments) || 1,
    description: params.description || `Assinatura KortePro - Plano ${(params.plan_id || "pro").toUpperCase()}`,
    payer: {
      email: params.payer?.email || "contato@barbearia.com",
    },
  };

  if (params.issuer_id) {
    payload.issuer_id = String(params.issuer_id);
  }

  if (params.payer?.identification?.number) {
    payload.payer.identification = {
      type: params.payer.identification.type || "CPF",
      number: String(params.payer.identification.number).replace(/\D/g, ""),
    };
  }

  try {
    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": uniqueIdempotencyKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        STATUS_DETAIL_MESSAGES[data.status_detail] ||
        data.message ||
        data.cause?.[0]?.description ||
        "Não foi possível processar a cobrança no Mercado Pago.";

      return {
        success: false,
        status: data.status || "rejected",
        status_detail: data.status_detail,
        id: data.id,
        message: errorMsg,
        detail: data,
      };
    }

    const isApproved = data.status === "approved";
    const isInProcess = data.status === "in_process";
    const friendlyMessage =
      STATUS_DETAIL_MESSAGES[data.status_detail] ||
      (isApproved
        ? "Pagamento aprovado com sucesso! Sua assinatura foi ativada."
        : isInProcess
        ? "Pagamento em análise pelo Mercado Pago. Aguarde a confirmação."
        : "Pagamento não aprovado.");

    return {
      success: isApproved || isInProcess,
      status: data.status,
      status_detail: data.status_detail,
      id: data.id,
      message: friendlyMessage,
      plan_id: params.plan_id,
    };
  } catch (error: any) {
    return {
      success: false,
      status: "error",
      message: `Erro na comunicação com o Mercado Pago: ${error.message}`,
    };
  }
}
