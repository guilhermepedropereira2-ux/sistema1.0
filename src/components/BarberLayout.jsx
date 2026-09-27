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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home, Users, TrendingUp, User, Plus, LogOut,
  Scissors, ShieldCheck, Share2, Globe, Link2,
  WifiOff, RefreshCw, Users2, Check,
} from "lucide-react";
import LancarAtendimentoModal from "@/components/LancarAtendimentoModal";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export default function BarberLayout() {
  const { user, ready, logout, switchAccount } = useAuth();
  const { subscription, isSubscriptionExpired: unitSubscriptionExpired } = useUnit();
  const navigate = useNavigate();
  const location = useLocation();
  const [shop, setShop] = useState(null);
  const [barberData, setBarberData] = useState(null);
  const [photoError, setPhotoError] = useState(false);
  const [lancarModalOpen, setLancarModalOpen] = useState(false);
  const [switchableUsers, setSwitchableUsers] = useState([]);
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();

  useEffect(() => {
    api.get("/auth/switchable-users").then(setSwitchableUsers).catch(() => {});
  }, []);

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

  const barberPhoto = barberData?.barber?.photo_url || user?.photo_url || user?.avatar_url || null;
  const initials = (userName || "B")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "B";
  const roleAndUnit = `Barbeiro Premium • ${shop?.name || "Barbearia do Centro"}`;

  const copyBookingLink = () => {
    if (!myBookingUrl) return;
    navigator.clipboard.writeText(myBookingUrl);
    toast.success("Link exclusivo de agendamento copiado!");
  };

  const navItems = [
    { to: "/barbeiro", label: "Início", icon: Home, end: true, testId: "bnav-inicio" },
    { to: "/barbeiro/clientes", label: "Clientes", icon: Users, testId: "bnav-clientes" },
    { to: "/barbeiro/desempenho", label: "Desempenho", icon: TrendingUp, testId: "bnav-desempenho" },
    { to: "/barbeiro/perfil", label: "Perfil", icon: User, testId: "bnav-perfil" },
  ];

  return (
    <div className="min-h-screen pb-24 bg-[#0B0D14] text-[#F8FAFC]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.08] bg-[#0F121C]/95 px-3 sm:px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <img 
            src="/logo.png" 
            alt="KingPro" 
            className="h-9 w-9 rounded-full object-cover border border-[#D4AF37]/30 shadow-md shrink-0" 
          />
          <div className="leading-tight hidden min-[400px]:block">
            <span className="font-display font-extrabold text-sm tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-500 block">
              KingPro
            </span>
            <p className="text-[10px] text-slate-400 font-medium">
              Hub do Barbeiro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
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

          {/* Menu de Perfil do Barbeiro com foto circular e dados destacados */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 sm:gap-2.5 p-1 rounded-full sm:rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-right focus:outline-none"
                data-testid="barber-user-menu"
              >
                <div className="text-right leading-tight max-w-[130px] sm:max-w-[220px]">
                  <span className="font-semibold text-xs sm:text-sm text-white block truncate tracking-tight">
                    {userName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal block truncate">
                    {roleAndUnit}
                  </span>
                </div>
                <div className="relative h-9 w-9 rounded-full ring-1 ring-white/15 border border-[#D4AF37]/40 overflow-hidden bg-gradient-to-br from-[#EAB308] to-[#D4AF37] flex items-center justify-center text-[#0B0D14] font-bold text-xs shrink-0 shadow-sm">
                  {barberPhoto && !photoError ? (
                    <img
                      src={barberPhoto}
                      alt={userName}
                      className="h-full w-full object-cover"
                      onError={() => setPhotoError(true)}
                    />
                  ) : (
                    <span className="font-bold text-xs">
                      {initials}
                    </span>
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 sm:w-80 bg-[#131622] border border-white/10 text-white p-2 rounded-[4px] shadow-2xl z-50 max-h-[85vh] overflow-y-auto">
              <DropdownMenuLabel className="px-2 py-1.5">
                <span className="font-bold text-sm block">{userName}</span>
                <span className="text-[11px] text-muted-foreground">{roleAndUnit}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10 my-1" />

              {/* Troca Rápida de Conta */}
              <div className="px-2 py-1">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1">
                    <Users2 className="h-3 w-3" /> Alternar de Conta
                  </span>
                  <span className="text-[9px] text-slate-400">Troca rápida</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                  {(switchableUsers.length ? switchableUsers : [
                    { id: "usr_dono", name: "Administrador / Dono", username: "dono", role: "dono" },
                    { id: "usr_dono_quick", name: "Dono Teste (1)", username: "1", role: "dono" },
                    { id: "usr_gerente", name: "Gerente Geral", username: "gerente", role: "gerente" },
                    { id: "usr_carlos", name: "Carlos Souza", username: "carlos", role: "barbeiro" },
                    { id: "usr_barbeiro_quick", name: "Barbeiro Teste (3)", username: "3", role: "barbeiro" },
                  ]).map((acc) => {
                    const isCurrent = user?.id === acc.id || user?.username === acc.username;
                    const roleName = acc.role === "dono" ? "Dono" : acc.role === "gerente" ? "Gerente" : "Barbeiro";
                    const roleGrad = acc.role === "dono"
                      ? "from-[#EAB308] to-[#D4AF37]"
                      : acc.role === "gerente"
                      ? "from-blue-500 to-indigo-600"
                      : "from-emerald-500 to-teal-600";

                    return (
                      <button
                        key={acc.id || acc.username}
                        type="button"
                        onClick={async () => {
                          if (isCurrent) return;
                          try {
                            const u = await switchAccount(acc.id || acc.username);
                            toast.success(`Alternado para: ${u.name}`);
                            if (u.role === "barbeiro") {
                              navigate("/barbeiro");
                            } else {
                              navigate("/");
                            }
                          } catch {
                            toast.error("Erro ao alternar de conta.");
                          }
                        }}
                        className={`w-full flex items-center justify-between p-1.5 rounded-[4px] text-left transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-white"
                            : "hover:bg-white/5 text-slate-300 hover:text-white border border-transparent"
                        }`}
                        data-testid={`barber-switch-to-${acc.username}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`h-6 w-6 rounded-full bg-gradient-to-br ${roleGrad} flex items-center justify-center text-[#0B0F19] font-black text-[9px] shrink-0`}>
                            {(acc.name || "U").substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate leading-tight">{acc.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">@{acc.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border border-white/20 bg-white/5">
                            {roleName}
                          </span>
                          {isCurrent && <Check className="h-3.5 w-3.5 text-[#D4AF37] stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <DropdownMenuSeparator className="bg-white/10 my-1" />
              <DropdownMenuItem onClick={copyBookingLink} className="cursor-pointer text-xs focus:bg-white/10 focus:text-white rounded-[2px]" data-testid="menu-copiar-link">
                <Link2 className="mr-2 h-4 w-4 text-[#D4AF37]" /> Copiar Link de Agendamento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/barbeiro/perfil")} className="cursor-pointer text-xs focus:bg-white/10 focus:text-white rounded-[2px]" data-testid="menu-perfil">
                <User className="mr-2 h-4 w-4 text-[#D4AF37]" /> Meu Perfil
              </DropdownMenuItem>
              {isAdmin(user) && (
                <DropdownMenuItem onClick={() => navigate("/")} className="cursor-pointer text-xs focus:bg-white/10 focus:text-white rounded-[2px]" data-testid="switch-to-admin">
                  <ShieldCheck className="mr-2 h-4 w-4 text-[#10B981]" /> Voltar para Administração
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/10 my-1" />
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

      {/* Barra de Navegação Inferior Otimizada e Minimalista (4 Itens Fixos) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-[#0F121C] px-2 py-2 shadow-2xl safe-area-pb">
        <div className="mx-auto max-w-lg grid grid-cols-4 w-full items-center gap-1">
          {navItems.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                data-testid={it.testId}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 rounded-[6px] py-1.5 px-1 text-center transition-colors w-full ${
                    isActive
                      ? "text-[#D4AF37] bg-[#D4AF37]/12 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5 font-medium"
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-[11px] leading-tight block whitespace-nowrap overflow-visible">
                  {it.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Modal de Bloqueio por Assinatura Expirada */}
      <ErrorBoundary fallback={null}>
        <SubscriptionExpiredModal open={isSubscriptionExpired} />
      </ErrorBoundary>
    </div>
  );
}

