/**
 * Módulo de Retenção e Recuperação de Clientes Inativos via WhatsApp
 * Parte do Backlog Estratégico do SaaS Barbearia
 */

/**
 * Calcula o número de dias desde a última visita do cliente
 * @param {string|Date} lastVisit 
 * @returns {number} dias de inatividade
 */
export function calculateInactivityDays(lastVisit) {
  if (!lastVisit) return 999;
  const visit = new Date(lastVisit);
  if (isNaN(visit.getTime())) return 999;
  const diffTime = Math.abs(new Date() - visit);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se um cliente é considerado inativo (ex: sem cortes há mais de 30 dias)
 * @param {Object} client 
 * @param {number} thresholdDays default 30 dias
 * @returns {boolean}
 */
export function isClientInactive(client, thresholdDays = 30) {
  if (!client) return false;
  // Checa last_visit ou last_cut ou data de criação se não tiver visitas
  const lastDate = client.last_visit || client.last_cut_date || client.created_at;
  const days = calculateInactivityDays(lastDate);
  return days >= thresholdDays;
}

/**
 * Templates pré-formatados de copy persuasiva para recuperação
 */
export const REACTIVATION_TEMPLATES = [
  {
    id: "amigavel",
    title: "Amigável & Casual",
    getText: (clientName, shopName, bookingUrl) =>
      `Fala, ${clientName}! 💈 Sentimos sua falta aqui na ${shopName}. Seu corte já deve estar precisando daquele trato especial, né? ✂️\n\nQue tal garantir seu horário para essa semana? Agende em 1 minuto sem complicação:\n👉 ${bookingUrl}`,
  },
  {
    id: "promocional",
    title: "Condição Especial Terça/Quarta",
    getText: (clientName, shopName, bookingUrl) =>
      `Olá, ${clientName}! Tudo bem? Passando pra avisar que estamos com condições especiais para você renovar o visual na ${shopName} essa semana! 🔥\n\nEscolha o melhor horário direto no link:\n👉 ${bookingUrl}`,
  },
];

/**
 * Gera URL direta do WhatsApp (wa.me) sanitizando o telefone
 * @param {Object} params
 * @param {string} params.phone
 * @param {string} params.clientName
 * @param {string} params.shopName
 * @param {string} params.bookingUrl
 * @param {string} [params.templateId]
 * @returns {string} url wa.me
 */
export function generateReactivationWhatsAppUrl({ phone, clientName, shopName = "nossa barbearia", bookingUrl, templateId = "amigavel" }) {
  if (!phone) return "";
  
  // Limpa caracteres não numéricos
  let cleanPhone = phone.replace(/\D/g, "");
  
  // Garante DDI do Brasil (55) se não tiver
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = `55${cleanPhone}`;
  }

  const template = REACTIVATION_TEMPLATES.find((t) => t.id === templateId) || REACTIVATION_TEMPLATES[0];
  const firstName = (clientName || "Amigo").split(" ")[0];
  const message = template.getText(firstName, shopName, bookingUrl);

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
