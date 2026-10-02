import { useState, useMemo } from "react";
import {
  LayoutDashboard, Users2, CalendarDays, Contact, Crown, Scissors,
  Package, Tags, TrendingUp, Receipt, CreditCard, Coins, HandCoins,
  ArrowRightLeft, BarChart3, History, Settings as SettingsIcon,
  ShieldCheck, Users, Wallet, ChevronLeft, ChevronRight, Sparkles,
  ExternalLink, Smartphone,
} from "lucide-react";

// Catálogo completo de telas do sistema.
// Cada entrada mapeia uma área do app Kupola para um arquivo de mockup.
export const PREVIEW_SECTIONS = [
  {
    title: "Operacional do Dia",
    items: [
      { id: "dashboard", label: "Dashboard Geral", icon: LayoutDashboard, file: "Dashboard" },
      { id: "operacional", label: "Fila & Agenda do Dia", icon: Users, file: "Operacional" },
      { id: "calendario", label: "Calendário Operacional", icon: CalendarDays, file: "Calendario" },
      { id: "fluxo-caixa", label: "Fluxo de Caixa & DRE", icon: Wallet, file: "FluxoCaixa" },
    ],
  },
  {
    title: "Lançamentos & Caixa",
    items: [
      { id: "receitas", label: "Receitas & Histórico", icon: TrendingUp, file: "Receitas" },
      { id: "despesas", label: "Despesas Operacionais", icon: Receipt, file: "Despesas" },
      { id: "comissoes", label: "Comissões dos Barbeiros", icon: Coins, file: "Comissoes" },
      { id: "retiradas", label: "Retiradas do Dono", icon: HandCoins, file: "Retiradas" },
      { id: "fechamento", label: "Fechamento de Caixa", icon: ArrowRightLeft, file: "Fechamento" },
    ],
  },
  {
    title: "Administração",
    items: [
      { id: "barbearia", label: "Cadastro da Barbearia", icon: Sparkles, file: "Barbearia" },
      { id: "equipe", label: "Equipe & Escala", icon: Users2, file: "Equipe" },
      { id: "barbeiro-relatorio", label: "Relatório do Barbeiro", icon: Users2, file: "BarberReport" },
      { id: "clientes", label: "Clientes", icon: Contact, file: "Clientes" },
      { id: "planos-clientes", label: "Planos & Assinaturas", icon: Crown, file: "PlanosClientes" },
      { id: "servicos", label: "Catálogo de Serviços", icon: Scissors, file: "Servicos" },
      { id: "produtos", label: "Estoque de Produtos", icon: Package, file: "Produtos" },
      { id: "categorias", label: "Categorias", icon: Tags, file: "Categorias" },
      { id: "usuarios", label: "Usuários & Acessos", icon: ShieldCheck, file: "Usuarios" },
    ],
  },
  {
    title: "Análises & Configurações",
    items: [
      { id: "comparacao", label: "Comparar Maquininhas", icon: BarChart3, file: "Comparacao" },
      { id: "maquininhas", label: "Maquininhas & Taxas", icon: CreditCard, file: "Maquininhas" },
      { id: "historico", label: "Histórico / Logs", icon: History, file: "Historico" },
      { id: "configuracoes", label: "Configurações Operacionais", icon: SettingsIcon, file: "Configuracoes" },
    ],
  },
  {
    title: "Sistema & Plataforma",
    items: [
      { id: "superadmin", label: "Painel SuperAdmin", icon: ShieldCheck, file: "SuperAdmin" },
      { id: "barbeiro-app", label: "Portal do Barbeiro (Mobile)", icon: Smartphone, file: "BarbeiroApp" },
    ],
  },
];

// Componente de cabeçalho de página padronizado para todas as telas do preview.
export function PreviewHeader({ title, subtitle, period, kpi, actions }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/80">
            Painel ADM / Preview
          </span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Mockup de alta fidelidade
          </span>
        </div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-slate-400 max-w-2xl leading-relaxed">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {period && (
          <div className="flex items-center gap-1 rounded-[4px] border border-white/10 bg-[#12141F] px-2 py-1 shadow-none">
            <CalendarDays className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span className="text-xs font-bold capitalize text-white whitespace-nowrap px-2.5">
              {period}
            </span>
          </div>
        )}
        {kpi && (
          <div className="rounded-[4px] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-3 py-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#D4AF37] block leading-tight">Indicador</span>
            <span className="text-xs font-bold text-[#E6CA65] leading-tight">{kpi}</span>
          </div>
        )}
        {actions}
      </div>
    </div>
  );
}

// Card KPI reutilizável em todas as telas.
export function KpiCard({ label, value, delta, positive, note, accent = "white", testid }) {
  const accentMap = {
    white: "border-white/10",
    gold: "border-[#D4AF37]/30 bg-[#D4AF37]/[0.04]",
    profit: "border-emerald-500/30 bg-emerald-500/[0.04]",
    loss: "border-rose-500/30 bg-rose-500/[0.04]",
  };
  const labelColorMap = {
    white: "text-slate-400",
    gold: "text-[#D4AF37]",
    profit: "text-emerald-400",
    loss: "text-rose-400",
  };
  const valueColorMap = {
    white: "text-white",
    gold: "text-[#E6CA65]",
    profit: "text-emerald-400",
    loss: "text-rose-300",
  };

  return (
    <div
      className={`rounded-[4px] border bg-[#131622] p-4 transition-colors hover:border-[#D4AF37]/40 ${accentMap[accent]}`}
      data-testid={testid}
    >
      <span className={`text-[10px] font-bold uppercase tracking-wider ${labelColorMap[accent]}`}>
        {label}
      </span>
      <p className={`mt-1 font-display text-xl lg:text-2xl font-bold tracking-tight ${valueColorMap[accent]}`}>
        {value}
      </p>
      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
        {delta && (
          <span
            className={`inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 font-bold ${
              positive ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
            }`}
          >
            {positive ? "▲" : "▼"} {delta}
          </span>
        )}
        {note && <span className="truncate">{note}</span>}
      </div>
    </div>
  );
}

// Badge padronizado do preview.
export function PB({ children, tone = "default" }) {
  const tones = {
    default: "border-white/10 bg-white/[0.04] text-slate-300",
    gold: "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]",
    profit: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    loss: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    muted: "border-white/10 bg-white/[0.03] text-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

// Avatar circular padrão.
export function Avatar({ initials, size = 8 }) {
  return (
    <div
      className={`h-${size} w-${size} rounded-full bg-gradient-to-br from-[#EAB308] to-[#D4AF37] flex items-center justify-center text-[#0B0F19] font-black text-[10px] border border-[#D4AF37]/50 shrink-0`}
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
    >
      {initials}
    </div>
  );
}

export default function PreviewShell({ active, onNavigate, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const totalScreens = useMemo(
    () => PREVIEW_SECTIONS.reduce((acc, s) => acc + s.items.length, 0),
    []
  );

  return (
    <div className="flex min-h-screen bg-[#0B0D14] text-[#F8FAFC] antialiased overflow-x-hidden w-full">
      {/* Sidebar fixa */}
      <aside
        className={`hidden lg:flex shrink-0 flex-col border-r border-white/[0.08] bg-[#0F121C] fixed inset-y-0 left-0 z-30 transition-all duration-300 ${
          collapsed ? "w-[78px]" : "w-72"
        }`}
        data-testid="preview-sidebar"
      >
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} h-16 border-b border-white/[0.08] shrink-0 px-3`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#EAB308] to-[#D4AF37] flex items-center justify-center text-[#0B0F19] font-black text-sm border border-[#D4AF37]/50 shrink-0">
                K
              </div>
              <div className="min-w-0">
                <span className="font-display font-extrabold text-base tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-500 block truncate leading-tight">
                  Kupola
                </span>
                <p className="text-[10px] text-slate-400 font-medium tracking-wider truncate">
                  Preview de Telas
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="h-8 w-8 text-slate-400 hover:text-[#D4AF37] hover:bg-white/10 rounded-[4px] shrink-0 transition-colors flex items-center justify-center"
            data-testid="preview-sidebar-toggle"
            aria-label="Alternar barra"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto ${collapsed ? "px-2 py-2" : "px-3 py-3"}`}>
          <div className="space-y-4">
            {PREVIEW_SECTIONS.map((section) => (
              <div key={section.title}>
                {!collapsed && (
                  <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">
                    {section.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = active === item.id;
                    if (collapsed) {
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onNavigate(item.id)}
                          className={`w-full flex items-center justify-center rounded-[3px] p-2 text-xs transition-colors ${
                            isActive
                              ? "bg-[#D4AF37]/15 text-[#D4AF37] border-l-2 border-[#D4AF37]"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          }`}
                          title={item.label}
                          data-testid={`preview-nav-${item.id}`}
                        >
                          <Icon className={`h-4 w-4 ${isActive ? "text-[#D4AF37]" : "text-slate-400"}`} />
                        </button>
                      );
                    }
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onNavigate(item.id)}
                        className={`w-full group flex items-center gap-2.5 rounded-[3px] px-3 py-2 text-xs font-medium transition-colors text-left ${
                          isActive
                            ? "bg-[#D4AF37]/15 text-[#D4AF37] font-bold border-l-2 border-[#D4AF37] pl-2.5"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                        data-testid={`preview-nav-${item.id}`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#D4AF37]" : "text-slate-400"}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${collapsed ? "p-2" : "p-3"} border-t border-white/[0.08] bg-[#0C0E16] shrink-0`}>
          {!collapsed ? (
            <div className="space-y-2">
              <a
                href="/landing"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-[4px] bg-[#12141F] hover:bg-[#181B28] border border-white/10 hover:border-[#D4AF37]/40 p-2.5 transition-all"
                data-testid="preview-landing-link"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-[4px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white leading-tight">Landing pública</p>
                    <p className="text-[10px] text-slate-400 leading-tight">Página de vendas</p>
                  </div>
                </div>
              </a>
              <div className="rounded-[4px] bg-[#12141F] border border-white/5 p-2.5">
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  <span className="text-[#D4AF37] font-bold">{totalScreens}</span> telas navegáveis renderizadas a partir do design system Kupola. Dados mockados.
                </p>
              </div>
            </div>
          ) : (
            <a
              href="/landing"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center rounded-[4px] bg-[#12141F] border border-white/10 hover:border-[#D4AF37]/40 p-2 transition-all"
              title="Landing pública"
            >
              <ExternalLink className="h-4 w-4 text-[#D4AF37]" />
            </a>
          )}
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className={`flex-1 flex flex-col min-w-0 w-full transition-all duration-300 ${
        collapsed ? "lg:pl-[78px]" : "lg:pl-72"
      }`}>
        <header className="sticky top-0 z-20 bg-[#0B0D14] border-b border-white/[0.08]">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="lg:hidden h-8 w-8 text-slate-300 hover:text-white hover:bg-white/5 rounded-[4px] flex items-center justify-center"
                aria-label="Menu"
              >
                <Sparkles className="h-4 w-4 text-[#D4AF37]" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium hidden sm:inline">Painel ADM</span>
                <span className="text-white/20 hidden sm:inline">/</span>
                <span className="text-white font-bold text-sm">Preview de Telas</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-[3px] bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] font-bold uppercase">
                  Demo
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/landing"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-slate-300 bg-[#131622] border border-white/10 hover:border-[#D4AF37]/40 rounded-[4px] transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#D4AF37]" />
                Ver Landing
              </a>
              <a
                href="/login"
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider transition-colors"
              >
                Entrar
              </a>
            </div>
          </div>

          {/* Mobile drawer simples */}
          {mobileOpen && (
            <div className="lg:hidden border-t border-white/[0.08] bg-[#0F121C] max-h-[70vh] overflow-y-auto">
              <div className="px-3 py-3 space-y-3">
                {PREVIEW_SECTIONS.map((section) => (
                  <div key={section.title}>
                    <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">
                      {section.title}
                    </p>
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = active === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onNavigate(item.id);
                              setMobileOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 rounded-[3px] px-3 py-2 text-xs font-medium transition-colors text-left ${
                              isActive
                                ? "bg-[#D4AF37]/15 text-[#D4AF37] font-bold border-l-2 border-[#D4AF37] pl-2.5"
                                : "text-slate-400 hover:bg-white/5"
                            }`}
                          >
                            <Icon className={`h-4 w-4 ${isActive ? "text-[#D4AF37]" : "text-slate-400"}`} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 w-full max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8 lg:py-7 pb-20 lg:pb-10">
          <div className="w-full max-w-full 2xl:max-w-[1920px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}