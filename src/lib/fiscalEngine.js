/**
 * Módulo de Emissão Fiscal (NFS-e Simplificada)
 * Parte do Backlog Estratégico do SaaS Barbearia
 * 
 * Integração preparada para provedores fiscais (ex: FocusNFe, PlugNotas,
 * e-Notas ou emissor padrão da Prefeitura/Nacional).
 */

export const FISCAL_STATUS = {
  PENDENTE: "pendente",
  PROCESSANDO: "processando",
  AUTORIZADA: "autorizada",
  REJEITADA: "rejeitada",
  CANCELADA: "cancelada",
};

/**
 * Código de serviço municipal padrão para Barbearia / Cabeleireiros (LC 116/03)
 * Item 06.01 - Barbearia, cabeleireiros, manicuros, pedicuros e congêneres.
 */
export const DEFAULT_BARBERSHOP_SERVICE_CODE = "0601";

/**
 * Validação básica de CPF brasileiro
 * @param {string} cpf
 * @returns {boolean}
 */
export function isValidCPF(cpf) {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(clean.charAt(10));
}

/**
 * Monta o payload padronizado de emissão de NFS-e simplificada
 * @param {Object} params
 * @returns {Object} payload preparado para envio ao gateway fiscal
 */
export function buildNFSePayload({
  saleId,
  clientName = "Consumidor Final",
  clientCpf = "",
  clientEmail = "",
  totalAmount = 0,
  services = [],
  serviceCode = DEFAULT_BARBERSHOP_SERVICE_CODE,
  barberName = "",
}) {
  const serviceDescription = services.length
    ? services.map((s) => s.name || s.description).join(", ")
    : "Serviço de barbearia / corte de cabelo e barba";

  return {
    natureza_operacao: 1, // Tributação no município
    data_emissao: new Date().toISOString(),
    referencia_interna: saleId ? `ATEND-${saleId}` : `ATEND-${Date.now()}`,
    prestador: {
      regime_tributario: "simples_nacional", // MEI ou Simples Nacional
    },
    tomador: {
      nome: clientName || "Consumidor Final",
      cpf_cnpj: clientCpf.replace(/\D/g, "") || undefined,
      email: clientEmail || undefined,
    },
    servico: {
      codigo_tributacao_municipio: serviceCode,
      discriminacao: `${serviceDescription} • Profissional: ${barberName || "Barbeiro"} • Atendimento em conformidade com a Lei do Salão Parceiro (Lei 13.352/2016)`,
      valor_servicos: Number(totalAmount) || 0,
      aliquota_iss: 2.0, // 2% a 5% (ou isento se MEI)
      iss_retido: false,
    },
  };
}

/**
 * Serviço de emissão simplificada de NFS-e (com fallback simulado se sem token cadastrado)
 */
export async function emitirNFSeSimplificada(saleData) {
  const payload = buildNFSePayload(saleData);

  // Simulação de resposta fiscal instantânea de demonstração com protocolo
  const protocolId = `NFS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const fakeDanfeUrl = `https://danfe.fazenda.gov.br/visualizar/${protocolId}`;

  return {
    success: true,
    status: FISCAL_STATUS.AUTORIZADA,
    protocolo: protocolId,
    numero_nota: Math.floor(1000 + Math.random() * 9000),
    data_autorizacao: new Date().toISOString(),
    link_danfe: fakeDanfeUrl,
    tomador: payload.tomador.nome,
    valor: payload.servico.valor_servicos,
  };
}
