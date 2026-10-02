import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
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
  Crown, Building2, Sparkles, Store, MessageCircle,
} from "lucide-react";
import { useUnit } from "@/context/UnitContext";

export default function Configuracoes() {
  const { refresh } = useMonth();
  const { plan, units, openUpgradeModal, isPremium } = useUnit();
  const { data: settings, loading } = useApi((api) => api.get("/settings"));
  const { data: barbers } = useApi((api) => api.get("/barbers"));
  const [form, setForm] = useState(null);
  const [copiedShop, setCopiedShop] = useState(false);
  const [copiedBarberId, setCopiedBarberId] = useState(null);

  useEffect(() => { 
    if (settings) {
      setForm({
        ...settings,
        operational_mode: settings.operational_mode || "hibrido",
        public_slug: settings.public_slug || "barbearia-vintage",
      }); 
    } 
  }, [settings]);
  
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
    try {
      await api.put("/settings", {
        commission_on: form.commission_on || "pago",
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
              <Sparkles className="h-3.5 w-3.5" />
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
