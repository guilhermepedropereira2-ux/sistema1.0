import { useState, useMemo } from "react";
import { Outlet, NavLink, useLocation, useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  LayoutDashboard, TrendingUp, Receipt, CreditCard, Users2, Users, Tags,
  ArrowRightLeft, CalendarDays, Wallet, BarChart3, History,
  Settings as SettingsIcon, ChevronLeft, ChevronRight,
  Store, Scissors, Package, ShieldCheck, LogIn, LogOut,
  UserCircle2, Contact, Bell, Plus, ChevronDown, CheckCircle2,
  AlertTriangle, AlertCircle, Info, Menu, HandCoins, X,
  Link2, Copy, Check, ExternalLink, Crown, EyeOff, Shield,
  Globe, ArrowUpRight, Coins, Home, Calendar, LayoutGrid, HelpCircle, MessageCircle, Send, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useMonth } from "@/context/MonthContext";
import { useAuth } from "@/context/AuthContext";
import { useUnit } from "@/context/UnitContext";
import { useBalcao } from "@/context/BalcaoContext";
import { useApi } from "@/hooks/useApi";
import { monthLabel } from "@/lib/format";
import { isAdmin, isBarber, isDono, isGerente, isCaixa, isSuperAdmin, rolesLabel, canAccess } from "@/lib/roles";
import NovoAtendimentoModal from "@/components/NovoAtendimentoModal";
import NovaDespesaModal from "@/components/NovaDespesaModal";
import NovaRetiradaModal from "@/components/NovaRetiradaModal";
import UnitSelector from "@/components/UnitSelector";
import UpgradeModal from "@/components/UpgradeModal";
import SubscriptionExpiredModal from "@/components/SubscriptionExpiredModal";
import KupolaLogo from "@/components/KupolaLogo";
import Sidebar from "@/components/Sidebar";

// Estrutura de Navegação Principal Exata conforme a Referência Visual KUPOLA
export const PRIMARY_NAV_ITEMS = [
  { to: "/", label: "Início", icon: Home, end: true, testId: "nav-inicio" },
  { to: "/calendario", label: "Agenda", icon: Calendar, testId: "nav-agenda" },
  { to: "/atendimentos", label: "Atendimentos", icon: Scissors, testId: "nav-atendimentos" },
  { to: "/clientes", label: "Clientes", icon: Users, testId: "nav-clientes" },
  { to: "/equipe", label: "Barbeiros", icon: Users2, testId: "nav-barbeiros" },
  { to: "/servicos", label: "Serviços", icon: LayoutGrid, testId: "nav-servicos" },
  { to: "/produtos", label: "Produtos", icon: Package, testId: "nav-produtos" },
  { to: "/maquininhas", label: "Formas de Pagamento", icon: CreditCard, testId: "nav-pagamentos" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, testId: "nav-relatorios" },
  { to: "/configuracoes", label: "Configurações", icon: SettingsIcon, testId: "nav-configuracoes" },
];

export const NAV_SECTIONS = [
  {
    title: "MENU PRINCIPAL",
    items: PRIMARY_NAV_ITEMS,
  },
];

// Mobile Bottom Navigation (5 abas exatas conforme a referência)
const MOBILE_BOTTOM_NAV = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/calendario", label: "Agenda", icon: Calendar },
  { to: "/atendimentos", label: "Atendimentos", icon: Scissors },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

function MonthSwitcher({ compact = false, variant = "default" }) {
  const { month, setMonth } = useMonth();
  const shift = (delta) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  // Formato limpo em linha única: "Setembro 2026"
  const monthDisplay = useMemo(() => {
    if (!month) return "";
    const [y, m] = month.split("-");
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    const name = monthNames[parseInt(m, 10) - 1] || m;
    return `${name} ${y}`;
  }, [month]);

  if (variant === "mobile-bar") {
    return (
      <div className="flex items-center justify-between w-full max-w-sm px-2 py-1 rounded-[4px] bg-[#12141F] border border-white/10 shadow-none">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-[#D4AF37] hover:bg-white/5 rounded-[3px] transition-colors"
          onClick={() => shift(-1)}
          data-testid="month-prev"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1.5 px-3 min-w-0">
          <CalendarDays className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
          <span
            className="text-xs sm:text-sm font-bold tracking-tight text-white capitalize whitespace-nowrap select-none"
            data-testid="current-month"
          >
            {monthDisplay}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-[#D4AF37] hover:bg-white/5 rounded-[3px] transition-colors"
          onClick={() => shift(1)}
          data-testid="month-next"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-[4px] border border-white/10 bg-[#12141F] px-2 py-1 shadow-none">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-slate-400 hover:text-[#D4AF37] hover:bg-white/5 rounded-[3px] transition-colors"
        onClick={() => shift(-1)}
        data-testid="month-prev"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <span
        className={`text-center font-bold capitalize text-white whitespace-nowrap px-2.5 ${
          compact ? "min-w-[95px] text-xs" : "min-w-[125px] text-xs sm:text-sm"
        }`}
        data-testid="current-month"
      >
        {monthDisplay}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-slate-400 hover:text-[#D4AF37] hover:bg-white/5 rounded-[3px] transition-colors"
        onClick={() => shift(1)}
        data-testid="month-next"
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: alerts } = useApi((api) => api.get("/dashboard/alerts"));
  
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("barbershop_read_alerts") || "[]");
    } catch {
      return [];
    }
  });

  const allAlerts = alerts || [];
  const unreadAlerts = allAlerts.filter((a, idx) => {
    const key = a.id || `${a.title}_${idx}`;
    return !readIds.includes(key);
  });
  const count = unreadAlerts.length;

  const markAllAsRead = () => {
    const allKeys = allAlerts.map((a, idx) => a.id || `${a.title}_${idx}`);
    setReadIds(allKeys);
    try {
      localStorage.setItem("barbershop_read_alerts", JSON.stringify(allKeys));
    } catch {}
    toast.success("Notificações marcadas como lidas.");
  };

  const markAsReadAndNavigate = (alert, idx) => {
    const key = alert.id || `${alert.title}_${idx}`;
    const newRead = Array.from(new Set([...readIds, key]));
    setReadIds(newRead);
    try {
      localStorage.setItem("barbershop_read_alerts", JSON.stringify(newRead));
    } catch {}

    setOpen(false);

    const target = alert.target || 
      (alert.title.toLowerCase().includes("contas") ? "/despesas" : 
       alert.title.toLowerCase().includes("receber") ? "/receitas" : "/");
    
    navigate(target);
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (isOpen && allAlerts.length > 0) {
      const allKeys = allAlerts.map((a, idx) => a.id || `${a.title}_${idx}`);
      setReadIds(allKeys);
      try {
        localStorage.setItem("barbershop_read_alerts", JSON.stringify(allKeys));
      } catch {}
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-[4px] border border-white/10 bg-[#12141F] text-slate-300 hover:text-white hover:border-[#D4AF37]/40 hover:bg-[#181B28] transition-colors shadow-none cursor-pointer"
          data-testid="header-notifications-btn"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-[3px] bg-[#D4AF37] px-1 text-[9px] font-black text-[#0B0F19] shadow-none animate-pulse">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-[#131622] border-white/10 p-4 text-white shadow-xl rounded-[4px]">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Notificações</span>
            {count > 0 ? (
              <Badge variant="outline" className="text-xs border-[#D4AF37]/40 text-[#D4AF37] bg-[#D4AF37]/10 rounded-[3px]">
                {count} nova{count > 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10 rounded-[3px]">
                Em dia
              </Badge>
            )}
          </div>
          {allAlerts.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] text-muted-foreground hover:text-[#D4AF37] font-medium transition-colors cursor-pointer"
              title="Marcar todas as notificações como lidas"
              data-testid="mark-all-read-btn"
            >
              Limpar todas
            </button>
          )}
        </div>
        <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {allAlerts.length === 0 ? (
            <p className="text-center py-6 text-xs text-muted-foreground">Tudo em dia! Sem alertas no momento.</p>
          ) : (
            allAlerts.map((a, i) => {
              const key = a.id || `${a.title}_${i}`;
              const isUnread = !readIds.includes(key);
              return (
                <div
                  key={i}
                  onClick={() => markAsReadAndNavigate(a, i)}
                  className={`flex items-start gap-2.5 rounded-[4px] p-2.5 text-xs border transition-all cursor-pointer group ${
                    isUnread
                      ? "bg-[#161926] border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#1C2030]"
                      : "bg-[#0E111A] border-white/5 hover:border-white/20 hover:bg-white/5 opacity-85"
                  }`}
                  data-testid={`alert-item-${i}`}
                >
                  {a.type === "danger" ? (
                    <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444] mt-0.5" />
                  ) : a.type === "warning" ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-[#D4AF37] mt-0.5" />
                  ) : (
                    <Info className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-white group-hover:text-[#D4AF37] transition-colors">{a.title}</p>
                      <span className="text-[10px] text-muted-foreground group-hover:text-[#D4AF37] font-bold">Ver &rarr;</span>
                    </div>
                    <p className="mt-0.5 text-muted-foreground leading-relaxed">{a.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserAvatarMenu({ variant = "header", collapsed = false }) {
  const { user, logout } = useAuth();
  const { isBalcaoMode, toggleBalcaoMode } = useBalcao();
  const navigate = useNavigate();

  const displayName = user?.name || "Administrador";
  const userRole = user?.role === "dono" ? "Dono" : rolesLabel(user) || "Administrador";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "sidebar" ? (
          collapsed ? (
            <button
              type="button"
              className="w-full flex items-center justify-center rounded-[4px] bg-[#12141F] hover:bg-[#181B28] border border-white/10 hover:border-[#D4AF37]/50 p-1.5 transition-all cursor-pointer group focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50"
              data-testid="sidebar-user-card-btn"
              aria-label="Perfil do usuário"
              title={`${displayName} (${userRole})`}
            >
              <div className="relative shrink-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#EAB308] to-[#D4AF37] flex items-center justify-center text-[#0B0F19] font-black text-xs border border-[#D4AF37]/50 shadow-sm">
                  {displayName.substring(0, 2).toUpperCase()}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#10B981] ring-2 ring-[#0F121C]"
                  title="Online"
                />
              </div>
            </button>
          ) : (
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2.5 rounded-[4px] bg-[#12141F] hover:bg-[#181B28] border border-white/10 hover:border-[#D4AF37]/50 p-2 text-left transition-all cursor-pointer group focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50"
              data-testid="sidebar-user-card-btn"
              aria-label="Perfil do usuário"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#EAB308] to-[#D4AF37] flex items-center justify-center text-[#0B0F19] font-black text-xs border border-[#D4AF37]/50 shadow-sm">
                    {displayName.substring(0, 2).toUpperCase()}
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#10B981] ring-2 ring-[#0F121C]"
                    title="Online"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white group-hover:text-[#D4AF37] truncate transition-colors leading-tight">
                    {displayName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block rounded-[2px] px-1 py-0.2 text-[9px] font-bold uppercase bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                      {userRole}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[95px]">
                      {user?.email || (user?.username ? `@${user.username}` : "")}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-[#D4AF37] shrink-0 transition-transform duration-200" />
            </button>
          )
        ) : (
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-[6px] p-1 lg:px-2 lg:py-1.5 transition-colors hover:bg-white/5 border border-transparent hover:border-white/10 focus:outline-none cursor-pointer"
            data-testid="header-user-btn"
            aria-label="Menu do usuário"
          >
            <div className="h-8 w-8 rounded-full bg-[#0A0E15] border border-[#D4AF37] text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              {displayName.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase() || "US"}
            </div>
            <div className="hidden lg:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-white tracking-tight">{displayName}</span>
              <span className="text-[10px] text-[#8B93A1] font-medium">{userRole} • Administrador</span>
            </div>
            <ChevronDown className="hidden lg:block h-3.5 w-3.5 text-[#8B93A1] ml-0.5" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === "sidebar" ? "start" : "end"}
        side={variant === "sidebar" ? "top" : "bottom"}
        sideOffset={variant === "sidebar" ? 8 : 6}
        className="w-72 sm:w-80 bg-[#131622] border border-white/10 text-white p-2 rounded-[4px] shadow-2xl z-50 max-h-[85vh] overflow-y-auto"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-white">{displayName}</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-[#10B981] font-semibold bg-[#10B981]/10 px-1.5 py-0.5 rounded border border-[#10B981]/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> Online
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{user?.email || "contato@barbearia.com"}</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-block rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold uppercase bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
              {userRole}
            </span>
            <span className="text-[10px] text-slate-400">Usuário: @{user?.username || "dono"}</span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/10 my-1" />

        {/* Toggle Modo Caixa / Balcão Seguro */}
        <DropdownMenuItem
          onClick={toggleBalcaoMode}
          className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-1.5 rounded-[2px] justify-between"
          data-testid="toggle-balcao-menu-item"
        >
          <div className="flex items-center gap-2">
            {isBalcaoMode ? <EyeOff className="h-3.5 w-3.5 text-amber-400" /> : <Shield className="h-3.5 w-3.5 text-slate-400" />}
            <span>Modo Balcão Seguro</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-[3px] font-bold uppercase ${
            isBalcaoMode ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-slate-400"
          }`}>
            {isBalcaoMode ? "Ativo" : "Off"}
          </span>
        </DropdownMenuItem>

        {(isBarber(user) || isAdmin(user)) && (
          <DropdownMenuItem
            onClick={() => navigate("/barbeiro")}
            className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-1.5 rounded-[2px]"
            data-testid="switch-to-barber"
          >
            <Scissors className="mr-2 h-3.5 w-3.5 text-[#D4AF37]" /> Painel do Barbeiro
          </DropdownMenuItem>
        )}

        {isSuperAdmin(user) && (
          <DropdownMenuItem
            onClick={() => navigate("/superadmin")}
            className="text-xs focus:bg-[#D4AF37]/20 focus:text-white cursor-pointer py-1.5 rounded-[2px] font-bold text-[#D4AF37] border border-[#D4AF37]/30 bg-[#D4AF37]/10"
            data-testid="switch-to-superadmin"
          >
            <ShieldCheck className="mr-2 h-3.5 w-3.5 text-[#D4AF37]" /> Painel SuperAdmin (Master)
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          onClick={() => navigate("/configuracoes")}
          className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-1.5 rounded-[2px]"
        >
          <SettingsIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Configurações Operacionais
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10 my-1" />

        <DropdownMenuItem
          onClick={() => { logout(); navigate("/login"); }}
          className="text-xs text-[#EF4444] focus:bg-[#EF4444]/15 focus:text-[#EF4444] cursor-pointer py-2 rounded-[2px] font-semibold"
          data-testid="header-logout-btn"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Layout() {
  const [modalNovoAtendimento, setModalNovoAtendimento] = useState(false);
  const [modalNovaDespesa, setModalNovaDespesa] = useState(false);
  const [modalNovaRetirada, setModalNovaRetirada] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [copiedShopLink, setCopiedShopLink] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("kupola_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("kupola_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const location = useLocation();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const { isBalcaoMode, toggleBalcaoMode } = useBalcao();
  const { plan, openUpgradeModal, subscription, isSubscriptionExpired: unitSubscriptionExpired } = useUnit();
  const { data: barbershop } = useApi((api) => api.get("/barbershop"));
  const shopSlug = barbershop?.slug || "barbearia-vintage";

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

  const copyPublicLink = () => {
    const url = `${window.location.origin}/agendar/${shopSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedShopLink(true);
    toast.success("Link público de agendamento copiado!");
    setTimeout(() => setCopiedShopLink(false), 2500);
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0B0D14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-[4px] bg-[#D4AF37] flex items-center justify-center text-[#0B0D14] font-black animate-pulse">
            <Scissors className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground animate-pulse">Carregando barbearia...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (!isAdmin(user)) return <Navigate to="/barbeiro" replace />;

  const allItems = NAV_SECTIONS.flatMap((s) => s.items).filter((i) => i.to);
  const current = allItems.find((i) => (i.end ? location.pathname === "/" : i.to !== "/" && location.pathname.startsWith(i.to)));
  const pageTitle = current?.label || (location.pathname.startsWith("/equipe/") ? "Relatório do Barbeiro" : "Visão Geral");

  const displayName = user?.name || "Administrador";
  const userRole = user?.role === "dono" ? "Dono" : rolesLabel(user) || "Dono";

  const renderNavSection = (section, isDrawer = false, isCollapsed = false) => {
    // Filter items by permission
    const accessibleItems = section.items.filter((item) => canAccess(user, item));
    if (!accessibleItems.length) return null;

    if (isCollapsed) {
      return (
        <div key={section.title} className="space-y-1">
          <div className="h-px bg-white/[0.06] my-1 mx-1" />
          <div className="space-y-1">
            {accessibleItems.map((item) => {
              const Icon = item.icon;
              if (item.action === "novo_atendimento") {
                return (
                  <button
                    key="action-novo-atendimento"
                    onClick={() => {
                      setModalNovoAtendimento(true);
                    }}
                    className="w-full flex items-center justify-center rounded-[3px] p-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                    title={item.label}
                    data-testid="sidebar-collapsed-novo-atendimento"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[#D4AF37]" />
                  </button>
                );
              }

              const isActive = item.end ? location.pathname === "/" : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={`w-full flex items-center justify-center rounded-[3px] p-2 text-xs transition-colors ${
                    isActive
                      ? "bg-[#D4AF37]/15 text-[#D4AF37] font-bold border-l-2 border-[#D4AF37]"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                  title={item.label}
                  data-testid={item.testId}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? "text-[#D4AF37]" : "text-slate-400 group-hover:text-white"
                    }`}
                  />
                </NavLink>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div key={section.title} className="pt-3 first:pt-0">
        <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">
          {section.title}
        </p>
        <div className="space-y-0.5">
          {accessibleItems.map((item) => {
            const Icon = item.icon;
            if (item.action === "novo_atendimento") {
              return (
                <button
                  key="action-novo-atendimento"
                  onClick={() => {
                    if (isDrawer) setMobileDrawerOpen(false);
                    setModalNovoAtendimento(true);
                  }}
                  className="w-full group flex items-center justify-between rounded-[3px] px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-white/5 hover:text-white transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 text-[#D4AF37]" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-[2px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-1.5 py-0.2 text-[9px] font-bold text-[#D4AF37]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            }

            const isActive = item.end ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => {
                  if (isDrawer) setMobileDrawerOpen(false);
                }}
                className={`group flex items-center gap-2.5 rounded-[3px] px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#D4AF37]/15 text-[#D4AF37] font-bold border-l-2 border-[#D4AF37] pl-2.5"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
                data-testid={item.testId}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? "text-[#D4AF37]" : "text-slate-400 group-hover:text-white"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#05070B] text-[#F5F5F5] antialiased overflow-x-hidden w-full selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
      {/* ======================================================== */}
      {/* 1. DESKTOP SIDEBAR (>= 1024px) FIXA                       */}
      {/* ======================================================== */}
      <aside
        className="hidden lg:flex shrink-0 flex-col fixed inset-y-0 left-0 z-30 w-[260px] sm:w-[270px] h-screen max-h-screen overflow-hidden"
        data-testid="desktop-sidebar"
      >
        <Sidebar isMobile={false} />
      </aside>

      {/* ======================================================== */}
      {/* 2. DRAWER MOBILE LATERAL COMPLETO (Com APENAS UM botão 'X')*/}
      {/* ======================================================== */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex" data-testid="mobile-drawer-overlay">
          {/* Backdrop blur com fechamento ao clicar fora */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          {/* Painel lateral deslizando com sombra suave e sem botões duplicados */}
          <div className="relative z-10 w-[270px] max-w-[85vw] h-full max-h-screen flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 overflow-hidden">
            <Sidebar isMobile={true} onCloseMobile={() => setMobileDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. CONTEÚDO PRINCIPAL (Área Central)                      */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 w-full transition-all duration-300 ease-in-out lg:pl-[260px] sm:lg:pl-[270px]">
        {/* CABEÇALHO MOBILE (< 1024px) - KUPOLA 2.0 COM LOGO CENTRALIZADO E PROTEGIDO CONTRA CORTES */}
        <header className="lg:hidden sticky top-0 z-40 bg-[#05070B]/95 backdrop-blur-md border-b border-[#121824] px-3 sm:px-4 py-2">
          <div className="flex items-center justify-between gap-2 max-w-full">
            {/* Lado Esquerdo: Botão Hambúrguer */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl shrink-0"
              aria-label="Abrir menu de navegação"
              data-testid="mobile-menu-trigger"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Centro: Logotipo KUPOLA Oficial 2.0 (min-w-max, nunca cortado, centralizado com orgulho) */}
            <div className="flex items-center justify-center flex-1 shrink-0 px-1 min-w-max">
              <KupolaLogo subtext="GESTÃO PARA BARBEARIAS" />
            </div>

            {/* Lado Direito: Notificações (e mês a partir de telas sm) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="hidden sm:block">
                <MonthSwitcher />
              </div>
              <NotificationsBell />
            </div>
          </div>
        </header>

        {/* CABEÇALHO DESKTOP (>= 1024px) - KUPOLA 2.0 */}
        <header className="hidden lg:flex items-center justify-between h-16 px-6 lg:px-8 border-b border-[#121824] bg-[#05070B]/95 backdrop-blur-md sticky top-0 z-20">
          {/* Lado Esquerdo: Toggle Hambúrguer + Input de Busca Elegante */}
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-9 w-9 text-[#8B93A1] hover:text-[#D4AF37] hover:bg-white/[0.05] rounded-xl cursor-pointer transition-colors shrink-0"
              title={isSidebarCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
              aria-label="Alternar barra lateral"
              data-testid="header-sidebar-toggle-btn"
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Input de Busca Fiel ao Kupola 2.0 */}
            <div 
              onClick={() => navigate("/clientes")}
              className="flex items-center gap-3 w-[280px] xl:w-[360px] px-3.5 py-1.5 bg-[#0A0E15] hover:bg-[#0D121B] border border-[#161e2c] hover:border-[#D4AF37]/40 rounded-xl text-left text-xs text-slate-400 transition-all shadow-inner group cursor-pointer"
            >
              <Search className="w-4 h-4 text-slate-400 group-hover:text-[#E5C365] transition-colors shrink-0" />
              <span className="flex-1 truncate">Buscar cliente, agendamento ou atendimento...</span>
              <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-[#111722] rounded border border-slate-700/60 shrink-0">Ctrl K</kbd>
            </div>
          </div>

          {/* Lado Direito: Seletor de Mês, Notificações com badge, Perfil */}
          <div className="flex items-center gap-3">
            <MonthSwitcher />
            <NotificationsBell />
            <div className="h-6 w-px bg-white/[0.08]" />
            <UserAvatarMenu />
          </div>
        </header>

        {/* ÁREA DE CONTEÚDO PRINCIPAL (com padding inferior amplo e safe-area para nunca cortar conteúdo sob a barra fixa) */}
        <main className="flex-1 w-full max-w-full overflow-x-hidden px-3.5 py-4 sm:px-6 lg:px-8 lg:py-7 pb-[calc(7.5rem+env(safe-area-inset-bottom,20px))] lg:pb-12">
          <div className="w-full max-w-full 2xl:max-w-[1920px] mx-auto">
            <ErrorBoundary title="Ops! Erro ao carregar esta tela">
              <Outlet
                context={{
                  openNovoAtendimento: () => setModalNovoAtendimento(true),
                  openNovaDespesa: () => setModalNovaDespesa(true),
                  openNovaRetirada: () => setModalNovaRetirada(true),
                }}
              />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* ======================================================== */}
      {/* 4. BARRA DE NAVEGAÇÃO INFERIOR FIXA (MOBILE < 1024px)     */}
      {/* ======================================================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0A0E15]/95 backdrop-blur-md border-t border-white/[0.07] flex items-center justify-around px-2 shadow-2xl pb-[max(env(safe-area-inset-bottom),0px)]">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname === item.to ||
                location.pathname.startsWith(item.to + "/");
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                isActive ? "text-[#D4AF37]" : "text-[#8B93A1] hover:text-[#F5F5F5]"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-[#D4AF37]" : "text-[#8B93A1]"}`} />
              <span
                className={`text-[10px] mt-1 tracking-tight ${
                  isActive ? "font-bold text-[#D4AF37]" : "font-medium"
                }`}
              >
                {item.label}
              </span>
              {isActive && <div className="h-0.5 w-6 bg-[#D4AF37] mt-0.5 rounded-full" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Modal Global: Novo Atendimento */}
      <NovoAtendimentoModal
        open={modalNovoAtendimento}
        onOpenChange={setModalNovoAtendimento}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent("refresh-dashboard-data"));
        }}
      />

      {/* Modal Global: Nova Despesa */}
      <NovaDespesaModal
        open={modalNovaDespesa}
        onOpenChange={setModalNovaDespesa}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent("refresh-dashboard-data"));
        }}
      />

      {/* Modal Global: Nova Retirada */}
      <NovaRetiradaModal
        open={modalNovaRetirada}
        onOpenChange={setModalNovaRetirada}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent("refresh-dashboard-data"));
        }}
      />

      {/* Modal Global: Upgrade de Assinatura & Planos */}
      <ErrorBoundary fallback={null}>
        <UpgradeModal />
      </ErrorBoundary>

      {/* Modal Bloqueante Global: Assinatura / Trial Expirado */}
      <ErrorBoundary fallback={null}>
        <SubscriptionExpiredModal open={isSubscriptionExpired} />
      </ErrorBoundary>
    </div>
  );
}
