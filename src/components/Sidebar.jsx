import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Home,
  Calendar,
  Scissors,
  Users,
  UserCheck,
  CreditCard,
  LayoutGrid,
  Package,
  Wallet,
  BarChart3,
  Settings,
  Crown,
  HelpCircle,
  MessageCircle,
  Send,
  ArrowRight,
  X,
  Store,
  ChevronDown,
  Check,
  Layers,
  EyeOff,
  Shield,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import KupolaLogo from "./KupolaLogo";
import { useAuth } from "@/context/AuthContext";
import { useUnit } from "@/context/UnitContext";
import { useBalcao } from "@/context/BalcaoContext";
import { rolesLabel, isBarber, isAdmin, isSuperAdmin } from "@/lib/roles";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const MENU_ITEMS = [
  { id: "inicio", to: "/", label: "Início", icon: Home, end: true, testId: "nav-inicio" },
  { id: "agenda", to: "/calendario", label: "Agenda", icon: Calendar, testId: "nav-agenda" },
  { id: "atendimentos", to: "/atendimentos", label: "Atendimentos", icon: Scissors, testId: "nav-atendimentos" },
  { id: "clientes", to: "/clientes", label: "Clientes", icon: Users, testId: "nav-clientes" },
  { id: "barbeiros", to: "/equipe", label: "Barbeiros", icon: UserCheck, testId: "nav-barbeiros" },
  { id: "servicos", to: "/servicos", label: "Serviços", icon: LayoutGrid, testId: "nav-servicos" },
  { id: "produtos", to: "/produtos", label: "Produtos", icon: Package, testId: "nav-produtos" },
  { id: "pagamentos", to: "/maquininhas", label: "Formas de Pagamento", icon: CreditCard, testId: "nav-pagamentos" },
  { id: "relatorios", to: "/relatorios", label: "Relatórios", icon: BarChart3, testId: "nav-relatorios" },
  { id: "planos", to: "/planos", label: "Planos e Assinatura", icon: Crown, testId: "nav-planos" },
  { id: "configuracoes", to: "/configuracoes", label: "Configurações", icon: Settings, testId: "nav-configuracoes" },
];

export default function Sidebar({
  isMobile = false,
  onCloseMobile,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isBalcaoMode, toggleBalcaoMode } = useBalcao();
  const {
    units = [],
    activeUnitId,
    activeUnit,
    switchUnit,
    plan,
    isPremium,
    subscription,
    isSubscriptionExpired,
    openUpgradeModal,
  } = useUnit();

  // Dados reais do usuário
  const displayName = user?.name || "Administrador";
  const userRole = rolesLabel(user) || (user?.role === "dono" ? "Dono" : "Administrador");
  const userEmail = user?.email || "";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "KP";

  // Data real da renovação do plano
  const renewalDateFormatted = React.useMemo(() => {
    const dateVal =
      subscription?.subscriptionExpiresAt ||
      subscription?.trial_ends_at ||
      user?.subscriptionExpiresAt;
    if (dateVal) {
      try {
        return new Date(dateVal).toLocaleDateString("pt-BR");
      } catch {
        return "12/11/2026";
      }
    }
    return "12/11/2026";
  }, [subscription, user]);

  return (
    <div
      className="flex flex-col h-full max-h-screen bg-[#070A0F] border-r border-[#121824] w-[260px] sm:w-[270px] select-none text-slate-300 overflow-hidden"
      data-testid="kupola-sidebar"
    >
      {/* ======================================================== */}
      {/* 1. CABEÇALHO FIXO: Logo KUPOLA + Botão fechar no mobile   */}
      {/* ======================================================== */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#121824] shrink-0 bg-[#070A0F] z-10">
        <KupolaLogo compact={false} subtext={false} />
        {isMobile && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 -mr-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Fechar menu lateral"
            data-testid="sidebar-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. UNIDADE ATIVA (Compacta, elegante e com seletor real)   */}
      {/* ======================================================== */}
      <div className="px-3 py-2.5 border-b border-[#121824]/80 shrink-0 bg-[#070A0F] z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#0D121B] border border-[#161e2c] hover:border-[#D4AF37]/40 text-left transition-all group cursor-pointer focus:outline-none"
              data-testid="sidebar-unit-selector"
              aria-label="Selecionar unidade"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center shrink-0 text-[#E5C365]">
                  {activeUnitId === "all" ? (
                    <Layers className="w-3.5 h-3.5" />
                  ) : (
                    <Store className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-[8.5px] font-bold uppercase tracking-wider text-[#D4AF37] leading-none mb-0.5">
                    UNIDADE ATIVA
                  </span>
                  <span className="block text-xs font-semibold text-slate-200 truncate group-hover:text-white leading-tight">
                    {activeUnitId === "all"
                      ? "Todas as Unidades (Rede)"
                      : activeUnit?.name || units[0]?.name || "Matriz"}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#D4AF37] shrink-0 transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-64 bg-[#0D121B] border border-[#161e2c] text-white p-1.5 rounded-xl shadow-2xl z-50"
          >
            <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
              Alternar Unidade
            </DropdownMenuLabel>
            {units.map((unit) => {
              const isSelected = activeUnitId === unit.id;
              return (
                <DropdownMenuItem
                  key={unit.id}
                  onClick={() => switchUnit(unit.id)}
                  className={`flex items-center justify-between px-2.5 py-2 text-xs rounded-lg cursor-pointer ${
                    isSelected
                      ? "bg-[#D4AF37]/15 text-[#E5C365] font-semibold"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                  data-testid={`select-unit-${unit.id}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Store className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span className="truncate">{unit.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#E5C365] shrink-0" />}
                </DropdownMenuItem>
              );
            })}
            {isPremium && (
              <>
                <DropdownMenuSeparator className="bg-white/10 my-1" />
                <DropdownMenuItem
                  onClick={() => switchUnit("all")}
                  className={`flex items-center justify-between px-2.5 py-2 text-xs rounded-lg cursor-pointer ${
                    activeUnitId === "all"
                      ? "bg-[#D4AF37]/15 text-[#E5C365] font-semibold"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                  data-testid="select-unit-all"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Layers className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span className="truncate">Todas as Unidades (Rede)</span>
                  </div>
                  {activeUnitId === "all" && <Check className="w-3.5 h-3.5 text-[#E5C365] shrink-0" />}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ======================================================== */}
      {/* 3. MENU PRINCIPAL — ÁREA ROLÁVEL (SOMENTE ESTA ÁREA ROLA) */}
      {/* ======================================================== */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          MENU PRINCIPAL
        </div>
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isCurrent =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname === item.to ||
                location.pathname.startsWith(item.to + "/");

          return (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === "/"}
              onClick={() => {
                if (isMobile && onCloseMobile) onCloseMobile();
              }}
              className={() =>
                `w-full min-h-[48px] h-[48px] sm:h-[50px] flex items-center gap-3.5 px-3.5 rounded-xl text-sm transition-all select-none ${
                  isCurrent
                    ? "bg-[#D4AF37]/10 text-[#E5C365] font-semibold border-l-[3px] border-[#D4AF37] pl-3 shadow-[inset_0_1px_1px_rgba(212,175,55,0.08)]"
                    : "text-slate-400 hover:text-slate-100 hover:bg-[#0D121B] font-medium"
                }`
              }
              data-testid={item.testId}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isCurrent ? "text-[#E5C365]" : "text-slate-400"
                }`}
              />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 4. RODAPÉ FIXO (PERMANECE ACESSÍVEL E FIXO NO RODAPÉ)     */}
      {/* ======================================================== */}
      <div className="shrink-0 border-t border-[#121824] bg-[#070A0F] flex flex-col z-10">
        {/* Status Compacto do Plano */}
        <div className="px-3 pt-2.5 pb-1">
          <button
            type="button"
            onClick={() => {
              if (isMobile && onCloseMobile) onCloseMobile();
              navigate("/planos");
            }}
            className="w-full p-2.5 rounded-xl bg-[#0D121B] hover:bg-[#121824] border border-[#D4AF37]/30 hover:border-[#D4AF37] flex items-center justify-between text-left transition-all cursor-pointer group"
            data-testid="sidebar-plan-btn"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/15 text-[#E5C365] flex items-center justify-center shrink-0 border border-[#D4AF37]/25">
                <Crown className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">PLANO</span>
                  <span className="text-[11px] font-black text-[#E5C365] uppercase truncate">
                    {plan?.name?.toUpperCase() || "PRO"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[9.5px] mt-1 text-slate-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSubscriptionExpired ? "bg-rose-400" : "bg-[#20C997]"}`} />
                  <span className={isSubscriptionExpired ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
                    {isSubscriptionExpired ? "Expirado" : "Ativo"}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span>{plan?.max_barbers || 4} barb.</span>
                </div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#E5C365] group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </div>

        {/* Ajuda e Suporte */}
        <div className="px-3 py-1.5 border-t border-[#121824]/60 text-xs">
          <div className="px-2 pb-1 text-[9.5px] font-bold text-slate-400 uppercase tracking-widest">
            AJUDA E SUPORTE
          </div>
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() =>
                toast.info("Central de Ajuda: Acessando documentação e guias do Kupola...")
              }
              className="w-full flex items-center gap-2.5 px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#0D121B] transition-colors cursor-pointer text-left text-xs"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Central de Ajuda</span>
            </button>
            <a
              href="https://wa.me/5511999999999?text=Ol%C3%A1%20Kupola,%20preciso%20de%20suporte"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center gap-2.5 px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#0D121B] transition-colors cursor-pointer text-left text-xs"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#20C997] shrink-0" />
              <span>Suporte via WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={() =>
                toast.success("Obrigado pelo seu feedback! Nossa equipe está trabalhando para aprimorar o Kupola.")
              }
              className="w-full flex items-center gap-2.5 px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#0D121B] transition-colors cursor-pointer text-left text-xs"
            >
              <Send className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Enviar Feedback</span>
            </button>
          </div>
        </div>

        {/* Perfil do Usuário */}
        <div className="p-2.5 border-t border-[#121824] bg-[#070A0F]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2.5 p-1.5 sm:p-2 rounded-xl bg-[#0D121B] hover:bg-[#121824] border border-[#161e2c] hover:border-[#D4AF37]/40 text-left transition-all cursor-pointer group focus:outline-none"
                data-testid="sidebar-user-card-btn"
                aria-label="Perfil do usuário"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#EAB308] to-[#D4AF37] flex items-center justify-center text-[#0B0F19] font-black text-xs border border-[#D4AF37]/50 shadow-sm">
                      {initials}
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#10B981] ring-2 ring-[#070A0F]"
                      title="Online"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white group-hover:text-[#E5C365] truncate transition-colors leading-tight">
                      {displayName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-400 truncate leading-tight">
                        {userRole}
                      </span>
                      {userEmail && (
                        <>
                          <span className="text-slate-600 text-[9px]">•</span>
                          <span className="text-[9.5px] text-slate-400 truncate leading-tight">
                            {userEmail}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#E5C365] shrink-0 transition-transform duration-200" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              sideOffset={8}
              className="w-64 bg-[#0D121B] border border-[#161e2c] text-white p-2 rounded-xl shadow-2xl z-50"
            >
              <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{displayName}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#10B981] font-semibold bg-[#10B981]/10 px-1.5 py-0.5 rounded border border-[#10B981]/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> Online
                  </span>
                </div>
                {userEmail && <span className="text-xs text-slate-400 truncate">{userEmail}</span>}
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase bg-[#D4AF37]/15 text-[#E5C365] border border-[#D4AF37]/30">
                    {userRole}
                  </span>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-white/10 my-1" />

              {/* Alternar Modo Balcão Seguro */}
              <DropdownMenuItem
                onClick={toggleBalcaoMode}
                className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-1.5 rounded-lg justify-between"
                data-testid="toggle-balcao-menu-item"
              >
                <div className="flex items-center gap-2">
                  {isBalcaoMode ? (
                    <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <Shield className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span>Modo Balcão Seguro</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    isBalcaoMode
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-white/10 text-slate-400"
                  }`}
                >
                  {isBalcaoMode ? "Ativo" : "Off"}
                </span>
              </DropdownMenuItem>

              {(isBarber(user) || isAdmin(user)) && (
                <DropdownMenuItem
                  onClick={() => {
                    if (isMobile && onCloseMobile) onCloseMobile();
                    navigate("/barbeiro");
                  }}
                  className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-1.5 rounded-lg"
                  data-testid="switch-to-barber"
                >
                  <Scissors className="mr-2 h-3.5 w-3.5 text-[#E5C365]" /> Painel do Barbeiro
                </DropdownMenuItem>
              )}

              {isSuperAdmin(user) && (
                <DropdownMenuItem
                  onClick={() => {
                    if (isMobile && onCloseMobile) onCloseMobile();
                    navigate("/superadmin");
                  }}
                  className="text-xs focus:bg-[#D4AF37]/20 focus:text-white cursor-pointer py-1.5 rounded-lg font-bold text-[#E5C365] border border-[#D4AF37]/30 bg-[#D4AF37]/10"
                  data-testid="switch-to-superadmin"
                >
                  <ShieldCheck className="mr-2 h-3.5 w-3.5 text-[#E5C365]" /> Painel SuperAdmin
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => {
                  if (isMobile && onCloseMobile) onCloseMobile();
                  navigate("/configuracoes");
                }}
                className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-1.5 rounded-lg"
              >
                <Settings className="mr-2 h-3.5 w-3.5 text-slate-400" /> Configurações
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/10 my-1" />

              <DropdownMenuItem
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="text-xs text-[#EF4444] focus:bg-[#EF4444]/15 focus:text-[#EF4444] cursor-pointer py-2 rounded-lg font-semibold"
                data-testid="header-logout-btn"
              >
                <LogOut className="mr-2 h-4 w-4" /> Sair da conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
