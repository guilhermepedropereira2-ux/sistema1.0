/**
 * Centralizador de regras e cálculos de comissões KUPOLA (Frontend & Simulações)
 *
 * Segue estritamente a ordem oficial:
 * 1. Valor original dos serviços/produtos (gross)
 * 2. Aplicação do desconto, conforme configuração (discount_affects_commission)
 * 3. Identificação da forma de pagamento e respectiva taxa real (feePercent)
 * 4. Aplicação da taxa da forma de pagamento, conforme configuração (commission_base: gross vs net)
 * 5. Determinação da base da comissão (commissionBase)
 * 6. Aplicação do percentual de comissão do barbeiro (ou valor fixo)
 * 7. Valor da comissão (commissionAmount)
 * 8. Valor líquido pertencente à barbearia (shopAmount)
 */

export function calculateCommission({
  gross = 0,
  discount = 0,
  feePercent = 0,
  barber = null,
  settings = {},
}) {
  const safeGross = Math.max(0, Number(gross) || 0);
  const safeDiscount = Math.max(0, Math.min(safeGross, Number(discount) || 0));
  const paidAmount = Number((safeGross - safeDiscount).toFixed(2));

  const safeFeePercent = Math.max(0, Number(feePercent) || 0);
  const feeAmount = Number(((paidAmount * safeFeePercent) / 100).toFixed(2));
  const netAmount = Number((paidAmount - feeAmount).toFixed(2));

  const commissionBaseRule = settings?.commission_base === "net" ? "net" : "gross";
  const discountAffectsRule = settings?.discount_affects_commission !== false;

  // 1. Base antes da taxa da forma de pagamento
  const baseBeforeFee = discountAffectsRule ? paidAmount : safeGross;

  // 2. Desconto da taxa da maquininha se base for líquida
  let feeDeductedFromBase = 0;
  if (commissionBaseRule === "net") {
    feeDeductedFromBase = Number(((baseBeforeFee * safeFeePercent) / 100).toFixed(2));
  }

  // 3. Base final oficial da comissão
  const commissionBase = Math.max(0, Number((baseBeforeFee - feeDeductedFromBase).toFixed(2)));

  // 4. Comissão do profissional
  let commissionAmount = 0;
  const commType = barber?.commission_type || "percentual";
  const commRate =
    commType === "fixo"
      ? Number(barber?.commission_value || 0)
      : Number(barber?.commission_percent ?? 40);

  if (commType === "fixo") {
    commissionAmount = commRate;
  } else {
    commissionAmount = Number(((commissionBase * commRate) / 100).toFixed(2));
  }

  // Proteção para nunca ultrapassar o líquido do atendimento
  commissionAmount = Math.max(0, Math.min(commissionAmount, netAmount));

  // 5. Valor da barbearia
  const shopAmount = Number((netAmount - commissionAmount).toFixed(2));

  return {
    gross: safeGross,
    discount: safeDiscount,
    paidAmount,
    feePercent: safeFeePercent,
    feeAmount,
    netAmount,
    discountAppliedToBase: discountAffectsRule,
    baseBeforeFee,
    feeDeductedFromBase,
    commissionBase,
    commissionType: commType,
    commissionRate: commRate,
    commissionAmount,
    shopAmount,
  };
}
