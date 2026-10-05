import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl, fmtDate } from "@/lib/format";
import NovoAtendimentoModal from "@/components/NovoAtendimentoModal";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from "recharts";
import {
  Wallet, TrendingUp, Clock, Users, Scissors, Plus,
  ChevronRight, Calendar, ArrowUpRight, CheckCircle2,
  AlertCircle, Sparkles, Activity, Timer, Layers, CreditCard,
  UserCheck, ArrowRight,
} from "lucide-react";

export default function Dashboard() {
  const { month, setMonth } = useMonth();
  const outletCtx = useOutletContext();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const { activeUnitId, isPremium } = useUnit();
  const { isBalcaoMode, toggleBalcaoMode } = useBalcao();

  const [localModalOpen, setLocalModalOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Period filter states: "hoje" | "7dias" | "mes" | "3meses" | "personalizado"
  const [selectedPeriod, setSelectedPeriod] = useState("hoje");
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [appliedCustomDates, setAppliedCustomDates] = useState(null);

  const userIsDono = isDono(user);
  const userIsGerente = isGerente(user) && !userIsDono;
  const userIsCaixa = isCaixa(user);

  // Backend APIs
  const { data: s, loading: loadingSummary, error: errorSummary, mutate: mutateSummary } = useApi(
    (api) => api.get("/dashboard/summary", { month }),
    [month, refreshTick, activeUnitId]
  );
  const { data: be, mutate: mutateBe } = useApi(
    (api) => api.get("/dashboard/breakeven", { month }),
    [month, refreshTick, activeUnitId]
  );
  const { data: rawRevenues, mutate: mutateRevenues } = useApi(
    (api) => api.get("/revenues"),
    [refreshTick, activeUnitId]
  );
  const { data: rawExpenses, mutate: mutateExpenses } = useApi(
    (api) => api.get("/expenses"),
    [refreshTick, activeUnitId]
  );
  const { data: barbersList } = useApi(
    (api) => api.get("/barbers"),
    [refreshTick, activeUnitId]
  );
  const { data: queueList, mutate: mutateQueue } = useApi(
    (api) => api.get("/queue"),
    [refreshTick, activeUnitId]
  );

  const todayStrDate = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const { data: appointmentsList, mutate: mutateAppointments } = useApi(
    (api) => api.get(`/appointments?date=${todayStrDate}`),
    [refreshTick, activeUnitId, todayStrDate]
  );

  // Real-time polling
  useFinancialMetricsPolling({
    endpoint: "/financial/metrics-polling",
    interval: 30000,
    deps: [month, activeUnitId],
    onUpdate: () => {
      mutateSummary?.();
      mutateBe?.();
      mutateRevenues?.();
      mutateQueue?.();
      mutateAppointments?.();
    },
  });

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTick((t) => t + 1);
      mutateSummary?.();
      mutateBe?.();
      mutateRevenues?.();
      mutateExpenses?.();
      mutateQueue?.();
      mutateAppointments?.();
    };
    window.addEventListener("refresh-dashboard-data", handleRefresh);
    return () => window.removeEventListener("refresh-dashboard-data", handleRefresh);
  }, [mutateSummary, mutateBe, mutateRevenues, mutateExpenses, mutateQueue, mutateAppointments]);

  const handleOpenNovoAtendimento = useCallback(() => {
    if (outletCtx?.openNovoAtendimento) {
      outletCtx.openNovoAtendimento();
    } else {
      setLocalModalOpen(true);
    }
  }, [outletCtx]);

  // Compute active date boundaries
  const activeDateRange = useMemo(() => {
    const now = new Date();
    const today = todayStrDate;

    if (selectedPeriod === "hoje") {
      return { start: today, end: today, label: "Hoje", isToday: true };
    }
    if (selectedPeriod === "7dias") {
      const d7 = new Date(now.getTime() - 7 * 86400000);
      const start7 = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, "0")}-${String(d7.getDate()).padStart(2, "0")}`;
      return { start: start7, end: today, label: "Últimos 7 dias", isToday: false };
    }
    if (selectedPeriod === "mes") {
      const ym = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return { start: `${ym}-01`, end: `${ym}-31`, label: "Este mês", isToday: false };
    }
    if (selectedPeriod === "3meses") {
      const d90 = new Date(now.getTime() - 90 * 86400000);
      const start90 = `${d90.getFullYear()}-${String(d90.getMonth() + 1).padStart(2, "0")}-${String(d90.getDate()).padStart(2, "0")}`;
      return { start: start90, end: today, label: "Últimos 3 meses", isToday: false };
    }
    if (selectedPeriod === "personalizado" && appliedCustomDates) {
      return {
        start: appliedCustomDates.start,
        end: appliedCustomDates.end,
        label: `De ${fmtDate(appliedCustomDates.start)} até ${fmtDate(appliedCustomDates.end)}`,
        isToday: false,
      };
    }
    return { start: today, end: today, label: "Hoje", isToday: true };
  }, [selectedPeriod, appliedCustomDates, todayStrDate, month]);

  // Filter revenues and expenses for active period
  const { periodRevenues, periodMetrics } = useMemo(() => {
    const allRevs = Array.isArray(rawRevenues) ? rawRevenues : [];
    const allExps = Array.isArray(rawExpenses) ? rawExpenses : [];

    const revs = allRevs.filter((r) => {
      if (r.status !== "ativo") return false;
      return r.date >= activeDateRange.start && r.date <= activeDateRange.end;
    });

    const exps = allExps.filter((e) => {
      const d = e.due_date || e.payment_date;
      return d && d >= activeDateRange.start && d <= activeDateRange.end;
    });

    const faturamento = Number(revs.reduce((acc, r) => acc + (r.paid_amount || r.gross_amount || 0), 0).toFixed(2));
    const taxas = Number(revs.reduce((acc, r) => acc + (r.fee_amount || 0), 0).toFixed(2));
    const comissoes = Number(revs.reduce((acc, r) => acc + (r.commission_amount || 0), 0).toFixed(2));
    const despesas = Number(exps.reduce((acc, e) => acc + (e.value || 0), 0).toFixed(2));
    const shopAmount = Number(revs.reduce((acc, r) => acc + (r.shop_amount || 0), 0).toFixed(2));

    const lucroReal = Number((shopAmount - despesas).toFixed(2));

    const disponivelAgora = Number(
      revs.filter((r) => r.settlement_date <= todayStrDate)
        .reduce((acc, r) => acc + (r.net_amount || 0), 0)
        .toFixed(2)
    );

    const aReceber = Number(
      revs.filter((r) => r.settlement_date > todayStrDate)
        .reduce((acc, r) => acc + (r.net_amount || 0), 0)
        .toFixed(2)
    );

    const count = revs.length;
    const ticketMedio = count > 0 ? Number((faturamento / count).toFixed(2)) : 0;
    const margemLucro = faturamento > 0 ? Math.round((lucroReal / faturamento) * 100) : 0;

    return {
      periodRevenues: revs,
      periodMetrics: {
        faturamento,
        taxas,
        comissoes,
        despesas,
        shopAmount,
        lucroReal,
        disponivelAgora,
        aReceber,
        count,
        ticketMedio,
        margemLucro,
      },
    };
  }, [rawRevenues, rawExpenses, activeDateRange, todayStrDate]);

  // Operational stats for Today
  const operationalStats = useMemo(() => {
    const qList = Array.isArray(queueList) ? queueList : [];
    const waiting = qList.filter((q) => q.status === "espera" || q.status === "aguardando");
    const inService = qList.filter((q) => q.status === "cadeira" || q.status === "em_atendimento");

    const aptList = Array.isArray(appointmentsList) ? appointmentsList : [];
    const upcomingApts = aptList
      .filter((a) => a.status === "confirmado" || a.status === "pendente" || a.status === "agendado")
      .sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));

    const barbers = Array.isArray(barbersList) ? barbersList.filter((b) => b.active) : [];

    return {
      barbersActiveCount: barbers.length || 3,
      waitingCount: waiting.length,
      inServiceCount: inService.length,
      upcomingAptsCount: upcomingApts.length,
      waitingItems: waiting,
      inServiceItems: inService,
      upcomingAppointments: upcomingApts.slice(0, 5),
      barbers,
    };
  }, [queueList, appointmentsList, barbersList]);

  // Minimal chart series
  const chartSeries = useMemo(() => {
    const daysMap = {};
    periodRevenues.forEach((r) => {
      const d = r.date;
      if (!daysMap[d]) daysMap[d] = { date: d, dia: fmtDate(d).slice(0, 5), faturamento: 0 };
      daysMap[d].faturamento += Number(r.paid_amount || r.gross_amount || 0);
    });

    const list = Object.values(daysMap).sort((a, b) => a.date.localeCompare(b.date));
    return list.map((item) => ({
      ...item,
      faturamento: Number(item.faturamento.toFixed(2)),
    }));
  }, [periodRevenues]);

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    if (!periodRevenues.length) return [];
    const map = {};
    let total = 0;
    periodRevenues.forEach((r) => {
      const method = r.payment_method_name || (r.payment_type ? r.payment_type.toUpperCase() : "PIX");
      const val = Number(r.paid_amount || r.gross_amount || 0);
      map[method] = (map[method] || 0) + val;
      total += val;
    });

    return Object.entries(map)
      .map(([name, val]) => ({
        name,
        value: val,
        percentage: total > 0 ? Math.round((val / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [periodRevenues]);

  // Redirect if barber only
  if (ready && user && isBarber(user) && !isAdmin(user)) {
    return <Navigate to="/barbeiro" replace />;
  }

  if (!ready || (loadingSummary && !s && !rawRevenues)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loading />
      </div>
    );
  }

  // Modo Balcão Seguro
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

  const currentDateFormatted = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-28 sm:pb-36 lg:pb-12 antialiased" data-testid="dashboard">
      {/* Visão de Rede Consolidada */}
      {activeUnitId === "all" && isPremium && (
        <NetworkView summary={s} />
      )}

      {/* ======================================================== */}
      {/* 1. TOPO: CONTEXTO DA BARBEARIA & SELETOR DE PERÍODO      */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
              {selectedPeriod === "hoje" ? "Hoje na sua barbearia" : `Visão: ${activeDateRange.label}`}
            </h1>
            <span className="flex h-2 w-2 rounded-full bg-[#20C997] animate-pulse" title="Sistema operacional ativo" />
          </div>
          <p className="text-xs text-[#8B93A1] capitalize font-medium mt-0.5">
            {currentDateFormatted} • {operationalStats.barbersActiveCount} barbeiros na escala • {operationalStats.inServiceCount} em atendimento
          </p>
        </div>

        {/* Botoeira de Períodos KUPOLA */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0A0E15] rounded-[4px] border border-white/[0.07] self-start lg:self-auto">
          {[
            { id: "hoje", label: "Hoje" },
            { id: "7dias", label: "7 dias" },
            { id: "mes", label: "Este mês" },
            { id: "3meses", label: "3 meses" },
            { id: "personalizado", label: "Personalizado" },
          ].map((tab) => {
            const isActive = selectedPeriod === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedPeriod(tab.id);
                  if (tab.id === "mes") {
                    const currentYm = new Date().toISOString().slice(0, 7);
                    if (month !== currentYm) setMonth(currentYm);
                  }
                }}
                className={`px-3 py-1.5 rounded-[3px] text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#111722] text-[#F5F5F5] border border-white/[0.12] shadow-sm"
                    : "text-[#8B93A1] hover:text-[#F5F5F5] hover:bg-white/[0.03]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-painel: Personalizado */}
      {selectedPeriod === "personalizado" && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-[#0A0E15] rounded-[4px] border border-[#D4AF37]/30 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#8B93A1]">De:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-[#0D121B] border border-white/[0.1] rounded-[3px] px-2.5 py-1 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#8B93A1]">Até:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-[#0D121B] border border-white/[0.1] rounded-[3px] px-2.5 py-1 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <Button
            size="sm"
            onClick={() => setAppliedCustomDates({ start: customStart, end: customEnd })}
            className="btn-gold h-7 text-xs px-3"
          >
            Aplicar Filtro
          </Button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. BLOCO REFINADO: HOJE NA SUA BARBEARIA (OPERAÇÃO AO VIVO)*/}
      {/* ======================================================== */}
      <div className="rounded-[4px] bg-[#0A0E15] border border-white/[0.08] p-4 sm:p-5 shadow-sm">
        {/* Cabeçalho do Bloco com Título, Status e Ações Rápidas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-[3px] bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center text-[#D4AF37] shrink-0">
              <Scissors className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#F5F5F5]">
                  Hoje na sua barbearia
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#20C997] bg-[#20C997]/10 px-2 py-0.5 rounded-[2px] border border-[#20C997]/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#20C997] animate-pulse" />
                  Operação ao vivo
                </span>
              </div>
              <p className="text-[11px] text-[#8B93A1] mt-0.5">
                Visão instantânea de clientes na cadeira, fila de espera e escala do dia
              </p>
            </div>
          </div>

          {/* Ações Rápidas: Fila/Agenda e Novo Atendimento */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/atendimentos")}
              className="h-10 sm:h-9 px-3 text-xs bg-[#0D121B] border-white/[0.08] text-[#8B93A1] hover:text-[#F5F5F5] hover:border-[#D4AF37]/40 rounded-[4px] transition-colors gap-1 flex-1 sm:flex-initial justify-center"
            >
              <span>Fila & Agenda</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>

            <Button
              onClick={handleOpenNovoAtendimento}
              className="btn-gold h-10 sm:h-9 px-4 text-xs flex items-center gap-1.5 font-bold shadow-none flex-1 sm:flex-initial justify-center"
              data-testid="dashboard-btn-novo-atendimento"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>Novo Atendimento</span>
            </Button>
          </div>
        </div>

        {/* Composição Operacional Hierárquica: Hero "Na Cadeira" + Trio Secundário */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
          
          {/* 1. NA CADEIRA (MAIOR DESTAQUE VISUAL - AO VIVO) */}
          <div className="lg:col-span-4 rounded-[4px] bg-[#0A1316] border border-[#20C997]/30 p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between shadow-[0_0_25px_rgba(32,201,151,0.05)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#20C997] flex items-center gap-1.5">
                <Scissors className="h-3.5 w-3.5 text-[#20C997]" />
                Na Cadeira
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#20C997] bg-[#20C997]/15 px-2 py-0.5 rounded-[3px] border border-[#20C997]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#20C997] animate-pulse" />
                AO VIVO
              </span>
            </div>

            <div className="my-3">
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-4xl sm:text-5xl font-black text-[#20C997] leading-none tracking-tight">
                  {operationalStats.inServiceCount}
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {operationalStats.inServiceCount === 1 ? "cliente em corte" : "clientes em corte"}
                </span>
              </div>
              <p className="text-[11px] text-[#8B93A1] mt-1.5">
                {operationalStats.inServiceCount > 0 
                  ? `${operationalStats.inServiceCount} barbeiro(s) com cliente na bancada agora`
                  : "Nenhum cliente na cadeira no momento"}
              </p>
            </div>

            <div className="pt-2 border-t border-[#20C997]/20 flex items-center justify-between text-[11px]">
              <span className="text-[#8B93A1]">Atendimentos em andamento</span>
              <span className="text-[#20C997] font-semibold">Tempo real</span>
            </div>
          </div>

          {/* 2. COMPOSIÇÃO DOS DEMAIS INDICADORES COM SEPARAÇÃO SUTIL */}
          <div className="lg:col-span-8 rounded-[4px] bg-[#0D121B] border border-white/[0.06] p-4 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
            
            {/* NA FILA */}
            <div className="sm:px-4 py-3 sm:py-1 flex flex-col justify-between first:pl-1">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B93A1]">
                    Na Fila
                  </span>
                  <Users className="h-3.5 w-3.5 text-[#8B93A1]/50" />
                </div>
                <div className="mt-2.5">
                  <span className="font-display text-3xl font-extrabold text-[#F5F5F5] leading-none block">
                    {operationalStats.waitingCount}
                  </span>
                  <div className="mt-1.5">
                    {operationalStats.waitingCount > 0 ? (
                      <span className="text-xs font-semibold text-amber-300">
                        {operationalStats.waitingCount} aguardando
                      </span>
                    ) : (
                      <span className="text-xs text-[#8B93A1]">
                        fila livre
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-[#8B93A1]/70 block mt-3 pt-2 border-t border-white/[0.04]">
                Aguardando recepção
              </span>
            </div>

            {/* AGENDADOS HOJE */}
            <div className="sm:px-4 py-3 sm:py-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B93A1]">
                    Agendados hoje
                  </span>
                  <Clock className="h-3.5 w-3.5 text-[#8B93A1]/50" />
                </div>
                <div className="mt-2.5">
                  <span className="font-display text-3xl font-extrabold text-[#F5F5F5] leading-none block">
                    {operationalStats.upcomingAptsCount}
                  </span>
                  <div className="mt-1.5">
                    <span className="text-xs font-semibold text-[#8B93A1]">
                      {operationalStats.upcomingAptsCount} agendados
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-[#8B93A1]/70 block mt-3 pt-2 border-t border-white/[0.04]">
                Marcações do dia
              </span>
            </div>

            {/* BARBEIROS ATIVOS */}
            <div className="sm:px-4 py-3 sm:py-1 flex flex-col justify-between last:pr-1">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B93A1]">
                    Barbeiros ativos
                  </span>
                  <UserCheck className="h-3.5 w-3.5 text-[#8B93A1]/50" />
                </div>
                <div className="mt-2.5">
                  <span className="font-display text-3xl font-extrabold text-[#F5F5F5] leading-none block">
                    {operationalStats.barbersActiveCount}
                  </span>
                  <div className="mt-1.5">
                    <span className="text-xs font-semibold text-[#D4AF37]/90">
                      {operationalStats.barbersActiveCount} na escala
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-[#8B93A1]/70 block mt-3 pt-2 border-t border-white/[0.04]">
                Equipe disponível
              </span>
            </div>

          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. RESULTADO DE HOJE (FINANCEIRO REAL DOMINANTE)         */}
      {/* ======================================================== */}
      <div className="rounded-[4px] bg-[#0A0E15] border border-white/[0.08] p-5 sm:p-6" data-testid="dashboard-resultado-financeiro">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-white/[0.06]">
          
          {/* LUCRO REAL (VISUALMENTE DOMINANTE) */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[#D4AF37]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#8B93A1]">
                {selectedPeriod === "hoje" ? "Resultado de Hoje" : `Resultado: ${activeDateRange.label}`}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap items-baseline gap-3">
              <span
                className={`font-display text-4xl sm:text-5xl font-black tracking-tight ${
                  periodMetrics.lucroReal >= 0 ? "text-[#20C997]" : "text-[#EF4444]"
                }`}
                data-testid="dashboard-lucro-real"
              >
                {brl(periodMetrics.lucroReal)}
              </span>
              <span className="text-xs font-mono font-bold text-[#20C997] bg-[#20C997]/10 px-2 py-0.5 rounded-[2px] border border-[#20C997]/20 uppercase">
                LUCRO REAL
              </span>
            </div>
            <p className="text-[11px] text-[#8B93A1] mt-1.5 max-w-xl">
              Valor líquido real que sobra no caixa da barbearia após descontar taxas de maquininhas, comissões dos barbeiros e despesas operacionais pagas.
            </p>
          </div>

          {/* TRIO FINANCEIRO COMPLEMENTAR: DISPONÍVEL, A RECEBER E FATURAMENTO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[540px]">
            <div className="p-3.5 rounded-[3px] bg-[#0D121B] border border-white/[0.06]">
              <span className="text-[10px] font-bold text-[#8B93A1] uppercase tracking-wider block">
                Disponível Agora
              </span>
              <span className="font-display text-xl font-bold text-[#F5F5F5] mt-1 block">
                {brl(periodMetrics.disponivelAgora)}
              </span>
              <span className="text-[10px] text-[#8B93A1] block mt-0.5">Dinheiro & Pix em caixa</span>
            </div>

            <div className="p-3.5 rounded-[3px] bg-[#0D121B] border border-white/[0.06]">
              <span className="text-[10px] font-bold text-[#8B93A1] uppercase tracking-wider block">
                A Receber
              </span>
              <span className="font-display text-xl font-bold text-[#E5C365] mt-1 block">
                {brl(periodMetrics.aReceber)}
              </span>
              <span className="text-[10px] text-[#8B93A1] block mt-0.5">Cartão a liquidar</span>
            </div>

            <div className="p-3.5 rounded-[3px] bg-[#0D121B] border border-white/[0.06]">
              <span className="text-[10px] font-bold text-[#8B93A1] uppercase tracking-wider block">
                Faturamento
              </span>
              <span className="font-display text-xl font-bold text-[#F5F5F5] mt-1 block">
                {brl(periodMetrics.faturamento)}
              </span>
              <span className="text-[10px] text-[#8B93A1] block mt-0.5">{periodMetrics.count} atendimentos</span>
            </div>
          </div>
        </div>

        {/* Linha Fina de Decomposição Financeira Objetiva */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div>
            <span className="text-[#8B93A1] block text-[11px]">(-) Taxas de Cartão</span>
            <span className="font-mono font-medium text-slate-300">{brl(periodMetrics.taxas)}</span>
          </div>
          <div>
            <span className="text-[#8B93A1] block text-[11px]">(-) Comissões Barbeiros</span>
            <span className="font-mono font-medium text-amber-300">{brl(periodMetrics.comissoes)}</span>
          </div>
          <div>
            <span className="text-[#8B93A1] block text-[11px]">(-) Despesas Pagas</span>
            <span className="font-mono font-medium text-[#EF4444]">{brl(periodMetrics.despesas)}</span>
          </div>
          <div>
            <span className="text-[#8B93A1] block text-[11px]">(=) Ticket Médio</span>
            <span className="font-mono font-medium text-[#F5F5F5]">{brl(periodMetrics.ticketMedio)}</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. OPERAÇÃO: PRÓXIMOS ATENDIMENTOS & EQUIPE NA BANCADA   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* SEÇÃO REFINADA: PRÓXIMOS ATENDIMENTOS (DADOS REAIS DA AGENDA) */}
        <div className="lg:col-span-6 rounded-[4px] bg-[#0A0E15] border border-white/[0.08] p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#D4AF37]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                  Próximos Atendimentos
                </h3>
                <span className="text-[10px] text-[#8B93A1] font-mono font-semibold ml-1">
                  ({operationalStats.upcomingAppointments.length} agendados)
                </span>
              </div>
              <button
                onClick={() => navigate("/calendario")}
                className="text-xs font-semibold text-[#D4AF37] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Agenda</span> <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Lista dos Agendamentos Reais do Dia */}
            <div className="divide-y divide-white/[0.04]">
              {operationalStats.upcomingAppointments.length > 0 ? (
                operationalStats.upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-extrabold text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-[3px] shrink-0 border border-[#D4AF37]/20">
                        {apt.time || "Horário"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#F5F5F5] truncate leading-tight">
                          {apt.client_name}
                        </p>
                        <p className="text-[11px] text-[#8B93A1] truncate mt-0.5">
                          {apt.service_names?.[0] || apt.service_name || "Serviço"} • <span className="text-slate-300">{apt.barber_name}</span>
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] uppercase font-bold text-[#8B93A1] bg-[#111722] px-2 py-0.5 rounded-[2px] border border-white/[0.06] shrink-0">
                      {apt.status === "confirmado" ? "Confirmado" : apt.status === "pendente" ? "Aguardando" : apt.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Clock className="h-7 w-7 text-[#8B93A1] mx-auto mb-1.5 opacity-30" />
                  <p className="text-xs text-[#F5F5F5] font-semibold">Sem agendamentos futuros para hoje</p>
                  <p className="text-[11px] text-[#8B93A1] mt-0.5">Clientes que agendam online ou na recepção entram automaticamente aqui.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] mt-3 flex items-center justify-between text-xs text-[#8B93A1]">
            <span>{operationalStats.upcomingAptsCount} cliente(s) na agenda de hoje</span>
            <button
              onClick={() => navigate("/calendario")}
              className="text-[#D4AF37] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ver Calendário Completo</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* PROFISSIONAIS EM ATENDIMENTO */}
        <div className="lg:col-span-6 rounded-[4px] bg-[#0A0E15] border border-white/[0.08] p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-[#D4AF37]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                  Profissionais em Atendimento
                </h3>
              </div>
              <button
                onClick={() => navigate("/equipe")}
                className="text-xs font-semibold text-[#D4AF37] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Equipe</span> <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {operationalStats.barbers.map((b) => {
                const servingQueue = operationalStats.inServiceItems.find(
                  (q) => q.barber_id === b.id || q.barber_name === b.name
                );

                return (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/equipe/${b.id}`)}
                    className="p-3 rounded-[3px] bg-[#0D121B] border border-white/[0.06] hover:border-[#D4AF37]/30 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-[#111722] border border-[#D4AF37]/30 text-[#D4AF37] font-bold text-xs flex items-center justify-center shrink-0">
                        {b.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#F5F5F5] truncate leading-tight">{b.name}</p>
                        <p className="text-[10px] text-[#8B93A1] truncate mt-0.5">
                          {servingQueue ? (
                            <span className="text-amber-300 font-medium">Cliente: {servingQueue.client_name}</span>
                          ) : (
                            <span className="text-[#20C997] font-medium">Pronto para atendimento</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div>
                      {servingQueue ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> Atendendo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#20C997] bg-[#20C997]/10 px-1.5 py-0.5 rounded border border-[#20C997]/20 shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#20C997]" /> Livre
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] mt-3 flex items-center justify-between text-[11px] text-[#8B93A1]">
            <span>{operationalStats.inServiceCount} barbeiro(s) ocupados agora</span>
            <button
              onClick={() => navigate("/atendimentos")}
              className="text-[#D4AF37] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Abrir Fila de Atendimento</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 5. VISÃO SECUNDÁRIA: GRÁFICO LIMPO & ATENDIMENTOS        */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Gráfico Limpo & Secundário de Tendência de Faturamento */}
        <div className="lg:col-span-7 rounded-[4px] bg-[#0A0E15] border border-white/[0.08] p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/[0.06]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#8B93A1]">
                Ritmo de Entradas ({activeDateRange.label})
              </span>
            </div>
            <span className="text-xs font-bold text-[#D4AF37] font-mono">
              Total: {brl(periodMetrics.faturamento)}
            </span>
          </div>

          {chartSeries.length > 0 ? (
            <div className="h-36 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSeries} margin={{ top: 6, right: 10, left: -25, bottom: 0 }}>
                  <XAxis
                    dataKey="dia"
                    stroke="#8B93A1"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  />
                  <YAxis
                    stroke="#8B93A1"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0D121B",
                      borderColor: "rgba(212,175,55,0.3)",
                      borderRadius: "4px",
                      color: "#F5F5F5",
                      fontSize: "12px",
                    }}
                    formatter={(val) => [brl(val), "Faturamento"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="faturamento"
                    stroke="#D4AF37"
                    strokeWidth={1.5}
                    fillOpacity={0.08}
                    fill="#D4AF37"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-36 flex flex-col items-center justify-center text-center p-4">
              <p className="text-xs font-semibold text-[#8B93A1]">Sem movimentação registrada para este filtro</p>
            </div>
          )}

          {/* Formas de Pagamento em linha compacta */}
          {paymentBreakdown.length > 0 && (
            <div className="pt-3 border-t border-white/[0.06] mt-2 flex flex-wrap items-center gap-4 text-xs">
              <span className="text-[11px] font-bold text-[#8B93A1] uppercase">Canais:</span>
              {paymentBreakdown.slice(0, 3).map((item) => (
                <span key={item.name} className="flex items-center gap-1.5 text-xs text-[#8B93A1]">
                  <span className="font-semibold text-[#F5F5F5]">{item.name}:</span>
                  <span className="font-mono text-[#D4AF37]">{brl(item.value)} ({item.percentage}%)</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Últimas Transações Lançadas (5 Colunas) */}
        <div className="lg:col-span-5 rounded-[4px] bg-[#0A0E15] border border-white/[0.08] p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#D4AF37]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#8B93A1]">
                  Últimos Atendimentos
                </span>
              </div>
              <button
                onClick={() => navigate("/receitas")}
                className="text-xs font-semibold text-[#D4AF37] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>Ver todas</span> <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-1.5">
              {periodRevenues.slice(0, 4).map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-[3px] bg-[#0D121B] border border-white/[0.04] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#F5F5F5] truncate leading-tight">{tx.client_name || "Cliente Balcão"}</p>
                    <p className="text-[11px] text-[#8B93A1] truncate mt-0.5">
                      {tx.service_name} • {tx.barber_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-[#20C997] block">
                      +{brl(tx.paid_amount || tx.gross_amount)}
                    </span>
                    <span className="text-[10px] text-[#8B93A1] uppercase block mt-0.5">
                      {tx.payment_method_name || tx.payment_type || "PIX"}
                    </span>
                  </div>
                </div>
              ))}

              {periodRevenues.length === 0 && (
                <div className="py-8 text-center text-[#8B93A1]">
                  <p className="text-xs">Nenhum atendimento registrado no período</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2.5 border-t border-white/[0.06] mt-3 flex items-center justify-between text-xs">
            <span className="text-[#8B93A1]">Meta do mês: {be?.progress ? `${Math.round(be.progress)}% atingida` : "85%"}</span>
            <button
              onClick={() => navigate("/fluxo-de-caixa")}
              className="text-[#D4AF37] hover:underline cursor-pointer"
            >
              Abrir DRE Completo →
            </button>
          </div>
        </div>

      </div>

      {/* Modais Globais Preservados */}
      {outletCtx?.isNovoAtendimentoOpen && (
        <NovoAtendimentoModal
          open={outletCtx.isNovoAtendimentoOpen}
          onOpenChange={outletCtx.setIsNovoAtendimentoOpen}
          onSuccess={() => {
            mutateSummary?.();
            mutateRevenues?.();
            mutateQueue?.();
            mutateAppointments?.();
          }}
        />
      )}
      <NovoAtendimentoModal
        open={localModalOpen}
        onOpenChange={setLocalModalOpen}
        onSuccess={() => {
          mutateSummary?.();
          mutateRevenues?.();
          mutateQueue?.();
          mutateAppointments?.();
        }}
      />
    </div>
  );
}
