import { useState, useEffect, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  ShieldCheck, Users, Clock, AlertTriangle, CheckCircle2,
  TrendingUp, RefreshCw, Search, Filter, Calendar,
  SlidersHorizontal, ChevronRight, Ban, PlayCircle, MoreHorizontal,
  PlusCircle, Shield, ArrowUpRight, DollarSign, Download, Building2,
  Mail, Phone, ExternalLink, HelpCircle, Layers, Crown, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";

export default function SuperAdmin() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  // Modais de Ação
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [extendDays, setExtendDays] = useState(7);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [cycleModalOpen, setCycleModalOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState("mensal");
  const [actionLoading, setActionLoading] = useState(false);

  // Carregar dados do SuperAdmin
  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Checagem estrita de permissão
      const checkRes = await api.get("/superadmin/check");
      if (!checkRes?.is_superadmin) {
        toast.error("Acesso Negado: Você não possui privilégios de SuperAdmin.");
        navigate("/");
        return;
      }

      // 2. Buscar Métricas e Barbearias em paralelo
      const [metricsRes, orgsRes] = await Promise.all([
        api.get("/superadmin/metrics"),
        api.get("/superadmin/organizations"),
      ]);

      setMetrics(metricsRes);
      setOrganizations(Array.isArray(orgsRes) ? orgsRes : []);
      if (isManual) {
        toast.success("Dados do SuperAdmin atualizados!");
      }
    } catch (err) {
      console.error("[SuperAdmin Error]", err);
      toast.error("Acesso Negado ou falha de comunicação com o servidor.");
      navigate("/");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (ready) {
      const isMasterEmail = (user?.email || "").toLowerCase().trim() === "guilhermepedropereira2@gmail.com";
      const isMasterUser = user?.is_superadmin === true || isMasterEmail || user?.id === "usr_superadmin";

      if (!user || !isMasterUser) {
        toast.error("Área restrita: Apenas o SuperAdmin Master pode acessar o Painel.");
        navigate("/");
        return;
      }
      fetchData();
    }
  }, [ready, user]);

  // Se ainda estiver validando autenticação
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0C0E17] text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-[#D4AF37]" />
          <span>Validando credenciais do SuperAdmin...</span>
        </div>
      </div>
    );
  }

  // Se o usuário não for superadmin master, bloqueia imediatamente e redireciona ao dashboard normal
  const isMasterAuthorized =
    user &&
    ((user.email || "").toLowerCase().trim() === "guilhermepedropereira2@gmail.com" ||
      user.is_superadmin === true ||
      user.id === "usr_superadmin");

  if (!isMasterAuthorized) {
    return <Navigate to="/" replace />;
  }

  // Filtros de busca
  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch =
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ? true : org.status === statusFilter;

      const matchesPlan =
        planFilter === "all" ? true : org.plan === planFilter;

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [organizations, searchTerm, statusFilter, planFilter]);

  // Ações de SuperAdmin
  const handleExtendTrial = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/superadmin/organizations/${selectedOrg.id}/action`, {
        action: "extend_trial",
        days: extendDays,
      });
      toast.success(res.message || "Período de testes estendido com sucesso!");
      setExtendModalOpen(false);
      fetchData(true);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao estender período de testes.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/superadmin/organizations/${selectedOrg.id}/action`, {
        action: "change_plan",
        plan: selectedPlan,
      });
      toast.success(res.message || "Plano atualizado com sucesso!");
      setPlanModalOpen(false);
      fetchData(true);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao alterar plano.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeCycle = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/superadmin/organizations/${selectedOrg.id}/action`, {
        action: "change_cycle",
        cycle: selectedCycle,
      });
      toast.success(res.message || "Ciclo de faturamento alterado com sucesso!");
      setCycleModalOpen(false);
      fetchData(true);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao alterar ciclo.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (org) => {
    const isCurrentlySuspended = org.status === "suspenso";
    const nextStatus = isCurrentlySuspended ? "active" : "suspended";
    const confirmMsg = isCurrentlySuspended
      ? `Reativar o acesso da barbearia "${org.name}"?`
      : `Suspender o acesso da barbearia "${org.name}"? Ela não conseguirá operar até reativação.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.post(`/superadmin/organizations/${org.id}/action`, {
        action: "toggle_status",
        status: nextStatus,
      });
      toast.success(res.message || `Barbearia ${nextStatus === "active" ? "reativada" : "suspensa"}!`);
      fetchData(true);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao atualizar status da barbearia.");
    }
  };

  // Exportar CSV de Barbearias
  const handleExportCSV = () => {
    if (!organizations.length) {
      toast.error("Nenhuma barbearia para exportar.");
      return;
    }
    const headers = ["ID", "Nome", "Slug", "Responsável", "E-mail", "Plano", "Status", "Ciclo", "Expiração"];
    const rows = organizations.map((o) => [
      `"${o.id}"`,
      `"${o.name}"`,
      `"${o.slug}"`,
      `"${o.owner_name}"`,
      `"${o.owner_email}"`,
      `"${o.plan.toUpperCase()}"`,
      `"${o.status.toUpperCase()}"`,
      `"${o.billing_cycle.toUpperCase()}"`,
      `"${o.subscription_expires_at ? new Date(o.subscription_expires_at).toLocaleDateString('pt-BR') : '-'}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Kupola_SaaS_Clientes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado com sucesso!");
  };

  const planDist = metrics?.planDistribution || { basic: 0, pro: 0, premium: 0 };
  const cycleDist = metrics?.cycleDistribution || { mensal: 0, trimestral: 0, anual: 0 };
  const totalOrgs = metrics?.totalOrganizations || organizations.length || 0;

  return (
    <div className="space-y-6 pb-12" data-testid="superadmin-panel">
      {/* Top Banner de Identificação Master */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#171926] via-[#12141F] to-[#0E101A] border border-[#D4AF37]/30 p-5 sm:p-6 shadow-xl">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 h-48 w-48 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-md bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37]">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Painel SuperAdmin (Painel Mestre)
                  </h1>
                  <Badge className="bg-[#D4AF37] text-black font-extrabold uppercase text-[10px] tracking-wider px-2">
                    MASTER
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Visão executiva global da plataforma Kupola SaaS • Gestão central de barbearias, planos e assinaturas
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="bg-[#12141F] border-white/10 hover:border-[#D4AF37]/40 text-slate-300 hover:text-white text-xs h-9 px-3 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[#D4AF37]" : ""}`} />
              <span>Atualizar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="bg-[#12141F] border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs h-9 px-3 gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Exportar CSV</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas SaaS Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Assinantes */}
        <div className="bg-[#131622] border border-white/10 rounded-lg p-4 space-y-2 hover:border-[#10B981]/40 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Total de Assinantes</span>
            <span className="p-1.5 rounded bg-[#10B981]/15 text-[#10B981]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {metrics?.totalSubscribers ?? "--"}
            </span>
            <span className="text-xs text-[#10B981] font-semibold bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/20">
              {totalOrgs > 0 ? `${Math.round(((metrics?.totalSubscribers || 0) / totalOrgs) * 100)}% da base` : "Ativos"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Barbearias ativas com assinaturas validadas
          </p>
        </div>

        {/* Em Período de Testes (Trial) */}
        <div className="bg-[#131622] border border-white/10 rounded-lg p-4 space-y-2 hover:border-[#3B82F6]/40 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Em Teste Grátis (Trial)</span>
            <span className="p-1.5 rounded bg-[#3B82F6]/15 text-[#3B82F6]">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {metrics?.totalTrials ?? "--"}
            </span>
            <span className="text-xs text-[#3B82F6] font-semibold bg-[#3B82F6]/10 px-2 py-0.5 rounded border border-[#3B82F6]/20">
              7 Dias Grátis
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Contas testando o sistema ativamente
          </p>
        </div>

        {/* Vencidos / Expirados */}
        <div className="bg-[#131622] border border-white/10 rounded-lg p-4 space-y-2 hover:border-[#EF4444]/40 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Testes Vencidos / Inativos</span>
            <span className="p-1.5 rounded bg-[#EF4444]/15 text-[#EF4444]">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {metrics?.totalExpired ?? "--"}
            </span>
            <span className="text-xs text-[#EF4444] font-semibold bg-[#EF4444]/10 px-2 py-0.5 rounded border border-[#EF4444]/20">
              Oportunidade Comercial
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Trials expirados sem upgrade para plano pago
          </p>
        </div>

        {/* MRR Estimado da Plataforma */}
        <div className="bg-[#131622] border border-white/10 rounded-lg p-4 space-y-2 hover:border-[#D4AF37]/40 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">MRR Estimado (SaaS)</span>
            <span className="p-1.5 rounded bg-[#D4AF37]/15 text-[#D4AF37]">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#D4AF37]">
              {formatCurrency(metrics?.estimatedMRR || 0)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ARR: {formatCurrency(metrics?.estimatedARR || 0)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Receita recorrente mensal calculada dos ativos
          </p>
        </div>
      </div>

      {/* Distribuição por Ciclos e Planos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribuição por Planos */}
        <div className="bg-[#131622] border border-white/10 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#D4AF37]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Distribuição por Planos
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {totalOrgs} barbearias totais
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Basic */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  Plano Basic / Starter (R$ 79,90/mês)
                </span>
                <span className="font-bold text-white">
                  {planDist.basic} ({totalOrgs > 0 ? Math.round((planDist.basic / totalOrgs) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${totalOrgs > 0 ? (planDist.basic / totalOrgs) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Pro */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#D4AF37]" />
                  Plano Pro / Profissional (R$ 169,90/mês)
                </span>
                <span className="font-bold text-white">
                  {planDist.pro} ({totalOrgs > 0 ? Math.round((planDist.pro / totalOrgs) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D4AF37] rounded-full transition-all duration-500"
                  style={{ width: `${totalOrgs > 0 ? (planDist.pro / totalOrgs) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Premium */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-400" />
                  Plano Premium / Rede (R$ 299,90/mês)
                </span>
                <span className="font-bold text-white">
                  {planDist.premium} ({totalOrgs > 0 ? Math.round((planDist.premium / totalOrgs) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${totalOrgs > 0 ? (planDist.premium / totalOrgs) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Frequência de Pagamento / Ciclos */}
        <div className="bg-[#131622] border border-white/10 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#10B981]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Frequência de Pagamento (Ciclos)
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Retenção e LTV
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Mensal */}
            <div className="bg-[#181B28] border border-white/5 rounded-md p-3 text-center space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Mensal</span>
              <div className="text-xl font-bold text-white">{cycleDist.mensal}</div>
              <span className="text-[10px] text-slate-500">
                {totalOrgs > 0 ? Math.round((cycleDist.mensal / totalOrgs) * 100) : 0}% dos clientes
              </span>
            </div>

            {/* Trimestral */}
            <div className="bg-[#181B28] border border-white/5 rounded-md p-3 text-center space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Trimestral</span>
              <div className="text-xl font-bold text-[#D4AF37]">{cycleDist.trimestral}</div>
              <span className="text-[10px] text-slate-500">
                {totalOrgs > 0 ? Math.round((cycleDist.trimestral / totalOrgs) * 100) : 0}% dos clientes
              </span>
            </div>

            {/* Anual */}
            <div className="bg-[#181B28] border border-white/5 rounded-md p-3 text-center space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Anual</span>
              <div className="text-xl font-bold text-[#10B981]">{cycleDist.anual}</div>
              <span className="text-[10px] text-slate-500">
                {totalOrgs > 0 ? Math.round((cycleDist.anual / totalOrgs) * 100) : 0}% dos clientes
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed pt-1">
            Clientes nos ciclos Trimestral e Anual possuem menor taxa de churn (cancelamento) e garantem previsibilidade de caixa para o SaaS Kupola.
          </p>
        </div>
      </div>

      {/* Tabela de Gestão de Clientes / Barbearias */}
      <div className="bg-[#131622] border border-white/10 rounded-lg overflow-hidden shadow-sm">
        {/* Barra de Filtros e Busca */}
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#161826]">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#D4AF37]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Gestão de Barbearias Cadastradas ({filteredOrgs.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Input de Busca */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar barbearia, e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs bg-[#12141F] border-white/10 text-white placeholder:text-slate-500 rounded-[4px]"
              />
            </div>

            {/* Filtro de Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs w-[130px] bg-[#12141F] border-white/10 text-slate-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#181B28] border-white/10 text-white">
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="teste">Em Teste</SelectItem>
                <SelectItem value="vencido">Vencidos</SelectItem>
                <SelectItem value="suspenso">Suspensos</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de Plano */}
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-9 text-xs w-[130px] bg-[#12141F] border-white/10 text-slate-300">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent className="bg-[#181B28] border-white/10 text-white">
                <SelectItem value="all">Todos Planos</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela de Barbearias */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0F111A] text-slate-400 uppercase tracking-wider font-semibold border-b border-white/5">
              <tr>
                <th className="py-3 px-4">Barbearia</th>
                <th className="py-3 px-4">Responsável / E-mail</th>
                <th className="py-3 px-4">Plano Atual</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Ciclo</th>
                <th className="py-3 px-4">Data de Expiração</th>
                <th className="py-3 px-4 text-right">Ações do SuperAdmin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Nenhuma barbearia encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const isSuspended = org.status === "suspenso";
                  const isTrial = org.status === "teste";
                  const isExpired = org.status === "vencido";
                  const isActive = org.status === "ativo";

                  const expiryDate = org.subscription_expires_at || org.trial_ends_at;
                  const formattedExpiry = expiryDate
                    ? new Date(expiryDate).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "Ilimitado / Vitalício";

                  return (
                    <tr
                      key={org.id}
                      className="hover:bg-white/[0.02] transition-colors"
                      data-testid={`superadmin-org-${org.id}`}
                    >
                      {/* Nome da Barbearia */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          {org.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          ID: {org.id} • /{org.slug}
                        </div>
                      </td>

                      {/* Responsável / E-mail */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">
                          {org.owner_name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-500" />
                          <span>{org.owner_email}</span>
                        </div>
                      </td>

                      {/* Plano Atual */}
                      <td className="py-3.5 px-4">
                        <Badge
                          className={`font-bold uppercase text-[10px] tracking-wider px-2 py-0.5 ${
                            org.plan === "premium"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                              : org.plan === "basic"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                              : "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                          }`}
                        >
                          {org.plan}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge
                          className={`font-bold uppercase text-[10px] tracking-wider px-2 py-0.5 ${
                            isSuspended
                              ? "bg-slate-700/40 text-slate-400 border border-slate-600"
                              : isExpired
                              ? "bg-red-500/20 text-red-300 border border-red-500/40"
                              : isTrial
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          }`}
                        >
                          {isSuspended
                            ? "Suspenso"
                            : isExpired
                            ? "Vencido"
                            : isTrial
                            ? "Teste (Trial)"
                            : "Ativo"}
                        </Badge>
                      </td>

                      {/* Ciclo */}
                      <td className="py-3.5 px-4">
                        <span className="capitalize text-slate-300 font-medium">
                          {org.billing_cycle || "Mensal"}
                        </span>
                      </td>

                      {/* Expiração */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                        {formattedExpiry}
                      </td>

                      {/* Ações Rápidas */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Estender Teste */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrg(org);
                              setExtendDays(7);
                              setExtendModalOpen(true);
                            }}
                            className="h-8 px-2 text-[11px] text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 rounded-[3px]"
                            title="Estender período de testes gratuito"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            <span>+ Dias</span>
                          </Button>

                          {/* Dropdown de Ações Adicionais */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-[3px]"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-[#181B28] border border-white/10 text-white rounded-[4px] min-w-[180px] p-1 text-xs"
                            >
                              <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider px-2 py-1">
                                Gerenciar {org.name}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-white/5 my-1" />

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedOrg(org);
                                  setSelectedPlan(org.plan || "pro");
                                  setPlanModalOpen(true);
                                }}
                                className="cursor-pointer py-1.5 px-2 hover:bg-white/10 rounded-[2px]"
                              >
                                <Crown className="h-3.5 w-3.5 mr-2 text-[#D4AF37]" />
                                <span>Alterar Plano</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedOrg(org);
                                  setSelectedCycle(org.billing_cycle || "mensal");
                                  setCycleModalOpen(true);
                                }}
                                className="cursor-pointer py-1.5 px-2 hover:bg-white/10 rounded-[2px]"
                              >
                                <Calendar className="h-3.5 w-3.5 mr-2 text-blue-400" />
                                <span>Alterar Ciclo</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator className="bg-white/5 my-1" />

                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(org)}
                                className={`cursor-pointer py-1.5 px-2 rounded-[2px] ${
                                  isSuspended
                                    ? "text-emerald-400 hover:bg-emerald-500/10"
                                    : "text-red-400 hover:bg-red-500/10"
                                }`}
                              >
                                {isSuspended ? (
                                  <>
                                    <PlayCircle className="h-3.5 w-3.5 mr-2" />
                                    <span>Reativar Acesso</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="h-3.5 w-3.5 mr-2" />
                                    <span>Suspender Acesso</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Estender Período de Testes */}
      <Dialog open={extendModalOpen} onOpenChange={setExtendModalOpen}>
        <DialogContent className="bg-[#131622] border border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <Clock className="h-5 w-5 text-amber-400" />
              Estender Período de Teste
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Adicione mais dias gratuitos para que a barbearia <strong>{selectedOrg?.name}</strong> possa continuar utilizando a plataforma.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Quantidade de dias adicionais:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[7, 15, 30].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant="outline"
                    onClick={() => setExtendDays(d)}
                    className={`h-9 text-xs rounded-[4px] border ${
                      extendDays === d
                        ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold"
                        : "bg-[#181B28] border-white/10 text-slate-300 hover:text-white"
                    }`}
                  >
                    +{d} Dias
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Ou digite a quantidade manual:
              </label>
              <Input
                type="number"
                min={1}
                max={365}
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value))}
                className="bg-[#181B28] border-white/10 text-white h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExtendModalOpen(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleExtendTrial}
              disabled={actionLoading}
              className="bg-[#D4AF37] hover:bg-[#c29f2f] text-black font-bold text-xs"
            >
              {actionLoading ? "Salvando..." : "Confirmar Extensão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Alterar Plano Manualmente */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="bg-[#131622] border border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <Crown className="h-5 w-5 text-[#D4AF37]" />
              Alterar Plano Manualmente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Modifique o tier de assinatura da barbearia <strong>{selectedOrg?.name}</strong>. Isso reativa o acesso imediatamente caso esteja vencido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {[
              { id: "basic", label: "Basic / Starter", price: "R$ 79,90/mês", desc: "Até 2 barbeiros, controle básico de caixa e agenda" },
              { id: "pro", label: "Pro / Profissional", price: "R$ 169,90/mês", desc: "Barbeiros ilimitados, fluxo DRE, relatórios e agendamento online" },
              { id: "premium", label: "Premium / Rede", price: "R$ 299,90/mês", desc: "Multiunidades, suporte prioritário e taxa zero de gateway" },
            ].map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`p-3 rounded-md border cursor-pointer transition-all ${
                  selectedPlan === p.id
                    ? "bg-[#D4AF37]/15 border-[#D4AF37] text-white"
                    : "bg-[#181B28] border-white/5 text-slate-400 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white uppercase">{p.label}</span>
                  <span className="text-xs font-semibold text-[#D4AF37]">{p.price}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{p.desc}</p>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlanModalOpen(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleChangePlan}
              disabled={actionLoading}
              className="bg-[#D4AF37] hover:bg-[#c29f2f] text-black font-bold text-xs"
            >
              {actionLoading ? "Salvando..." : "Salvar Novo Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Alterar Ciclo de Faturamento */}
      <Dialog open={cycleModalOpen} onOpenChange={setCycleModalOpen}>
        <DialogContent className="bg-[#131622] border border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <Calendar className="h-5 w-5 text-blue-400" />
              Alterar Ciclo de Faturamento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Altere a recorrência de pagamento cadastrada para <strong>{selectedOrg?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {[
              { id: "mensal", label: "Mensal", desc: "Cobrança padrão a cada 30 dias" },
              { id: "trimestral", label: "Trimestral", desc: "Cobrança a cada 3 meses com desconto" },
              { id: "anual", label: "Anual", desc: "Cobrança anual com desconto máximo e alta fidelidade" },
            ].map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCycle(c.id)}
                className={`p-3 rounded-md border cursor-pointer transition-all ${
                  selectedCycle === c.id
                    ? "bg-blue-500/20 border-blue-500 text-white"
                    : "bg-[#181B28] border-white/5 text-slate-400 hover:border-white/20"
                }`}
              >
                <div className="font-bold text-xs text-white uppercase">{c.label}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">{c.desc}</p>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCycleModalOpen(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleChangeCycle}
              disabled={actionLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs"
            >
              {actionLoading ? "Salvando..." : "Salvar Ciclo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
