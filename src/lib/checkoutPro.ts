import { redirectToExternalCheckout, ExternalCheckoutOptions } from "./externalCheckout";

export type PreferenceOptions = ExternalCheckoutOptions;

/**
 * Função de redirecionamento para o checkout oficial seguro Kupola.
 * Redireciona diretamente para o portal homologado de pagamentos.
 */
export async function redirectToCheckoutPro(options: PreferenceOptions): Promise<void> {
  redirectToExternalCheckout(options);
}
