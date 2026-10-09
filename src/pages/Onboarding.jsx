import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Building2,
  User,
  Users,
  Briefcase,
  Check,
  ArrowRight,
  ArrowLeft,
  Scissors,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Store,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function Onboarding() {
  const { stepName } = useParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();

  // Mapping url steps to index 1..4
  const getInitialStep = () => {
    if (stepName === "perfil") return 2;
    if (stepName === "operacao") return 3;
    if (stepName === "plano") return 4;
    return 1; // default "barbearia"
  };

  const [step, setStep] = useState(getInitialStep);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Etapa 1 - Barbearia
    shopName: "",
    shopPhone: "",
    city: "",
    state: "",
    address: "",
    // Etapa 2 - Perfil
    ownerName: "",
    ownerPhone: "",
    email: "",
    password: "",
    // Etapa 3 - Operação
    operationType: "equipe", // 'solo' | 'equipe' | 'multiunidade'
    // Etapa 4 - Plano
    selectedPlan: "pro", // 'starter' | 'pro' | 'premium'
  });

  // Carregar estado salvo do backend (apenas se o usuário já tiver preenchido algo nesta sessão)
  useEffect(() => {
    api.get("/onboarding/state")
      .then((res) => {
        if (res.completed) {
          // Se já concluiu, redireciona para Dashboard
          navigate("/", { replace: true });
          return;
        }

        if (res.data) {
          const d = res.data;
          setFormData((prev) => ({
            ...prev,
            shopName: d.barbershop?.name || "",
            shopPhone: d.barbershop?.phone || "",
            city: d.barbershop?.city || "",
            state: d.barbershop?.state || "",
            address: d.barbershop?.address || "",
            ownerName: d.profile?.name || "",
            ownerPhone: d.profile?.phone || "",
            email: d.profile?.email || "",
            operationType: d.operation?.type || "equipe",
            selectedPlan: d.plan?.id || "pro",
          }));
        }

        // Se URL não especificou etapa, vai para a salva
        if (!stepName && res.currentStep) {
          setStep(res.currentStep);
        }
      })
      .catch((err) => {
        console.warn("Aviso ao carregar estado do onboarding:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Sincronizar rota com etapa
  useEffect(() => {
    if (stepName === "barbearia") setStep(1);
    else if (stepName === "perfil") setStep(2);
    else if (stepName === "operacao") setStep(3);
    else if (stepName === "plano") setStep(4);
  }, [stepName]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const goToStep = async (newStep) => {
    // Validações por etapa
    if (step === 1 && newStep > 1) {
      if (!formData.shopName.trim()) {
        toast.error("Por favor, informe o nome da barbearia.");
        return;
      }
      if (!formData.city.trim()) {
        toast.error("Por favor, informe a cidade da sua barbearia.");
        return;
      }

      // Persistir Etapa 1 no backend
      try {
        await api.post("/onboarding/step", {
          step: 1,
          data: {
            barbershop: {
              name: formData.shopName,
              phone: formData.shopPhone,
              city: formData.city,
              state: formData.state,
              address: formData.address,
            },
          },
        });
      } catch (e) {
        console.warn("Erro ao salvar etapa 1:", e);
      }
    }

    if (step === 2 && newStep > 2) {
      if (!formData.ownerName.trim()) {
        toast.error("Por favor, informe seu nome completo.");
        return;
      }
      if (!formData.email.trim() || !formData.email.includes("@")) {
        toast.error("Por favor, informe um e-mail válido.");
        return;
      }

      // Persistir Etapa 2 no backend
      try {
        await api.post("/onboarding/step", {
          step: 2,
          data: {
            profile: {
              name: formData.ownerName,
              phone: formData.ownerPhone,
              email: formData.email,
              password: formData.password || "dono123",
            },
          },
        });
      } catch (e) {
        console.warn("Erro ao salvar etapa 2:", e);
      }
    }

    if (step === 3 && newStep > 3) {
      // Persistir Etapa 3 no backend
      try {
        await api.post("/onboarding/step", {
          step: 3,
          data: {
            operation: {
              type: formData.operationType,
            },
          },
        });
      } catch (e) {
        console.warn("Erro ao salvar etapa 3:", e);
      }
    }

    setStep(newStep);
    const stepUrls = ["", "barbearia", "perfil", "operacao", "plano"];
    navigate(`/onboarding/${stepUrls[newStep]}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinishOnboarding = async () => {
    setSaving(true);
    try {
      const planMap = {
        starter: { id: "starter", name: "BASIC", price: 39.9 },
        pro: { id: "pro", name: "PRO", price: 79.9 },
        premium: { id: "premium", name: "PREMIUM", price: 129.9 },
      };

      const res = await api.post("/onboarding/complete", {
        barbershop: {
          name: formData.shopName || "Minha Barbearia",
          phone: formData.shopPhone,
          city: formData.city || "São Paulo",
          state: formData.state || "SP",
          address: formData.address,
        },
        profile: {
          name: formData.ownerName || "Administrador",
          phone: formData.ownerPhone,
          email: formData.email || "admin@kupola.com",
          password: formData.password || "dono123",
        },
        operation: {
          type: formData.operationType,
        },
        plan: planMap[formData.selectedPlan] || planMap.pro,
      });

      if (res.token && res.user) {
        setSession(res.token, res.user);
      }

      toast.success("Sua barbearia foi configurada com sucesso! Teste grátis de 7 dias ativado.");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Erro ao concluir configuração.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05070B] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E5C365] flex items-center justify-center text-[#080B10] animate-pulse">
            <Scissors className="w-5 h-5" />
          </div>
          <p className="text-xs text-white/50 animate-pulse">Preparando ambiente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 bg-[#05070B] overflow-x-hidden select-none">
      {/* Background Image Oficial com Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-40"
        style={{ backgroundImage: "url('/hero-barbershop-v2.jpg')" }}
      />
      <div className="absolute inset-0 bg-[#05070B]/80 backdrop-brightness-90 pointer-events-none" />

      {/* HEADER SUPERIOR COM LOGO E CANCELAR/VOLTAR */}
      <header className="relative z-10 w-full max-w-2xl flex items-center justify-between mb-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[#0A0D14] border border-[#E5C365]/30 flex items-center justify-center text-[#E5C365]">
            <Scissors className="w-4 h-4" />
          </div>
          <span className="font-['Outfit'] font-black tracking-[0.2em] text-lg bg-gradient-to-r from-[#FFFDF0] via-[#F3CE72] to-[#D4AF37] bg-clip-text text-transparent">
            KUPOLA
          </span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-white/60">
          <span className="text-[#E5C365] font-bold">Etapa {step}</span> de 4
        </div>
      </header>

      {/* STEPPER DE PROGRESSO VISUAL */}
      <nav aria-label="Progresso do onboarding" className="relative z-10 w-full max-w-2xl mb-6">
        <div className="grid grid-cols-4 gap-2">
          {[
            { num: 1, label: "Barbearia", icon: Building2 },
            { num: 2, label: "Perfil", icon: User },
            { num: 3, label: "Operação", icon: Briefcase },
            { num: 4, label: "Plano", icon: Sparkles },
          ].map((item) => {
            const isCompleted = step > item.num;
            const isCurrent = step === item.num;
            return (
              <div
                key={item.num}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                  isCurrent
                    ? "bg-[#0A0E17]/90 border-[#E5C365]/50 shadow-[0_0_15px_rgba(229,195,101,0.15)]"
                    : isCompleted
                    ? "bg-white/[0.04] border-white/15 text-white/70"
                    : "bg-black/20 border-white/5 text-white/30"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCompleted
                        ? "bg-[#20C997] text-black"
                        : isCurrent
                        ? "bg-[#E5C365] text-black"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : item.num}
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-semibold hidden sm:inline ${
                      isCurrent ? "text-white" : isCompleted ? "text-white/80" : "text-white/40"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* CONTAINER PRINCIPAL DO FORMULÁRIO */}
      <main className="relative z-10 w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-[#090C12]/95 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] p-5 sm:p-8 lg:p-9 backdrop-blur-xl">
        
        {/* ============================================================ */}
        {/* ETAPA 1 — SUA BARBEARIA */}
        {/* ============================================================ */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#E5C365] uppercase">
                ETAPA 1 DE 4
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Sua Barbearia
              </h2>
              <p className="text-xs sm:text-sm text-white/60 mt-1">
                Informe os dados do seu estabelecimento para personalizarmos seu sistema e sua página de agendamentos.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Nome da Barbearia *
                </label>
                <input
                  type="text"
                  placeholder="Nome da sua barbearia"
                  value={formData.shopName}
                  onChange={(e) => updateField("shopName", e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#E5C365] focus:ring-1 focus:ring-[#E5C365] transition"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1.5">
                    Telefone / WhatsApp Comercial
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={formData.shopPhone}
                    onChange={(e) => updateField("shopPhone", e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#E5C365] focus:ring-1 focus:ring-[#E5C365] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1.5">
                    Estado (UF) *
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/15 text-white text-sm focus:outline-none focus:border-[#E5C365] focus:ring-1 focus:ring-[#E5C365] transition cursor-pointer"
                  >
                    <option value="" className="bg-[#090C12] text-white/50">
                      [ Selecionar estado ]
                    </option>
                    {BRAZILIAN_STATES.map((uf) => (
                      <option key={uf} value={uf} className="bg-[#090C12] text-white">
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Cidade *
                </label>
                <input
                  type="text"
                  placeholder="Digite sua cidade"
                  value={formData.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#E5C365] focus:ring-1 focus:ring-[#E5C365] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Endereço completo (Rua, Número, Bairro)
                </label>
                <input
                  type="text"
                  placeholder="Rua, número e bairro"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#E5C365] focus:ring-1 focus:ring-[#E5C365] transition"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/10">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-xs font-medium text-white/60 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para Início
              </button>

              <button
                type="button"
                onClick={() => goToStep(2)}
                data-testid="onboarding-step1-continue"
                className="py-3 px-6 rounded-xl font-bold text-[#080B10] bg-gradient-to-r from-[#F3CE72] via-[#E5C365] to-[#D4AF37] hover:brightness-110 active:scale-[0.99] transition cursor-pointer text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2"
              >
                <span>CONTINUAR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ETAPA 2 — SEU PERFIL */}
        {/* ============================================================ */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#E5C365] uppercase">
                ETAPA 2 DE 4
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Seu Perfil de Administrador
              </h2>
              <p className="text-xs sm:text-sm text-white/60 mt-1">
                Crie seu perfil com acesso de Dono para gerenciar equipe, finanças e configurações.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  placeholder="Digite seu nome completo"
                  value={formData.ownerName}
                  onChange={(e) => updateField("ownerName", e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#E5C365] focus:ring-1 focus:ring-[#E5C365] transition"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Seu Telefone / WhatsApp Pessoal
                </label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={formData.ownerPhone}
                  onChange={(e) => updateField("ownerPhone", e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#E5C365] focus:ring-1 focus:ring-[#E5C365] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  E-mail de Acesso *
                </label>
                <input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#E5C365] focus:ring-1 focus:ring-[#E5C365] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite uma senha segura"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className="w-full h-11 px-3.5 pr-10 rounded-xl bg-black/40 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#E5C365] focus:ring-1 focus:ring-[#E5C365] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-white/40 mt-1 block">
                  Você poderá utilizar este e-mail e senha para fazer login futuramente.
                </span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/10">
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="text-xs font-medium text-white/60 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>

              <button
                type="button"
                onClick={() => goToStep(3)}
                data-testid="onboarding-step2-continue"
                className="py-3 px-6 rounded-xl font-bold text-[#080B10] bg-gradient-to-r from-[#F3CE72] via-[#E5C365] to-[#D4AF37] hover:brightness-110 active:scale-[0.99] transition cursor-pointer text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2"
              >
                <span>CONTINUAR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ETAPA 3 — SUA OPERAÇÃO */}
        {/* ============================================================ */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#E5C365] uppercase">
                ETAPA 3 DE 4
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Sua Operação
              </h2>
              <p className="text-xs sm:text-sm text-white/60 mt-1">
                Como funciona a estrutura de atendimento da sua barbearia hoje?
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: "solo",
                  title: "SOLO / AUTÔNOMO",
                  desc: "Atendo sozinho no meu espaço ou studio. Quero agilidade total para marcar clientes, controlar caixa e ver faturamento.",
                  icon: Scissors,
                },
                {
                  id: "equipe",
                  title: "EQUIPE",
                  desc: "Tenho barbeiros parceiros ou funcionários. Preciso de controle de comissões por serviço/produto, fechamento de caixa e painel para cada barbeiro.",
                  icon: Users,
                  recommended: true,
                },
                {
                  id: "multiunidade",
                  title: "MULTIUNIDADE",
                  desc: "Gerencio 2 ou mais unidades ou franquias. Quero alternar filiais, consolidar relatórios e gerenciar administradores por unidade.",
                  icon: Layers,
                },
              ].map((op) => {
                const Icon = op.icon;
                const isSelected = formData.operationType === op.id;
                return (
                  <div
                    key={op.id}
                    onClick={() => updateField("operationType", op.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-4 ${
                      isSelected
                        ? "bg-[#0E1524] border-[#E5C365] shadow-[0_0_20px_rgba(229,195,101,0.15)] ring-1 ring-[#E5C365]/40"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-[#E5C365] text-[#080B10]"
                          : "bg-black/40 border border-white/10 text-[#E5C365]"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">{op.title}</span>
                        {op.recommended && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#E5C365]/20 text-[#E5C365] border border-[#E5C365]/40 uppercase tracking-wider">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">{op.desc}</p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-[#E5C365] border-[#E5C365] text-black"
                          : "border-white/30 bg-transparent"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/10">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="text-xs font-medium text-white/60 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>

              <button
                type="button"
                onClick={() => goToStep(4)}
                data-testid="onboarding-step3-continue"
                className="py-3 px-6 rounded-xl font-bold text-[#080B10] bg-gradient-to-r from-[#F3CE72] via-[#E5C365] to-[#D4AF37] hover:brightness-110 active:scale-[0.99] transition cursor-pointer text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2"
              >
                <span>CONTINUAR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ETAPA 4 — ESCOLHA DO PLANO */}
        {/* ============================================================ */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#E5C365] uppercase">
                ETAPA 4 DE 4
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Escolha o Plano Ideal
              </h2>
              <p className="text-xs sm:text-sm text-white/60 mt-1">
                Comece agora com <strong className="text-[#E5C365]">7 dias de teste grátis</strong> com todas as funcionalidades liberadas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: "starter",
                  name: "BASIC",
                  price: "R$ 39,90/mês",
                  desc: "Para barbeiros autônomos que buscam agilidade e controle.",
                  features: [
                    "1 Barbeiro ativo",
                    "1 Unidade cadastrada",
                    "Agenda inteligente de horários",
                    "Controle financeiro essencial",
                  ],
                },
                {
                  id: "pro",
                  name: "PRO",
                  price: "R$ 79,90/mês",
                  badge: "MAIS ESCOLHIDO",
                  desc: "Ideal para barbearias em expansão com equipe de barbeiros.",
                  features: [
                    "Até 4 Barbeiros cadastrados",
                    "1 Unidade cadastrada",
                    "Comissões automáticas",
                    "Fechamento de caixa & DRE",
                    "Painel exclusivo do Barbeiro",
                  ],
                },
                {
                  id: "premium",
                  name: "PREMIUM",
                  price: "R$ 129,90/mês",
                  desc: "Para grandes barbearias, redes e franquias com alto volume.",
                  features: [
                    "Até 10 Barbeiros por unidade",
                    "Gestão Multi-Unidades (Rede)",
                    "Planos & Assinaturas de Clientes",
                    "Relatórios gerenciais avançados",
                    "Suporte prioritário VIP",
                  ],
                },
              ].map((p) => {
                const isSelected = formData.selectedPlan === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => updateField("selectedPlan", p.id)}
                    className={`relative p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-[#0E1524] border-[#E5C365] shadow-[0_0_20px_rgba(229,195,101,0.2)] ring-1 ring-[#E5C365]/50"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    {p.badge && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest uppercase bg-gradient-to-r from-[#F3CE72] to-[#D4AF37] text-black px-2.5 py-0.5 rounded-full shadow-md whitespace-nowrap">
                        {p.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1 mt-1">
                        <span className="font-extrabold text-sm text-white tracking-wider">
                          {p.name}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "bg-[#E5C365] border-[#E5C365] text-black"
                              : "border-white/30"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="text-base sm:text-lg font-black text-[#E5C365] mb-2">
                        {p.price}
                      </div>

                      <p className="text-[11px] text-white/60 mb-3 leading-tight">{p.desc}</p>

                      <div className="space-y-1.5 border-t border-white/10 pt-3">
                        {p.features.map((f, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[10.5px] text-white/80 leading-tight">
                            <CheckCircle2 className="w-3 h-3 text-[#20C997] shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-white/10">
                      <div
                        className={`w-full py-1.5 rounded-lg text-center text-[10.5px] font-bold uppercase tracking-wider transition ${
                          isSelected
                            ? "bg-[#E5C365] text-black"
                            : "bg-white/5 text-white/60 group-hover:text-white"
                        }`}
                      >
                        {isSelected ? "Plano Selecionado" : "Selecionar"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AVISO DO TESTE GRÁTIS */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#20C997] shrink-0" />
              <p className="text-[11.5px] text-white/70">
                <strong className="text-white font-semibold">Sem cobrança imediata:</strong> você terá 7 dias para testar todas as funcionalidades do KUPOLA antes de ativar sua assinatura.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/10">
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="text-xs font-medium text-white/60 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>

              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={saving}
                data-testid="onboarding-finish-btn"
                className="py-3.5 px-6 rounded-xl font-black text-[#080B10] bg-gradient-to-r from-[#F3CE72] via-[#E5C365] to-[#D4AF37] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition cursor-pointer text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-[0_5px_20px_rgba(212,175,55,0.3)]"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>CONFIGURANDO...</span>
                  </>
                ) : (
                  <>
                    <span>CONCLUIR E ACESSAR DASHBOARD</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
