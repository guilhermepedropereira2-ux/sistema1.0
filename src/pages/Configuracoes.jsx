import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { isBarber } from "@/lib/roles";
import { useMonth } from "@/context/MonthContext";
import { Loading } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Save, Calendar, Users, Layers,
  CheckCircle2, Link2, Copy, Check, ExternalLink, Globe, Scissors,
  Crown, Building2, Store, MessageCircle, Coins, Percent,
  Calculator, ArrowRight, Tag, CreditCard, HelpCircle, Info, ShieldAlert,
} from "lucide-react";
import { useUnit } from "@/context/UnitContext";
import { calculateCommission } from "@/lib/commission";
import { brl } from "@/lib/format";

export default function Configuracoes() {
  const { user } = useAuth();
  const location = useLocation();
  const isUserBarber = isBarber(user);
  const { refresh } = useMonth();
  const { plan, units, openUpgradeModal, isPremium } = useUnit();
  const { data: settings, loading } = useApi((api) => api.get("/settings"));
  const { data: barbers } = useApi((api) => api.get("/barbers"));
  const [form, setForm] = useState(null);
  const [copiedShop, setCopiedShop] = useState(false);
  const [copiedBarberId, setCopiedBarberId] = useState(null);
  const [savingRules, setSavingRules] = useState(false);

  useEffect(() => { 
    if (settings) {
      setForm({
        ...settings,
        commission_base: settings.commission_base || (settings.commission_on === "original" ? "gross" : "net") || "gross",
        discount_affects_commission: settings.discount_affects_commission !== false,
        operational_mode: settings.operational_mode || "hibrido",
        public_slug: settings.public_slug || "barbearia-vintage",
      }); 
    } 
  }, [settings]);

  useEffect(() => {
    if (location.hash === "#regras-comissao" || location.search.includes("comissao")) {
      const timer = setTimeout(() => {
        const el = document.getElementById("regras-comissao");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.hash, location.search]);
  
  if (loading || !form) return <Loading />;

  const currentSlug = form.public_slug || "barbearia-vintage";
  const shopPublicUrl = `${window.location.origin}/agendar/${currentSlug}`;

  const copyShopLink = () => {
    navigator.clipboard.writeText(shopPublicUrl);
    setCopiedShop(true);
    toast.success("Link da barbearia copiado com sucesso!");
    setTimeout(() => setCopiedShop(false), 2500);
  };

  const copyBarberLink = (barberId, barberName) => {
    const barberUrl = `${window.location.origin}/agendar/${currentSlug}?barber=${barberId}`;
    navigator.clipboard.writeText(barberUrl);
    setCopiedBarberId(barberId);
    toast.success(`Link exclusivo de ${barberName} copiado!`);
    setTimeout(() => setCopiedBarberId(null), 2500);
  };

  const save = async () => {
    if (isUserBarber) {
      toast.error("Barbeiros não possuem permissão para alterar as configurações.");
      return;
    }
    try {
      await api.put("/settings", {
        commission_base: form.commission_base || "gross",
        discount_affects_commission: form.discount_affects_commission !== false,
        commission_on: form.commission_base === "gross" ? "original" : "pago",
        initial_balance: parseFloat(form.initial_balance) || 0,
        operational_mode: form.operational_mode || "hibrido",
        public_slug: form.public_slug || "barbearia-vintage",
      });
      toast.success("Configurações salvas com sucesso"); 
      refresh();
    } catch { 
      toast.error("Erro ao salvar configurações"); 
    }
  };

  const saveCommissionRules = async () => {
    if (isUserBarber) {
      toast.error("Barbeiros não possuem permissão para alterar as regras de comissão.");
      return;
    }
    setSavingRules(true);
    try {
      await api.put("/settings", {
        commission_base: form.commission_base || "gross",
        discount_affects_commission: form.discount_affects_commission !== false,
        commission_on: form.commission_base === "gross" ? "original" : "pago",
      });
      toast.success("Regras de comissão salvas com sucesso!");
      refresh();
    } catch {
      toast.error("Erro ao salvar regras de comissão.");
    } finally {
      setSavingRules(false);
    }
  };

  const isNetBase = form.commission_base === "net";
  const discountsAffectCommission = form.discount_affects_commission !== false;

  // Simulação oficial dinâmica do Exemplo Completo
  const completeSim = calculateCommission({
    gross: 100,
    discount: 10,
    feePercent: 3,
    barber: { commission_percent: 40 },
    settings: {
      commission_base: form.commission_base || "gross",
      discount_affects_commission: form.discount_affects_commission !== false,
    },
  });

  const operationalModes = [
    {
      id: "agendamento",
      title: "Apenas Horário Agendado",
      desc: "Agenda tradicional com marcação prévia de horários e atendimento com hora marcada.",
      badge: "Estúdios & Agendados",
      icon: Calendar,
    },
    {
      id: "fila",
      title: "Apenas Ordem de Chegada",
      desc: "Fila virtual em tempo real (Na Espera, Na Cadeira, Finalizados). Sem horários agendados.",
      badge: "Alta Rotatividade",
      icon: Users,
    },
    {
      id: "hibrido",
      title: "Modo Híbrido (Recomendado)",
      desc: "O melhor dos dois mundos: aceita agendamentos prévios e encaixes rápidos na fila do dia.",
      badge: "Mais Flexível",
      icon: Layers,
    },
  ];

  return (
    <div className="w-full max-w-6xl 2xl:max-w-[1920px] mx-auto space-y-6" data-testid="config-page">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-sm text-muted-foreground">Personalize o link público de agendamentos, dinâmica de atendimento e acompanhe sua assinatura.</p>
      </div>

      {/* Identidade Pública & Link da Barbearia */}
      <Card className="p-6 border border-white/10 bg-[#12141F] rounded-[4px] shadow-none">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[2px] bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/30">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">Link Público da Barbearia</h3>
              <p className="text-xs text-muted-foreground">Compartilhe no Instagram, WhatsApp e Bio para seus clientes agendarem online.</p>
            </div>
          </div>
          <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30 text-xs px-2.5 py-0.5 rounded-[2px] font-bold">
            Página Ativa
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Identificador da Barbearia (Slug / URL Amigável)
            </Label>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono select-none hidden sm:inline">
                  /agendar/
                </span>
                <Input
                  className="rounded-[4px] sm:pl-20 font-mono text-sm bg-[#0A0D14] border-white/10 text-white"
                  value={form.public_slug || ""}
                  onChange={(e) => {
                    const clean = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "-")
                      .replace(/-+/g, "-");
                    setForm((f) => ({ ...f, public_slug: clean }));
                  }}
                  placeholder="nome-da-barbearia"
                  data-testid="config-slug-input"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={copyShopLink}
                className="gap-1.5 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-[4px] h-10 px-3 text-xs font-bold shrink-0 cursor-pointer"
                data-testid="config-copy-shop-link"
              >
                {copiedShop ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedShop ? "Link Copiado!" : "Copiar Link"}</span>
              </Button>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Olá! Agende seu horário de corte na barbearia pelo Kupola: ${shopPublicUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-3.5 rounded-[4px] bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-xs text-[#25D366] font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
                title="Compartilhar no WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </a>

              <a
                href={shopPublicUrl}
                target="_blank"
                rel="noreferrer"
                className="h-10 px-3.5 rounded-[4px] bg-[#0A0D14] border border-white/10 hover:border-white/20 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1.5 font-semibold transition-colors shrink-0"
                title="Abrir página pública em nova aba"
              >
                <span>Ver Página</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </a>
            </div>
          </div>

          {/* Links Personalizados por Barbeiro da Equipe */}
          {barbers && barbers.length > 0 && (
            <div className="pt-2 border-t border-white/10">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">
                Links Personalizados por Barbeiro (Pré-seleção Automática)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {barbers.filter((b) => b.active !== false).map((barber) => {
                  const isCopied = copiedBarberId === barber.id;
                  return (
                    <div
                      key={barber.id}
                      className="p-2.5 rounded-[4px] bg-[#0A0D14]/60 border border-white/10 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="h-7 w-7 rounded-[2px] bg-[#12141F] border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {barber.name.substring(0, 1).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-white truncate">
                          {barber.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyBarberLink(barber.id, barber.name)}
                          className={`h-7 px-2 text-[10px] font-bold rounded-[4px] gap-1 cursor-pointer ${
                            isCopied ? "text-emerald-400 bg-emerald-500/10" : "text-[#D4AF37] hover:bg-[#D4AF37]/10"
                          }`}
                        >
                          {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          <span>{isCopied ? "Copiado" : "Copiar"}</span>
                        </Button>

                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Olá! Agende seu horário com ${barber.name} no Kupola: ${window.location.origin}/agendar/${currentSlug}?barber=${barber.id}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 px-2 text-[10px] font-bold rounded-[4px] gap-1 cursor-pointer inline-flex items-center text-[#25D366] hover:bg-[#25D366]/10 border border-[#25D366]/30"
                          title="Compartilhar no WhatsApp"
                        >
                          <MessageCircle className="h-3 w-3" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-1">
            <Button onClick={save} className="gap-2 bg-[#D4AF37] hover:bg-[#C59F2E] text-slate-950 font-bold rounded-[4px] shadow-none cursor-pointer" data-testid="config-save-slug">
              <Save className="h-4 w-4" /> Salvar Link da Barbearia
            </Button>
          </div>
        </div>
      </Card>

      {/* Regras de Comissão — Oficial KUPOLA */}
      <Card id="regras-comissao" className="p-6 border border-white/10 bg-[#12141F] rounded-[4px] shadow-none scroll-mt-20" data-testid="config-commission-rules-card">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[2px] bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/30">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">Regras de Comissão</h3>
              <p className="text-xs text-muted-foreground">
                Defina como o KUPOLA deve calcular a comissão dos barbeiros da sua barbearia.
              </p>
            </div>
          </div>
          <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30 text-xs px-2.5 py-0.5 rounded-[2px] font-bold self-start sm:self-auto">
            Financeiro & Repasses
          </Badge>
        </div>

        {isUserBarber && (
          <div className="mb-5 p-3 rounded-[4px] bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Acesso restrito ao Dono ou Administrador da barbearia. Barbeiros não podem alterar as regras de comissão.</span>
          </div>
        )}

        <div className="space-y-6">
          {/* 1. Base de Cálculo da Comissão */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold text-white uppercase tracking-wider block">
                Base de cálculo da comissão
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Escolha se a comissão é calculada antes ou depois do desconto das taxas da forma de pagamento.
              </p>
            </div>

            <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
              {/* Opção: Valor Bruto */}
              <div
                onClick={() => !isUserBarber && setForm((f) => ({ ...f, commission_base: "gross" }))}
                data-testid="option-commission-gross"
                className={`p-4 rounded-[4px] border transition-all cursor-pointer flex flex-col justify-between ${
                  !isNetBase
                    ? "border-[#D4AF37] bg-[#D4AF37]/10 shadow-[inset_0_0_0_1px_#D4AF37]"
                    : "border-white/10 bg-[#0A0D14] hover:border-white/20"
                } ${isUserBarber ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-sm font-bold text-white">Valor bruto</span>
                    <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      !isNetBase ? "border-[#D4AF37] bg-[#D4AF37]" : "border-slate-600 bg-transparent"
                    }`}>
                      {!isNetBase && <span className="h-1.5 w-1.5 rounded-full bg-[#05070B]" />}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    A comissão é calculada sobre o valor do atendimento antes das taxas da forma de pagamento.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Taxas da maquininha:</span>
                  <span className="font-semibold text-slate-200">Absorvidas pela barbearia</span>
                </div>
              </div>

              {/* Opção: Valor Líquido */}
              <div
                onClick={() => !isUserBarber && setForm((f) => ({ ...f, commission_base: "net" }))}
                data-testid="option-commission-net"
                className={`p-4 rounded-[4px] border transition-all cursor-pointer flex flex-col justify-between ${
                  isNetBase
                    ? "border-[#D4AF37] bg-[#D4AF37]/10 shadow-[inset_0_0_0_1px_#D4AF37]"
                    : "border-white/10 bg-[#0A0D14] hover:border-white/20"
                } ${isUserBarber ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-sm font-bold text-white">Valor líquido</span>
                    <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      isNetBase ? "border-[#D4AF37] bg-[#D4AF37]" : "border-slate-600 bg-transparent"
                    }`}>
                      {isNetBase && <span className="h-1.5 w-1.5 rounded-full bg-[#05070B]" />}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    As taxas da forma de pagamento são descontadas antes do cálculo da comissão.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Taxas da maquininha:</span>
                  <span className="font-semibold text-[#E5C365]">Descontadas da base</span>
                </div>
              </div>
            </div>

            {/* Exemplo Visual Dinâmico da Base */}
            <div className="p-3.5 rounded-[4px] bg-[#0A0D14] border border-white/10 space-y-2" data-testid="box-exemplo-base">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
                  Exemplo Visual da Base Selecionada
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Atendimento: R$ 100,00 · Taxa: R$ 3,00 (3%) · Comissão: 40%
                </span>
              </div>
              {!isNetBase ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="p-2 rounded bg-white/[0.03]">
                    <span className="text-slate-400 block text-[11px]">Base da comissão:</span>
                    <span className="font-bold text-white font-mono text-sm">R$ 100,00</span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.03]">
                    <span className="text-slate-400 block text-[11px]">Comissão do barbeiro (40%):</span>
                    <span className="font-bold text-[#E5C365] font-mono text-sm">R$ 40,00</span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.03]">
                    <span className="text-slate-400 block text-[11px]">Líquido da barbearia (R$ 97 - R$ 40):</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">R$ 57,00</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="p-2 rounded bg-white/[0.03]">
                    <span className="text-slate-400 block text-[11px]">Valor após taxa (Base):</span>
                    <span className="font-bold text-white font-mono text-sm">R$ 97,00</span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.03]">
                    <span className="text-slate-400 block text-[11px]">Comissão do barbeiro (40%):</span>
                    <span className="font-bold text-[#E5C365] font-mono text-sm">R$ 38,80</span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.03]">
                    <span className="text-slate-400 block text-[11px]">Líquido da barbearia (R$ 97 - R$ 38,80):</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">R$ 58,20</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Descontos */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div>
              <Label className="text-xs font-bold text-white uppercase tracking-wider block">
                Descontos afetam a comissão?
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Defina se os abatimentos concedidos aos clientes reduzem a base de cálculo da comissão do barbeiro.
              </p>
            </div>

            <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
              {/* Opção: Sim */}
              <div
                onClick={() => !isUserBarber && setForm((f) => ({ ...f, discount_affects_commission: true }))}
                data-testid="option-discount-yes"
                className={`p-4 rounded-[4px] border transition-all cursor-pointer flex flex-col justify-between ${
                  discountsAffectCommission
                    ? "border-[#D4AF37] bg-[#D4AF37]/10 shadow-[inset_0_0_0_1px_#D4AF37]"
                    : "border-white/10 bg-[#0A0D14] hover:border-white/20"
                } ${isUserBarber ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-sm font-bold text-white">Sim</span>
                    <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      discountsAffectCommission ? "border-[#D4AF37] bg-[#D4AF37]" : "border-slate-600 bg-transparent"
                    }`}>
                      {discountsAffectCommission && <span className="h-1.5 w-1.5 rounded-full bg-[#05070B]" />}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Calcular a comissão sobre o valor após o desconto.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/5 text-[11px] text-slate-400">
                  Base da comissão é o valor final efetivamente pago pelo cliente.
                </div>
              </div>

              {/* Opção: Não */}
              <div
                onClick={() => !isUserBarber && setForm((f) => ({ ...f, discount_affects_commission: false }))}
                data-testid="option-discount-no"
                className={`p-4 rounded-[4px] border transition-all cursor-pointer flex flex-col justify-between ${
                  !discountsAffectCommission
                    ? "border-[#D4AF37] bg-[#D4AF37]/10 shadow-[inset_0_0_0_1px_#D4AF37]"
                    : "border-white/10 bg-[#0A0D14] hover:border-white/20"
                } ${isUserBarber ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-sm font-bold text-white">Não</span>
                    <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      !discountsAffectCommission ? "border-[#D4AF37] bg-[#D4AF37]" : "border-slate-600 bg-transparent"
                    }`}>
                      {!discountsAffectCommission && <span className="h-1.5 w-1.5 rounded-full bg-[#05070B]" />}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Calcular a comissão sobre o valor original antes do desconto.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/5 text-[11px] text-slate-400">
                  A comissão é preservada sobre o preço cheio e a barbearia assume o desconto.
                </div>
              </div>
            </div>

            {/* Exemplo Visual Dinâmico de Desconto */}
            <div className="p-3.5 rounded-[4px] bg-[#0A0D14] border border-white/10 space-y-2" data-testid="box-exemplo-desconto">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
                  Exemplo Visual de Descontos
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Serviço: R$ 100,00 · Desconto: R$ 20,00 · Valor final: R$ 80,00 · Comissão: 40%
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                <div className={`p-2.5 rounded border ${
                  discountsAffectCommission
                    ? "bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#E5C365]"
                    : "bg-white/[0.02] border-white/5 text-slate-400"
                }`}>
                  <span className="font-bold block text-xs mb-1">
                    Se &quot;Sim&quot; {discountsAffectCommission && "(Selecionado)"}:
                  </span>
                  <div className="space-y-0.5 font-mono text-[11px]">
                    <div>Base = <strong className="text-white">R$ 80,00</strong></div>
                    <div>Comissão (40%) = <strong className="text-[#E5C365]">R$ 32,00</strong></div>
                  </div>
                </div>

                <div className={`p-2.5 rounded border ${
                  !discountsAffectCommission
                    ? "bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#E5C365]"
                    : "bg-white/[0.02] border-white/5 text-slate-400"
                }`}>
                  <span className="font-bold block text-xs mb-1">
                    Se &quot;Não&quot; {!discountsAffectCommission && "(Selecionado)"}:
                  </span>
                  <div className="space-y-0.5 font-mono text-[11px]">
                    <div>Base = <strong className="text-white">R$ 100,00</strong></div>
                    <div>Comissão (40%) = <strong className="text-[#E5C365]">R$ 40,00</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Ordem Oficial do Cálculo */}
          <div className="pt-2 border-t border-white/10 space-y-3">
            <div>
              <Label className="text-xs font-bold text-white uppercase tracking-wider block">
                Ordem Oficial do Cálculo
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                O KUPOLA executa rigorosamente este fluxo matemático centralizado em cada atendimento finalizado:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              <div className="p-3 rounded-[4px] bg-[#0A0D14] border border-white/10">
                <span className="text-[10px] font-black font-mono text-[#D4AF37] block mb-1">ETAPA 1 & 2</span>
                <p className="font-semibold text-white">1. Valor original dos serviços</p>
                <p className="text-[11px] text-slate-400 mt-1">2. Aplicação do desconto ({discountsAffectCommission ? "reduz a base" : "não afeta base"}).</p>
              </div>

              <div className="p-3 rounded-[4px] bg-[#0A0D14] border border-white/10">
                <span className="text-[10px] font-black font-mono text-[#D4AF37] block mb-1">ETAPA 3 & 4</span>
                <p className="font-semibold text-white">3. Forma de pagamento real</p>
                <p className="text-[11px] text-slate-400 mt-1">4. Taxa real aplicada (Dinheiro 0%, PIX, Ton, Stone...).</p>
              </div>

              <div className="p-3 rounded-[4px] bg-[#0A0D14] border border-white/10">
                <span className="text-[10px] font-black font-mono text-[#D4AF37] block mb-1">ETAPA 5 & 6</span>
                <p className="font-semibold text-white">5. Definição da base da comissão</p>
                <p className="text-[11px] text-slate-400 mt-1">6. Aplicação da % de comissão do barbeiro ({isNetBase ? "base líquida" : "base bruta"}).</p>
              </div>

              <div className="p-3 rounded-[4px] bg-[#0A0D14] border border-white/10">
                <span className="text-[10px] font-black font-mono text-[#D4AF37] block mb-1">ETAPA 7 & 8</span>
                <p className="font-semibold text-white">7. Valor da comissão apurada</p>
                <p className="text-[11px] text-slate-400 mt-1">8. Valor líquido restante da barbearia.</p>
              </div>
            </div>
          </div>

          {/* 4. Exemplo Completo Oficial Adaptativo */}
          <div className="p-4 rounded-[4px] bg-[#0D121B] border border-[#D4AF37]/30 space-y-3" data-testid="box-exemplo-completo">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-[#D4AF37]" />
                <h4 className="font-display text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Demonstrativo em Tempo Real da Regra Atual
                </h4>
              </div>
              <Badge className="bg-[#D4AF37]/15 text-[#E5C365] border-[#D4AF37]/30 text-[10px] font-mono font-bold">
                {isNetBase ? "Base Líquida" : "Base Bruta"} · {discountsAffectCommission ? "Desconto Reduz Base" : "Desconto Não Afeta"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center font-mono">
              <div className="p-2.5 rounded bg-[#0A0D14] border border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">ATENDIMENTO</span>
                <span className="text-xs sm:text-sm font-bold text-white">R$ 100,00</span>
              </div>
              <div className="p-2.5 rounded bg-[#0A0D14] border border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">DESCONTO</span>
                <span className="text-xs sm:text-sm font-bold text-rose-400">- R$ 10,00</span>
              </div>
              <div className="p-2.5 rounded bg-[#0A0D14] border border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">PAGO PELO CLIENTE</span>
                <span className="text-xs sm:text-sm font-bold text-white">R$ 90,00</span>
              </div>
              <div className="p-2.5 rounded bg-[#0A0D14] border border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">TAXA PAGAMENTO (3%)</span>
                <span className="text-xs sm:text-sm font-bold text-amber-300">
                  R$ 2,70
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#D4AF37]/15 border border-[#D4AF37]/40">
                <span className="text-[10px] text-[#E5C365] block font-sans font-bold">BASE COMISSÃO</span>
                <span className="text-xs sm:text-sm font-black text-white">
                  {brl(completeSim.commissionBase)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#D4AF37]/15 border border-[#D4AF37]/40">
                <span className="text-[10px] text-[#E5C365] block font-sans font-bold">COMISSÃO (40%)</span>
                <span className="text-xs sm:text-sm font-black text-[#E5C365]">
                  {brl(completeSim.commissionAmount)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#0A0D14] border border-emerald-500/30 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-emerald-400 block font-sans font-bold">VALOR BARBEARIA</span>
                <span className="text-xs sm:text-sm font-black text-emerald-400">
                  {brl(completeSim.shopAmount)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              {isNetBase && discountsAffectCommission ? (
                <span>
                  ✓ <strong>Cenário Oficial Padrão:</strong> Desconto de R$ 10 é aplicado (R$ 90), a taxa de 3% (R$ 2,70) é subtraída da base (R$ 87,30), e os 40% do barbeiro resultam em <strong>R$ 34,92</strong>, restando <strong>R$ 52,38</strong> líquidos para a barbearia.
                </span>
              ) : isNetBase && !discountsAffectCommission ? (
                <span>
                  ✓ O desconto não reduziu a base (R$ 100), da qual é deduzida a taxa de 3% (R$ 3,00), resultando em base de R$ 97,00 e comissão de <strong>R$ 38,80</strong>.
                </span>
              ) : !isNetBase && discountsAffectCommission ? (
                <span>
                  ✓ O desconto reduziu o valor para R$ 90,00, a comissão é calculada bruta (sem descontar taxa), gerando <strong>R$ 36,00</strong> para o profissional.
                </span>
              ) : (
                <span>
                  ✓ Comissão calculada sobre o valor cheio original de R$ 100,00 gerando <strong>R$ 40,00</strong> para o profissional.
                </span>
              )}
            </p>
          </div>

          {/* Botão de Salvar Regras de Comissão */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Button
              onClick={saveCommissionRules}
              disabled={isUserBarber || savingRules}
              className="gap-2 bg-[#D4AF37] hover:bg-[#C59F2E] text-slate-950 font-bold rounded-[4px] shadow-none cursor-pointer h-10 px-5"
              data-testid="config-save-commission-rules"
            >
              <Save className="h-4 w-4" />
              <span>{savingRules ? "Salvando regras..." : "Salvar Regras de Comissão"}</span>
            </Button>
            <span className="text-xs text-muted-foreground">
              As alterações passarão a valer automaticamente para os novos atendimentos registrados.
            </span>
          </div>
        </div>
      </Card>

      {/* Módulo Operacional */}
      <Card className="p-6 border border-white/10 bg-[#12141F] rounded-[4px] shadow-none">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-[#D4AF37]" />
          <div>
            <h3 className="font-display text-base font-bold text-white">Modo de Atendimento do Estabelecimento</h3>
            <p className="text-xs text-muted-foreground">Defina a dinâmica operacional de atendimento da sua barbearia</p>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-5">
          {operationalModes.map((mode) => {
            const isSelected = form.operational_mode === mode.id;
            const Icon = mode.icon;
            return (
              <div
                key={mode.id}
                onClick={() => setForm((f) => ({ ...f, operational_mode: mode.id }))}
                data-testid={`mode-option-${mode.id}`}
                className={`cursor-pointer rounded-[4px] border p-4 transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? "border-[#D4AF37] bg-[#D4AF37]/10 shadow-none"
                    : "border-white/10 bg-[#0A0D14] hover:border-white/20"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-[2px] ${isSelected ? "bg-[#D4AF37] text-[#0B0F19]" : "bg-[#12141F] text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />}
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">{mode.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{mode.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/10 flex justify-between items-center">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#D4AF37]/80">{mode.badge}</span>
                  <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-[#D4AF37]" : "bg-muted"}`} />
                </div>
              </div>
            );
          })}
        </div>

        <Button onClick={save} className="gap-2 bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0F19] font-bold rounded-[4px] shadow-none cursor-pointer" data-testid="config-save-mode">
          <Save className="h-4 w-4" /> Salvar Modo de Atendimento
        </Button>
      </Card>

      {/* Plano & Gestão de Unidades */}
      <Card className="p-6 border border-white/10 bg-[#12141F] rounded-[4px] shadow-none">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[2px] bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/30">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">Plano & Unidades da Barbearia</h3>
              <p className="text-xs text-muted-foreground">Gerencie a assinatura do sistema e a estrutura de lojas.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40 font-extrabold uppercase text-xs px-3 py-1 rounded-[2px]">
              {plan?.name || "Plano Pro"}
            </Badge>
            <Button
              size="sm"
              onClick={() => openUpgradeModal({ title: "Planos & Assinatura da Barbearia" })}
              className="bg-gradient-to-r from-[#F3CD68] via-[#D4AF37] to-[#B8860B] text-[#0B0F19] font-bold text-xs h-8 px-3 rounded-[4px] gap-1.5 shadow-none hover:brightness-105 cursor-pointer"
            >
              <Crown className="h-3.5 w-3.5" />
              <span>{isPremium ? "Gerenciar Plano" : "Fazer Upgrade"}</span>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-[4px] bg-[#0A0D14] border border-white/10">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Unidades Ativas</p>
              <p className="text-xl font-bold font-display text-white mt-1">
                {plan?.id === "premium" ? `${units.length} de ${plan.maxUnits || 5} unidades ativas` : "1 Unidade"}
              </p>
              <p className="text-[11px] text-[#D4AF37] mt-0.5">
                {plan?.id === "premium" ? "Rede Multi-Lojas Habilitada" : "Plano Unidade Única"}
              </p>
            </div>
            <div className="p-3.5 rounded-[4px] bg-[#0A0D14] border border-white/10">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Limite de Barbeiros</p>
              <p className="text-xl font-bold font-display text-white mt-1">
                {plan?.id === "premium"
                  ? "Ilimitado (6+)"
                  : plan?.id === "starter"
                  ? "1 Barbeiro / Cadeira"
                  : "2 a 5 Barbeiros"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {plan?.id === "premium" ? "Sem limites de cadeiras" : "Conforme plano contratado"}
              </p>
            </div>
            <div className="p-3.5 rounded-[4px] bg-[#0A0D14] border border-white/10">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Visão Consolidada</p>
              <p className="text-xl font-bold font-display text-white mt-1">
                {plan?.id === "premium" ? "Liberada" : "Bloqueada"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {plan?.id === "premium" ? "DRE e faturamento unificados" : "Exclusivo no plano Premium"}
              </p>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Unidades Cadastradas</Label>
            <div className="divide-y divide-white/5 rounded-[4px] border border-white/10 overflow-hidden">
              {units.map((u) => (
                <div key={u.id} className="p-3 flex items-center justify-between bg-[#0A0D14] hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-[2px] bg-primary/10 text-primary flex items-center justify-center border border-white/10">
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{u.name}</span>
                        {u.is_main && (
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 rounded-[2px]">
                            Matriz
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{u.address || "Endereço cadastrado"}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 rounded-[2px]">
                    Ativa
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
