import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useOutletContext, useNavigate, Navigate } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useFinancialMetricsPolling } from "@/hooks/useFinancialMetricsPolling";
import { useMonth } from "@/context/MonthContext";
import { useAuth } from "@/context/AuthContext";
import { useUnit } from "@/context/UnitContext";
import { isBarber, isAdmin, isDono, isGerente, isCaixa } from "@/lib/roles";
import { useBalcao } from "@/context/BalcaoContext";
import PainelBalcao from "@/components/PainelBalcao";
import { Loading } from "@/components/Shared";
import NetworkView from "@/components/NetworkView";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { brl, fmtDate } from "@/lib/format";
import NovoAtendimentoModal from "@/components/NovoAtendimentoModal";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import {
  Wallet, TrendingUp, Clock, PiggyBank, Percent, Users, Receipt,
  Target, CheckCircle2, Plus, Scissors, ArrowUpRight, ChevronRight,
  CreditCard, HandCoins, ArrowRightLeft, ExternalLink, ChevronDown,
  RefreshCw, Layers, Calendar as CalendarIcon, UserCheck, Shield,
} from "lucide-react";
import SparklineWave from "@/components/dashboard/SparklineWave";
import RecentTransactionRow from "@/components/dashboard/RecentTransactionRow";

export default function Dashboard() {
  const { month } = useMonth();
  const outletCtx = useOutletContext();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const { activeUnitId, isPremium, plan } = useUnit();
  const { isBalcaoMode, toggleBalcaoMode } = useBalcao();

  const [localModalOpen, setLocalModalOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const userIsDono = isDono(user);
  const userIsGerente = isGerente(user) && !userIsDono;
  const userIsCaixa = isCaixa(user);

  const { data: s, loading: loadingSummary, error: errorSummary, mutate: mutateSummary } = useApi((api) => api.get("/dashboard/summary", { month }), [month, refreshTick, activeUnitId]);
  const { data: be, mutate: mutateBe } = useApi((api) => api.get("/dashboard/breakeven", { month }), [month, refreshTick, activeUnitId]);
  const { data: cashflow, mutate: mutateCashflow } = useApi((api) => api.get("/dashboard/cashflow", { month }), [month, refreshTick, activeUnitId]);
  const { data: revenues, mutate: mutateRevenues } = useApi((api) => api.get("/revenues", { month }), [month, refreshTick, activeUnitId]);
  const { data: queueList } = useApi((api) => api.get("/queue"), [refreshTick, activeUnitId]);

  // Hook customizado: polling leve a cada 30 segundos das métricas financeiras (faturamento diário e atendimentos)
  const {
    faturamentoDiario: polledFatDiario,
    totalAtendimentos: polledAtendHoje,
    reload: reloadPollingMetrics,
  } = useFinancialMetricsPolling({
    endpoint: "/financial/metrics-polling",
    interval: 30000,
    deps: [month, activeUnitId],
    onUpdate: () => {
      // Revalidação silenciosa em segundo plano sem recarregar a tela inteira
      mutateSummary?.();
      mutateBe?.();
      mutateCashflow?.();
      mutateRevenues?.();
    },
  });

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTick((t) => t + 1);
      mutateSummary?.();
      mutateBe?.();
      mutateCashflow?.();
      mutateRevenues?.();
      reloadPollingMetrics?.();
    };
    window.addEventListener("refresh-dashboard-data", handleRefresh);
    return () => window.removeEventListener("refresh-dashboard-data", handleRefresh);
  }, [mutateSummary, mutateBe, mutateCashflow, mutateRevenues, reloadPollingMetrics]);

  const handleOpenNovoAtendimento = useCallback(() => {
    if (outletCtx?.openNovoAtendimento) {
      outletCtx.openNovoAtendimento();
    } else {
      setLocalModalOpen(true);
    }
  }, [outletCtx]);

  // Process recent transactions
  const recentTransactions = useMemo(() => {
    if (!Array.isArray(revenues)) return [];
    return [...revenues]
      .filter((r) => r.status === "ativo")
      .slice(0, 6);
  }, [revenues]);

  // Process revenue curve series with golden line and gradient area
  const revenueChartData = useMemo(() => {
    if (!cashflow?.series?.length) return [];
    return cashflow.series.map((item) => ({
      dia: fmtDate(item.date).slice(0, 5),
      dataCompleta: fmtDate(item.date),
      receita: Number(item.in || 0),
      despesas: Number(item.out || 0),
      lucro: Number(((item.in || 0) - (item.out || 0)).toFixed(2)),
    }));
  }, [cashflow]);

  // Distribution of payment methods & card machines
  const paymentMethodsData = useMemo(() => {
    if (!Array.isArray(revenues) || !revenues.length) return [];
    const map = {};
    let total = 0;
    revenues.forEach((r) => {
      if (r.status !== "ativo") return;
      const name = r.payment_method_name || (r.payment_type ? r.payment_type.toUpperCase() : "PIX");
      const amount = Number(r.paid_amount || r.gross_amount || 0);
      map[name] = (map[name] || 0) + amount;
      total += amount;
    });

    const palette = [
      "#D4AF37", // Dourado
      "#10B981", // Esmeralda
      "#3B82F6", // Azul Safira
      "#8B5CF6", // Violeta
      "#F59E0B", // Âmbar
      "#EC4899", // Rosa
      "#06B6D4", // Ciano
    ];

    const list = Object.entries(map).map(([name, value], i) => ({
      name,
      value: Number(value.toFixed(2)),
      percent: total > 0 ? Math.round((value / total) * 100) : 0,
      color: palette[i % palette.length],
    }));

    list.sort((a, b) => b.value - a.value);
    return list;
  }, [revenues]);

  const totalPaymentValue = useMemo(() => {
    return paymentMethodsData.reduce((acc, curr) => acc + curr.value, 0);
  }, [paymentMethodsData]);

  const queueStats = useMemo(() => {
    const qList = Array.isArray(queueList) ? queueList : [];
    const waiting = qList.filter((q) => q.status === "aguardando");
    const inService = qList.filter((q) => q.status === "em_atendimento");
    const finished = qList.filter((q) => q.status === "concluido");
    return {
      total: qList.length,
      waiting: waiting.length,
      inService: inService.length,
      finished: finished.length,
      activeTotal: waiting.length + inService.length,
      waitingList: waiting,
      inServiceList: inService,
    };
  }, [queueList]);

  const avgTicket = useMemo(() => {
    const count = s?.revenue_count || 0;
    const gross = s?.gross || 0;
    return count > 0 ? gross / count : 0;
  }, [s]);

  // Se o usuário logado for barbeiro e não administrador, redireciona para sua tela dedicada
  // Executado APÓS todos os hooks para respeitar as Regras dos Hooks do React
  if (ready && user && isBarber(user) && !isAdmin(user)) {
    return <Navigate to="/barbeiro" replace />;
  }

  if (!ready || (loadingSummary && !s)) return <Loading />;

  if (errorSummary && !s) {
    return (
      <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-8 text-center space-y-4 max-w-lg mx-auto my-12 shadow-none">
        <p className="text-white font-bold text-base">Não foi possível carregar os dados financeiros</p>
        <p className="text-xs text-muted-foreground">Ocorreu um erro ao carregar as métricas do período selecionado.</p>
        <Button
          onClick={() => mutateSummary?.()}
          className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs uppercase rounded-[4px] gap-2 shadow-none"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Tentar Novamente
        </Button>
      </div>
    );
  }

  const profitDisplay = s?.profit ?? (((s?.gross || 0) - (s?.fees || 0) - (s?.commissions || 0) - (s?.expenses_total || 0)));
  const breakevenProgress = be?.progress ? Math.min(Math.round(be.progress), 100) : 82;

  // Modo Caixa (Balcão Seguro) para operação exposta aos clientes na recepção
  if (isBalcaoMode || userIsCaixa) {
    return (
      <div className="space-y-4 sm:space-y-5 w-full max-w-full overflow-x-hidden" data-testid="dashboard-caixa-seguro">
        <PainelBalcao
          onOpenNovoAtendimento={handleOpenNovoAtendimento}
          isBalcaoMode={isBalcaoMode}
          toggleBalcaoMode={toggleBalcaoMode}
          user={user}
        />
        {outletCtx?.isNovoAtendimentoOpen && (
          <NovoAtendimentoModal
            open={outletCtx.isNovoAtendimentoOpen}
            onOpenChange={outletCtx.setIsNovoAtendimentoOpen}
            onSuccess={() => {
              mutateSummary?.();
              mutateRevenues?.();
            }}
          />
        )}
        <NovoAtendimentoModal
          open={localModalOpen}
          onOpenChange={setLocalModalOpen}
          onSuccess={() => {
            mutateSummary?.();
            mutateRevenues?.();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden" data-testid="dashboard">
      {/* ======================================================== */}
      {/* 1. VISÃO MOBILE (< 1024px)                               */}
      {/* ======================================================== */}
      <div className="space-y-5 lg:hidden w-full">
        {/* Visão de Rede Consolidada Mobile (Quando ativa no Seletor de Lojas) */}
        {activeUnitId === "all" && isPremium && (
          <NetworkView summary={s} />
        )}

        {/* Quick Operations Strip (Fila & Agenda) */}
        <div
          onClick={() => navigate("/atendimentos")}
          role="button"
          tabIndex={0}
          className="flex items-center justify-between p-3 rounded-[4px] bg-[#12141F] border border-[#D4AF37]/40 shadow-none cursor-pointer hover:border-[#D4AF37] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Scissors className="h-3.5 w-3.5 text-[#D4AF37]" />
              Fila & Agenda do Dia
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#D4AF37] flex items-center gap-0.5">
            <span>{queueStats.activeTotal} na fila</span> <ChevronRight className="h-3 w-3" />
          </span>
        </div>

        {/* Card Principal Hero: Lucro Real do Mês (Dono) OU Atendimentos Operacionais (Gerente) */}
        {userIsGerente ? (
          <div
            onClick={() => navigate("/atendimentos")}
            role="button"
            tabIndex={0}
            className="relative overflow-hidden rounded-[4px] bg-[#12141F] border border-white/10 p-5 shadow-none transition-colors hover:border-[#D4AF37]/60 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>Atendimentos do Mês</span>
                <ChevronRight className="h-3 w-3 text-[#D4AF37]" />
              </span>
              <span className="inline-flex items-center gap-1 rounded-[2px] bg-[#D4AF37]/15 px-2 py-0.5 text-xs font-bold text-[#D4AF37] border border-[#D4AF37]/30">
                <Users className="h-3.5 w-3.5" /> Fila: {queueStats.activeTotal} ativos
              </span>
            </div>

            <div className="mt-3">
              <p className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {s?.revenue_count ?? 0} <span className="text-lg font-medium text-slate-400">clientes</span>
              </p>
            </div>

            {/* Chips Inferiores */}
            <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-[3px] bg-[#0A0D14] border border-white/10 px-3 py-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span className="text-slate-400">Faturamento Geral:</span>
                <span className="font-bold text-white">{brl(s?.gross ?? 0)}</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-[3px] bg-[#0A0D14] border border-white/10 px-3 py-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                <span className="text-slate-400">Despesas Operacionais:</span>
                <span className="font-bold text-white">{brl(s?.expenses_total ?? 0)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => navigate("/fluxo-de-caixa")}
            role="button"
            tabIndex={0}
            className="relative overflow-hidden rounded-[4px] bg-[#12141F] border border-white/10 p-5 shadow-none transition-colors hover:border-[#D4AF37]/60 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>Lucro Real Líquido</span>
                <ChevronRight className="h-3 w-3 text-[#D4AF37]" />
              </span>
              <span className="inline-flex items-center gap-1 rounded-[2px] bg-[#10B981]/15 px-2 py-0.5 text-xs font-bold text-[#10B981] border border-[#10B981]/30">
                <ArrowUpRight className="h-3.5 w-3.5" /> +12.4%
              </span>
            </div>

            <div className="mt-3">
              <p className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {brl(profitDisplay)}
              </p>
            </div>

            {/* Chips Inferiores */}
            <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-[3px] bg-[#0A0D14] border border-white/10 px-3 py-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span className="text-slate-400">Disponível:</span>
                <span className="font-bold text-white">{brl(s?.available_now ?? 0)}</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-[3px] bg-[#0A0D14] border border-white/10 px-3 py-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-[#D4AF37]" />
                <span className="text-slate-400">A Liberar:</span>
                <span className="font-bold text-white">{brl(s?.to_receive ?? 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Grade 2x2 Compacta - Resumo Executivo Operacional */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Faturamento do Mês */}
          <div
            onClick={() => navigate("/receitas")}
            role="button"
            tabIndex={0}
            className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 shadow-none cursor-pointer transition-colors hover:border-[#D4AF37]/50"
            title="Clique para ver todos os atendimentos"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Fat. do Mês</span>
              <div className="h-7 w-7 rounded-[3px] bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="mt-2 text-lg sm:text-xl font-bold font-display text-white">
              {brl(s?.gross ?? 0)}
            </p>
            <span className="text-[10px] text-[#D4AF37] font-medium mt-0.5 flex items-center gap-0.5">
              <span>Hoje: {brl(s?.faturamento_diario ?? polledFatDiario ?? 0)} · {s?.atendimentos_hoje ?? polledAtendHoje ?? 0} atend.</span>
              <ChevronRight className="h-2.5 w-2.5" />
            </span>
          </div>

          {/* Card 2: Fila de Hoje */}
          <div
            onClick={() => navigate("/atendimentos")}
            role="button"
            tabIndex={0}
            className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 shadow-none cursor-pointer transition-colors hover:border-[#D4AF37]/50"
            title="Clique para gerenciar a fila virtual"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Fila Hoje</span>
              <div className="h-7 w-7 rounded-[3px] bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
                <Scissors className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="mt-2 text-lg sm:text-xl font-bold font-display text-white">
              {queueStats.activeTotal} ativos
            </p>
            <span className="text-[10px] text-[#D4AF37] font-medium mt-0.5 flex items-center gap-0.5">
              <span>{queueStats.waiting} aguardando</span>
              <ChevronRight className="h-2.5 w-2.5" />
            </span>
          </div>

          {/* Card 3: Ticket Médio Geral */}
          <div
            onClick={() => navigate("/atendimentos")}
            role="button"
            tabIndex={0}
            className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 shadow-none cursor-pointer transition-colors hover:border-[#D4AF37]/50"
            title="Ticket médio por atendimento"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Ticket Médio</span>
              <div className="h-7 w-7 rounded-[3px] bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
                <Receipt className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="mt-2 text-lg sm:text-xl font-bold font-display text-white">
              {brl(avgTicket)}
            </p>
            <span className="text-[10px] text-[#D4AF37] font-medium mt-0.5 flex items-center gap-0.5">
              <span>Média por cliente</span>
              <ChevronRight className="h-2.5 w-2.5" />
            </span>
          </div>

          {/* Card 4: Resultado DRE / Operacional */}
          <div
            onClick={() => navigate("/fluxo-de-caixa")}
            role="button"
            tabIndex={0}
            className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 shadow-none cursor-pointer transition-colors hover:border-[#10B981]/50"
            title="Clique para ver o DRE completo"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">DRE Sintética</span>
              <div className="h-7 w-7 rounded-[3px] bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="mt-2 text-lg sm:text-xl font-bold font-display text-emerald-400">
              {brl(profitDisplay)}
            </p>
            <span className="text-[10px] text-[#10B981] font-medium mt-0.5 flex items-center gap-0.5">
              <span>Ver DRE completa</span>
              <ChevronRight className="h-2.5 w-2.5" />
            </span>
          </div>
        </div>

        {/* Gráfico Mobile: Linha com Gradiente Dourado Suave (Faturamento Diário) */}
        <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
                <span>Receita Diária</span>
              </h3>
              <p className="text-[11px] text-slate-400">Faturamento com curva diária</p>
            </div>
            <span className="text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/15 px-2 py-0.5 rounded-[2px] border border-[#D4AF37]/30">
              {brl(s?.gross ?? 0)}
            </span>
          </div>

          {revenueChartData.length ? (
            <div className="w-full h-48 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGradientMobile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="dia" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    contentStyle={{
                      background: "#0F121C",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "4px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                    formatter={(v) => [brl(v), "Receita"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#goldGradientMobile)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Sem dados diários no mês.
            </div>
          )}
        </div>

        {/* Gráfico de Rosca & Barras Retangulares Mobile: Formas de Pagamento */}
        {paymentMethodsData.length > 0 && (
          <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 shadow-none space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-[#D4AF37]" />
                  <span>Formas de Pagamento</span>
                </h3>
                <p className="text-[11px] text-slate-400">Distribuição por canal e maquininhas</p>
              </div>
              <span className="text-xs font-extrabold text-white font-display">
                {brl(totalPaymentValue)}
              </span>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={65}
                      paddingAngle={3}
                      stroke="#12141F"
                      strokeWidth={2}
                    >
                      {paymentMethodsData.map((entry, index) => (
                        <Cell key={`cell-mobile-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#0F121C",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "4px",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                      formatter={(val) => [brl(val), ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Total</span>
                  <span className="text-[11px] font-bold text-white font-display">
                    {brl(totalPaymentValue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Barras Horizontais com cantos retos */}
            <div className="space-y-2 pt-1">
              {paymentMethodsData.map((method) => (
                <div key={method.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: method.color }} />
                      <span className="font-semibold text-white truncate text-[11px]">{method.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-bold text-slate-200 text-[11px]">{brl(method.value)}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-[#0A0D14] px-1.5 py-0.2 rounded-[2px] border border-white/10">
                        {method.percent}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-[#0A0D14] rounded-none overflow-hidden border border-white/5">
                    <div
                      className="h-full rounded-none transition-all duration-500"
                      style={{ width: `${Math.max(method.percent, 4)}%`, backgroundColor: method.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card Ponto de Equilíbrio Mobile -> Atalho para Fluxo de Caixa */}
        <div
          onClick={() => navigate("/fluxo-de-caixa")}
          role="button"
          tabIndex={0}
          className="rounded-[4px] bg-[#12141F] border border-white/10 p-5 shadow-none space-y-3 cursor-pointer transition-colors hover:border-[#D4AF37]/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-[3px] bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                <Target className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-bold text-white">Ponto de Equilíbrio</span>
            </div>
            <span className="text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded-[2px]">
              {breakevenProgress}%
            </span>
          </div>

          {/* Barra de Progresso Dourada Retangular */}
          <div className="w-full h-2.5 bg-[#0A0D14] border border-white/10 p-0.5 overflow-hidden">
            <div
              className="h-full bg-[#D4AF37] transition-all duration-500"
              style={{ width: `${breakevenProgress}%` }}
            />
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {be?.reached
              ? "Meta operacional atingida! A barbearia já cobriu todos os custos e está gerando lucro líquido real."
              : `A barbearia atingiu ${breakevenProgress}% da meta para cobrir todas as despesas deste mês (${brl(be?.target || 4089.9)}).`}
          </p>
        </div>

        {/* Barra de Ações Rápidas Mobile */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleOpenNovoAtendimento}
            className="h-11 rounded-[4px] bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-none transition-colors"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>+ Atendimento</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-11 rounded-[4px] bg-[#12141F] hover:bg-[#181B28] text-white border border-white/10 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>+ Lançar</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#12141F] border border-white/10 text-white p-1.5 rounded-[4px] shadow-xl">
              <DropdownMenuItem
                onClick={() => (outletCtx?.openNovaDespesa ? outletCtx.openNovaDespesa() : navigate("/despesas"))}
                className="text-xs cursor-pointer py-2 rounded-[2px] focus:bg-white/10 focus:text-white"
              >
                <Receipt className="mr-2 h-4 w-4 text-[#EF4444]" /> Nova Despesa
              </DropdownMenuItem>
              {userIsDono && (
                <DropdownMenuItem
                  onClick={() => (outletCtx?.openNovaRetirada ? outletCtx.openNovaRetirada() : navigate("/retiradas"))}
                  className="text-xs cursor-pointer py-2 rounded-[2px] focus:bg-white/10 focus:text-white"
                >
                  <HandCoins className="mr-2 h-4 w-4 text-[#D4AF37]" /> Retirada do Dono
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => navigate("/fechamento")}
                className="text-xs cursor-pointer py-2 rounded-[2px] focus:bg-white/10 focus:text-white"
              >
                <ArrowRightLeft className="mr-2 h-4 w-4 text-blue-400" /> Fechamento de Caixa
              </DropdownMenuItem>
              {userIsDono && (
                <DropdownMenuItem
                  onClick={() => navigate("/comparacao")}
                  className="text-xs cursor-pointer py-2 rounded-[2px] focus:bg-white/10 focus:text-white"
                >
                  <Percent className="mr-2 h-4 w-4 text-emerald-400" /> Comparar Maquininhas
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. VISÃO DESKTOP (>= 1024px)                             */}
      {/* ======================================================== */}
      <div className="hidden lg:block space-y-6 w-full">
        {/* Barra Superior de Ações Rápidas Desktop */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
          <div>
            <h2 className="font-display text-lg font-bold text-white tracking-tight">
              {userIsGerente ? "Painel Operacional da Barbearia" : "Painel Financeiro & Indicadores"}
            </h2>
            <p className="text-xs text-slate-400">
              {userIsGerente
                ? `Gestão de atendimentos, faturamento geral, despesas operacionais e fila virtual em ${month}`
                : `Acompanhe a saúde do negócio, DRE completa, lucro real e comparador de adquirentes em ${month}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate("/atendimentos")}
              className="h-8 text-xs bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold rounded-[4px] gap-1.5 transition-colors shadow-none cursor-pointer uppercase"
              data-testid="desktop-btn-operacional"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Fila & Agenda do Dia</span>
            </Button>
            {userIsGerente && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenNovoAtendimento}
                className="h-8 text-xs bg-[#12141F] border border-white/10 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/40 rounded-[4px] gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>+ Novo Atendimento</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => (outletCtx?.openNovaDespesa ? outletCtx.openNovaDespesa() : navigate("/despesas"))}
              className="h-8 text-xs bg-[#12141F] border border-white/10 text-slate-300 hover:text-white hover:border-[#EF4444]/50 rounded-[4px] gap-1.5 transition-colors cursor-pointer"
            >
              <Receipt className="h-3.5 w-3.5 text-[#EF4444]" />
              <span>+ Nova Despesa</span>
            </Button>
            {userIsDono && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => (outletCtx?.openNovaRetirada ? outletCtx.openNovaRetirada() : navigate("/retiradas"))}
                className="h-8 text-xs bg-[#12141F] border border-white/10 text-slate-300 hover:text-white hover:border-[#D4AF37]/40 rounded-[4px] gap-1.5 transition-colors cursor-pointer"
              >
                <HandCoins className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>+ Retirada do Dono</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/fechamento")}
              className="h-8 text-xs bg-[#12141F] border border-white/10 text-slate-300 hover:text-white hover:border-blue-500/50 rounded-[4px] gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-blue-400" />
              <span>Fechar Caixa</span>
            </Button>
            {userIsDono ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/comparacao")}
                  className="h-8 text-xs bg-[#12141F] border border-white/10 text-slate-300 hover:text-white hover:border-[#D4AF37]/40 rounded-[4px] gap-1.5 transition-colors cursor-pointer"
                >
                  <Percent className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>Comparar Maquininhas</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/fluxo-de-caixa")}
                  className="h-8 text-xs bg-[#12141F] border border-white/10 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/50 rounded-[4px] gap-1.5 transition-colors cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  <span>DRE Completa</span>
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/equipe")}
                className="h-8 text-xs bg-[#12141F] border border-white/10 text-slate-300 hover:text-white hover:border-[#D4AF37]/40 rounded-[4px] gap-1.5 transition-colors cursor-pointer"
              >
                <UserCheck className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>Escala de Barbeiros</span>
              </Button>
            )}
          </div>
        </div>

        {/* Visão de Rede Consolidada Desktop */}
        {activeUnitId === "all" && isPremium && (
          <NetworkView summary={s} />
        )}

        {/* Banner Resumo Executivo */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[4px] bg-[#12141F] border border-white/10 shadow-none">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[3px] bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#D4AF37] flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Resumo Executivo para Tomada de Decisão</p>
              <p className="text-[11px] text-slate-400">
                Detalhamento completo (Receita Bruta Total, Deduções de taxas, Margem de Contribuição e Saldo Final) consolidado em <strong className="text-slate-300">Relatórios / DRE</strong>.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/fluxo-de-caixa")}
            className="h-8 text-xs font-semibold bg-white/5 hover:bg-[#D4AF37]/15 border-white/10 hover:border-[#D4AF37]/40 text-[#D4AF37] rounded-[4px] gap-1.5 transition-colors cursor-pointer shrink-0"
            data-testid="btn-open-dre-summary"
          >
            <span>Abrir DRE Completa</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Linha Superior de Métricas: 4 Cards Resumo Executivo (Sem Duplicações do DRE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-5">
          {/* Card 1: Faturamento do Mês */}
          <div
            onClick={() => navigate("/receitas")}
            role="button"
            tabIndex={0}
            className="group rounded-[4px] bg-[#12141F] border border-white/10 p-5 shadow-none transition-colors hover:border-[#D4AF37]/50 cursor-pointer flex flex-col justify-between"
            data-testid="kpi-gross"
            title="Clique para ver o histórico detalhado de Atendimentos e Vendas"
          >
            <div>
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                  <span>Faturamento do Mês</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <div className="h-9 w-9 rounded-[3px] bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl xl:text-3xl font-bold font-display text-white tracking-tight">
                {brl(s?.gross ?? 0)}
              </p>
              <SparklineWave color="#D4AF37" id="spark-gross" pathD="M 0 28 Q 45 32, 90 16 T 170 20 T 230 8 T 280 16" activePoint={{ x: 230, y: 8 }} />
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-slate-400">Hoje: <strong className="text-white font-medium">{brl(s?.faturamento_diario ?? polledFatDiario ?? 0)}</strong></span>
              <span className="font-semibold text-white">{s?.revenue_count ?? 0} no mês</span>
            </div>
          </div>

          {/* Card 2: Atendimentos do Mês */}
          <div
            onClick={() => navigate("/atendimentos")}
            role="button"
            tabIndex={0}
            className="group rounded-[4px] bg-[#12141F] border border-white/10 p-5 shadow-none transition-colors hover:border-[#D4AF37]/50 cursor-pointer flex flex-col justify-between"
            data-testid="kpi-atendimentos"
            title="Clique para gerenciar a fila e os atendimentos de hoje"
          >
            <div>
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-[#D4AF37] transition-colors flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]"></span>
                  </span>
                  <span>Atendimentos do Mês</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <div className="h-9 w-9 rounded-[3px] bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center">
                  <Scissors className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl xl:text-3xl font-bold font-display text-white tracking-tight">
                {s?.revenue_count ?? 0}
              </p>
              <SparklineWave color="#D4AF37" id="spark-gerente-atend" pathD="M 0 30 Q 40 10, 80 22 T 160 14 T 220 25 T 280 8" activePoint={{ x: 220, y: 25 }} />
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-slate-400">Hoje: <strong className="text-white font-medium">{s?.atendimentos_hoje ?? polledAtendHoje ?? 0}</strong> atend.</span>
              <span className="font-semibold text-[#D4AF37]">{queueStats.activeTotal} ativos ({queueStats.waiting} na espera)</span>
            </div>
          </div>

          {/* Card 3: Ticket Médio Geral */}
          <div
            onClick={() => navigate("/atendimentos")}
            role="button"
            tabIndex={0}
            className="group rounded-[4px] bg-[#12141F] border border-white/10 p-5 shadow-none transition-colors hover:border-[#D4AF37]/50 cursor-pointer flex flex-col justify-between"
            data-testid="kpi-ticket"
            title="Ticket médio por atendimento"
          >
            <div>
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                  <span>Ticket Médio Geral</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <div className="h-9 w-9 rounded-[3px] bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl xl:text-3xl font-bold font-display text-white tracking-tight">
                {brl(avgTicket)}
              </p>
              <SparklineWave color="#D4AF37" id="spark-ticket" pathD="M 0 25 Q 40 32, 90 14 T 170 20 T 230 10 T 280 18" activePoint={{ x: 230, y: 10 }} />
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-slate-400">Média / Cliente:</span>
              <span className="font-semibold text-[#D4AF37]">{s?.revenue_count ? "Consumo balanceado" : "Aguardando vendas"}</span>
            </div>
          </div>

          {/* Card 4: Resumo DRE / Resultado do Mês */}
          <div
            onClick={() => navigate("/fluxo-de-caixa")}
            role="button"
            tabIndex={0}
            className="group rounded-[4px] bg-[#12141F] border border-white/10 p-5 shadow-none transition-colors hover:border-[#10B981]/50 cursor-pointer flex flex-col justify-between"
            data-testid="kpi-profit"
            title="Clique para ver o DRE e Fluxo de Caixa completo"
          >
            <div>
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Resultado Operacional</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <span className="inline-flex items-center gap-1 rounded-[2px] bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-bold text-[#10B981] border border-[#10B981]/30">
                  DRE Sintética
                </span>
              </div>
              <p className="mt-2 text-2xl xl:text-3xl font-bold font-display text-white tracking-tight">
                {brl(profitDisplay)}
              </p>
              <SparklineWave color="#10B981" id="spark-profit" pathD="M 0 32 Q 40 8, 80 24 T 160 12 T 220 22 T 280 6" activePoint={{ x: 220, y: 22 }} />
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-slate-400">Ver DRE Completa:</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-0.5 group-hover:underline">
                Acessar <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Área Central Dividida: Coluna Esquerda (65%) e Coluna Direita (35%) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Gráfico de Linha com Gradiente Dourado + Ponto de Equilíbrio */}
          <div className="col-span-1 xl:col-span-8 space-y-6">
            {/* Gráfico de Receita & Fluxo Diário com Gradiente Dourado Suave */}
            <div
              className="rounded-[4px] bg-[#12141F] border border-white/10 p-6 shadow-none"
              data-testid="cashflow-chart"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
                    <span>Curva de Faturamento & Fluxo de Caixa</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evolução diária de receitas e despesas ao longo de {month}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#D4AF37]" />
                    <span className="text-slate-200">Faturamento</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                    <span className="text-slate-400">Despesas</span>
                  </div>
                </div>
              </div>

              {revenueChartData.length ? (
                <ResponsiveContainer width="100%" height={290}>
                  <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="goldGradientDesktop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="redGradientDesktop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="dia" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      contentStyle={{
                        background: "#0F121C",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "4px",
                        boxShadow: "none",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      formatter={(v, name) => [brl(v), name === "receita" ? "Faturamento" : "Despesas"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      stroke="#D4AF37"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#goldGradientDesktop)"
                      activeDot={{ r: 5, fill: "#D4AF37", stroke: "#0B0D14", strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="despesas"
                      stroke="#EF4444"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#redGradientDesktop)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  Sem movimentações diárias registradas para este período.
                </div>
              )}
            </div>

            {/* Se Dono: Card Ponto de Equilíbrio / Se Gerente: Painel Operacional da Fila Virtual */}
            {userIsGerente ? (
              <div
                onClick={() => navigate("/atendimentos")}
                role="button"
                tabIndex={0}
                className="rounded-[4px] bg-[#12141F] border border-white/10 p-6 shadow-none space-y-4 cursor-pointer transition-colors hover:border-[#D4AF37]/60"
                data-testid="gerente-queue-card"
                title="Clique para gerenciar a Fila Virtual completa e agendamentos"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-[3px] bg-[#D4AF37]/15 border border-[#D4AF37]/25 text-[#D4AF37] flex items-center justify-center">
                      <Scissors className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>Fila Virtual & Atendimento do Dia</span>
                        <ChevronRight className="h-3.5 w-3.5 text-[#D4AF37]" />
                      </h4>
                      <p className="text-xs text-slate-400">
                        Visão rápida do fluxo de clientes na barbearia hoje
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-3 py-1 rounded-[2px]">
                      {queueStats.activeTotal} Clientes Ativos Hoje
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="rounded-[3px] bg-[#0A0D14] border border-white/10 p-3.5">
                    <span className="text-slate-400 block text-[11px]">Aguardando na Recepção</span>
                    <span className="text-sm font-bold text-amber-400 mt-1 block flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {queueStats.waiting} clientes
                    </span>
                  </div>
                  <div className="rounded-[3px] bg-[#0A0D14] border border-white/10 p-3.5">
                    <span className="text-slate-400 block text-[11px]">Na Cadeira (Cortando)</span>
                    <span className="text-sm font-bold text-[#10B981] mt-1 block flex items-center gap-1.5">
                      <Scissors className="h-3.5 w-3.5" /> {queueStats.inService} em atendimento
                    </span>
                  </div>
                  <div className="rounded-[3px] bg-[#0A0D14] border border-white/10 p-3.5">
                    <span className="text-slate-400 block text-[11px]">Concluídos Hoje</span>
                    <span className="text-sm font-bold text-[#D4AF37] mt-1 block flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {queueStats.finished} finalizados
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>Tempo de espera estimado: <strong className="text-white">~15 min</strong></span>
                  <span className="text-[#D4AF37] font-semibold flex items-center gap-1 hover:underline">
                    Abrir Fila Completa & Chamar Cliente <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => navigate("/fluxo-de-caixa")}
                role="button"
                tabIndex={0}
                className="rounded-[4px] bg-[#12141F] border border-white/10 p-6 shadow-none space-y-4 cursor-pointer transition-colors hover:border-[#D4AF37]/60"
                data-testid="breakeven-card"
                title="Clique para analisar o Ponto de Equilíbrio no Fluxo de Caixa"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-[3px] bg-[#D4AF37]/15 border border-[#D4AF37]/25 text-[#D4AF37] flex items-center justify-center">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>Ponto de Equilíbrio Operacional</span>
                        <ChevronRight className="h-3.5 w-3.5 text-[#D4AF37]" />
                      </h4>
                      <p className="text-xs text-slate-400">
                        Faturamento mínimo necessário para cobrir custos fixos e variáveis
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-3 py-1 rounded-[2px]">
                      {breakevenProgress}% Atingido
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso Dourada Estilizada com cantos retos */}
                <div className="w-full h-2.5 bg-[#0A0D14] border border-white/10 p-0.5 overflow-hidden">
                  <div
                    className="h-full bg-[#D4AF37] transition-all duration-500"
                    style={{ width: `${breakevenProgress}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="rounded-[3px] bg-[#0A0D14] border border-white/10 p-3.5">
                    <span className="text-slate-400 block text-[11px]">Meta de Custos</span>
                    <span className="text-sm font-bold text-white mt-1 block">{brl(be?.target || 4089.9)}</span>
                  </div>
                  <div className="rounded-[3px] bg-[#0A0D14] border border-white/10 p-3.5">
                    <span className="text-slate-400 block text-[11px]">Faturamento Atual</span>
                    <span className="text-sm font-bold text-[#10B981] mt-1 block">{brl(be?.current ?? s?.gross ?? 0)}</span>
                  </div>
                  <div className="rounded-[3px] bg-[#0A0D14] border border-white/10 p-3.5">
                    <span className="text-slate-400 block text-[11px]">Status</span>
                    <span className="text-sm font-bold text-[#D4AF37] mt-1 block">
                      {be?.reached ? "Equilíbrio Superado" : `Faltam ${brl(be?.missing || 890)}`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita (35%): Distribuição de Formas de Pagamento + Transações Recentes */}
          <div className="col-span-1 xl:col-span-4 space-y-6">
            {/* Donut Chart & Barras: Formas de Pagamento & Maquininhas */}
            <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-6 shadow-none space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#D4AF37]" />
                  <h3 className="font-display text-sm font-bold text-white tracking-tight">
                    Pagamentos & Maquininhas
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/comparacao")}
                  className="text-xs text-[#D4AF37] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Taxas</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              {paymentMethodsData.length ? (
                <div className="space-y-4">
                  {/* Rosca Donut Centralizada */}
                  <div className="flex items-center justify-center">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentMethodsData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={72}
                            paddingAngle={3}
                            stroke="#12141F"
                            strokeWidth={2}
                          >
                            {paymentMethodsData.map((entry, index) => (
                              <Cell key={`cell-desktop-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "#0F121C",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: "4px",
                              color: "#fff",
                              fontSize: "12px",
                            }}
                            formatter={(val) => [brl(val), ""]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                        <span className="text-xs font-bold text-white font-display">
                          {brl(totalPaymentValue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barras Horizontais com cantos retos */}
                  <div className="space-y-2.5">
                    {paymentMethodsData.slice(0, 4).map((method) => (
                      <div key={method.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: method.color }} />
                            <span className="font-semibold text-white truncate">{method.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-slate-200">{brl(method.value)}</span>
                            <span className="text-[10px] font-bold text-slate-400 bg-[#0A0D14] px-1.5 py-0.5 rounded-[2px] border border-white/10">
                              {method.percent}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-[#0A0D14] rounded-none overflow-hidden border border-white/5">
                          <div
                            className="h-full rounded-none transition-all duration-500"
                            style={{ width: `${Math.max(method.percent, 3)}%`, backgroundColor: method.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Sem transações registradas no período.
                </div>
              )}
            </div>

            {/* Transações Recentes */}
            <div className="flex flex-col rounded-[4px] bg-[#12141F] border border-white/10 p-6 shadow-none">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-[#D4AF37]" />
                  <h3 className="font-display text-sm font-bold text-white tracking-tight">
                    Transações Recentes
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/receitas")}
                  className="text-xs text-[#D4AF37] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver todas</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              <div className="mt-4 space-y-2.5 overflow-y-auto max-h-[320px] pr-1">
                {recentTransactions.length ? (
                  recentTransactions.map((tx) => (
                    <RecentTransactionRow key={tx.id} tx={tx} />
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Nenhum atendimento registrado recentemente.
                  </div>
                )}
              </div>

              {/* Botão para lançar atendimento */}
              <div className="pt-4 mt-4 border-t border-white/10">
                <Button
                  onClick={handleOpenNovoAtendimento}
                  className="w-full bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs uppercase tracking-wider h-10 rounded-[4px] shadow-none transition-colors gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4 stroke-[3]" />
                  <span>Novo Atendimento</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local fallback modal */}
      <NovoAtendimentoModal
        open={localModalOpen}
        onOpenChange={setLocalModalOpen}
        onSuccess={() => {
          setRefreshTick((t) => t + 1);
          mutateSummary?.();
          mutateBe?.();
          mutateCashflow?.();
          mutateRevenues?.();
        }}
      />
    </div>
  );
}
