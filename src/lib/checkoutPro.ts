import { toast } from "sonner";

export interface PreferenceOptions {
  planId: string;
  planName?: string;
  price?: number;
  organizationId?: string;
  email?: string;
}

/**
 * Cria a preferência de pagamento no Mercado Pago Checkout Pro
 * e redireciona o usuário para o init_point oficial (suporta Pix, Cartão de Crédito/Débito e Boleto)
 */
export async function redirectToCheckoutPro(options: PreferenceOptions): Promise<void> {
  const toastId = toast.loading("Gerando checkout seguro do Mercado Pago...", {
    description: "Preparando opções de Pix, Cartão e Boleto...",
  });

  try {
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const response = await fetch("/api/checkout/create_preference", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planId: options.planId,
        planName: options.planName || options.planId,
        price: options.price,
        organizationId: options.organizationId || "org_vintage",
        email: options.email,
        appUrl: currentOrigin,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.init_point) {
      toast.dismiss(toastId);
      const errorMsg = data.message || "Erro ao conectar com o Mercado Pago Checkout Pro.";
      toast.error("Não foi possível abrir o Checkout Pro", {
        description: errorMsg,
      });
      return;
    }

    toast.success("Redirecionando para o Mercado Pago...", {
      id: toastId,
      description: "Você será direcionado ao ambiente seguro do Checkout Pro.",
    });

    // Se estiver em modo sandbox/testes e houver sandbox_init_point preferencial
    const targetUrl = data.init_point;

    // Aguarda breve instante para que o usuário veja a confirmação
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 400);
  } catch (err: any) {
    toast.dismiss(toastId);
    toast.error("Falha ao iniciar pagamento", {
      description: err?.message || "Verifique sua conexão e tente novamente.",
    });
  }
}
