import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Copy,
  QrCode,
  ShieldCheck,
  Zap,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  CreditCard,
  Receipt,
  ExternalLink,
  Lock,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { api } from "@/lib/api";
import { useUnit } from "@/context/UnitContext";
import { useAuth } from "@/context/AuthContext";

export default function AsaasPaymentModal({
  open,
  onOpenChange,
  planId = "pro",
  planName = "Pro",
  price = 169.9,
  email = "",
  cycle = "mensal",
  organizationId = "",
  onSuccess,
}) {
  const { user } = useAuth();
  const { refreshUnits } = useUnit();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  const [copiedLink, setCopiedLink] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const pollingRef = useRef(null);

  // Normaliza o nome do plano
  const cleanPlanName =
    planName ||
    (planId === "starter" || planId === "basic"
      ? "Basic"
      : planId === "premium"
      ? "Premium"
      : "Pro");

  // Cria a cobrança com fatura/link de pagamento oficial no Asaas ao abrir o modal
  useEffect(() => {
    let isMounted = true;

    if (open) {
      setLoading(true);
      setError(null);
      setInvoiceData(null);
      setPaymentStatus("PENDING");

      api
        .post("/asaas/invoice/create", {
          planId,
          name: user?.name,
          email: email || user?.email,
          cycle,
          organizationId: organizationId || user?.barbershop_id || "org_vintage",
          billingType: "UNDEFINED", // Habilita Pix, Cartão e Boleto na fatura Asaas
        })
        .then((res) => {
          if (!isMounted) return;
          setInvoiceData(res);
          setLoading(false);
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("[Asaas Invoice Error]", err);
          setError("Não foi possível gerar a fatura no Asaas. Tente novamente.");
          setLoading(false);
        });
    }

    return () => {
      isMounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [open, planId, cycle, organizationId, user, email]);

  // Polling em tempo real do status do pagamento
  useEffect(() => {
    if (
      !open ||
      !invoiceData?.paymentId ||
      paymentStatus === "RECEIVED" ||
      paymentStatus === "CONFIRMED"
    ) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/asaas/invoice/status/${invoiceData.paymentId}`);
        if (res.isPaid || res.status === "RECEIVED" || res.status === "CONFIRMED") {
          setPaymentStatus("RECEIVED");
          clearInterval(pollingRef.current);
          toast.success("Pagamento confirmado com sucesso no Asaas!", {
            description: "Sua assinatura foi ativada automaticamente no sistema.",
          });
          if (refreshUnits) refreshUnits();
          if (onSuccess) onSuccess(res);
          window.dispatchEvent(new CustomEvent("refresh-subscription"));
        }
      } catch (err) {
        // Ignora erros temporários de conexão durante polling
      }
    }, 2800);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [open, invoiceData, paymentStatus, refreshUnits, onSuccess]);

  const handleCopyLink = () => {
    if (!invoiceData?.invoiceUrl) return;
    navigator.clipboard.writeText(invoiceData.invoiceUrl);
    setCopiedLink(true);
    toast.success("Link da fatura Asaas copiado com sucesso!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSimulatePayment = async () => {
    if (!invoiceData?.paymentId) return;
    setSimulating(true);
    try {
      const res = await api.post(`/asaas/invoice/simulate/${invoiceData.paymentId}`);
      setPaymentStatus("RECEIVED");
      toast.success(res.message || "Pagamento confirmado com sucesso!");
      if (refreshUnits) refreshUnits();
      if (onSuccess) onSuccess(res);
      window.dispatchEvent(new CustomEvent("refresh-subscription"));
    } catch (err) {
      toast.error("Erro ao simular pagamento");
    } finally {
      setSimulating(false);
    }
  };

  const isPaid = paymentStatus === "RECEIVED" || paymentStatus === "CONFIRMED";
  const displayPrice = invoiceData?.value
    ? formatCurrency(invoiceData.value)
    : formatCurrency(price);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg bg-[#0D1019] border border-[#D4AF37]/40 text-white p-0 rounded-[8px] shadow-2xl overflow-hidden">
        {/* Header Oficial do Checkout Asaas */}
        <div className="bg-gradient-to-r from-[#151827] via-[#181C2E] to-[#12141F] border-b border-[#D4AF37]/25 p-5 text-left relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 h-36 w-36 rounded-full bg-[#D4AF37]/15 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="h-10 w-10 rounded-[6px] bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Checkout Seguro Asaas
                </DialogTitle>
                <Badge className="bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5">
                  Fatura Hospedada
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Escolha livremente entre Pix, Cartão de Crédito ou Boleto na página oficial do Asaas
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Card Resumo do Plano */}
          <div className="p-3.5 rounded-[6px] bg-[#141724] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                Plano Selecionado
              </span>
              <div className="text-base font-extrabold text-white flex items-center gap-2 mt-0.5">
                <span>Plano {cleanPlanName}</span>
                <span className="text-xs font-semibold text-slate-400 font-normal">
                  ({cycle === "anual" ? "Anual • 2 Meses Grátis" : cycle === "trimestral" ? "Trimestral" : "Mensal"})
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-[#D4AF37]">
                {displayPrice}
              </span>
              <span className="block text-[10px] text-emerald-400 font-semibold">
                ativação automática
              </span>
            </div>
          </div>

          {/* Estado de Carregamento */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="h-8 w-8 text-[#D4AF37] animate-spin" />
              <p className="text-xs font-semibold text-slate-300">
                Gerando link de pagamento oficial no Asaas...
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Preparando fatura segura com opções de Pix, Cartão de Crédito e Boleto Bancário.
              </p>
            </div>
          )}

          {/* Estado de Erro */}
          {!loading && error && (
            <div className="p-4 rounded-[6px] bg-red-500/10 border border-red-500/30 text-center space-y-2">
              <AlertCircle className="h-6 w-6 text-red-400 mx-auto" />
              <p className="text-xs text-red-300 font-medium">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  api
                    .post("/asaas/invoice/create", {
                      planId,
                      name: user?.name,
                      email: user?.email,
                      cycle,
                      billingType: "UNDEFINED",
                    })
                    .then((res) => {
                      setInvoiceData(res);
                      setLoading(false);
                    })
                    .catch(() => {
                      setError("Falha ao gerar cobrança. Tente novamente.");
                      setLoading(false);
                    });
                }}
                className="text-xs bg-[#171926] border-white/10 text-white mt-1"
              >
                Tentar Novamente
              </Button>
            </div>
          )}

          {/* Estado de Sucesso (Pago / Confirmado) */}
          {!loading && isPaid && (
            <div className="py-6 px-4 rounded-[8px] bg-[#0F1D19] border border-emerald-500/50 text-center space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">
                  Pagamento Confirmado pelo Asaas!
                </h4>
                <p className="text-xs text-emerald-300">
                  A licença do <strong>Plano {cleanPlanName}</strong> foi ativada com sucesso.
                </p>
              </div>
              <p className="text-[11px] text-slate-400">
                O painel completo do Kupola já está totalmente desbloqueado para sua equipe.
              </p>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  window.location.reload();
                }}
                className="w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-[4px] mt-2 cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                <span>Acessar Meu Painel Completo</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Checkout Oficial e Unificado Asaas */}
          {!loading && !error && !isPaid && invoiceData && (
            <div className="space-y-4">
              <div className="p-4 rounded-[8px] bg-[#111420] border border-[#D4AF37]/30 space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-xs font-bold text-white block">
                    Fatura Oficial Hospedada no Asaas
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Você pode pagar diretamente na página oficial e protegida do Asaas com a forma que preferir:
                  </p>
                </div>

                {/* Badges dos Meios de Pagamento Disponíveis */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-[6px] bg-[#161A2B] border border-white/5 space-y-1">
                    <QrCode className="h-4 w-4 text-emerald-400 mx-auto" />
                    <span className="text-[10px] font-bold text-white block">Pix</span>
                    <span className="text-[9px] text-slate-400 block leading-tight">Instantâneo</span>
                  </div>

                  <div className="p-2.5 rounded-[6px] bg-[#161A2B] border border-white/5 space-y-1">
                    <CreditCard className="h-4 w-4 text-sky-400 mx-auto" />
                    <span className="text-[10px] font-bold text-white block">Cartão</span>
                    <span className="text-[9px] text-slate-400 block leading-tight">Até 12x</span>
                  </div>

                  <div className="p-2.5 rounded-[6px] bg-[#161A2B] border border-white/5 space-y-1">
                    <Receipt className="h-4 w-4 text-amber-400 mx-auto" />
                    <span className="text-[10px] font-bold text-white block">Boleto</span>
                    <span className="text-[9px] text-slate-400 block leading-tight">Bancário</span>
                  </div>
                </div>

                {/* Botão de Ação Primário Exclusivo: Abrir Link Oficial de Pagamento Asaas */}
                <div className="pt-2">
                  <a
                    href={invoiceData.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-11 px-4 rounded-[4px] bg-gradient-to-r from-[#E6CA65] to-[#D4AF37] hover:from-[#DFBE58] hover:to-[#C59F2E] text-[#0A0D14] font-black uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Ir para o Pagamento Seguro no Asaas</span>
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </div>

                {/* Copiar Link da Fatura */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={invoiceData.invoiceUrl || ""}
                    className="flex-1 bg-[#090B12] border border-white/10 rounded-[4px] px-3 py-1.5 text-[11px] font-mono text-slate-300 select-all truncate outline-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="h-8 px-2.5 text-xs border-white/10 hover:bg-white/10 text-slate-300 gap-1 shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Status em Tempo Real */}
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-300 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span>Aguardando confirmação bancária em tempo real...</span>
              </div>
            </div>
          )}

          {/* Informações Automáticas e Simulação */}
          {!loading && !error && !isPaid && invoiceData && (
            <div className="space-y-3">
              <div className="p-3 rounded-[6px] bg-[#121522] border border-white/5 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2 text-slate-300">
                  <Zap className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                  <span>
                    <strong>Ativação 100% Automática:</strong> assim que você pagar no Asaas, sua conta é ativada na hora.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Ambiente protegido com criptografia de ponta e liquidação oficial.</span>
                </div>
              </div>

              {/* Botão de Homologação / Simulação */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-white/5">
                <span>
                  ID Fatura: <code className="text-slate-400">{invoiceData.paymentId}</code>
                </span>
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={simulating}
                  className="text-xs text-[#D4AF37] hover:underline cursor-pointer font-semibold"
                  title="Simula o recebimento do webhook do Asaas para teste imediato"
                >
                  {simulating ? "Processando..." : "Simular Confirmação Asaas"}
                </button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="bg-[#090B12] border-t border-white/10 p-3 px-5 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#D4AF37]" />
            Gateway Oficial Asaas • Pagamento Seguro
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-400 hover:text-white"
          >
            {isPaid ? "Concluir" : "Fechar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
