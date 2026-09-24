import { useState, useMemo } from "react";
import { Outlet, NavLink, useLocation, useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  LayoutDashboard, TrendingUp, Receipt, CreditCard, Users2, Users, Tags,
  ArrowRightLeft, CalendarDays, Wallet, BarChart3, History,
  Settings as SettingsIcon, ChevronLeft, ChevronRight,
  Store, Scissors, Package, ShieldCheck, LogIn, LogOut,
  UserCircle2, Contact, Bell, Plus, Sparkles, ChevronDown, CheckCircle2,
  AlertTriangle, AlertCircle, Info, Menu, HandCoins, X,
  Link2, Copy, Check, ExternalLink, Crown, EyeOff, Shield,
  Globe, ArrowUpRight,
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
import { isAdmin, isBarber, isDono, isGerente, isCaixa, rolesLabel, canAccess } from "@/lib/roles";
import NovoAtendimentoModal from "@/components/NovoAtendimentoModal";
import NovaDespesaModal from "@/components/NovaDespesaModal";
import NovaRetiradaModal from "@/components/NovaRetiradaModal";
import UnitSelector from "@/components/UnitSelector";
import UpgradeModal from "@/components/UpgradeModal";
import SubscriptionExpiredModal from "@/components/SubscriptionExpiredModal";

// Estrutura de Navegação Completa Organizada por Módulos
export const NAV_SECTIONS = [
  {
    title: "OPERACIONAL (DO DIA)",
    items: [
      { to: "/atendimentos", label: "Fila & Agenda do Dia", icon: Users, badge: "Ao Vivo", testId: "nav-atendimentos", perm: ["ver_receitas", "gerenciar_fila", "gerenciar_agenda"] },
      { to: "/", label: "Dashboard Geral", icon: LayoutDashboard, end: true, testId: "nav-dashboard", perm: ["ver_dashboard", "ver_financeiro"] },
      { to: "/fluxo-de-caixa", label: "Fluxo de Caixa & DRE", icon: Wallet, testId: "nav-fluxo-de-caixa", perm: ["ver_financeiro", "ver_relatorios"], donoOnly: true },
      { to: "/calendario", label: "Calendário Operacional", icon: CalendarDays, testId: "nav-calendario", perm: ["ver_financeiro", "registrar_despesas"] },
    ],
  },
  {
    title: "LANÇAMENTOS & CAIXA",
    items: [
      { action: "novo_atendimento", label: "Novo Atendimento", icon: Scissors, badge: "Rápido", perm: ["registrar_atendimentos"] },
      { to: "/receitas", label: "Receitas & Histórico", icon: TrendingUp, testId: "nav-receitas", perm: ["ver_receitas"] },
      { to: "/despesas", label: "Despesas Operacionais", icon: Receipt, testId: "nav-despesas", perm: ["registrar_despesas"] },
      { to: "/retiradas", label: "Retiradas do Dono", icon: HandCoins, testId: "nav-retiradas", perm: ["ver_financeiro"], donoOnly: true },
      { to: "/fechamento", label: "Fechamento de Caixa", icon: ArrowRightLeft, testId: "nav-fechamento", perm: ["ver_financeiro"] },
    ],
  },
  {
    title: "ADMINISTRAÇÃO",
    items: [
      { to: "/barbearia", label: "Cadastro da Barbearia", icon: Store, testId: "nav-barbearia", perm: ["alterar_configuracoes"] },
      { to: "/equipe", label: "Equipe & Escala de Barbeiros", icon: Users2, testId: "nav-equipe", perm: ["gerenciar_barbeiros", "cadastrar_barbeiros", "editar_barbeiros"] },
      { to: "/clientes", label: "Clientes", icon: Contact, testId: "nav-clientes", perm: ["gerenciar_clientes"] },
      { to: "/servicos", label: "Catálogo de Serviços", icon: Scissors, testId: "nav-servicos", perm: ["gerenciar_servicos"] },
      { to: "/produtos", label: "Estoque de Produtos", icon: Package, testId: "nav-produtos", perm: ["gerenciar_produtos"] },
      { to: "/categorias", label: "Categorias", icon: Tags, testId: "nav-categorias", perm: ["alterar_configuracoes"] },
      { to: "/usuarios", label: "Usuários & Acessos", icon: ShieldCheck, testId: "nav-usuarios", donoOnly: true },
    ],
  },
  {
    title: "ANÁLISES & CONFIGURAÇÕES",
    items: [
      { to: "/comparacao", label: "Comparar Maquininhas", icon: BarChart3, testId: "nav-comparacao", perm: ["ver_financeiro", "ver_relatorios"], donoOnly: true },
      { to: "/maquininhas", label: "Maquininhas & Taxas", icon: CreditCard, testId: "nav-maquininhas", perm: ["alterar_taxas"], donoOnly: true },
      { to: "/historico", label: "Histórico / Logs", icon: History, testId: "nav-historico", perm: ["ver_relatorios", "alterar_configuracoes"] },
      { to: "/configuracoes", label: "Configurações Operacionais", icon: SettingsIcon, testId: "nav-configuracoes", perm: ["alterar_configuracoes"] },
    ],
  },
];

// Mobile Bottom Navigation (4 abas fundamentais)
const MOBILE_BOTTOM_NAV = [
  { to: "/", label: "Início", icon: LayoutDashboard, end: true },
  { to: "/atendimentos", label: "Atendimentos", icon: Users },
  { to: "/clientes", label: "Clientes", icon: Contact },
  { to: "/fluxo-de-caixa", label: "Relatórios", icon: BarChart3 },
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

function UserAvatarMenu() {
  const { user, logout } = useAuth();
  const { isBalcaoMode, toggleBalcaoMode } = useBalcao();
  const navigate = useNavigate();

  const displayName = user?.name || "Guilherme Pereira";
  const userRole = user?.role === "dono" ? "Dono" : rolesLabel(user) || "Dono";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex items-center gap-2.5 rounded-[4px] p-1 lg:px-2.5 lg:py-1.5 transition-colors hover:bg-white/5 border border-transparent hover:border-white/10 focus:outline-none cursor-pointer"
          data-testid="header-user-btn"
          aria-label="Menu do usuário"
        >
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#EAB308] to-[#D4AF37] flex items-center justify-center text-[#0B0F19] font-black text-xs border border-[#D4AF37]/50">
              {displayName.substring(0, 2).toUpperCase()}
            </div>
            {/* Status Online Indicator */}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#10B981] ring-2 ring-[#0B0F19]"
              title="Online"
            />
          </div>
          <div className="hidden lg:flex flex-col text-left leading-tight">
            <span className="text-xs font-bold text-white tracking-tight">{displayName}</span>
            <span className="text-[10px] text-muted-foreground">({userRole})</span>
          </div>
          <ChevronDown className="hidden lg:block h-3.5 w-3.5 text-muted-foreground ml-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 bg-[#131622] border-white/10 text-white p-2 rounded-[4px] shadow-xl">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="font-bold text-sm text-white">{displayName}</span>
          <span className="text-xs text-muted-foreground">{user?.email || "contato@barbearia.com"}</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-block rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold uppercase bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
              {userRole}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-[#10B981] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> Online
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        
        {/* Toggle Modo Caixa / Balcão Seguro */}
        <DropdownMenuItem
          onClick={toggleBalcaoMode}
          className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-2 rounded-[2px] justify-between"
          data-testid="toggle-balcao-menu-item"
        >
          <div className="flex items-center gap-2">
            {isBalcaoMode ? <EyeOff className="h-4 w-4 text-amber-400" /> : <Shield className="h-4 w-4 text-slate-400" />}
            <span>Modo Balcão Seguro</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-[3px] font-bold uppercase ${
            isBalcaoMode ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-slate-400"
          }`}>
            {isBalcaoMode ? "Ativo" : "Off"}
          </span>
        </DropdownMenuItem>

        {isBarber(user) && (
          <DropdownMenuItem
            onClick={() => navigate("/barbeiro")}
            className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-2 rounded-[2px]"
            data-testid="switch-to-barber"
          >
            <Scissors className="mr-2 h-4 w-4 text-[#D4AF37]" /> Meu Painel de Barbeiro
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => navigate("/configuracoes")}
          className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-2 rounded-[2px]"
        >
          <SettingsIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onClick={() => { logout(); navigate("/login"); }}
          className="text-xs text-[#EF4444] focus:bg-[#EF4444]/15 focus:text-[#EF4444] cursor-pointer py-2 rounded-[2px]"
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
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/barbeiro" replace />;

  const allItems = NAV_SECTIONS.flatMap((s) => s.items).filter((i) => i.to);
  const current = allItems.find((i) => (i.end ? location.pathname === "/" : i.to !== "/" && location.pathname.startsWith(i.to)));
  const pageTitle = current?.label || (location.pathname.startsWith("/equipe/") ? "Relatório do Barbeiro" : "Visão Geral");

  const displayName = user?.name || "Guilherme Pereira";
  const userRole = user?.role === "dono" ? "Dono" : rolesLabel(user) || "Dono";

  const renderNavSection = (section, isDrawer = false) => {
    // Filter items by permission
    const accessibleItems = section.items.filter((item) => canAccess(user, item));
    if (!accessibleItems.length) return null;

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
                  className="w-full group flex items-center justify-between rounded-[3px] px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-white/5 hover:text-white transition-colors text-left"
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
    <div className="flex min-h-screen bg-[#0B0D14] text-[#F8FAFC] antialiased overflow-x-hidden w-full selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
      {/* ======================================================== */}
      {/* 1. DESKTOP SIDEBAR (>= 1024px) FIXA                       */}
      {/* ======================================================== */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/[0.08] bg-[#0F121C] fixed inset-y-0 left-0 z-30">
        {/* Topo da Sidebar: Logo e nome */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.08] shrink-0">
          <img 
            src="/logo.png" 
            alt="KortePro" 
            className="h-10 w-10 rounded-full object-cover border border-[#D4AF37]/30 shadow-md shadow-[#D4AF37]/10 shrink-0" 
          />
          <div className="min-w-0 flex-1">
            <span className="font-display font-extrabold text-base tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-500 block truncate leading-tight">
              KortePro
            </span>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider truncate mt-0.5">
              {barbershop?.name || "Painel de Gestão"}
            </p>
          </div>
        </div>

        {/* Seletor de Unidade & Badge do Plano na Sidebar */}
        <div className="px-3 py-2.5 border-b border-white/[0.08] space-y-2 bg-[#0C0E16]">
          <div className="w-full">
            <UnitSelector variant="sidebar" />
          </div>
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] bg-[#12141F] border border-white/5">
            <div className="flex items-center gap-1.5">
              <Crown className={`h-3.5 w-3.5 ${plan.id === 'premium' ? 'text-[#D4AF37]' : plan.id === 'pro' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">{plan.name}</span>
            </div>
            <button
              onClick={() => openUpgradeModal({ title: "Planos & Assinatura" })}
              className="text-[10px] font-semibold text-[#D4AF37] hover:underline cursor-pointer"
            >
              {plan.id === 'premium' ? 'Gerenciar' : 'Upgrade'}
            </button>
          </div>
        </div>

        {/* Links de Navegação Organizados por Módulos */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {NAV_SECTIONS.map((section) => renderNavSection(section, false))}
        </div>

        {/* Rodapé da Sidebar: Perfil do Usuário */}
        <div className="p-3 border-t border-white/[0.08] bg-[#0C0E16] shrink-0">
          <div className="flex items-center justify-between gap-2 rounded-[4px] bg-[#12141F] border border-white/5 p-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#EAB308] to-[#D4AF37] flex items-center justify-center text-[#0B0D14] font-black text-xs shrink-0">
                {displayName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{displayName}</p>
                <span className="inline-block rounded-[2px] px-1.5 py-0.2 text-[9px] font-bold uppercase bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  {userRole}
                </span>
              </div>
            </div>
            <UserAvatarMenu />
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. DRAWER MOBILE LATERAL COMPLETO (Trigger via Hambúrguer)*/}
      {/* ======================================================== */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[300px] p-0 bg-[#0F121C] border-r border-white/[0.08] text-white flex flex-col z-50 shadow-xl"
        >
          <SheetHeader className="p-4 border-b border-white/[0.08] flex flex-row items-center justify-between">
            <div className="flex items-center gap-3 text-left">
              <img 
                src="/logo.png" 
                alt="KortePro" 
                className="h-10 w-10 rounded-full object-cover border border-[#D4AF37]/30 shadow-md shrink-0" 
              />
              <div>
                <SheetTitle className="text-base font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-500">
                  KortePro
                </SheetTitle>
                <p className="text-[10px] text-slate-400 font-medium tracking-wider truncate max-w-[170px]">
                  {barbershop?.name || "Menu Principal"}
                </p>
              </div>
            </div>
          </SheetHeader>

          {/* Seletor de Unidade e Plano no Mobile Drawer */}
          <div className="px-4 py-2.5 border-b border-white/[0.08] space-y-2 bg-[#0C0E16]">
            <UnitSelector variant="sidebar" />
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] bg-[#12141F] border border-white/5">
              <div className="flex items-center gap-1.5">
                <Crown className={`h-3.5 w-3.5 ${plan.id === 'premium' ? 'text-[#D4AF37]' : plan.id === 'pro' ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">{plan.name}</span>
              </div>
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  openUpgradeModal({ title: "Planos & Assinatura" });
                }}
                className="text-[10px] font-semibold text-[#D4AF37] hover:underline cursor-pointer"
              >
                {plan.id === 'premium' ? 'Gerenciar' : 'Upgrade'}
              </button>
            </div>
          </div>

          {/* Navegação completa no celular */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {NAV_SECTIONS.map((section) => renderNavSection(section, true))}
          </div>

          {/* Rodapé do Drawer com perfil e logout */}
          <div className="p-3 border-t border-white/[0.08] bg-[#0C0E16]">
            <div className="flex items-center justify-between gap-2 rounded-[4px] bg-[#12141F] border border-white/5 p-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#EAB308] to-[#D4AF37] text-[#0B0D14] font-black text-xs flex items-center justify-center shrink-0">
                  {displayName.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <UserAvatarMenu />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ======================================================== */}
      {/* 3. CONTEÚDO PRINCIPAL (Área Central)                      */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 w-full">
        {/* CABEÇALHO MOBILE (< 1024px) */}
        <header className="lg:hidden sticky top-0 z-40 bg-[#0F121C] border-b border-white/[0.08]">
          {/* Linha 1: Hambúrguer, Logo, Sino com badge e Avatar com status online */}
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileDrawerOpen(true)}
                className="h-9 w-9 text-slate-300 hover:text-white hover:bg-white/5 -ml-1 rounded-[4px]"
                aria-label="Abrir menu de navegação"
                data-testid="mobile-menu-trigger"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-2">
                <img 
                  src="/logo.png" 
                  alt="KortePro" 
                  className="h-8 w-8 rounded-full object-cover border border-[#D4AF37]/30 shadow-sm shrink-0" 
                />
                <div className="flex flex-col">
                  <span className="font-display font-extrabold text-sm tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-400">
                    KortePro
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium truncate max-w-[130px] mt-0.5">
                    {barbershop?.name || "Gestão"}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações Topo Direito */}
            <div className="flex items-center gap-1.5">
              {isBalcaoMode && (
                <span
                  onClick={toggleBalcaoMode}
                  role="button"
                  className="px-2 py-1 rounded-[3px] bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  title="Modo Caixa Seguro Ativo (Clique para desativar)"
                >
                  <EyeOff className="h-3 w-3" /> Caixa
                </span>
              )}
              {/* Atalho para Landing Page / Página de Vendas */}
              <a
                href="/landing"
                target="_blank"
                rel="noreferrer"
                className="h-8 px-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#131622] border border-white/10 hover:border-[#D4AF37]/50 rounded-[4px] flex items-center gap-1 transition-colors"
                title="Acessar Página de Vendas / Landing Page"
                data-testid="mobile-landing-link"
              >
                <Globe className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span className="text-[11px]">Início</span>
              </a>

              <Button
                variant="ghost"
                size="icon"
                onClick={copyPublicLink}
                className="h-8 w-8 text-[#D4AF37] hover:bg-[#D4AF37]/15 rounded-[4px]"
                title={`Copiar link público: /agendar/${shopSlug}`}
                data-testid="mobile-copy-public-link"
              >
                {copiedShopLink ? <Check className="h-4 w-4 text-emerald-400 stroke-[3]" /> : <Link2 className="h-4 w-4" />}
              </Button>
              <NotificationsBell />
              <UserAvatarMenu />
            </div>
          </div>

          {/* Linha 2 (Filtro de período) */}
          <div className="px-4 py-2 bg-[#0B0D14] border-t border-white/[0.08] flex items-center justify-center">
            <MonthSwitcher variant="mobile-bar" />
          </div>
        </header>

        {/* CABEÇALHO DESKTOP (>= 1024px) */}
        <header className="hidden lg:flex items-center justify-between h-16 px-8 border-b border-white/[0.08] bg-[#0B0D14] sticky top-0 z-20">
          {/* Breadcrumb */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Painel ADM</span>
              <span className="text-white/20">/</span>
              <span className="text-white font-bold">{pageTitle}</span>
              <Badge className="ml-1 bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30 text-[10px] font-bold uppercase rounded-[3px]">
                {isDono(user) ? "Dono" : isGerente(user) ? "Gerente" : isCaixa(user) ? "Caixa" : "Barbeiro"}
              </Badge>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <UnitSelector variant="header" />
          </div>

          {/* Seletor de Mês Centralizado */}
          <div>
            <MonthSwitcher />
          </div>

          {/* Ações Topo Direito */}
          <div className="flex items-center gap-2.5">
            {/* Atalho para Landing Page / Página de Vendas */}
            <a
              href="/landing"
              target="_blank"
              rel="noreferrer"
              className="bg-[#131622] border border-white/10 text-slate-300 hover:text-white hover:border-[#D4AF37]/50 text-xs font-semibold h-9 px-3 rounded-[4px] gap-1.5 transition-colors shadow-none flex items-center"
              title="Abrir Página Inicial / Landing Page de Vendas"
              data-testid="header-landing-link"
            >
              <Globe className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span className="hidden xl:inline">Página de Vendas</span>
              <span className="xl:hidden">Início</span>
              <ArrowUpRight className="h-3 w-3 text-slate-500" />
            </a>

            {/* Botão Modo Balcão / Caixa Seguro */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleBalcaoMode}
              className={`h-9 px-3 text-xs rounded-[4px] gap-1.5 transition-colors border ${
                isBalcaoMode
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold hover:bg-amber-500/25"
                  : "bg-[#131622] border-white/10 text-slate-400 hover:text-white hover:bg-[#181B28]"
              }`}
              title={isBalcaoMode ? "Modo Caixa Seguro ativo (dados sensíveis ocultos no balcão). Clique para desativar." : "Ativar Modo Caixa Seguro para recepção/balcão"}
              data-testid="toggle-balcao-header"
            >
              {isBalcaoMode ? <EyeOff className="h-3.5 w-3.5 text-amber-400" /> : <Shield className="h-3.5 w-3.5" />}
              <span className="hidden xl:inline">{isBalcaoMode ? "Modo Caixa Ativo" : "Modo Caixa (Balcão)"}</span>
            </Button>

            {/* Botão Copiar Link Público Geral da Barbearia */}
            <Button
              variant="outline"
              size="sm"
              onClick={copyPublicLink}
              className="bg-[#131622] border border-white/10 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/40 text-xs font-semibold h-9 px-3 rounded-[4px] gap-1.5 transition-colors shadow-none"
              title={`Copiar link público geral da barbearia (/agendar/${shopSlug})`}
              data-testid="header-copy-public-link"
            >
              {copiedShopLink ? <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[3]" /> : <Link2 className="h-3.5 w-3.5" />}
              <span className="hidden xl:inline">{copiedShopLink ? "Link Copiado!" : "Link de Agendamento"}</span>
              <span className="xl:hidden">{copiedShopLink ? "Copiado!" : "Link"}</span>
            </Button>

            {/* Menu Rápido "+ Lançar" */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-[#131622] border border-white/10 text-white hover:bg-[#181B28] hover:border-[#D4AF37]/40 text-xs font-semibold h-9 px-3 rounded-[4px] gap-1.5 transition-colors shadow-none"
                  data-testid="quick-actions-trigger"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>+ Lançar</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#131622] border border-white/10 text-white p-1.5 rounded-[4px] shadow-xl"
              >
                <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-1">
                  Ações Rápidas
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setModalNovoAtendimento(true)}
                  className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-2 rounded-[2px]"
                >
                  <Scissors className="mr-2 h-4 w-4 text-[#D4AF37]" /> Novo Atendimento
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setModalNovaDespesa(true)}
                  className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-2 rounded-[2px]"
                >
                  <Receipt className="mr-2 h-4 w-4 text-[#EF4444]" /> Nova Despesa
                </DropdownMenuItem>
                {isDono(user) && (
                  <DropdownMenuItem
                    onClick={() => setModalNovaRetirada(true)}
                    className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-2 rounded-[2px]"
                  >
                    <HandCoins className="mr-2 h-4 w-4 text-[#D4AF37]" /> Retirada do Dono
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => navigate("/fechamento")}
                  className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-2 rounded-[2px]"
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4 text-blue-400" /> Fechar Caixa do Dia
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/clientes")}
                  className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-2 rounded-[2px]"
                >
                  <Contact className="mr-2 h-4 w-4 text-[#10B981]" /> Cadastrar Novo Cliente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <NotificationsBell />

            <Button
              onClick={() => setModalNovoAtendimento(true)}
              className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs uppercase h-9 px-4 rounded-[4px] shadow-none active:translate-y-[1px] transition-colors gap-1.5 cursor-pointer"
              data-testid="header-new-service-btn"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Novo Atendimento</span>
            </Button>

            <div className="pl-1 border-l border-white/10">
              <UserAvatarMenu />
            </div>
          </div>
        </header>

        {/* ÁREA DE CONTEÚDO PRINCIPAL (com padding lateral seguro px-4 e overflow-x-hidden) */}
        <main className="flex-1 w-full max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8 lg:py-7 pb-24 lg:pb-8">
          <ErrorBoundary title="Ops! Erro ao carregar esta tela">
            <Outlet
              context={{
                openNovoAtendimento: () => setModalNovoAtendimento(true),
                openNovaDespesa: () => setModalNovaDespesa(true),
                openNovaRetirada: () => setModalNovaRetirada(true),
              }}
            />
          </ErrorBoundary>
        </main>
      </div>

      {/* ======================================================== */}
      {/* 4. BARRA DE NAVEGAÇÃO INFERIOR FIXA (MOBILE < 1024px)     */}
      {/* ======================================================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0F121C] border-t border-white/[0.08] flex items-center justify-around px-2 shadow-xl">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = item.end ? location.pathname === "/" : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                isActive ? "text-[#D4AF37]" : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-[#D4AF37]" : ""}`} />
              <span
                className={`text-[11px] mt-1 tracking-tight ${
                  isActive ? "font-bold text-[#D4AF37]" : "font-medium"
                }`}
              >
                {item.label}
              </span>
              {isActive && <div className="h-0.5 w-6 bg-[#D4AF37] mt-0.5" />}
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
