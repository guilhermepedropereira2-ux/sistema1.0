import { Outlet, NavLink, useNavigate, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useUnit } from "@/context/UnitContext";
import { hasRole, isAdmin } from "@/lib/roles";
import { Loading } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import ErrorBoundary from "@/components/ErrorBoundary";
import SubscriptionExpiredModal from "@/components/SubscriptionExpiredModal";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarClock, Users, LineChart, Wallet, Plus, UserCircle2, LogOut,
  Scissors, ShieldCheck, Link2, Copy, Check, ExternalLink, Share2, Globe,
  WifiOff, RefreshCw,
} from "lucide-react";
import LancarAtendimentoModal from "@/components/LancarAtendimentoModal";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export default function BarberLayout() {
  const { user, ready, logout } = useAuth();
  const { subscription, isSubscriptionExpired: unitSubscriptionExpired } = useUnit();
  const navigate = useNavigate();
  const location = useLocation();
  const [shop, setShop] = useState(null);
  const [barberData, setBarberData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [lancarModalOpen, setLancarModalOpen] = useState(false);
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();

  useEffect(() => {
    const handleOpen = () => setLancarModalOpen(true);
    window.addEventListener("open-barber-lancar-modal", handleOpen);
    return () => window.removeEventListener("open-barber-lancar-modal", handleOpen);
  }, []);

  // Abre o modal diretamente se vier por parâmetro (ex: redirecionamento de /lancar-atendimento)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("lancar") === "true") {
      setLancarModalOpen(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  const isSubscriptionExpired = useMemo(() => {
    if (unitSubscriptionExpired) return true;
    if (user?.subscriptionStatus === "expired" || user?.organization?.subscription_status === "expired") return true;
    if (subscription?.status === "expired" || subscription?.subscriptionStatus === "expired" || subscription?.subscription_status === "expired") return true;
    if (
      subscription?.subscription_status === "trial" &&
      subscription?.trial_ends_at &&
      new Date(subscription.trial_ends_at) < new Date()
    ) {
      return true;
    }
    if (user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) < new Date()) {
      return true;
    }
    return false;
  }, [user, subscription, unitSubscriptionExpired]);

  useEffect(() => {
    api.get("/barbershop").then(setShop).catch(() => {});
    api.get("/barber/me").then(setBarberData).catch(() => {});
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0B0D14] flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!user || (!hasRole(user, "barbeiro") && !isAdmin(user))) {
    return <Navigate to="/login" replace />;
  }

  const showFab = location.pathname !== "/barbeiro/lancar";
  const userName = user?.name || barberData?.barber?.name || "Barbeiro";
  const barberId = barberData?.barber?.id || user?.barber_id || "b1";
  const shopSlug = shop?.slug || "barbearia-vintage";
  const myBookingUrl = `${window.location.origin}/agendar/${shopSlug}?barber=${barberId}`;

  const copyBookingLink = () => {
    navigator.clipboard.writeText(myBookingUrl);
    setCopiedLink(true);
    toast.success("Link de agendamento exclusivo copiado!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const openLinkModal = () => {
    copyBookingLink();
    setLinkModalOpen(true);
  };

  const navItems = [
    { to: "/barbeiro", label: "Início", icon: CalendarClock, end: true, testId: "bnav-inicio" },
    { to: "/barbeiro/clientes", label: "Clientes", icon: Users, testId: "bnav-clientes" },
    { to: "/barbeiro/desempenho", label: "Desempenho", icon: LineChart, testId: "bnav-desempenho" },
    { to: "/barbeiro/comissao", label: "Comissão", icon: Wallet, testId: "bnav-comissao" },
    { to: "/barbeiro/perfil", label: "Perfil", icon: UserCircle2, testId: "bnav-perfil" },
  ];

  return (
    <div className="min-h-screen pb-24 bg-[#0B0D14] text-[#F8FAFC]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.08] bg-[#0F121C] px-4 py-3">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="KortePro" 
            className="h-10 w-10 rounded-full object-cover border border-[#D4AF37]/30 shadow-md shrink-0" 
          />
          <div className="leading-tight">
            <span className="font-display font-extrabold text-sm tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-500 block">
              KortePro
            </span>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[160px]">
              {userName ? `${userName} • ${shop?.name || "Barbeiro"}` : (shop?.name || "Portal do Barbeiro")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Offline / Sincronização Pendente */}
          {(!isOnline || pendingCount > 0) && (
            <button
              type="button"
              onClick={syncNow}
              disabled={!isOnline || isSyncing}
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-[4px] border cursor-pointer transition-colors ${
                !isOnline
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/25"
              }`}
              title={
                !isOnline
                  ? "Modo Offline: novos atendimentos serão salvos localmente no aparelho"
                  : `Clique para sincronizar ${pendingCount} atendimento(s) salvo(s) offline`
              }
              data-testid="header-offline-status"
            >
              {!isOnline ? (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline text-[11px]">Offline</span>
                  {pendingCount > 0 && (
                    <span className="bg-amber-500/30 text-amber-200 px-1 rounded text-[10px]">
                      {pendingCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${isSyncing ? "animate-spin" : ""}`} />
                  <span className="text-[11px]">Sincronizar ({pendingCount})</span>
                </>
              )}
            </button>
          )}

          {/* Acesso rápido à Landing Page / Início */}
          <a
            href="/landing"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center h-8 px-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 gap-1.5 rounded-[4px] border border-white/10 transition-colors"
            title="Página de Vendas / Início"
          >
            <Globe className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span className="hidden sm:inline">Início</span>
          </a>

          {/* Acesso rápido ao link no header também */}
          <Button
            variant="ghost"
            size="sm"
            onClick={openLinkModal}
            className="hidden sm:inline-flex h-8 px-2.5 text-xs text-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 gap-1.5 rounded-[4px] border border-[#D4AF37]/30"
            title="Copiar link de agendamento"
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>Meu Link</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/5 rounded-[4px]" data-testid="barber-user-menu">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#EAB308] to-[#D4AF37] flex items-center justify-center text-[#0B0D14] font-bold text-xs border border-[#D4AF37]/40">
                  {userName.substring(0, 2).toUpperCase()}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#131622] border border-white/10 text-white p-1.5 rounded-[4px] shadow-xl">
              <DropdownMenuLabel className="px-2 py-1.5">
                <span className="font-bold text-sm block">{userName}</span>
                <span className="text-[11px] text-muted-foreground">{user?.email || "barbeiro@barbearia.com"}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={openLinkModal} className="cursor-pointer text-xs focus:bg-white/10 focus:text-white rounded-[2px]" data-testid="menu-copiar-link">
                <Link2 className="mr-2 h-4 w-4 text-[#D4AF37]" /> Copiar Link de Agendamento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/barbeiro/perfil")} className="cursor-pointer text-xs focus:bg-white/10 focus:text-white rounded-[2px]" data-testid="menu-perfil">
                <UserCircle2 className="mr-2 h-4 w-4 text-[#D4AF37]" /> Meu Perfil
              </DropdownMenuItem>
              {isAdmin(user) && (
                <DropdownMenuItem onClick={() => navigate("/")} className="cursor-pointer text-xs focus:bg-white/10 focus:text-white rounded-[2px]" data-testid="switch-to-admin">
                  <ShieldCheck className="mr-2 h-4 w-4 text-[#10B981]" /> Voltar para Administração
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => { logout(); navigate("/login"); }} className="cursor-pointer text-xs text-[#EF4444] focus:bg-[#EF4444]/15 focus:text-[#EF4444] rounded-[2px]" data-testid="barber-logout">
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5">
        <ErrorBoundary title="Ops! Erro ao exibir esta página do Barbeiro">
          <Outlet context={{ openLancarModal: () => setLancarModalOpen(true), closeLancarModal: () => setLancarModalOpen(false), lancarModalOpen }} />
        </ErrorBoundary>
      </main>

      {showFab && (
        <button
          onClick={() => setLancarModalOpen(true)}
          data-testid="fab-lancar"
          title="Lançar novo atendimento"
          className="fixed bottom-20 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-[4px] bg-[#D4AF37] text-[#0B0D14] shadow-none hover:bg-[#C59F2E] transition-colors border border-[#D4AF37]/50 active:translate-y-[1px] cursor-pointer"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
      )}

      {/* Modal Sobreposto de Lançar Atendimento */}
      <LancarAtendimentoModal
        open={lancarModalOpen}
        onClose={() => setLancarModalOpen(false)}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent("barber-atendimento-created"));
        }}
      />

      {/* Barra de Navegação Inferior Otimizada e Minimalista */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-[#0F121C] px-2 py-1.5 shadow-xl">
        <div className="mx-auto max-w-lg flex items-center justify-around">
          {navItems.slice(0, 2).map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                data-testid={it.testId}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-[3px] px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    isActive
                      ? "text-[#D4AF37] bg-[#D4AF37]/10 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{it.label}</span>
              </NavLink>
            );
          })}

          {/* Botão Compacto: Link de Agendamento */}
          <button
            type="button"
            onClick={openLinkModal}
            data-testid="bnav-link"
            title="Copiar meu link exclusivo de agendamento"
            className="flex flex-col items-center gap-1 rounded-[3px] px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
          >
            <div className="relative">
              <Link2 className="h-5 w-5" />
              {copiedLink && (
                <Check className="h-3 w-3 text-[#10B981] absolute -top-1 -right-1 stroke-[3]" />
              )}
            </div>
            <span>{copiedLink ? "Copiado!" : "Meu Link"}</span>
          </button>

          {navItems.slice(2).map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                data-testid={it.testId}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-[3px] px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    isActive
                      ? "text-[#D4AF37] bg-[#D4AF37]/10 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{it.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Modal Compacto do Link de Agendamento */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="max-w-md bg-[#12141F] border border-white/10 text-white p-6 rounded-[6px] shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold flex items-center gap-2 text-white">
              <Link2 className="h-4 w-4 text-[#D4AF37]" />
              Meu Link de Agendamento
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Seus clientes caem diretamente no seu perfil com você pré-selecionado para corte e agendamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-[4px] bg-[#090B10] border border-white/10 break-all font-mono text-xs text-[#D4AF37]/90 select-all">
              {myBookingUrl}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                onClick={copyBookingLink}
                className="w-full bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs h-9 rounded-[4px] gap-1.5 shadow-none"
                data-testid="btn-copy-barber-my-link"
              >
                {copiedLink ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
                <span>{copiedLink ? "Copiado!" : "Copiar Link"}</span>
              </Button>

              <a
                href={myBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-9 rounded-[4px] border border-white/10 hover:border-[#D4AF37]/40 bg-[#141724] hover:bg-[#1A1D2B] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                data-testid="btn-test-barber-my-link"
              >
                <span>Testar Link</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Bloqueio por Assinatura Expirada */}
      <ErrorBoundary fallback={null}>
        <SubscriptionExpiredModal open={isSubscriptionExpired} />
      </ErrorBoundary>
    </div>
  );
}

