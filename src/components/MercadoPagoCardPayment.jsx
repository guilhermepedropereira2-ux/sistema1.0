import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUnit } from "@/context/UnitContext";
import { toast } from "sonner";
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Garante o carregamento assíncrono seguro da SDK v2 do Mercado Pago
 */
function ensureMercadoPagoLoaded() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.MercadoPago) {
      return resolve(window.MercadoPago);
    }
    const existing = document.querySelector(
      'script[src="https://sdk.mercadopago.com/js/v2"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(window.MercadoPago));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => resolve(window.MercadoPago);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Componente do Formulário de Cartão (Checkout Transparente - Mercado Pago)
 * Renderiza o Card Payment Brick oficial da SDK v2
 */
export default function MercadoPagoCardPayment({
  plan,
  onPaymentSuccess,
  onPaymentError,
  onSuccess,
  onError,
}) {
  const { user } = useAuth();
  const { refreshUnits, changePlan } = useUnit();

  const handleSuccess = onPaymentSuccess || onSuccess;
  const handleError = onPaymentError || onError;

  // Normaliza o nome do plano garantindo que "Plano" não seja duplicado (ex: "Plano Basic" ao invés de "Plano Plano Basic")
  const rawPlanName = plan?.name?.trim() || "Plano";
  const planName = rawPlanName.toLowerCase().startsWith("plano ")
    ? rawPlanName
    : `Plano ${rawPlanName}`;

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [publicKey, setPublicKey] = useState("");
  const [hasServerAccessToken, setHasServerAccessToken] = useState(false);
  const [brickLoading, setBrickLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("idle"); // idle | processing | approved | rejected | error
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentData, setPaymentData] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const brickControllerRef = useRef(null);
  const containerMountedRef = useRef(false);

  const targetAmount = Number(plan?.amount || plan?.price || 169.9);
  const formattedAmount = targetAmount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // 1. Obter a Chave Pública (Public Key) do Mercado Pago
  useEffect(() => {
    let isCancelled = false;

    async function fetchConfig() {
      try {
        setLoadingConfig(true);
        let key =
          (typeof import.meta !== "undefined" &&
            import.meta?.env?.VITE_MERCADO_PAGO_PUBLIC_KEY) ||
          "";

        // Consulta o backend para obter o estado do Access Token e fallback da Public Key
        try {
          const res = await fetch("/api/checkout/config");
          if (res.ok) {
            const cfg = await res.json();
            if (!key && cfg.publicKey) {
              key = cfg.publicKey;
            }
            if (!isCancelled) {
              setHasServerAccessToken(Boolean(cfg.hasAccessToken));
            }
          }
        } catch (backendErr) {
          console.warn("Aviso ao buscar configuração do backend:", backendErr);
        }

        if (!isCancelled) {
          setPublicKey(key);
        }
      } catch (err) {
        console.warn("Falha ao carregar configuração do Mercado Pago", err);
      } finally {
        if (!isCancelled) setLoadingConfig(false);
      }
    }

    fetchConfig();
    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. Inicializar o Card Payment Brick do Mercado Pago
  useEffect(() => {
    if (loadingConfig) return;
    if (paymentStatus === "approved") return;

    let isDisposed = false;

    async function initBrick() {
      // Se não houver public key, não tentamos inicializar a SDK do Mercado Pago
      if (!publicKey) {
        setBrickLoading(false);
        return;
      }

      try {
        setBrickLoading(true);
        setErrorMessage("");

        await ensureMercadoPagoLoaded();
        if (isDisposed) return;

        if (!window.MercadoPago) {
          throw new Error("SDK do Mercado Pago não encontrada.");
        }

        // Desmonta controlador anterior se existir
        if (window.cardPaymentBrickController) {
          try {
            await window.cardPaymentBrickController.unmount();
          } catch (e) {
            console.warn("Aviso ao desmontar window.cardPaymentBrickController anterior:", e);
          }
          window.cardPaymentBrickController = null;
        }

        if (brickControllerRef.current) {
          try {
            await brickControllerRef.current.unmount();
          } catch (e) {
            console.warn("Aviso ao desmontar Brick anterior:", e);
          }
          brickControllerRef.current = null;
        }

        // Limpa o conteúdo interno do contentor
        const container = document.getElementById("cardPaymentBrick_container");
        if (container) {
          container.innerHTML = "";
        }

        // Inicializa SDK com a Public Key usando mp.bricks()
        const mp = new window.MercadoPago(publicKey, {
          locale: "pt-BR",
        });
        const bricksBuilder = mp.bricks();

        // Configuração do Card Payment Brick
        const settings = {
          initialization: {
            amount: targetAmount,
            payer: {
              email: user?.email || "",
            },
          },
          customization: {
            visual: {
              style: {
                theme: "dark",
                customVariables: {
                  baseColor: "#D4AF37",
                },
              },
            },
            paymentMethods: {
              maxInstallments: 12,
            },
          },
          callbacks: {
            onReady: () => {
              if (!isDisposed) {
                setBrickLoading(false);
              }
              return Promise.resolve();
            },
            onSubmit: async (cardFormData) => {
              if (!isDisposed) {
                setPaymentStatus("processing");
                setErrorMessage("");
              }

              try {
                const token =
                  localStorage.getItem("token") ||
                  sessionStorage.getItem("token");

                // Envia via fetch/POST para a nossa rota de backend os dados recolhidos
                const response = await fetch("/api/checkout/process_payment", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({
                    ...cardFormData,
                    plan_id: plan.id,
                    plan_name: planName,
                    description: `Assinatura KortePro - ${planName}`,
                    payer: {
                      ...cardFormData?.payer,
                      email: cardFormData?.payer?.email || user?.email,
                    },
                  }),
                });

                const result = await response.json();

                if (
                  !response.ok ||
                  !result.success ||
                  (result.status !== "approved" && result.status !== "in_process")
                ) {
                  const msg =
                    result.message ||
                    "Pagamento não autorizado pela operadora do cartão.";
                  if (!isDisposed) {
                    setPaymentStatus("rejected");
                    setErrorMessage(msg);
                  }
                  toast.error("Falha no pagamento", { description: msg });
                  handleError?.(new Error(msg));
                  return Promise.reject(new Error(msg));
                }

                if (!isDisposed) {
                  setPaymentStatus("approved");
                  setPaymentData(result);
                }
                toast.success(
                  `Pagamento Aprovado! ${planName} ativado com sucesso.`
                );
                refreshUnits?.();
                handleSuccess?.(result);
                return Promise.resolve(result);
              } catch (error) {
                const msg =
                  error?.message ||
                  "Falha de conexão com o servidor de pagamentos.";
                if (!isDisposed) {
                  setPaymentStatus("error");
                  setErrorMessage(msg);
                }
                toast.error("Erro ao processar", { description: msg });
                handleError?.(error);
                return Promise.reject(error);
              }
            },
            onError: (error) => {
              console.error("Erro no Card Payment Brick:", error);
              if (!isDisposed) {
                setBrickLoading(false);
                setErrorMessage(
                  "Não foi possível renderizar o formulário do Mercado Pago. Verifique a chave de teste."
                );
              }
              handleError?.(error);
              return Promise.resolve();
            },
          },
        };

        // Renderiza o Payment Brick ('cardPayment') no contentor
        const controller = await bricksBuilder.create(
          "cardPayment",
          "cardPaymentBrick_container",
          settings
        );

        if (!isDisposed) {
          brickControllerRef.current = controller;
          window.cardPaymentBrickController = controller;
        } else {
          controller.unmount().catch(() => {});
        }
      } catch (err) {
        console.error("Falha ao inicializar Payment Brick:", err);
        if (!isDisposed) {
          setBrickLoading(false);
          setErrorMessage(
            err.message || "Erro ao carregar o formulário do Mercado Pago."
          );
        }
      }
    }

    initBrick();

    return () => {
      isDisposed = true;
      if (window.cardPaymentBrickController) {
        try {
          window.cardPaymentBrickController.unmount().catch(() => {});
        } catch (e) {}
        window.cardPaymentBrickController = null;
      }
      if (brickControllerRef.current) {
        try {
          brickControllerRef.current.unmount().catch(() => {});
        } catch (e) {}
        brickControllerRef.current = null;
      }
    };
  }, [publicKey, targetAmount, plan.id, plan.name, user?.email, loadingConfig]);

  // Simulação de Teste (Fallback para desenvolvedores sem chave de produção no ambiente local)
  const handleSimulatePayment = async () => {
    try {
      setSimulating(true);
      setErrorMessage("");
      setPaymentStatus("processing");

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      const res = await fetch("/api/checkout/process_payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          token: "sim_test_token_" + Date.now(),
          payment_method_id: "master",
          transaction_amount: targetAmount,
          installments: 1,
          is_simulation: true,
          plan_id: plan.id,
          plan_name: plan.name,
          payer: {
            email: user?.email || "admin@barbearia.com",
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentStatus("approved");
        setPaymentData(data);
        await changePlan?.(plan.id);
        toast.success(
          `Pagamento Aprovado! ${planName} ativado com sucesso.`
        );
        refreshUnits?.();
        onPaymentSuccess?.(data);
      } else {
        setPaymentStatus("rejected");
        setErrorMessage(data.message || "Erro ao simular pagamento.");
      }
    } catch (err) {
      setPaymentStatus("error");
      setErrorMessage(err.message || "Falha na simulação.");
    } finally {
      setSimulating(false);
    }
  };

  const handleResetForm = () => {
    setPaymentStatus("idle");
    setErrorMessage("");
    setPaymentData(null);
  };

  return (
    <div className="w-full space-y-4">
      {/* Resumo do Plano e Valor a ser Cobrado */}
      <div className="flex items-center justify-between p-3.5 rounded-[4px] bg-[#0A0D14] border border-[#D4AF37]/30 text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-[#D4AF37]">
              {planName}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Mensalidade
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Cobrança recorrente • Cancele quando quiser
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg sm:text-xl font-bold font-mono text-[#D4AF37]">
            {formattedAmount}
          </div>
          <span className="text-[10px] text-slate-400">/mês</span>
        </div>
      </div>

      {/* Estado: Pagamento Aprovado com Sucesso */}
      {paymentStatus === "approved" ? (
        <div className="p-6 bg-[#0A140F] border border-emerald-500/40 rounded-[6px] text-center space-y-4 animate-in fade-in duration-300">
          <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white font-display">
              Pagamento Aprovado com Sucesso!
            </h4>
            <p className="text-xs text-emerald-200 mt-1 max-w-md mx-auto">
              Sua assinatura do <b>{planName}</b> foi ativada instantaneamente.
              Todos os recursos exclusivos e limites já foram liberados no seu
              painel.
            </p>
          </div>

          {paymentData?.id && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-black/40 border border-emerald-500/30 text-[11px] font-mono text-emerald-300">
              <span>ID Transação Mercado Pago:</span>
              <span className="font-bold">{paymentData.id}</span>
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={() => window.location.reload()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-6 rounded-[4px] cursor-pointer"
            >
              Acessar Painel Agora
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Mensagem de Erro Caso Ocorra */}
          {errorMessage && (
            <div className="p-3.5 rounded-[4px] bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Não foi possível aprovar:</span>
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleResetForm}
                className="text-[11px] underline text-rose-300 hover:text-white shrink-0 cursor-pointer"
              >
                Tentar outro cartão
              </button>
            </div>
          )}

          {/* Loader de Inicialização do Brick */}
          {brickLoading && publicKey && (
            <div className="p-8 rounded-[4px] bg-[#0A0D14]/80 border border-white/10 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-7 w-7 text-[#D4AF37] animate-spin" />
              <p className="text-xs text-slate-300 font-medium">
                Carregando formulário seguro do Mercado Pago...
              </p>
            </div>
          )}

          {/* CONTENTOR OFICIAL DO FORMULÁRIO DO CARTÃO MERCADO PAGO */}
          <div
            id="cardPaymentBrick_container"
            className={`w-full transition-opacity duration-200 ${
              brickLoading ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
            }`}
          />

          {/* Painel de Apoio / Modo Sandbox quando não houver Public Key configurada */}
          {!publicKey && (
            <div className="p-5 rounded-[6px] bg-[#0C101A] border border-[#D4AF37]/40 text-left space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-[4px] bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                    Checkout Transparente - Mercado Pago
                  </h5>
                  <span className="text-[10px] text-slate-400">
                    Integração com SDK v2 e Card Payment Brick
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Para carregar o formulário real do cartão com tokenização
                bancária, declare suas chaves do Mercado Pago nas variáveis de
                ambiente:
              </p>

              <div className="p-2.5 rounded bg-black/60 border border-white/10 font-mono text-[11px] text-amber-200/90 space-y-1">
                <div>MERCADO_PAGO_PUBLIC_KEY=APP_USR-...</div>
                <div>MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...</div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <Button
                  onClick={handleSimulatePayment}
                  disabled={simulating || paymentStatus === "processing"}
                  className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs h-9 px-4 rounded-[4px] cursor-pointer gap-2"
                >
                  {simulating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Processando no Backend...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Testar Ativação no Modo Sandbox</span>
                    </>
                  )}
                </Button>
                <span className="text-[10px] text-slate-400">
                  Simula o retorno da API do Mercado Pago
                </span>
              </div>
            </div>
          )}

          {/* Selos de Segurança e Criptografia */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>Ambiente criptografado 256-bit SSL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Processado com segurança pelo Mercado Pago</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
