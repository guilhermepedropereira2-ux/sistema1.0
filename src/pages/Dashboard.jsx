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
import HeroBanner from "@/components/HeroBanner";
import PeriodFilterBar from "@/components/PeriodFilterBar";
import MetricCards from "@/components/MetricCards";
import RevenueChart from "@/components/RevenueChart";
import OperationalStatus from "@/components/OperationalStatus";
import TopLists from "@/components/TopLists";
import PaymentBreakdown from "@/components/PaymentBreakdown";
import HourlySales from "@/components/HourlySales";
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
} from "recharts";
import {
  Wallet, TrendingUp, Clock, Users, Scissors, Plus,
  ChevronRight, Calendar, ArrowUpRight, CheckCircle2,
  AlertCircle, Activity, Timer, Layers, CreditCard,
  UserCheck, ArrowRight, Package, Flame, Tag, DollarSign,
  QrCode, Banknote,
} from "lucide-react";

function getPaymentMethodIcon(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("pix")) return QrCode;
  if (n.includes("dinheiro")) return Banknote;
  return CreditCard;
}

export default function Dashboard() {
  const { month, setMonth } = useMonth();
  const outletCtx = useOutletContext();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const { activeUnitId, isPremium, activeUnit } = useUnit();
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
  const { data: servicesList } = useApi(
    (api) => api.get("/services"),
    [refreshTick, activeUnitId]
  );
  const { data: productsList } = useApi(
    (api) => api.get("/products"),
    [refreshTick, activeUnitId]
  );
  const { data: barbershop } = useApi(
    (api) => api.get("/barbershop"),
    [refreshTick]
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

  // Totais de serviços vs produtos
  const { totalServiceSales, totalProductSales, serviceCount, productCount } = useMemo(() => {
    let svcTotal = 0;
    let prodTotal = 0;
    let svcQty = 0;
    let prodQty = 0;
    const prods = Array.isArray(productsList) ? productsList : [];
    const prodNamesLower = prods.map((p) => p.name.toLowerCase());

    periodRevenues.forEach((r) => {
      const isProd =
        r.item_kind === "produto" ||
        (r.service_name && prodNamesLower.includes(r.service_name.toLowerCase()));
      const val = Number(r.paid_amount || r.gross_amount || 0);
      const qty = Number(r.quantity || 1);
      if (isProd) {
        prodTotal += val;
        prodQty += qty;
      } else {
        svcTotal += val;
        svcQty += qty;
      }
    });

    return {
      totalServiceSales: Number(svcTotal.toFixed(2)),
      totalProductSales: Number(prodTotal.toFixed(2)),
      serviceCount: svcQty,
      productCount: prodQty,
    };
  }, [periodRevenues, productsList]);

  // Evolução de Faturamento (com decomposição Serviços vs Produtos)
  const chartSeries = useMemo(() => {
    const daysMap = {};
    const prods = Array.isArray(productsList) ? productsList : [];
    const prodNamesLower = prods.map((p) => p.name.toLowerCase());

    periodRevenues.forEach((r) => {
      const d = r.date;
      if (!daysMap[d]) {
        daysMap[d] = {
          date: d,
          dia: fmtDate(d).slice(0, 5),
          servicos: 0,
          produtos: 0,
          faturamento: 0,
        };
      }
      const isProd =
        r.item_kind === "produto" ||
        (r.service_name && prodNamesLower.includes(r.service_name.toLowerCase()));
      const val = Number(r.paid_amount || r.gross_amount || 0);

      if (isProd) {
        daysMap[d].produtos += val;
      } else {
        daysMap[d].servicos += val;
      }
      daysMap[d].faturamento += val;
    });

    const list = Object.values(daysMap).sort((a, b) => a.date.localeCompare(b.date));
    return list.map((item) => ({
      ...item,
      day: item.dia ? item.dia.slice(0, 2) : "01",
      dateStr: item.dia,
      total: Number(item.faturamento.toFixed(2)),
      servicos: Number(item.servicos.toFixed(2)),
      produtos: Number(item.produtos.toFixed(2)),
      faturamento: Number(item.faturamento.toFixed(2)),
    }));
  }, [periodRevenues, productsList]);

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    if (!periodRevenues.length) {
      return [
        { name: "Cartão de Crédito", value: 0, percentage: 0 },
        { name: "PIX", value: 0, percentage: 0 },
        { name: "Cartão de Débito", value: 0, percentage: 0 },
        { name: "Dinheiro", value: 0, percentage: 0 },
      ];
    }
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

  // 1. Serviços Mais Vendidos
  const topServices = useMemo(() => {
    const map = {};
    const prods = Array.isArray(productsList) ? productsList : [];
    const prodNamesLower = prods.map((p) => p.name.toLowerCase());

    periodRevenues.forEach((r) => {
      const isProd =
        r.item_kind === "produto" ||
        (r.service_name && prodNamesLower.includes(r.service_name.toLowerCase()));
      if (isProd) return;
      const name = r.service_name || "Serviço";
      const svcMatch = Array.isArray(servicesList)
        ? servicesList.find((s) => s.name === name || s.id === r.service_id)
        : null;
      if (!map[name]) map[name] = { name, count: 0, revenue: 0, icon: svcMatch?.icon };
      map[name].count += Number(r.quantity || 1);
      map[name].revenue += Number(r.paid_amount || r.gross_amount || 0);
    });

    let list = Object.values(map).sort((a, b) => b.revenue - a.revenue);
    if (list.length === 0 && Array.isArray(servicesList) && servicesList.length > 0) {
      list = servicesList.slice(0, 4).map((s) => ({
        name: s.name,
        count: 0,
        revenue: 0,
        icon: s.icon,
      }));
    }

    const maxRev = Math.max(...list.map((i) => i.revenue), 1);
    return list.slice(0, 4).map((item) => ({
      ...item,
      percentage: Math.round((item.revenue / maxRev) * 100),
    }));
  }, [periodRevenues, productsList, servicesList]);

  // 2. Produtos Mais Vendidos
  const topProducts = useMemo(() => {
    const map = {};
    const prods = Array.isArray(productsList) ? productsList : [];
    const prodNamesLower = prods.map((p) => p.name.toLowerCase());

    periodRevenues.forEach((r) => {
      const isProd =
        r.item_kind === "produto" ||
        (r.service_name && prodNamesLower.includes(r.service_name.toLowerCase()));
      if (!isProd) return;
      const name = r.service_name || "Produto";
      if (!map[name]) map[name] = { name, count: 0, revenue: 0 };
      map[name].count += Number(r.quantity || 1);
      map[name].revenue += Number(r.paid_amount || r.gross_amount || 0);
    });

    let list = Object.values(map).sort((a, b) => b.revenue - a.revenue);

    if (list.length === 0 && prods.length > 0) {
      list = prods.slice(0, 4).map((p) => ({
        name: p.name,
        count: 0,
        revenue: 0,
        stock: p.stock ?? 18,
      }));
    } else {
      list = list.map((item) => {
        const p = prods.find((x) => x.name.toLowerCase() === item.name.toLowerCase());
        return {
          ...item,
          stock: p?.stock ?? 15,
        };
      });
    }

    const maxRev = Math.max(...list.map((i) => i.revenue), 1);
    return list.slice(0, 4).map((item) => ({
      ...item,
      percentage: Math.round((item.revenue / maxRev) * 100),
    }));
  }, [periodRevenues, productsList]);

  // 3. Horários de Maior Venda (Picos de Movimento)
  const peakHours = useMemo(() => {
    const slots = [
      { id: "slot_manha", label: "09:00 - 12:00", name: "Manhã", count: 0, revenue: 0, hours: [9, 10, 11] },
      { id: "slot_almoco", label: "12:00 - 15:00", name: "Almoço", count: 0, revenue: 0, hours: [12, 13, 14] },
      { id: "slot_tarde", label: "15:00 - 18:00", name: "Tarde", count: 0, revenue: 0, hours: [15, 16, 17] },
      { id: "slot_noite", label: "18:00 - 21:00", name: "Noite / Pico", count: 0, revenue: 0, hours: [18, 19, 20] },
    ];

    periodRevenues.forEach((r) => {
      const timeStr = r.time || "14:00";
      const hour = parseInt(timeStr.split(":")[0], 10);
      const matched = slots.find((s) => s.hours.includes(hour)) || slots[2];
      matched.count += 1;
      matched.revenue += Number(r.paid_amount || r.gross_amount || 0);
    });

    const maxCount = Math.max(...slots.map((s) => s.count), 1);
    return slots.map((s) => ({
      ...s,
      timeRange: s.label,
      amount: s.revenue,
      percentage: Math.round((s.count / maxCount) * 100),
    }));
  }, [periodRevenues]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "BOM DIA" : h < 18 ? "BOA TARDE" : "BOA NOITE";
  }, []);

  const metricCardsData = useMemo(() => [
    {
      id: "faturamento",
      title: "Faturamento Bruto",
      value: brl(periodMetrics.faturamento),
      trend: "+12.4% vs anterior",
    },
    {
      id: "servicos",
      title: "Vendas de Serviços",
      value: brl(totalServiceSales),
      trend: `${serviceCount} atendimentos`,
    },
    {
      id: "produtos",
      title: "Vendas de Produtos",
      value: brl(totalProductSales),
      trend: `${productCount} un vendidas`,
    },
    {
      id: "atendimentos",
      title: "Total de Atendimentos",
      value: String(periodMetrics.count),
      trend: `Ticket: ${brl(periodMetrics.ticketMedio)}`,
    },
  ], [periodMetrics, totalServiceSales, totalProductSales, serviceCount, productCount]);

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

  const userName = user?.name ? user.name.split(" ")[0] : "Administrador";
  const shopName = activeUnit?.name || barbershop?.name || "Barbearia";
  const shopAddress = activeUnit?.address || barbershop?.address || "São Paulo - SP";

  const todayLongDate = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const currentDateFormatted = selectedPeriod === "hoje"
    ? `Hoje, ${todayLongDate}`
    : activeDateRange.label;

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6 w-full max-w-[1600px] mx-auto pb-24 sm:pb-28 lg:pb-12 antialiased" data-testid="dashboard">
      {/* Visão de Rede Consolidada */}
      {activeUnitId === "all" && isPremium && (
        <NetworkView summary={s} />
      )}

      {/* 1. HERO BANNER CINEMATOGRÁFICO KUPOLA 2.0 */}
      <HeroBanner
        userName={userName}
        shopName={shopName}
        unitName={activeUnit?.is_main ? "Matriz" : (activeUnit?.name || "Matriz")}
        onOpenStoreProfile={() => navigate("/barbearia")}
      />

      {/* 2. FILTRO DE PERÍODOS COM ROLAGEM ISOLADA */}
      <PeriodFilterBar
        selectedPeriod={selectedPeriod}
        onPeriodChange={(p) => {
          setSelectedPeriod(p);
          if (p === "mes") {
            const currentYm = new Date().toISOString().slice(0, 7);
            if (month !== currentYm) setMonth(currentYm);
          }
        }}
        selectedMonth={currentDateFormatted}
        showCustomInputs={selectedPeriod === "personalizado"}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        onApplyCustomDates={() => setAppliedCustomDates({ start: customStart, end: customEnd })}
      />

      {/* 3. CARDS DE MÉTRICAS (2x2 no mobile / 4 colunas no tablet e desktop) */}
      <MetricCards
        metrics={metricCardsData}
        onCardClick={(id) => {
          if (id === "servicos") navigate("/servicos");
          else if (id === "produtos") navigate("/produtos");
          else if (id === "atendimentos") navigate("/atendimentos");
          else if (id === "faturamento") navigate("/receitas");
        }}
      />

      {/* 4. COMPOSIÇÃO RESPONSIVA PROGRESSIVA (KUPOLA 2.0) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 w-full">
        {/* Coluna Esquerda (Desktop 8 colunas / Tablet e Mobile largura total) */}
        <div className="xl:col-span-8 space-y-4 sm:space-y-5 min-w-0">
          {/* Evolução de Faturamento */}
          <RevenueChart data={chartSeries} totalRevenue={periodMetrics.faturamento} />

          {/* No Mobile & Tablet (< xl): Situação Agora logo após o gráfico */}
          <div className="xl:hidden">
            <OperationalStatus
              barbersCount={operationalStats.barbersActiveCount}
              appointmentsCount={operationalStats.upcomingAptsCount}
              inServiceCount={operationalStats.inServiceCount}
              onOpenNewAppointment={handleOpenNovoAtendimento}
              onRowClick={(row) => {
                if (row === "barbeiros") navigate("/equipe");
                else if (row === "agendamentos") navigate("/calendario");
                else if (row === "atendimento") navigate("/atendimentos");
              }}
            />
          </div>

          {/* Serviços Mais Vendidos & Produtos Mais Vendidos (lado a lado no tablet e desktop!) */}
          <TopLists
            services={topServices}
            products={topProducts}
            onViewAllServices={() => navigate("/servicos")}
            onViewAllProducts={() => navigate("/produtos")}
            onSelectService={() => navigate("/servicos")}
            onSelectProduct={() => navigate("/produtos")}
          />
        </div>

        {/* Coluna Direita (Desktop 4 colunas / Tablet 2 colunas / Mobile 1 coluna) */}
        <div className="xl:col-span-4 space-y-4 sm:space-y-5 min-w-0">
          {/* Desktop apenas (>= xl): Situação Agora alinhada lado a lado com o gráfico */}
          <div className="hidden xl:block">
            <OperationalStatus
              barbersCount={operationalStats.barbersActiveCount}
              appointmentsCount={operationalStats.upcomingAptsCount}
              inServiceCount={operationalStats.inServiceCount}
              onOpenNewAppointment={handleOpenNovoAtendimento}
              onRowClick={(row) => {
                if (row === "barbeiros") navigate("/equipe");
                else if (row === "agendamentos") navigate("/calendario");
                else if (row === "atendimento") navigate("/atendimentos");
              }}
            />
          </div>

          {/* Formas de Pagamento & Horários de Maior Venda:
              - No Tablet (md a xl): lado a lado em 2 colunas (md:grid-cols-2)
              - No Desktop (xl+): empilhado na barra de 4 colunas (xl:grid-cols-1)
              - No Mobile (< md): empilhado (grid-cols-1) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4 sm:gap-5 w-full">
            <PaymentBreakdown methods={paymentBreakdown} />
            <HourlySales sales={peakHours} />
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
