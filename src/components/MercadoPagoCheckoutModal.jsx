import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Crown,
  CheckCircle2,
  X,
  ShieldCheck,
  Zap,
  QrCode,
  FileText,
  ExternalLink,
} from "lucide-react";
import MercadoPagoCardPayment from "@/components/MercadoPagoCardPayment";
import { redirectToCheckoutPro } from "@/lib/checkoutPro";
import { useAuth } from "@/context/AuthContext";

export default function MercadoPagoCheckoutModal({
  open,
  onClose,
  plan,
  onPaymentSuccess,
}) {
  const { user } = useAuth();
  if (!open || !plan) return null;

  const rawPlanName = plan?.name?.trim() || "Plano";
  const planName = rawPlanName.toLowerCase().startsWith("plano ")
    ? rawPlanName
    : `Plano ${rawPlanName}`;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] flex flex-col bg-[#0F121C] border border-[#D4AF37]/50 p-0 text-white shadow-2xl rounded-[6px] overflow-hidden [&>button:last-child]:hidden">
        {/* Header Elegante em Tom Escuro Dourado */}
        <div className="relative p-5 sm:p-6 bg-[#0A0D14] border-b border-[#D4AF37]/30 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-30 h-8 w-8 rounded-[4px] bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar checkout"
            data-testid="mp-checkout-modal-close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-[4px] bg-[#D4AF37] flex items-center justify-center text-[#0B0F19] shrink-0 shadow">
              <Zap className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40 text-[10px] uppercase font-extrabold tracking-wider rounded-[2px]">
                  Mercado Pago Checkout Pro
                </Badge>
                <span className="text-xs text-slate-400">
                  Pix, Cartão & Boleto
                </span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-display font-extrabold text-white mt-1">
                Assinar {planName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 mt-0.5">
                Escolha o Checkout Pro oficial do Mercado Pago para ativação instantânea no KingPro.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Corpo com Destaque para o Checkout Pro */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(92vh-100px)] space-y-5">
          <div className="p-5 rounded-[6px] bg-[#0A0D14] border border-[#D4AF37]/40 text-center space-y-3">
            <div className="flex items-center justify-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <QrCode className="h-4 w-4" /> Pix Instantâneo
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-sky-400">
                <CreditCard className="h-4 w-4" /> Débito & Crédito
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                <FileText className="h-4 w-4" /> Boleto
              </span>
            </div>

            <Button
              onClick={() => {
                onClose?.();
                redirectToCheckoutPro({
                  planId: plan.key || plan.id || "pro",
                  planName: plan.name,
                  price: plan.amount || 169.9,
                  email: user?.email,
                  organizationId: user?.barbershop_id || "org_vintage",
                });
              }}
              className="w-full h-12 bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-black text-sm uppercase rounded-[4px] gap-2 shadow-xl cursor-pointer transition-all active:scale-[0.99]"
              data-testid="modal-btn-checkout-pro"
            >
              <Zap className="h-4 w-4 fill-current" />
              <span>Pagar no Checkout Pro Mercado Pago</span>
              <ExternalLink className="h-4 w-4" />
            </Button>

            <p className="text-[11px] text-slate-400">
              Redirecionamento oficial com garantia total de proteção ao comprador.
            </p>
          </div>

          <div className="pt-2 border-t border-white/10">
            <details className="text-xs text-slate-400 group cursor-pointer">
              <summary className="hover:text-slate-200 transition-colors py-1 flex items-center justify-between">
                <span>Ou preencha cartão de crédito diretamente neste modal</span>
                <span className="text-[10px] text-[#D4AF37]">Expandir formulário</span>
              </summary>
              <div className="mt-4 pt-3">
                <MercadoPagoCardPayment
                  plan={plan}
                  onPaymentSuccess={(res) => {
                    onPaymentSuccess?.(res);
                  }}
                />
              </div>
            </details>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
