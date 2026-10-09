import React, { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { useAuth } from "@/context/AuthContext";
import { useBalcao } from "@/context/BalcaoContext";
import { api } from "@/lib/api";
import { brl, fmtDate } from "@/lib/format";
import { downloadCsv, formatBrlNumber } from "@/lib/exportCsv";
import ProductIcon from "@/components/products/ProductIcon";
import ServiceIcon from "@/components/services/ServiceIcon";
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Calendar,
  ChevronDown,
  LayoutGrid,
  Scale,
  ArrowLeftRight,
  Scissors,
  Tag,
  Package,
  User,
  Users,
  TrendingUp,
  Receipt,
  CheckCircle2,
  DollarSign,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  MoreVertical,
  Plus,
  Search,
  Filter,
  CreditCard,
  Banknote,
  Coins,
  Check,
  Ban,
  RotateCcw,
  ExternalLink,
  HelpCircle,
  FolderOpen,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Relatorios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "geral";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [movementFilter, setMovementFilter] = useState("todos"); // todos | receitas | despesas
  const [periodMonthsCount, setPeriodMonthsCount] = useState(6);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState(null);

  const { month, setMonth } = useMonth();
  const { isBalcaoMode } = useBalcao();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Buscar dados reais da API KUPOLA (isolados por tenant autenticado)
  const { data: summary, refresh: refreshSummary } = useApi((apiClient) =>
    apiClient.get("/dashboard/summary", { month })
  );
  const { data: evolution, refresh: refreshEvolution } = useApi((apiClient) =>
    apiClient.get("/dashboard/evolution", { month, months: periodMonthsCount })
  );
  const { data: cashflow, refresh: refreshCashflow } = useApi((apiClient) =>
    apiClient.get("/dashboard/cashflow", { month })
  );
  const { data: rawRevenues, refresh: refreshRevenues } = useApi((apiClient) =>
    apiClient.get("/revenues", { month })
  );
  const { data: rawExpenses, refresh: refreshExpenses } = useApi((apiClient) =>
    apiClient.get("/expenses", { month })
  );
  const { data: rawBarbers } = useApi((apiClient) => apiClient.get("/barbers"));
  const { data: rawServices } = useApi((apiClient) => apiClient.get("/services"));
  const { data: rawProducts } = useApi((apiClient) => apiClient.get("/products"));
  const { data: rawClients } = useApi((apiClient) => apiClient.get("/clients"));
  const { data: rawWithdrawals, refresh: refreshWithdrawals } = useApi((apiClient) =>
    apiClient.get("/withdrawals", { month })
  );

  const revenues = Array.isArray(rawRevenues) ? rawRevenues : [];
  const expenses = Array.isArray(rawExpenses) ? rawExpenses : [];
  const barbers = Array.isArray(rawBarbers) ? rawBarbers : [];
  const services = Array.isArray(rawServices) ? rawServices : [];
  const products = Array.isArray(rawProducts) ? rawProducts : [];
  const clients = Array.isArray(rawClients) ? rawClients : [];
  const withdrawals = Array.isArray(rawWithdrawals) ? rawWithdrawals : [];

  const refreshAll = () => {
    refreshSummary();
    refreshEvolution();
    refreshCashflow();
    refreshRevenues();
    refreshExpenses();
    refreshWithdrawals();
  };

  // Sincronizar query param com tab
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Cálculos Financeiros Reais
  const gross = Number(summary?.gross ?? revenues.reduce((acc, r) => acc + (r.paid_amount || r.gross_amount || 0), 0));
  const fees = Number(summary?.fees ?? revenues.reduce((acc, r) => acc + (r.fee_amount || 0), 0));
  const netRevenue = Math.max(0, gross - fees);
  const commissions = Number(summary?.commissions ?? revenues.reduce((acc, r) => acc + (r.commission_amount || 0), 0));
  const contributionMargin = Number(summary?.contribution_margin ?? (netRevenue - commissions));
  const totalExpenses = Number(summary?.expenses_total ?? expenses.reduce((acc, e) => acc + (e.value || 0), 0));
  const netProfit = Number(summary?.profit ?? (contributionMargin - totalExpenses));
  const totalWithdrawals = (withdrawals || []).reduce((acc, w) => acc + (w.value || 0), 0);
  const retainedResult = netProfit - totalWithdrawals;

  // Percentuais de margem calculados em tempo real a partir da receita real
  const marginPct = gross > 0 ? ((contributionMargin / gross) * 100).toFixed(1) + "%" : "—";
  const expensesPct = gross > 0 ? ((totalExpenses / gross) * 100).toFixed(1) + "%" : "—";
  const profitPct = gross > 0 ? ((netProfit / gross) * 100).toFixed(1) + "%" : "—";

  // Função para renderizar comparativos reais vs mês anterior
  const renderComparison = (currentVal, prevVal, isExpense = false) => {
    if (!summary?.has_prev_data || (prevVal === 0 && currentVal === 0)) {
      return <span className="text-slate-400 font-medium">Sem dados anteriores</span>;
    }
    if (prevVal === 0 && currentVal > 0) {
      return (
        <span className="text-[#20C997] font-bold flex items-center gap-1">
          <ArrowUp className="w-3.5 h-3.5" /> 1º período ativo
        </span>
      );
    }
    if (prevVal > 0) {
      const diff = currentVal - prevVal;
      const pct = Math.round((diff / prevVal) * 100);
      if (pct === 0) {
        return <span className="text-slate-400 font-medium">0% vs. mês anterior</span>;
      }
      if (pct > 0) {
        const isGood = !isExpense;
        return (
          <span className={`${isGood ? "text-[#20C997]" : "text-red-400"} font-bold flex items-center gap-0.5`}>
            <ArrowUp className="w-3.5 h-3.5" /> +{pct}% vs. mês anterior
          </span>
        );
      }
      const isGood = isExpense;
      return (
        <span className={`${isGood ? "text-[#20C997]" : "text-red-400"} font-bold flex items-center gap-0.5`}>
          <ArrowDown className="w-3.5 h-3.5" /> {pct}% vs. mês anterior
        </span>
      );
    }
    return <span className="text-slate-400 font-medium">Sem dados anteriores</span>;
  };

  // Data formatada para período no cabeçalho
  const periodLabel = useMemo(() => {
    if (!month) return "Mês Atual";
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, "0");
    return `01/${mm}/${y} - ${lastDay}/${mm}/${y}`;
  }, [month]);

  // Lista combinada de Movimentações (Receitas + Despesas)
  const combinedMovements = useMemo(() => {
    const revList = (revenues || []).map((r) => {
      const isProduct = r.service_type === "produto" || r.item_kind === "produto";
      return {
        id: `rev-${r.id}`,
        rawId: r.id,
        kind: "receita",
        date: r.date,
        time: r.time || "12:00",
        description: r.service_name || (isProduct ? "Venda de Produto" : "Atendimento"),
        categoryLabel: isProduct ? "Produto" : "Serviço",
        categoryType: isProduct ? "produto" : "servico",
        type: "Receita",
        isPositive: true,
        barberName: r.barber_name || "-",
        clientName: r.client_name || "-",
        paymentMethod: r.payment_method || r.payment_channel || r.payment_type || "PIX",
        paymentChannel: r.payment_channel,
        amount: Number(r.paid_amount || r.gross_amount || 0),
        status: r.status || "ativo",
        raw: r,
      };
    });

    const expList = (expenses || []).map((e) => {
      return {
        id: `exp-${e.id}`,
        rawId: e.id,
        kind: "despesa",
        date: e.due_date || e.payment_date || todayISO(),
        time: "14:10",
        description: e.description || e.category || "Despesa Operacional",
        categoryLabel: "Despesa",
        categoryType: "despesa",
        type: "Despesa",
        isPositive: false,
        barberName: "-",
        clientName: "-",
        paymentMethod: e.payment_method || "-",
        paymentChannel: "-",
        amount: Number(e.value || 0),
        status: e.payment_date ? "pago" : "pendente",
        raw: e,
      };
    });

    const all = [...revList, ...expList];
    all.sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
    return all;
  }, [revenues, expenses]);

  // Movimentações filtradas para exibição
  const filteredMovements = useMemo(() => {
    return combinedMovements.filter((m) => {
      if (movementFilter === "receitas" && m.kind !== "receita") return false;
      if (movementFilter === "despesas" && m.kind !== "despesa") return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchDesc = m.description.toLowerCase().includes(query);
        const matchClient = m.clientName.toLowerCase().includes(query);
        const matchBarber = m.barberName.toLowerCase().includes(query);
        const matchPayment = m.paymentMethod.toLowerCase().includes(query);
        if (!matchDesc && !matchClient && !matchBarber && !matchPayment) return false;
      }

      return true;
    });
  }, [combinedMovements, movementFilter, searchTerm]);

  // As primeiras 5 para o card de "Últimas movimentações" da Visão Geral
  const latestMovements = useMemo(() => {
    return combinedMovements.slice(0, 5);
  }, [combinedMovements]);

  // Dados do Gráfico de Evolução Financeira (Base real da API do tenant)
  const evolutionChartData = useMemo(() => {
    if (evolution && Array.isArray(evolution.series)) {
      return evolution.series;
    }
    return [];
  }, [evolution]);

  const hasEvolutionData = Boolean(evolution?.hasData);

  // Distribuição da Receita por Categoria (Calculada exclusivamente a partir das receitas reais)
  const { distributionItems, hasDistributionData, totalDistributionRevenue } = useMemo(() => {
    let cortes = 0;
    let barba = 0;
    let combo = 0;
    let sobrancelha = 0;
    let prods = 0;
    let outros = 0;

    revenues.forEach((r) => {
      const name = (r.service_name || "").toLowerCase();
      const val = Number(r.paid_amount || r.gross_amount || 0);
      if (r.service_type === "produto" || r.item_kind === "produto") {
        prods += val;
      } else if (name.includes("combo") || name.includes("completo") || name.includes("+")) {
        combo += val;
      } else if (name.includes("corte") || name.includes("degrade") || name.includes("cabelo")) {
        cortes += val;
      } else if (name.includes("barba") || name.includes("terapia")) {
        barba += val;
      } else if (name.includes("sobrancelha")) {
        sobrancelha += val;
      } else {
        outros += val;
      }
    });

    const total = cortes + barba + combo + sobrancelha + prods + outros;

    if (total <= 0) {
      return {
        distributionItems: [],
        hasDistributionData: false,
        totalDistributionRevenue: 0,
      };
    }

    const items = [
      { name: "Cortes", value: cortes, pct: Math.round((cortes / total) * 100), color: "#E5C365" },
      { name: "Barba", value: barba, pct: Math.round((barba / total) * 100), color: "#EF4444" },
      { name: "Combo", value: combo, pct: Math.round((combo / total) * 100), color: "#A855F7" },
      { name: "Sobrancelha", value: sobrancelha, pct: Math.round((sobrancelha / total) * 100), color: "#38BDF8" },
      { name: "Produtos", value: prods, pct: Math.round((prods / total) * 100), color: "#20C997" },
      { name: "Outros", value: outros, pct: Math.round((outros / total) * 100), color: "#94A3B8" },
    ].filter((item) => item.value > 0);

    return {
      distributionItems: items,
      hasDistributionData: items.length > 0,
      totalDistributionRevenue: total,
    };
  }, [revenues]);

  // Função para exportação em Excel/CSV
  const handleExportCsv = () => {
    let filename = `Kupola_Relatorio_${activeTab}_${month}.csv`;
    let headers = [];
    let rows = [];

    if (activeTab === "dre") {
      filename = `Kupola_DRE_Demonstrativo_${month}.csv`;
      headers = ["Linha / Conta", "Competência", "Valor (R$)", "Proporção da Receita (%)"];
      const pctCalc = (v) => (gross > 0 ? ((v / gross) * 100).toFixed(1) + "%" : "0.0%");
      rows = [
        ["(+) Receita Bruta Total", month, formatBrlNumber(gross), "100.0%"],
        ["(-) Deduções e Taxas de Cartão", month, formatBrlNumber(fees), pctCalc(fees)],
        ["(=) Receita Operacional Líquida", month, formatBrlNumber(netRevenue), pctCalc(netRevenue)],
        ["(-) Comissões da Equipe", month, formatBrlNumber(commissions), pctCalc(commissions)],
        ["(=) Margem de Contribuição", month, formatBrlNumber(contributionMargin), pctCalc(contributionMargin)],
        ["(-) Despesas Operacionais", month, formatBrlNumber(totalExpenses), pctCalc(totalExpenses)],
        ["(=) Lucro Líquido Real", month, formatBrlNumber(netProfit), pctCalc(netProfit)],
        ["(-) Retiradas do Dono / Pró-labore", month, formatBrlNumber(totalWithdrawals), pctCalc(totalWithdrawals)],
        ["(=) Saldo Retido no Caixa", month, formatBrlNumber(retainedResult), pctCalc(retainedResult)],
      ];
    } else if (activeTab === "movimentacao") {
      filename = `Kupola_Movimentacoes_Financeiras_${month}.csv`;
      headers = [
        "Data/Hora",
        "Tipo",
        "Categoria",
        "Descrição",
        "Barbeiro",
        "Cliente",
        "Forma de Pagamento",
        "Valor (R$)",
        "Status",
      ];
      rows = combinedMovements.map((m) => [
        `${fmtDate(m.date)} ${m.time}`,
        m.type,
        m.categoryLabel,
        m.description,
        m.barberName,
        m.clientName,
        m.paymentMethod,
        formatBrlNumber(m.amount),
        m.status,
      ]);
    } else {
      filename = `Kupola_Relatorio_Geral_${month}.csv`;
      headers = ["Indicador", "Competência", "Valor (R$)", "Observação"];
      const uniqueAttendancesCount = new Set(revenues.filter((r) => r.status === "ativo").map((r) => r.sale_group_id || r.id)).size;
      rows = [
        ["Receita Bruta", month, formatBrlNumber(gross), "Faturamento Total"],
        ["Margem de Contribuição", month, formatBrlNumber(contributionMargin), `${marginPct} da receita`],
        ["Total de Despesas", month, formatBrlNumber(totalExpenses), `${expensesPct} da receita`],
        ["Lucro Líquido", month, formatBrlNumber(netProfit), `${profitPct} da receita`],
        ["Total de Atendimentos", month, String(uniqueAttendancesCount), "Atendimentos realizados"],
      ];
    }

    downloadCsv({ filename, headers, rows });
    toast.success("Relatório exportado para Excel (.csv) com sucesso!");
  };

  const handlePrint = () => {
    window.print();
  };

  const renderPaymentIcon = (paymentMethod) => {
    const m = (paymentMethod || "").toLowerCase();
    if (m.includes("pix")) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-200">
          <span className="w-2 h-2 rounded-full bg-[#20C997]" />
          PIX
        </span>
      );
    }
    if (m.includes("dinheiro") || m.includes("cash")) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-200">
          <Banknote className="w-3.5 h-3.5 text-[#E5C365]" />
          Dinheiro
        </span>
      );
    }
    if (m.includes("cartão") || m.includes("card") || m.includes("ton") || m.includes("credito") || m.includes("debito")) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-200">
          <CreditCard className="w-3.5 h-3.5 text-[#38BDF8]" />
          {paymentMethod}
        </span>
      );
    }
    return <span className="text-xs text-slate-300">{paymentMethod || "-"}</span>;
  };

  const handleCancelMovement = async (m, mode = "cancelado") => {
    if (m.kind !== "receita") {
      toast.info("Apenas receitas podem ser canceladas por este atalho.");
      return;
    }
    try {
      await api.post(`/revenues/${m.rawId}/cancel?mode=${mode}`);
      toast.success(mode === "cancelado" ? "Venda cancelada!" : "Venda estornada!");
      refreshAll();
    } catch {
      toast.error("Erro ao alterar status da transação.");
    }
  };

  return (
    <div className="space-y-5 max-w-full 2xl:max-w-[1920px] mx-auto select-none print:bg-white print:text-black" data-testid="relatorios-page">
      {/* ======================================================== */}
      {/* 1. CABEÇALHO DA PÁGINA COM NAVEGAÇÃO E AÇÕES             */}
      {/* ======================================================== */}
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#E5C365] shrink-0 mt-0.5">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                Relatórios
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-tight">
                Acompanhe o desempenho financeiro da sua barbearia com relatórios completos e DRE.
              </p>
            </div>
          </div>

          {/* Botões Superiores Desktop */}
          <div className="hidden lg:flex items-center gap-2.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-10 px-3.5 rounded-xl bg-[#0D121B] border border-[#161E2C] hover:border-[#D4AF37]/40 text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Calendar className="w-4 h-4 text-[#E5C365]" />
                  <span>{periodLabel}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0D121B] border-[#161E2C] text-slate-200 w-56">
                <DropdownMenuItem onClick={() => setMonth("2026-10")} className="cursor-pointer text-xs focus:bg-white/10">
                  Outubro 2026 (Atual)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMonth("2026-09")} className="cursor-pointer text-xs focus:bg-white/10">
                  Setembro 2026
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMonth("2026-08")} className="cursor-pointer text-xs focus:bg-white/10">
                  Agosto 2026
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={handleExportCsv}
              className="h-10 px-4 rounded-xl bg-[#0D121B] hover:bg-[#121824] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-xs font-bold text-[#E5C365] hover:text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              data-testid="export-excel-btn"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#E5C365]" />
              <span>Exportar Excel (.csv)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="h-10 px-4 rounded-xl bg-[#E5C365] hover:bg-[#D4AF37] text-[#05070B] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg"
              data-testid="print-report-btn"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Relatório</span>
            </button>
          </div>
        </div>

        {/* Linha de Filtro e Ações Mobile (sem truncamento) */}
        <div className="flex lg:hidden flex-col gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full h-11 px-3.5 rounded-xl bg-[#0D121B] border border-[#161E2C] text-xs font-semibold text-slate-200 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#E5C365]" />
                  <span>{periodLabel}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-[#0D121B] border-[#161E2C] text-slate-200 w-[calc(100vw-32px)]">
              <DropdownMenuItem onClick={() => setMonth("2026-10")} className="cursor-pointer text-xs">
                Outubro 2026 (Atual)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMonth("2026-09")} className="cursor-pointer text-xs">
                Setembro 2026
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMonth("2026-08")} className="cursor-pointer text-xs">
                Agosto 2026
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-11 px-2.5 rounded-xl bg-[#0D121B] border border-[#D4AF37]/40 text-xs font-bold text-[#E5C365] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-[#E5C365]" />
              <span className="whitespace-nowrap">Exportar Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="h-11 px-2.5 rounded-xl bg-[#E5C365] text-[#05070B] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Imprimir Relatório</span>
            </button>
          </div>
        </div>

        {/* Abas de Navegação Superior (Rolagem horizontal fluida no mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none border-b border-[#161E2C]/80 pt-1">
          {[
            { id: "geral", label: "Visão Geral", icon: LayoutGrid },
            { id: "dre", label: "DRE (Resultado)", mobileLabel: "DRE", icon: Scale },
            { id: "movimentacao", label: "Movimentação Financeira", mobileLabel: "Movimentação", icon: ArrowLeftRight },
            { id: "atendimentos", label: "Atendimentos", icon: Scissors },
            { id: "servicos", label: "Serviços", icon: Tag },
            { id: "produtos", label: "Produtos", icon: Package },
            { id: "barbeiros", label: "Barbeiros", icon: User },
            { id: "clientes", label: "Clientes", icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-[#E5C365] text-[#05070B] shadow-md"
                    : "bg-[#0D121B] text-slate-300 hover:text-white border border-[#161E2C] hover:border-[#D4AF37]/30"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#05070B]" : "text-slate-400"}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.mobileLabel || tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CONTEÚDO PRINCIPAL — CONFORME A ABA ATIVA              */}
      {/* ======================================================== */}

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === "geral" && (
        <div className="space-y-5 animate-in fade-in-50 duration-150">
          {/* Quatro Cards Financeiros Principais (100% dados reais da conta) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Receita Bruta */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121B] border border-[#161E2C] hover:border-[#D4AF37]/40 transition-all flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#E5C365] shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-400 block">
                    Receita Bruta
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
                    {brl(gross)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-xs">
                {renderComparison(gross, summary?.prev_gross || 0, false)}
              </div>
            </div>

            {/* 2. Margem de Contribuição */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121B] border border-[#161E2C] hover:border-[#D4AF37]/40 transition-all flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#E5C365] shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-400 block">
                    Margem de Contribuição
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
                    {brl(contributionMargin)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-1.5 mt-3 text-xs">
                <div className="min-w-0">
                  {renderComparison(contributionMargin, summary?.prev_contribution_margin || 0, false)}
                </div>
                {gross > 0 && <span className="text-slate-400 shrink-0">{marginPct} da receita</span>}
              </div>
            </div>

            {/* 3. Total de Despesas */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121B] border border-[#161E2C] hover:border-red-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-400 block">
                    Total de Despesas
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
                    {brl(totalExpenses)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-1.5 mt-3 text-xs">
                <div className="min-w-0">
                  {renderComparison(totalExpenses, summary?.prev_expenses_total || 0, true)}
                </div>
                {gross > 0 && <span className="text-slate-400 shrink-0">{expensesPct} da receita</span>}
              </div>
            </div>

            {/* 4. Lucro Líquido */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121B] border border-[#161E2C] hover:border-[#20C997]/40 transition-all flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#20C997]/15 border border-[#20C997]/30 flex items-center justify-center text-[#20C997] shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-400 block">
                    Lucro Líquido
                  </span>
                  <div className={`text-xl sm:text-2xl font-black mt-0.5 tracking-tight ${netProfit < 0 ? "text-red-400" : "text-white"}`}>
                    {brl(netProfit)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-1.5 mt-3 text-xs">
                <div className="min-w-0">
                  {renderComparison(netProfit, summary?.prev_profit || 0, false)}
                </div>
                {gross > 0 && <span className="text-slate-400 shrink-0">{profitPct} da receita</span>}
              </div>
            </div>
          </div>

          {/* Gráficos da Visão Geral (Evolução Financeira + Distribuição da Receita) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card Evolução Financeira */}
            <div className="lg:col-span-2 p-4 sm:p-6 rounded-2xl bg-[#0D121B] border border-[#161E2C] shadow-lg flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-white tracking-tight">
                    Evolução Financeira
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Receitas, despesas e lucro dos últimos {periodMonthsCount} meses
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={periodMonthsCount}
                    onChange={(e) => setPeriodMonthsCount(Number(e.target.value))}
                    className="py-1 px-2.5 bg-[#070A0F] border border-[#161E2C] rounded-lg text-xs text-slate-300 outline-none cursor-pointer"
                  >
                    <option value={6}>Últimos 6 meses</option>
                    <option value={3}>Últimos 3 meses</option>
                    <option value={12}>Últimos 12 meses</option>
                  </select>
                </div>
              </div>

              {hasEvolutionData ? (
                <>
                  <div className="flex items-center gap-4 text-xs mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#E5C365]" />
                      <span className="text-slate-300 font-medium">Receita</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
                      <span className="text-slate-300 font-medium">Despesas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#20C997]" />
                      <span className="text-slate-300 font-medium">Lucro</span>
                    </div>
                  </div>

                  <div className="w-full h-56 sm:h-64 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={evolutionChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#161E2C" vertical={false} />
                        <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
                        <YAxis
                          stroke="#64748B"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `R$ ${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0A0E15",
                            borderColor: "#161E2C",
                            borderRadius: "10px",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                          formatter={(val) => [brl(val), ""]}
                        />
                        <Bar dataKey="Receita" fill="#E5C365" radius={[4, 4, 0, 0]} maxBarSize={22} />
                        <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={22} />
                        <Bar dataKey="Lucro" fill="#20C997" radius={[4, 4, 0, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="h-56 sm:h-64 flex flex-col items-center justify-center text-center p-6 bg-[#070A0F]/50 rounded-xl border border-dashed border-[#161E2C]">
                  <TrendingUp className="w-8 h-8 text-slate-600 mb-2 opacity-40" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-300">
                    Sem movimentações financeiras no período
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 max-w-sm">
                    Os dados de receitas, despesas e lucros serão exibidos em tempo real assim que as primeiras transações forem lançadas.
                  </span>
                </div>
              )}
            </div>

            {/* Card Distribuição da Receita */}
            <div className="p-4 sm:p-6 rounded-2xl bg-[#0D121B] border border-[#161E2C] shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="font-display text-sm sm:text-base font-bold text-white tracking-tight">
                  Distribuição da Receita
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Composição do faturamento por categoria
                </p>
              </div>

              {hasDistributionData ? (
                <>
                  <div className="relative w-44 h-44 mx-auto my-3 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distributionItems}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={72}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {distributionItems.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-xs sm:text-sm font-black text-white leading-tight">
                        {brl(totalDistributionRevenue)}
                      </span>
                      <span className="text-[10px] text-slate-400 leading-tight">
                        Total do mês
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[#161E2C]">
                    {distributionItems.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs py-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-300 font-medium">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-100">{item.pct}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center p-4 bg-[#070A0F]/50 rounded-xl border border-dashed border-[#161E2C] my-auto">
                  <Coins className="w-8 h-8 text-slate-600 mb-2 opacity-40" />
                  <span className="text-xs font-semibold text-slate-300">
                    Sem receitas no período
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    Nenhum atendimento ou venda faturada neste mês.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Últimas Movimentações */}
          <div className="rounded-2xl bg-[#0D121B] border border-[#161E2C] p-4 sm:p-6 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="font-display text-base font-bold text-white tracking-tight">
                Últimas movimentações
              </h3>
              {latestMovements.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleTabChange("movimentacao")}
                  className="text-xs font-bold text-[#E5C365] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer group"
                >
                  <span>Ver todas</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>

            {latestMovements.length > 0 ? (
              <>
                {/* Tabela Desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#161E2C] text-slate-400 font-medium pb-2">
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Descrição</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Barbeiro</th>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3">Forma de pagamento</th>
                        <th className="py-2.5 px-3">Valor</th>
                        <th className="py-2.5 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#161E2C]/80">
                      {latestMovements.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="py-3 px-3 whitespace-nowrap text-slate-300">
                            {fmtDate(tx.date)} {tx.time}
                          </td>
                          <td className="py-3 px-3 font-semibold text-white">
                            {tx.description}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#121824] border border-[#161E2C] text-slate-300">
                              {tx.categoryType === "servico" && <Scissors className="w-3 h-3 text-[#E5C365]" />}
                              {tx.categoryType === "produto" && <Package className="w-3 h-3 text-[#20C997]" />}
                              {tx.categoryType === "despesa" && <Receipt className="w-3 h-3 text-red-400" />}
                              {tx.categoryLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-bold">
                            {tx.isPositive ? (
                              <span className="text-[#20C997] flex items-center gap-1">
                                <ArrowUp className="w-3.5 h-3.5" /> Receita
                              </span>
                            ) : (
                              <span className="text-red-400 flex items-center gap-1">
                                <ArrowDown className="w-3.5 h-3.5" /> Despesa
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-300">{tx.barberName}</td>
                          <td className="py-3 px-3 text-slate-300">{tx.clientName}</td>
                          <td className="py-3 px-3 whitespace-nowrap">{renderPaymentIcon(tx.paymentMethod)}</td>
                          <td className="py-3 px-3 font-bold text-white whitespace-nowrap">{brl(tx.amount)}</td>
                          <td className="py-3 px-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#0D121B] border-[#161E2C] text-slate-200">
                                <DropdownMenuItem
                                  onClick={() => setSelectedTxForDetail(tx)}
                                  className="cursor-pointer text-xs focus:bg-white/10"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 mr-2 text-[#E5C365]" /> Ver detalhes
                                </DropdownMenuItem>
                                {tx.kind === "receita" && tx.status === "ativo" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleCancelMovement(tx, "cancelado")}
                                      className="cursor-pointer text-xs text-amber-400 focus:bg-white/10"
                                    >
                                      <Ban className="w-3.5 h-3.5 mr-2" /> Cancelar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleCancelMovement(tx, "estornado")}
                                      className="cursor-pointer text-xs text-red-400 focus:bg-white/10"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 mr-2" /> Estornar
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cards Mobile */}
                <div className="lg:hidden space-y-2.5">
                  {latestMovements.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTxForDetail(tx)}
                      className="p-3 rounded-xl bg-[#070A0F] border border-[#161E2C] flex items-center justify-between gap-3 cursor-pointer hover:border-[#D4AF37]/30 transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#121824] border border-[#161E2C] flex items-center justify-center shrink-0">
                        {tx.categoryType === "servico" && <Scissors className="w-4 h-4 text-[#E5C365]" />}
                        {tx.categoryType === "produto" && <Package className="w-4 h-4 text-[#20C997]" />}
                        {tx.categoryType === "despesa" && <Receipt className="w-4 h-4 text-red-400" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-400 block">
                          {fmtDate(tx.date)} {tx.time}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">
                          {tx.description}
                        </h4>
                        <span className="text-[11px] text-slate-400 truncate block">
                          {tx.clientName !== "-" ? tx.clientName : tx.barberName !== "-" ? tx.barberName : tx.categoryLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-bold ${tx.isPositive ? "text-[#20C997]" : "text-red-400"}`}>
                          {tx.isPositive ? "↑" : "↓"} {brl(tx.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTxForDetail(tx);
                          }}
                          className="text-slate-400 p-1"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs">
                Nenhuma movimentação encontrada.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: DRE (DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO) */}
      {activeTab === "dre" && (
        <div className="space-y-5 animate-in fade-in-50 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Receita Bruta Total
              </span>
              <p className="font-display text-xl sm:text-2xl font-black text-white mt-1">
                {brl(gross)}
              </p>
              <span className="text-xs text-[#20C997] font-semibold mt-1 block">
                {gross > 0 ? "100% faturamento" : "—"}
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Margem Contribuição
              </span>
              <p className="font-display text-xl sm:text-2xl font-black text-[#E5C365] mt-1">
                {brl(contributionMargin)}
              </p>
              <span className="text-xs text-slate-400 mt-1 block">
                {gross > 0 ? `${marginPct} da receita` : "—"}
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Lucro Líquido Real
              </span>
              <p className={`font-display text-xl sm:text-2xl font-black mt-1 ${netProfit >= 0 ? "text-[#20C997]" : "text-red-400"}`}>
                {brl(netProfit)}
              </p>
              <span className="text-xs text-slate-400 mt-1 block">
                {gross > 0 ? `${profitPct} margem líquida` : "—"}
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Saldo Retido no Caixa
              </span>
              <p className={`font-display text-xl sm:text-2xl font-black mt-1 ${retainedResult >= 0 ? "text-white" : "text-red-400"}`}>
                {brl(retainedResult)}
              </p>
              <span className="text-xs text-slate-400 mt-1 block">
                Após retiradas ({brl(totalWithdrawals)})
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-[#0D121B] border border-[#161E2C] shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[#161E2C]">
              <div>
                <h3 className="font-display text-base font-bold text-white tracking-tight">
                  Demonstrativo do Resultado do Exercício (DRE)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Apuração oficial de resultado operacional e financeiro
                </p>
              </div>
              <Badge variant="outline" className="text-[#E5C365] border-[#D4AF37]/30 text-xs">
                Competência: {month}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[500px] divide-y divide-[#161E2C] text-xs sm:text-sm">
                <div className="flex items-center justify-between py-3 font-bold text-white">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#20C997]" />
                    <span>(+) RECEITA OPERACIONAL BRUTA</span>
                  </span>
                  <div className="flex items-center gap-6">
                    <span className="text-slate-400 text-xs w-16 text-right">{gross > 0 ? "100.0%" : "0.0%"}</span>
                    <span className="font-mono text-sm sm:text-base font-black text-[#20C997]">{brl(gross)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5 pl-4 sm:pl-6 text-slate-400">
                  <span>(-) Deduções / Taxas de Maquininhas</span>
                  <div className="flex items-center gap-6">
                    <span className="text-xs w-16 text-right text-red-400">
                      -{gross > 0 ? ((fees / gross) * 100).toFixed(1) : "0.0"}%
                    </span>
                    <span className="font-mono text-xs sm:text-sm text-red-400">- {brl(fees)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 font-bold text-white bg-[#070A0F] px-3 rounded-xl border border-[#161E2C]">
                  <span>(=) RECEITA OPERACIONAL LÍQUIDA</span>
                  <div className="flex items-center gap-6">
                    <span className="text-xs w-16 text-right text-slate-400">
                      {gross > 0 ? ((netRevenue / gross) * 100).toFixed(1) : "0.0"}%
                    </span>
                    <span className="font-mono text-sm sm:text-base font-black">{brl(netRevenue)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5 pl-4 sm:pl-6 text-slate-400">
                  <span>(-) Comissões dos Barbeiros</span>
                  <div className="flex items-center gap-6">
                    <span className="text-xs w-16 text-right text-[#E5C365]">
                      -{gross > 0 ? ((commissions / gross) * 100).toFixed(1) : "0.0"}%
                    </span>
                    <span className="font-mono text-xs sm:text-sm text-slate-300">- {brl(commissions)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 font-bold text-[#E5C365] bg-[#070A0F] px-3 rounded-xl border border-[#D4AF37]/30">
                  <span>(=) MARGEM DE CONTRIBUIÇÃO (LUCRO BRUTO)</span>
                  <div className="flex items-center gap-6">
                    <span className="text-xs w-16 text-right text-[#E5C365]">{gross > 0 ? marginPct : "0.0%"}</span>
                    <span className="font-mono text-sm sm:text-base font-black text-[#E5C365]">{brl(contributionMargin)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5 pl-4 sm:pl-6 text-slate-400">
                  <span>(-) Despesas Operacionais Fixas e Variáveis</span>
                  <div className="flex items-center gap-6">
                    <span className="text-xs w-16 text-right text-red-400">{gross > 0 ? `-${expensesPct}` : "0.0%"}</span>
                    <span className="font-mono text-xs sm:text-sm text-red-400">- {brl(totalExpenses)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3.5 font-black text-white bg-[#070A0F] px-3 sm:px-4 rounded-xl border border-[#20C997]/40 shadow-inner">
                  <span className="text-sm sm:text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#20C997]" />
                    <span>(=) LUCRO LÍQUIDO REAL</span>
                  </span>
                  <div className="flex items-center gap-6">
                    <span className="text-xs w-16 text-right text-[#20C997]">{gross > 0 ? profitPct : "0.0%"}</span>
                    <span className={`font-mono text-base sm:text-xl font-black ${netProfit >= 0 ? "text-[#20C997]" : "text-red-400"}`}>
                      {brl(netProfit)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5 pl-4 sm:pl-6 text-slate-400">
                  <span>(-) Retiradas do Dono / Pró-labore</span>
                  <div className="flex items-center gap-6">
                    <span className="text-xs w-16 text-right text-slate-400">
                      -{gross > 0 ? ((totalWithdrawals / gross) * 100).toFixed(1) : "0.0"}%
                    </span>
                    <span className="font-mono text-xs sm:text-sm text-slate-400">- {brl(totalWithdrawals)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 font-bold text-white px-3">
                  <span className="text-xs sm:text-sm">(=) SALDO FINAL DISPONÍVEL NO CAIXA</span>
                  <div className="flex items-center gap-6">
                    <span className="text-xs w-16 text-right text-slate-400">
                      {gross > 0 ? ((retainedResult / gross) * 100).toFixed(1) : "0.0"}%
                    </span>
                    <span className={`font-mono text-base sm:text-lg font-black ${retainedResult >= 0 ? "text-white" : "text-red-400"}`}>
                      {brl(retainedResult)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: MOVIMENTAÇÃO FINANCEIRA */}
      {activeTab === "movimentacao" && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por descrição, cliente, barbeiro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#070A0F] border border-[#161E2C] rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-[#D4AF37]/50"
                />
              </div>

              <div className="flex items-center gap-1 bg-[#070A0F] p-1 rounded-xl border border-[#161E2C]">
                {[
                  { id: "todos", label: "Todos" },
                  { id: "receitas", label: "Receitas" },
                  { id: "despesas", label: "Despesas" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setMovementFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      movementFilter === f.id
                        ? "bg-[#E5C365] text-[#05070B]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3 py-2 rounded-xl bg-[#070A0F] border border-[#D4AF37]/40 text-xs font-bold text-[#E5C365] hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar (.csv)</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-[#0D121B] border border-[#161E2C] p-4 sm:p-5 shadow-lg overflow-x-auto">
            {filteredMovements.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#161E2C] text-slate-400 font-semibold pb-2">
                    <th className="py-2.5 px-3">Data/Hora</th>
                    <th className="py-2.5 px-3">Descrição</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Barbeiro</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Pagamento</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#161E2C]/80">
                  {filteredMovements.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                        {fmtDate(tx.date)} {tx.time}
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">
                        {tx.description}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#121824] border border-[#161E2C] text-slate-300">
                          {tx.categoryLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-bold">
                        {tx.isPositive ? (
                          <span className="text-[#20C997] flex items-center gap-1">
                            <ArrowUp className="w-3.5 h-3.5" /> Receita
                          </span>
                        ) : (
                          <span className="text-red-400 flex items-center gap-1">
                            <ArrowDown className="w-3.5 h-3.5" /> Despesa
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300">{tx.barberName}</td>
                      <td className="py-3 px-3 text-slate-300">{tx.clientName}</td>
                      <td className="py-3 px-3 whitespace-nowrap">{renderPaymentIcon(tx.paymentMethod)}</td>
                      <td className="py-3 px-3 font-bold text-white text-right whitespace-nowrap">
                        {brl(tx.amount)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#0D121B] border-[#161E2C] text-slate-200">
                            <DropdownMenuItem
                              onClick={() => setSelectedTxForDetail(tx)}
                              className="cursor-pointer text-xs focus:bg-white/10"
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-2 text-[#E5C365]" /> Ver detalhes
                            </DropdownMenuItem>
                            {tx.kind === "receita" && tx.status === "ativo" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleCancelMovement(tx, "cancelado")}
                                  className="cursor-pointer text-xs text-amber-400 focus:bg-white/10"
                                >
                                  <Ban className="w-3.5 h-3.5 mr-2" /> Cancelar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleCancelMovement(tx, "estornado")}
                                  className="cursor-pointer text-xs text-red-400 focus:bg-white/10"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 mr-2" /> Estornar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                Nenhuma movimentação encontrada com os filtros aplicados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 4: ATENDIMENTOS */}
      {activeTab === "atendimentos" && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
              <span className="text-xs text-slate-400 font-semibold block">Total de Atendimentos</span>
              <p className="text-2xl font-black text-white mt-1">{revenues.length}</p>
              <span className="text-xs text-[#20C997] font-semibold block mt-1">Concluídos no período</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
              <span className="text-xs text-slate-400 font-semibold block">Faturamento em Atendimentos</span>
              <p className="text-2xl font-black text-[#E5C365] mt-1">{brl(gross)}</p>
              <span className="text-xs text-slate-400 block mt-1">Receita apurada</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
              <span className="text-xs text-slate-400 font-semibold block">Ticket Médio</span>
              <p className="text-2xl font-black text-white mt-1">
                {revenues.length > 0 ? brl(gross / revenues.length) : "—"}
              </p>
              <span className="text-xs text-[#20C997] font-semibold block mt-1">Por atendimento</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
              <span className="text-xs text-slate-400 font-semibold block">Descontos Concedidos</span>
              <p className="text-2xl font-black text-red-400 mt-1">{brl(summary?.discounts || 0)}</p>
              <span className="text-xs text-slate-400 block mt-1">Promoções / Cupons</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
            <h3 className="font-display text-base font-bold text-white mb-3">Histórico de Atendimentos no Período</h3>
            {revenues.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#161E2C] text-slate-400 pb-2">
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Cliente</th>
                      <th className="py-2 px-3">Serviço</th>
                      <th className="py-2 px-3">Barbeiro</th>
                      <th className="py-2 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#161E2C]/80">
                    {revenues.slice(0, 15).map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-slate-300">{fmtDate(r.date)} {r.time}</td>
                        <td className="py-2.5 px-3 text-white font-semibold">{r.client_name || "-"}</td>
                        <td className="py-2.5 px-3 text-slate-300">{r.service_name}</td>
                        <td className="py-2.5 px-3 text-slate-300">{r.barber_name || "-"}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#E5C365]">{brl(r.paid_amount || r.gross_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhum atendimento registrado no período selecionado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 5: SERVIÇOS (Ranking dinâmico calculado exclusivamente com base nos atendimentos reais) */}
      {activeTab === "servicos" && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          <div className="p-5 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
            <h3 className="font-display text-base font-bold text-white mb-3">Ranking dos Serviços Mais Realizados</h3>
            {(() => {
              const serviceMap = {};
              revenues
                .filter((r) => r.service_type !== "produto" && r.item_kind !== "produto")
                .forEach((r) => {
                  const name = r.service_name || "Serviço";
                  if (!serviceMap[name]) {
                    serviceMap[name] = { name, count: 0, rev: 0 };
                  }
                  serviceMap[name].count += 1;
                  serviceMap[name].rev += Number(r.paid_amount || r.gross_amount || 0);
                });

              const list = Object.values(serviceMap).sort((a, b) => b.rev - a.rev);
              const totalRevServices = list.reduce((acc, s) => acc + s.rev, 0);

              if (list.length === 0) {
                return (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Nenhum serviço realizado no período selecionado.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {list.map((s) => {
                    const pct = totalRevServices > 0 ? Math.round((s.rev / totalRevServices) * 100) : 0;
                    return (
                      <div key={s.name} className="p-3 rounded-xl bg-[#070A0F] border border-[#161E2C] flex items-center gap-3">
                        <ServiceIcon iconKey={s.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold text-white truncate">{s.name}</span>
                            <span className="font-bold text-[#E5C365] shrink-0 ml-2">
                              {brl(s.rev)} ({s.count} {s.count === 1 ? "realizado" : "realizados"})
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#121824] overflow-hidden">
                            <div className="h-full bg-[#E5C365] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ABA 6: PRODUTOS (Cálculos dinâmicos a partir das vendas reais) */}
      {activeTab === "produtos" && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {(() => {
            const productSales = revenues.filter((r) => r.service_type === "produto" || r.item_kind === "produto");
            const totalProdRev = productSales.reduce((acc, r) => acc + Number(r.paid_amount || r.gross_amount || 0), 0);
            const totalItemsCount = productSales.length;

            const productMap = {};
            productSales.forEach((r) => {
              const name = r.service_name || "Produto";
              if (!productMap[name]) productMap[name] = { name, sold: 0, rev: 0 };
              productMap[name].sold += 1;
              productMap[name].rev += Number(r.paid_amount || r.gross_amount || 0);
            });
            const topProducts = Object.values(productMap).sort((a, b) => b.rev - a.rev);
            const bestProduct = topProducts[0] || null;

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
                    <span className="text-xs text-slate-400 block font-semibold">Faturamento em Produtos</span>
                    <p className="text-2xl font-black text-[#20C997] mt-1">{brl(totalProdRev)}</p>
                    <span className="text-xs text-slate-400 block mt-1">Total vendido no mês</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
                    <span className="text-xs text-slate-400 block font-semibold">Itens Vendidos</span>
                    <p className="text-2xl font-black text-white mt-1">{totalItemsCount} unidades</p>
                    <span className="text-xs text-[#20C997] block mt-1">Pomadas, Óleos e Acessórios</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#0D121B] border border-[#161E2C] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-semibold">Produto Mais Vendido</span>
                      <p className="text-base font-bold text-white mt-1 truncate">
                        {bestProduct ? bestProduct.name : "—"}
                      </p>
                      <span className="text-xs text-[#E5C365] block mt-1">
                        {bestProduct ? `${bestProduct.sold} un. (${brl(bestProduct.rev)})` : "Sem vendas"}
                      </span>
                    </div>
                    <ProductIcon iconKey="pomada" size="sm" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
                  <h3 className="font-display text-base font-bold text-white mb-3">Ranking de Produtos no Período</h3>
                  {topProducts.length > 0 ? (
                    <div className="space-y-2">
                      {topProducts.map((item) => (
                        <div key={item.name} className="p-3 rounded-xl bg-[#070A0F] border border-[#161E2C] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <ProductIcon iconKey="pomada" size="sm" />
                            <div>
                              <span className="text-xs font-bold text-white block">{item.name}</span>
                              <span className="text-[11px] text-slate-400">{item.sold} unidades vendidas</span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#E5C365]">{brl(item.rev)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Nenhum produto vendido no período selecionado.
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ABA 7: BARBEIROS (Desempenho apurado estritamente a partir dos barbeiros do tenant) */}
      {activeTab === "barbeiros" && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {(() => {
            const barberStats = (barbers || []).map((b) => {
              const bRevs = revenues.filter((r) => r.barber_id === b.id || r.barber_name === b.name);
              const totalAtend = bRevs.length;
              const faturamento = bRevs.reduce((acc, r) => acc + Number(r.paid_amount || r.gross_amount || 0), 0);
              const comissao = bRevs.reduce((acc, r) => acc + Number(r.commission_amount || 0), 0);
              const ticket = totalAtend > 0 ? faturamento / totalAtend : 0;
              return {
                id: b.id,
                name: b.name,
                active: b.active,
                atendimentos: totalAtend,
                faturamento,
                comissao,
                ticket,
              };
            });

            if (barberStats.length === 0) {
              return (
                <div className="p-8 rounded-2xl bg-[#0D121B] border border-[#161E2C] text-center text-slate-400 text-xs">
                  Nenhum barbeiro cadastrado no sistema.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {barberStats.map((b) => (
                  <div key={b.id} className="p-5 rounded-2xl bg-[#0D121B] border border-[#161E2C] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#161E2C]">
                      <h4 className="font-bold text-white text-base">{b.name}</h4>
                      <Badge className={b.active !== false ? "bg-[#D4AF37]/15 text-[#E5C365] border-[#D4AF37]/30" : "bg-slate-800 text-slate-400"}>
                        {b.active !== false ? "Profissional Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Atendimentos</span>
                        <span className="font-black text-white text-base">{b.atendimentos}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Faturamento</span>
                        <span className="font-black text-[#E5C365] text-base">{brl(b.faturamento)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Comissão Apurada</span>
                        <span className="font-bold text-[#20C997]">{brl(b.comissao)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Ticket Médio</span>
                        <span className="font-bold text-slate-200">{b.atendimentos > 0 ? brl(b.ticket) : "—"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ABA 8: CLIENTES (Métricas reais da base de clientes do tenant) */}
      {activeTab === "clientes" && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {(() => {
            const totalClients = clients.length;
            const subscribedCount = clients.filter((c) => c.plan_id || c.subscription_plan).length;
            const uniqueClientsInRevenues = new Set(revenues.map((r) => r.client_name || r.client_id).filter(Boolean)).size;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
                  <span className="text-xs text-slate-400 font-semibold block">Clientes na Base</span>
                  <p className="text-2xl font-black text-white mt-1">{totalClients}</p>
                  <span className="text-xs text-slate-400 block mt-1">Total cadastrado</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
                  <span className="text-xs text-slate-400 font-semibold block">Atendidos no Mês</span>
                  <p className="text-2xl font-black text-[#20C997] mt-1">{uniqueClientsInRevenues}</p>
                  <span className="text-xs text-slate-400 block mt-1">Clientes únicos com visita</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
                  <span className="text-xs text-slate-400 font-semibold block">Assinantes de Planos</span>
                  <p className="text-2xl font-black text-[#E5C365] mt-1">{subscribedCount} {subscribedCount === 1 ? "assinatura" : "assinaturas"}</p>
                  <span className="text-xs text-slate-400 block mt-1">Recorrência ativa</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#0D121B] border border-[#161E2C]">
                  <span className="text-xs text-slate-400 font-semibold block">Frequência Média</span>
                  <p className="text-2xl font-black text-white mt-1">
                    {uniqueClientsInRevenues > 0 ? (revenues.length / uniqueClientsInRevenues).toFixed(1) + "x / mês" : "—"}
                  </p>
                  <span className="text-xs text-[#20C997] block mt-1">Visitas por cliente ativo</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal de Detalhes da Movimentação */}
      {selectedTxForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-md rounded-2xl bg-[#0A0E15] border border-[#161E2C] p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#161E2C]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#E5C365]">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base">Detalhes da Transação</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxForDetail(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#161E2C]/50">
                <span className="text-slate-400">Tipo:</span>
                <span className={`font-bold ${selectedTxForDetail.isPositive ? "text-[#20C997]" : "text-red-400"}`}>
                  {selectedTxForDetail.type}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#161E2C]/50">
                <span className="text-slate-400">Descrição:</span>
                <span className="font-semibold text-white">{selectedTxForDetail.description}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#161E2C]/50">
                <span className="text-slate-400">Data e Horário:</span>
                <span className="text-slate-200">{fmtDate(selectedTxForDetail.date)} {selectedTxForDetail.time}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#161E2C]/50">
                <span className="text-slate-400">Cliente:</span>
                <span className="text-slate-200">{selectedTxForDetail.clientName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#161E2C]/50">
                <span className="text-slate-400">Barbeiro:</span>
                <span className="text-slate-200">{selectedTxForDetail.barberName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#161E2C]/50">
                <span className="text-slate-400">Forma de Pagamento:</span>
                <span className="text-slate-200">{selectedTxForDetail.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-2 bg-[#070A0F] px-3 rounded-xl border border-[#161E2C]">
                <span className="font-bold text-white">Valor:</span>
                <span className="font-black text-sm text-[#E5C365]">{brl(selectedTxForDetail.amount)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTxForDetail(null)}
                className="px-4 py-2 rounded-xl bg-[#E5C365] text-[#05070B] font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
