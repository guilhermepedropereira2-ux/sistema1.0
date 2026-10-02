import { toast } from "sonner";

export interface ExternalCheckoutOptions {
  planId: string;
  planName?: string;
  price?: number;
  email?: string;
  organizationId?: string;
}

/**
 * Normaliza o nome do plano para apresentação
 */
export function getNormalizedPlanName(planId: string = "pro"): string {
  const lower = (planId || "").toLowerCase();
  if (lower.includes("basic") || lower.includes("starter") || lower.includes("solo")) {
    return "Basic";
  }
  if (lower.includes("premium") || lower.includes("rede") || lower.includes("enterprise")) {
    return "Premium";
  }
  return "Pro";
}

/**
 * Dispara o fluxo de pagamento com Faturas Hospedadas / Checkout Oficial do Asaas
 * Dispara o evento global `open_direct_checkout` para renderizar o AsaasPaymentModal
 */
export function redirectToExternalCheckout(options: ExternalCheckoutOptions): void {
  const planName = options.planName || getNormalizedPlanName(options.planId);

  if (typeof window !== "undefined") {
    const customEvent = new CustomEvent("open_direct_checkout", {
      detail: {
        ...options,
        planName,
      },
    });
    window.dispatchEvent(customEvent);
  }

  toast.info(`Gerando fatura oficial Asaas para o Plano ${planName}...`, {
    description: "Opções disponíveis: Pix, Cartão de Crédito e Boleto Bancário.",
  });
}
