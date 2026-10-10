import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  ShieldCheck,
  Building2,
  Clock,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Search,
  Layers,
  Download,
  Mail,
  AlertCircle,
  Ban,
  ArrowLeft,
  Lock,
  Info,
  Calendar,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";

export default function SuperAdmin() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [quickFilter, setQuickFilter] = useState("all"); // 'all' | 'active' | 'trial' | 'expired' | 'blocked'
  const [accountFilter, setAccountFilter] = useState("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  // Busca de dados
  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Verificação estrita de autorização no backend
      const checkRes = await api.get("/superadmin/check");
      if (!checkRes?.is_superadmin) {
        setAccessDenied(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 2. Consulta de métricas e organizações em paralelo
      const [metricsRes, orgsRes] = await Promise.all([
        api.get("/superadmin/metrics"),
        api.get("/superadmin/organizations"),
      ]);

      setMetrics(metricsRes || null);
      setOrganizations(Array.isArray(orgsRes) ? orgsRes : []);

      if (isManual) {
        toast.success("Dados do SuperAdmin atualizados!");
      }
    } catch (err) {
      console.error("[SuperAdmin Error]", err);
      if (err?.status === 403 || err?.response?.status === 403) {
        setAccessDenied(true);
      } else {
        setErrorMessage(
          err?.response?.data?.message ||
          err?.message ||
          "Não foi possível carregar os dados executivos do SaaS."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (ready) {
      if (!user || !user.is_superadmin) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      fetchData();
    }
  }, [ready, user]);

  // Barbearias filtradas
  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (org.name && org.name.toLowerCase().includes(q)) ||
        (org.id && org.id.toLowerCase().includes(q)) ||
        (org.owner_email && org.owner_email.toLowerCase().includes(q)) ||
        (org.owner_name && org.owner_name.toLowerCase().includes(q)) ||
        (org.slug && org.slug.toLowerCase().includes(q));

      const accountStatus = org.account_status || (org.status === "suspenso" ? "bloqueada" : "ativa");
      const currentSubStatus = org.subscription_status || (org.status === "teste" ? "teste" : org.status === "vencido" ? "vencida" : "ativa");

      // Quick filter
      if (quickFilter === "active" && (accountStatus !== "ativa" || currentSubStatus !== "ativa")) return false;
      if (quickFilter === "trial" && currentSubStatus !== "teste") return false;
      if (quickFilter === "expired" && currentSubStatus !== "vencida") return false;
      if (quickFilter === "blocked" && accountStatus !== "bloqueada") return false;

      const matchesAccount =
        accountFilter === "all" ? true : accountStatus === accountFilter;

      const matchesSubscription =
        subscriptionFilter === "all" ? true : currentSubStatus === subscriptionFilter;

      const matchesPlan =
        planFilter === "all" ? true : (org.plan || "pro") === planFilter;

      return matchesSearch && matchesAccount && matchesSubscription && matchesPlan;
    });
  }, [organizations, searchTerm, quickFilter, accountFilter, subscriptionFilter, planFilter]);

  // Exportar CSV
  const handleExportCSV = () => {
    if (!filteredOrgs.length) {
      toast.error("Nenhuma barbearia encontrada com os filtros aplicados para exportar.");
      return;
    }
    const headers = [
      "ID",
      "Nome",
      "Slug",
      "Responsável",
      "E-mail",
      "Plano",
      "Estado da Conta",
      "Situação Assinatura",
      "Data Cadastro",
      "Expiração",
    ];
    const rows = filteredOrgs.map((o) => [
      `"${o.id || ""}"`,
      `"${(o.name || "").replace(/"/g, '""')}"`,
      `"${o.slug || ""}"`,
      `"${(o.owner_name || "").replace(/"/g, '""')}"`,
      `"${o.owner_email || ""}"`,
      `"${(o.plan || "pro").toUpperCase()}"`,
      `"${(o.account_status || (o.status === "suspenso" ? "bloqueada" : "ativa")).toUpperCase()}"`,
      `"${(o.subscription_status || o.status || "ativa").toUpperCase()}"`,
      `"${o.created_at ? new Date(o.created_at).toLocaleDateString("pt-BR") : "-"}"`,
      `"${o.subscription_expires_at ? new Date(o.subscription_expires_at).toLocaleDateString("pt-BR") : "-"}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Kupola_SaaS_Barbearias_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Relatório CSV gerado com sucesso! (${filteredOrgs.length} barbearias exportadas)`);
  };

  // -------------------------------------------------------------
  // ESTADO 1: CARREGAMENTO INICIAL
  // -------------------------------------------------------------
  if (!ready || loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#05070B] text-white p-6">
        <div className="flex flex-col items-center gap-4 bg-[#0A0E15] border border-white/10 rounded-xl p-8 max-w-sm text-center shadow-2xl">
          <RefreshCw className="h-8 w-8 animate-spin text-[#D4AF37]" />
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Carregando Painel do Proprietário
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Validando autorização do SuperAdmin e recuperando métricas da plataforma...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ESTADO 2: ACESSO NEGADO (403 FORBIDDEN)
  // -------------------------------------------------------------
  if (accessDenied || !user?.is_superadmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#05070B] text-white p-6" data-testid="superadmin-access-denied">
        <div className="flex flex-col items-center gap-4 bg-[#0A0E15] border border-red-500/30 rounded-xl p-8 max-w-md text-center shadow-2xl">
          <span className="p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
            <Lock className="h-8 w-8" />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-white tracking-tight">
              Acesso Negado (403 Forbidden)
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Esta área é estritamente restrita ao <strong>SuperAdministrador Master</strong> do KUPOLA.
              Contas de barbearias, gerentes, barbeiros e operadores comuns não possuem autorização para visualizar dados globais do SaaS.
            </p>
          </div>
          <Button
            onClick={() => navigate("/")}
            className="mt-2 bg-[#D4AF37] hover:bg-[#b89528] text-black font-bold text-xs h-9 px-4 gap-2 rounded-lg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao Painel da Barbearia
          </Button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ESTADO 3: ERRO DE CARREGAMENTO
  // -------------------------------------------------------------
  if (errorMessage) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#05070B] text-white p-6" data-testid="superadmin-error-state">
        <div className="flex flex-col items-center gap-4 bg-[#0A0E15] border border-amber-500/30 rounded-xl p-8 max-w-md text-center shadow-2xl">
          <span className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="h-8 w-8" />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-white tracking-tight">
              Falha ao Carregar Dados do SaaS
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {errorMessage}
            </p>
          </div>
          <Button
            onClick={() => fetchData()}
            className="mt-2 bg-[#D4AF37] hover:bg-[#b89528] text-black font-bold text-xs h-9 px-4 gap-2 rounded-lg"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  // Dados consolidados
  const totalOrgs = metrics?.totalOrganizations ?? organizations.length ?? 0;
  const activeOrgs = metrics?.accountStatus?.active ?? organizations.filter((o) => o.status !== "suspenso").length;
  const blockedOrgs = metrics?.accountStatus?.blocked ?? organizations.filter((o) => o.status === "suspenso").length;

  const trialCount = metrics?.subscriptionStatus?.trial ?? metrics?.totalTrials ?? 0;
  const activeSubCount = metrics?.subscriptionStatus?.active ?? metrics?.totalSubscribers ?? 0;
  const expiredCount = metrics?.subscriptionStatus?.expired ?? metrics?.totalExpired ?? 0;
  const canceledCount = metrics?.subscriptionStatus?.canceled ?? metrics?.totalSuspended ?? 0;

  const planDist = metrics?.planDistribution || { basic: 0, pro: 0, premium: 0 };
  const projectedMRR = metrics?.financialSummary?.projectedMonthlyRate ?? metrics?.estimatedMRR ?? 0;
  const projectedARR = metrics?.estimatedARR ?? Number((projectedMRR * 12).toFixed(2));

  return (
    <div className="min-h-screen bg-[#05070B] text-white space-y-6 pb-16" data-testid="superadmin-panel">
      {/* 1. Header do Painel Executivo do Proprietário do SaaS */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0A0E15] via-[#0D121B] to-[#111722] border border-[#D4AF37]/30 p-5 sm:p-6 shadow-2xl">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 h-48 w-48 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] shadow-inner">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Painel Exclusivo do Proprietário do SaaS
                  </h1>
                  <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded bg-[#D4AF37] text-black">
                    SuperAdmin Master
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Visão executiva do ecossistema KUPOLA 2.0 · Monitoramento central de barbearias, contas e planos
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="bg-[#0A0E15] border-white/10 hover:border-[#D4AF37]/50 text-slate-300 hover:text-white text-xs h-9 px-3 gap-1.5 rounded-lg transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[#D4AF37]" : "text-slate-400"}`} />
              <span>Atualizar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredOrgs.length === 0}
              className="bg-[#0A0E15] border-white/10 hover:border-white/25 text-slate-300 hover:text-white text-xs h-9 px-3 gap-1.5 rounded-lg transition-all"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Exportar CSV</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Banner Oficial: Transparência Financeira do SaaS */}
      <div className="rounded-xl bg-[#0A0E15] border border-amber-500/25 p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5 sm:mt-0">
              <Info className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Transparência Financeira do SaaS & Integração de Pagamentos
                </h3>
                <span className="text-[10px] text-amber-300 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
                  Gateway Pendente
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                Os valores financeiros apresentados neste painel refletem <strong>projeções teóricas</strong> calculadas com base nas mensalidades dos planos ativos cadastrados na plataforma. A liquidação bancária automatizada está pendente de integração com gateway de pagamento real (Asaas / Stripe / Mercado Pago). Nenhuma cobrança financeira é faturada automaticamente nesta versão.
              </p>
            </div>
          </div>
          <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between w-full sm:w-auto gap-2 sm:gap-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
            <span className="text-[11px] text-slate-400">Receita Liquidada Confirmada:</span>
            <span className="text-base font-bold text-white font-mono">R$ 0,00</span>
          </div>
        </div>
      </div>

      {/* 3. Grid de Métricas Principais (Visão Geral Confiável) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total de Barbearias Cadastradas */}
        <div className="bg-[#0A0E15] border border-white/10 rounded-xl p-5 space-y-3.5 hover:border-white/20 transition-all shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5 text-slate-300">
              <Building2 className="h-4 w-4 text-[#D4AF37]" />
              Total de Barbearias
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Base Global
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight">
              {totalOrgs}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              organizações
            </span>
          </div>
          <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {activeOrgs} Ativas
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              {blockedOrgs} Bloqueadas
            </span>
          </div>
        </div>

        {/* Card 2: Situação das Assinaturas */}
        <div className="bg-[#0A0E15] border border-white/10 rounded-xl p-5 space-y-3.5 hover:border-white/20 transition-all shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5 text-slate-300">
              <Clock className="h-4 w-4 text-blue-400" />
              Situação Assinaturas
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Ciclo de Vida
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight">
              {activeSubCount}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">
              Assinaturas Ativas
            </span>
          </div>
          <div className="pt-2.5 border-t border-white/5 grid grid-cols-3 gap-1.5 text-xs text-slate-400 text-center">
            <div className="bg-[#0D121B] py-1.5 rounded-lg border border-white/5">
              <div className="text-amber-400 font-bold">{trialCount}</div>
              <div className="text-[10px] text-slate-400 uppercase">Trial</div>
            </div>
            <div className="bg-[#0D121B] py-1.5 rounded-lg border border-white/5">
              <div className="text-red-400 font-bold">{expiredCount}</div>
              <div className="text-[10px] text-slate-400 uppercase">Vencidas</div>
            </div>
            <div className="bg-[#0D121B] py-1.5 rounded-lg border border-white/5">
              <div className="text-slate-300 font-bold">{canceledCount}</div>
              <div className="text-[10px] text-slate-400 uppercase">Cancel.</div>
            </div>
          </div>
        </div>

        {/* Card 3: Distribuição por Planos */}
        <div className="bg-[#0A0E15] border border-white/10 rounded-xl p-5 space-y-3.5 hover:border-white/20 transition-all shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5 text-slate-300">
              <Layers className="h-4 w-4 text-purple-400" />
              Planos Contratados
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Distribuição
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                Basic: <strong className="text-white ml-0.5">{planDist.basic}</strong>
              </span>
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full bg-[#D4AF37]" />
                Pro: <strong className="text-white ml-0.5">{planDist.pro}</strong>
              </span>
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full bg-purple-400" />
                Premium: <strong className="text-white ml-0.5">{planDist.premium}</strong>
              </span>
            </div>
            <div className="h-2 w-full bg-[#0D121B] rounded-full overflow-hidden flex border border-white/5">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${totalOrgs > 0 ? (planDist.basic / totalOrgs) * 100 : 0}%` }}
                title={`Basic: ${planDist.basic}`}
              />
              <div
                className="h-full bg-[#D4AF37] transition-all"
                style={{ width: `${totalOrgs > 0 ? (planDist.pro / totalOrgs) * 100 : 0}%` }}
                title={`Pro: ${planDist.pro}`}
              />
              <div
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${totalOrgs > 0 ? (planDist.premium / totalOrgs) * 100 : 0}%` }}
                title={`Premium: ${planDist.premium}`}
              />
            </div>
          </div>
          <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>Mais contratado:</span>
            <span className="font-bold text-[#D4AF37]">
              {planDist.pro >= planDist.basic && planDist.pro >= planDist.premium
                ? "Plano PRO"
                : planDist.premium >= planDist.basic
                ? "Plano PREMIUM"
                : "Plano BASIC"}
            </span>
          </div>
        </div>

        {/* Card 4: Faturamento Geral do SaaS (MRR / ARR Projetado) */}
        <div className="bg-[#0A0E15] border border-white/10 rounded-xl p-5 space-y-3.5 hover:border-[#D4AF37]/30 transition-all shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5 text-slate-300">
              <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
              Faturamento SaaS (Projeção)
            </span>
            <span className="text-[10px] font-mono text-[#D4AF37]">
              MRR Teórico
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-[#D4AF37] tracking-tight font-mono">
              {formatCurrency(projectedMRR)}
            </span>
            <span className="text-xs text-slate-400">
              /mês proj.
            </span>
          </div>
          <div className="pt-2.5 border-t border-white/5 flex flex-col gap-1 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span>ARR Projetado:</span>
              <span className="font-bold text-white font-mono">
                {formatCurrency(projectedARR)}
              </span>
            </div>
            {metrics?.financialSummary?.potentialTrialMonthlyRate > 0 && (
              <div className="flex items-center justify-between text-[11px] text-amber-400/90 pt-0.5">
                <span title="Receita hipotética caso 100% dos trials atuais contratem o plano">Potencial em Trial (hipotético):</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(metrics.financialSummary.potentialTrialMonthlyRate)}/mês
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Tabela Executiva de Barbearias Cadastradas */}
      <div className="bg-[#0A0E15] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        {/* Barra Superior: Título, Filtros Rápidos e Busca */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col gap-4 bg-[#0D121B]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#D4AF37]" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Barbearias Cadastradas no SaaS
                </h2>
                <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-[#111722] border border-white/10">
                  {filteredOrgs.length} de {organizations.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lista oficial de tenants com situação da conta e ciclo de assinatura separados
              </p>
            </div>

            {/* Abas de Filtros Rápidos (Zero-Pill: botões de controle de filtro) */}
            <div className="flex items-center gap-1 p-1 bg-[#05070B] rounded-lg border border-white/5 self-start sm:self-auto overflow-x-auto max-w-full">
              {[
                { id: "all", label: "Todas" },
                { id: "active", label: "Ativas" },
                { id: "trial", label: "Em Teste" },
                { id: "expired", label: "Vencidas" },
                { id: "blocked", label: "Bloqueadas" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setQuickFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    quickFilter === tab.id
                      ? "bg-[#D4AF37] text-black font-bold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros em Linha: Busca e Selects */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/5">
            {/* Input de Busca */}
            <div className="relative min-w-[220px] flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar por nome, ID, slug ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs bg-[#05070B] border-white/10 text-white placeholder:text-slate-500 rounded-lg focus:border-[#D4AF37]"
              />
            </div>

            {/* Filtro: Estado da Conta */}
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="h-9 text-xs w-[140px] bg-[#05070B] border-white/10 text-slate-300 rounded-lg">
                <SelectValue placeholder="Estado da Conta" />
              </SelectTrigger>
              <SelectContent className="bg-[#0D121B] border-white/10 text-white">
                <SelectItem value="all">Todas as Contas</SelectItem>
                <SelectItem value="ativa">Contas Ativas</SelectItem>
                <SelectItem value="bloqueada">Contas Bloqueadas</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro: Situação da Assinatura */}
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="h-9 text-xs w-[145px] bg-[#05070B] border-white/10 text-slate-300 rounded-lg">
                <SelectValue placeholder="Situação Assinatura" />
              </SelectTrigger>
              <SelectContent className="bg-[#0D121B] border-white/10 text-white">
                <SelectItem value="all">Todas Assinaturas</SelectItem>
                <SelectItem value="teste">Em Teste (Trial)</SelectItem>
                <SelectItem value="ativa">Assinatura Ativa</SelectItem>
                <SelectItem value="vencida">Vencida / Atraso</SelectItem>
                <SelectItem value="cancelada">Cancelada / Suspensa</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro: Plano */}
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-9 text-xs w-[130px] bg-[#05070B] border-white/10 text-slate-300 rounded-lg">
                <SelectValue placeholder="Plano Contratado" />
              </SelectTrigger>
              <SelectContent className="bg-[#0D121B] border-white/10 text-white">
                <SelectItem value="all">Todos os Planos</SelectItem>
                <SelectItem value="basic">Plano Basic</SelectItem>
                <SelectItem value="pro">Plano Pro</SelectItem>
                <SelectItem value="premium">Plano Premium</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || quickFilter !== "all" || accountFilter !== "all" || subscriptionFilter !== "all" || planFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setQuickFilter("all");
                  setAccountFilter("all");
                  setSubscriptionFilter("all");
                  setPlanFilter("all");
                }}
                className="h-9 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg px-2.5"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>

        {/* Tabela Responsiva */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070A0F] text-slate-400 uppercase tracking-wider font-semibold border-b border-white/5">
              <tr>
                <th className="py-3 px-4">Barbearia / ID</th>
                <th className="py-3 px-4">Responsável / E-mail</th>
                <th className="py-3 px-4">Data Cadastro</th>
                <th className="py-3 px-4">Plano</th>
                <th className="py-3 px-4">Estado da Conta</th>
                <th className="py-3 px-4">Situação Assinatura</th>
                <th className="py-3 px-4">Vencimento / Término</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Building2 className="h-8 w-8 text-slate-400" />
                      <p className="text-sm font-semibold text-white">
                        {organizations.length === 0
                          ? "Nenhuma barbearia cadastrada no SaaS"
                          : "Nenhum resultado encontrado para os filtros aplicados"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {organizations.length === 0
                          ? "As novas barbearias aparecerão aqui automaticamente quando realizarem o cadastro."
                          : "Tente redefinir os filtros ou buscar por outro termo."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const accountStatus = org.account_status || (org.status === "suspenso" ? "bloqueada" : "ativa");
                  const subStatus = org.subscription_status || (org.status === "teste" ? "teste" : org.status === "vencido" ? "vencida" : "ativa");

                  const isBlocked = accountStatus === "bloqueada";
                  const isTrial = subStatus === "teste";
                  const isExpired = subStatus === "vencida";

                  const expiryDate = org.subscription_expires_at || org.trial_ends_at;
                  const formattedExpiry = expiryDate
                    ? new Date(expiryDate).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "Sem data registrada";

                  const formattedCreated = org.created_at
                    ? new Date(org.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "Data indisponível";

                  return (
                    <tr
                      key={org.id}
                      className="hover:bg-white/[0.02] transition-colors"
                      data-testid={`superadmin-org-row-${org.id}`}
                    >
                      {/* Nome e ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">
                          {org.name || "Barbearia Sem Nome"}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ID: {org.id} {org.slug ? `· /${org.slug}` : ""}
                        </div>
                      </td>

                      {/* Responsável e E-mail */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">
                          {org.owner_name || "Não informado"}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{org.owner_email || "-"}</span>
                        </div>
                      </td>

                      {/* Data de Cadastro */}
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                        {formattedCreated}
                      </td>

                      {/* Plano */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            org.plan === "premium"
                              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                              : org.plan === "basic"
                              ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                              : "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30"
                          }`}
                        >
                          {org.plan || "pro"}
                        </span>
                      </td>

                      {/* Estado da Conta */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isBlocked ? "bg-red-400" : "bg-emerald-400"
                            }`}
                          />
                          <span className={isBlocked ? "text-red-300 font-medium" : "text-emerald-300 font-medium"}>
                            {isBlocked ? "Bloqueada" : "Ativa"}
                          </span>
                        </span>
                      </td>

                      {/* Situação da Assinatura */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isTrial
                                ? "bg-amber-400"
                                : isExpired
                                ? "bg-red-400"
                                : isBlocked
                                ? "bg-slate-500"
                                : "bg-emerald-400"
                            }`}
                          />
                          <span
                            className={
                              isTrial
                                ? "text-amber-300 font-medium"
                                : isExpired
                                ? "text-red-300 font-medium"
                                : isBlocked
                                ? "text-slate-400 font-medium"
                                : "text-emerald-300 font-medium"
                            }
                          >
                            {isTrial
                              ? "Em Teste (Trial)"
                              : isExpired
                              ? "Vencida / Atraso"
                              : isBlocked
                              ? "Cancelada"
                              : "Assinatura Ativa"}
                          </span>
                        </span>
                      </td>

                      {/* Vencimento */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                        {formattedExpiry}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
