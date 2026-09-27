import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUnit } from "@/context/UnitContext";
import { PLANS } from "@/lib/plans";
import { redirectToCheckoutPro } from "@/lib/checkoutPro";
import MercadoPagoCardPayment from "@/components/MercadoPagoCardPayment";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Crown,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Scissors,
  Zap,
  QrCode,
  FileText,
} from "lucide-react";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan: currentPlan } = useUnit();

  const queryPlan = searchParams.get("plan");
  const initialPlanKey =
    queryPlan && PLANS[queryPlan]
      ? queryPlan
      : currentPlan?.id === "starter"
      ? "pro"
      : "pro";

  const [selectedPlanKey, setSelectedPlanKey] = useState(initialPlanKey);
  const selectedPlan = PLANS[selectedPlanKey] || PLANS.pro;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col justify-between p-4 sm:p-8">
      {/* Header com Navegação */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="KingPro" 
            className="h-10 w-10 rounded-full object-cover border border-[#D4AF37]/40 shadow-md shrink-0" 
          />
          <div>
            <h1 className="text-base font-extrabold font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-500">
              KingPro
            </h1>
            <span className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-wider block">
              Checkout Seguro • Mercado Pago
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-xs border-white/20 hover:bg-white/10 text-slate-300 hover:text-white rounded-[4px] h-8 px-3 gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar</span>
        </Button>
      </header>

      {/* Conteúdo Principal do Checkout */}
      <main className="max-w-4xl mx-auto w-full py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna Esquerda: Resumo do Pedido & Seletor de Plano */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-[6px] bg-[#0E121D] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                  Resumo da Assinatura
                </span>
                <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40 text-[10px] uppercase font-bold">
                  Recorrente
                </Badge>
              </div>

              {/* Seletor rápido de Plano */}
              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-semibold block">
                  Selecione o Plano Desejado:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(PLANS).map(([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedPlanKey(key)}
                      className={`p-2 rounded-[4px] text-center border transition-colors cursor-pointer ${
                        selectedPlanKey === key
                          ? "bg-[#D4AF37]/20 border-[#D4AF37] text-white"
                          : "bg-black/30 border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-bold">{p.shortName}</div>
                      <div className="text-[10px] text-[#D4AF37] mt-0.5">
                        R$ {p.amount?.toFixed(2).replace(".", ",")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detalhes do Plano Escolhido */}
              <div className="p-3.5 rounded-[4px] bg-[#0A0D14] border border-[#D4AF37]/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white font-display">
                    {selectedPlan.name}
                  </h3>
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">
                    R$ {selectedPlan.amount?.toFixed(2).replace(".", ",")}/mês
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {selectedPlan.tagline}
                </p>

                <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300 border-t border-white/10 pt-2.5">
                  {(selectedPlan.highlights || []).map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Informações de Garantia */}
              <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#D4AF37] shrink-0" />
                  <span>Ativação imediata no painel</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Cancele a qualquer momento sem taxas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>Segurança bancária Mercado Pago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Checkout Pro Oficial Mercado Pago */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-[6px] bg-[#0E121D] border border-[#D4AF37]/50 shadow-2xl space-y-5">
              <div className="border-b border-white/10 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                    <Zap className="h-4 w-4 text-[#D4AF37] fill-current" />
                    <span>Mercado Pago Checkout Pro Oficial</span>
                  </div>
                  <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40 text-[10px] uppercase font-bold">
                    Recomendado
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Pague com total segurança utilizando Pix (aprovação imediata), Cartão de Crédito em até 12x, Cartão de Débito Virtual ou Boleto Bancário.
                </p>
              </div>

              {/* Botão Oficial Checkout Pro */}
              <div className="p-5 rounded-[6px] bg-[#0A0D14] border border-[#D4AF37]/40 text-center space-y-4">
                <div className="flex items-center justify-center gap-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1 font-semibold text-emerald-400">
                    <QrCode className="h-4 w-4" /> Pix Instantâneo
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-sky-400">
                    <CreditCard className="h-4 w-4" /> Cartões
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-amber-400">
                    <FileText className="h-4 w-4" /> Boleto
                  </span>
                </div>

                <Button
                  onClick={() => {
                    redirectToCheckoutPro({
                      planId: selectedPlanKey,
                      planName: selectedPlan.name,
                      price: selectedPlan.amount || 169.9,
                      email: user?.email,
                      organizationId: user?.barbershop_id || "org_vintage",
                    });
                  }}
                  className="w-full h-12 bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-black text-sm uppercase rounded-[4px] gap-2 shadow-xl cursor-pointer transition-all active:scale-[0.99]"
                  data-testid="btn-checkout-pro-main"
                >
                  <Zap className="h-4 w-4 fill-current" />
                  <span>Ir para Checkout Pro (Mercado Pago)</span>
                </Button>

                <p className="text-[11px] text-slate-400">
                  Você será direcionado ao ambiente criptografado e seguro do Mercado Pago para escolher sua forma de pagamento favorita.
                </p>
              </div>

              <div className="pt-2">
                <details className="text-xs text-slate-400 group cursor-pointer">
                  <summary className="hover:text-slate-200 transition-colors py-1 flex items-center justify-between">
                    <span>Prefere pagar via cartão direto nesta página? (Checkout Transparente)</span>
                    <span className="text-[10px] text-[#D4AF37]">Clique para expandir</span>
                  </summary>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <MercadoPagoCardPayment
                      plan={selectedPlan}
                      onPaymentSuccess={(data) => {
                        navigate("/checkout/success?collection_status=approved");
                      }}
                    />
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full py-4 border-t border-white/10 text-center text-xs text-slate-500">
        <p>
          KingPro &copy; {new Date().getFullYear()} • Todos os direitos
          reservados. Processamento seguro pelo Mercado Pago.
        </p>
      </footer>
    </div>
  );
}
