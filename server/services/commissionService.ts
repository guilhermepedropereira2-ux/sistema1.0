export interface CommissionSettings {
  commission_base: "gross" | "net" | string; // "gross": sobre valor bruto; "net": sobre valor líquido após taxas de pagamento
  discount_affects_commission: boolean; // true: após desconto; false: valor original antes do desconto
  commission_on?: string; // backward compatibility ("original" | "pago")
}

export interface CalculateCommissionParams {
  gross: number;
  discount?: number;
  feePercent?: number;
  barber?: {
    commission_type?: string;
    commission_percent?: number;
    commission_value?: number;
  } | null;
  settings?: Partial<CommissionSettings>;
}

export interface CommissionResult {
  gross: number;
  discount: number;
  paidAmount: number;
  feePercent: number;
  feeAmount: number;
  netAmount: number;
  discountAppliedToBase: boolean;
  baseBeforeFee: number;
  feeDeductedFromBase: number;
  commissionBase: number;
  commissionType: string;
  commissionRate: number;
  effectivePercent?: number;
  commissionAmount: number;
  shopAmount: number;
}

/**
 * Serviço centralizado oficial do KUPOLA para cálculo de comissões.
 *
 * Ordem oficial do cálculo:
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
  gross,
  discount = 0,
  feePercent = 0,
  barber,
  settings,
}: CalculateCommissionParams): CommissionResult {
  const safeGross = Math.max(0, Number(gross) || 0);
  const safeDiscount = Math.max(0, Math.min(safeGross, Number(discount) || 0));
  const paidAmount = Number((safeGross - safeDiscount).toFixed(2));

  const safeFeePercent = Math.max(0, Number(feePercent) || 0);
  // Taxa total cobrada pela forma de pagamento / maquininha
  const feeAmount = Number(((paidAmount * safeFeePercent) / 100).toFixed(2));
  const netAmount = Number((paidAmount - feeAmount).toFixed(2));

  // Regras de configuração do estabelecimento
  const commissionBaseRule = settings?.commission_base === "net" ? "net" : "gross";
  const discountAffectsRule = settings?.discount_affects_commission !== false;

  // 1. Base antes da dedução da taxa da forma de pagamento
  const baseBeforeFee = discountAffectsRule ? paidAmount : safeGross;

  // 2. Dedução da taxa da maquininha se a base for líquida
  let feeDeductedFromBase = 0;
  if (commissionBaseRule === "net") {
    feeDeductedFromBase = Number(((baseBeforeFee * safeFeePercent) / 100).toFixed(2));
  }

  // 3. Base final oficial para aplicação da comissão
  const commissionBase = Math.max(0, Number((baseBeforeFee - feeDeductedFromBase).toFixed(2)));

  // 4. Cálculo da comissão do profissional
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

  // Proteção para nunca ultrapassar o valor líquido que entrou no caixa
  commissionAmount = Math.max(0, Math.min(commissionAmount, netAmount));

  // 5. Valor líquido restante da barbearia
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
    effectivePercent: commRate,
    commissionAmount,
    shopAmount,
  };
}
