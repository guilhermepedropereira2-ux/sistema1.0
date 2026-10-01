import { toast } from "sonner";

export interface ExternalCheckoutOptions {
  planId: string;
  planName?: string;
  price?: number;
  platform?: "kiwify" | "hotmart" | "kirvano";
  email?: string;
  organizationId?: string;
}

/**
 * URLs de Checkout do portal oficial de pagamentos Kupola.
 * Podem ser sobrescritas facilmente por variáveis de ambiente (.env) ou mantidas com os links padrão.
 */
export const EXTERNAL_CHECKOUT_URLS: Record<string, Record<string, string>> = {
  kiwify: {
    starter: (import.meta as any).env?.VITE_KIWIFY_CHECKOUT_STARTER || "https://pay.kiwify.com.br/kupola-basic",
    pro: (import.meta as any).env?.VITE_KIWIFY_CHECKOUT_PRO || "https://pay.kiwify.com.br/kupola-pro",
    premium: (import.meta as any).env?.VITE_KIWIFY_CHECKOUT_PREMIUM || "https://pay.kiwify.com.br/kupola-premium",
  },
  hotmart: {
    starter: (import.meta as any).env?.VITE_HOTMART_CHECKOUT_STARTER || "https://pay.hotmart.com/kupola-basic",
    pro: (import.meta as any).env?.VITE_HOTMART_CHECKOUT_PRO || "https://pay.hotmart.com/kupola-pro",
    premium: (import.meta as any).env?.VITE_HOTMART_CHECKOUT_PREMIUM || "https://pay.hotmart.com/kupola-premium",
  },
  kirvano: {
    starter: (import.meta as any).env?.VITE_KIRVANO_CHECKOUT_STARTER || "https://pay.kirvano.com/kupola-basic",
    pro: (import.meta as any).env?.VITE_KIRVANO_CHECKOUT_PRO || "https://pay.kirvano.com/kupola-pro",
    premium: (import.meta as any).env?.VITE_KIRVANO_CHECKOUT_PREMIUM || "https://pay.kirvano.com/kupola-premium",
  },
};

/**
 * Retorna a URL de checkout externa adequada para o plano e plataforma
 */
export function getExternalCheckoutUrl(
  planId: string,
  platform: "kiwify" | "hotmart" | "kirvano" = "kiwify",
  email?: string
): string {
  const normPlan = planId === "basic" ? "starter" : planId;
  const platformUrls = EXTERNAL_CHECKOUT_URLS[platform] || EXTERNAL_CHECKOUT_URLS.kiwify;
  let url = platformUrls[normPlan] || platformUrls.pro || "https://pay.kiwify.com.br/kupola";

  if (email && email.includes("@")) {
    const sep = url.includes("?") ? "&" : "?";
    url += `${sep}email=${encodeURIComponent(email)}`;
  }
  return url;
}

/**
 * Redireciona o usuário de forma transparente para o ambiente de pagamento seguro
 */
export function redirectToExternalCheckout(options: ExternalCheckoutOptions): void {
  const platform = options.platform || "kiwify";
  const url = getExternalCheckoutUrl(options.planId, platform, options.email);

  toast.info("Redirecionando para o ambiente de pagamento seguro...", {
    description: "Você será redirecionado para concluir a assinatura no nosso portal oficial de pagamentos.",
  });

  setTimeout(() => {
    if (typeof window !== "undefined") {
      window.location.href = url;
    }
  }, 450);
}
