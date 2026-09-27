import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { useAuth } from "@/context/AuthContext";
import { isDono } from "@/lib/roles";
import { Loading, StatCard } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { brl, fmtDate } from "@/lib/format";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  ArrowDownCircle, ArrowUpCircle, Landmark, Scale, FileText,
  TrendingUp, Percent, Users, Receipt, HandCoins, CheckCircle2, FileSpreadsheet,
} from "lucide-react";
import { downloadCsv, formatBrlNumber } from "@/lib/exportCsv";
import { toast } from "sonner";

export default function FluxoCaixa() {
  const { user, ready } = useAuth();
  const { month } = useMonth();
  const [tab, setTab] = useState("dre");
  const { data, loading } = useApi((api) => api.get("/dashboard/cashflow", { month }));
  const { data: summary } = useApi((api) => api.get("/dashboard/summary", { month }));
  const { data: withdrawals } = useApi((api) => api.get("/withdrawals", { month }));

  if (ready && user && !isDono(user)) {
    return <Navigate to="/" replace />;
  }

  if (loading || !data) return <Loading />;

  const chartData = (data.series || []).map((s) => ({
    date: fmtDate(s.date).slice(0, 5),
    Entradas: s.in,
    Saídas: s.out,
  }));

  // DRE Financial Math
  const gross = summary?.gross || 0;
  const fees = summary?.fees || 0;
  const netRevenue = Math.max(0, gross - fees);
  const commissions = summary?.commissions || 0;
  const contributionMargin = netRevenue - commissions;
  const expenses = summary?.expenses_total || 0;
  const netProfit = summary?.profit_real ?? (contributionMargin - expenses);
  const totalWithdrawals = (withdrawals || []).reduce((acc, w) => acc + (w.value || 0), 0);
  const retainedResult = netProfit - totalWithdrawals;

  const pct = (val) => (gross > 0 ? ((val / gross) * 100).toFixed(1) + "%" : "0.0%");

  const handleExportCsv = () => {
    if (!summary && !data?.series?.length) {
      toast.error("Sem dados para exportação no mês selecionado.");
      return;
    }

    const headers = [
      "Indicador / Conta",
      "Competência",
      "Valor (R$)",
      "Proporção da Receita (%)",
    ];

    const rows = [
      ["(+) Receita Bruta Total", month, formatBrlNumber(gross), "100.0%"],
      ["(-) Taxas de Maquininhas", month, formatBrlNumber(fees), pct(fees)],
      ["(=) Receita Líquida Real", month, formatBrlNumber(netRevenue), pct(netRevenue)],
      ["(-) Comissões da Equipe", month, formatBrlNumber(commissions), pct(commissions)],
      ["(=) Margem de Contribuição", month, formatBrlNumber(contributionMargin), pct(contributionMargin)],
      ["(-) Despesas Operacionais Fixas/Variáveis", month, formatBrlNumber(expenses), pct(expenses)],
      ["(=) Lucro Líquido Real", month, formatBrlNumber(netProfit), pct(netProfit)],
      ["(-) Retiradas do Proprietário", month, formatBrlNumber(totalWithdrawals), pct(totalWithdrawals)],
      ["(=) Saldo Retido no Caixa", month, formatBrlNumber(retainedResult), pct(retainedResult)],
    ];

    const filename = `KingPro_DRE_Financeiro_${month}.csv`;
    downloadCsv({ filename, headers, rows });
    toast.success("DRE exportada para Excel com sucesso!");
  };

  return (
    <div className="space-y-6" data-testid="fluxo-page">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1F293D]">
        <div>
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <Landmark className="h-5 w-5 text-[#D4AF37]" />
            <span>Fluxo Financeiro & DRE do Proprietário</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ferramenta exclusiva da diretoria para apuração de resultado e movimentação de caixa em {month}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            className="rounded-[4px] border-[#D4AF37]/40 bg-[#12141F] text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] font-semibold text-xs gap-1.5 shadow-none transition-all cursor-pointer h-9 px-3"
            data-testid="export-csv-fluxo-btn"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>Exportar DRE (.csv)</span>
          </Button>
          <Tabs value={tab} onValueChange={setTab} className="w-auto">
            <TabsList className="bg-[#131826] border border-[#1F293D]">
              <TabsTrigger value="dre" className="text-xs data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0B0F19] font-bold">
                <FileText className="h-3.5 w-3.5 mr-1.5" /> DRE Completa
              </TabsTrigger>
              <TabsTrigger value="fluxo" className="text-xs data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0B0F19] font-bold">
                <Scale className="h-3.5 w-3.5 mr-1.5" /> Movimentação Diária
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {tab === "dre" ? (
        <div className="space-y-6">
          {/* Top DRE Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5 bg-[#131826] border-[#1F293D]">
              <p className="text-xs uppercase font-bold text-muted-foreground">Receita Bruta Total</p>
              <p className="font-display text-2xl font-black text-white mt-1">{brl(gross)}</p>
              <span className="text-[11px] text-[#10B981] font-semibold mt-1 block">100% faturamento</span>
            </Card>
            <Card className="p-5 bg-[#131826] border-[#1F293D]">
              <p className="text-xs uppercase font-bold text-muted-foreground">Margem Contribuição</p>
              <p className="font-display text-2xl font-black text-[#D4AF37] mt-1">{brl(contributionMargin)}</p>
              <span className="text-[11px] text-muted-foreground mt-1 block">{pct(contributionMargin)} da receita</span>
            </Card>
            <Card className="p-5 bg-[#131826] border-[#1F293D]">
              <p className="text-xs uppercase font-bold text-muted-foreground">Lucro Líquido Real</p>
              <p className={`font-display text-2xl font-black mt-1 ${netProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                {brl(netProfit)}
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block">{pct(netProfit)} margem líquida</span>
            </Card>
            <Card className="p-5 bg-[#131826] border-[#1F293D]">
              <p className="text-xs uppercase font-bold text-muted-foreground">Saldo Retido no Caixa</p>
              <p className={`font-display text-2xl font-black mt-1 ${retainedResult >= 0 ? "text-white" : "text-[#EF4444]"}`}>
                {brl(retainedResult)}
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block">Após retiradas ({brl(totalWithdrawals)})</span>
            </Card>
          </div>

          {/* DRE Detalhada */}
          <Card className="p-4 sm:p-6 bg-[#131826] border-[#1F293D] shadow-xl">
            <h3 className="font-display text-base font-bold text-white mb-4 flex flex-wrap items-center justify-between gap-2">
              <span>Demonstrativo do Resultado do Exercício (DRE)</span>
              <Badge variant="outline" className="text-[#D4AF37] border-[#D4AF37]/30 text-xs">
                Competência: {month}
              </Badge>
            </h3>

            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <div className="min-w-[480px] divide-y divide-[#1F293D] text-sm">
                <div className="flex items-center justify-between py-3 font-semibold text-white">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#10B981]" />
                    <span>(+) RECEITA OPERACIONAL BRUTA</span>
                  </span>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-muted-foreground text-xs w-14 sm:w-16 text-right">100.0%</span>
                    <span className="font-mono text-sm sm:text-base font-bold text-[#10B981]">{brl(gross)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5 pl-4 sm:pl-6 text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Percent className="h-3.5 w-3.5 text-[#EF4444]" />
                    <span>(-) Deduções / Taxas de Maquininhas</span>
                  </span>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-xs w-14 sm:w-16 text-right text-[#EF4444]">-{pct(fees)}</span>
                    <span className="font-mono text-xs sm:text-sm text-[#EF4444]">- {brl(fees)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 font-semibold text-white bg-[#0A0D14] px-3 rounded-[4px] border border-white/10">
                  <span>(=) RECEITA OPERACIONAL LÍQUIDA</span>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-xs w-14 sm:w-16 text-right text-muted-foreground">{pct(netRevenue)}</span>
                    <span className="font-mono text-sm sm:text-base font-bold">{brl(netRevenue)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5 pl-4 sm:pl-6 text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>(-) Comissões dos Barbeiros</span>
                  </span>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-xs w-14 sm:w-16 text-right text-[#D4AF37]">-{pct(commissions)}</span>
                    <span className="font-mono text-xs sm:text-sm text-slate-300">- {brl(commissions)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 font-semibold text-[#D4AF37] bg-[#0A0D14] px-3 rounded-[4px] border border-white/10">
                  <span>(=) MARGEM DE CONTRIBUIÇÃO (LUCRO BRUTO)</span>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-xs w-14 sm:w-16 text-right text-[#D4AF37]">{pct(contributionMargin)}</span>
                    <span className="font-mono text-sm sm:text-base font-bold text-[#D4AF37]">{brl(contributionMargin)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5 pl-4 sm:pl-6 text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Receipt className="h-3.5 w-3.5 text-[#EF4444]" />
                    <span>(-) Despesas Fixas e Variáveis</span>
                  </span>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-xs w-14 sm:w-16 text-right text-[#EF4444]">-{pct(expenses)}</span>
                    <span className="font-mono text-xs sm:text-sm text-[#EF4444]">- {brl(expenses)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3.5 font-bold text-white bg-[#0A0D14] px-3 sm:px-4 rounded-[4px] border border-white/10">
                  <span className="text-sm sm:text-base flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                    <span>(=) LUCRO LÍQUIDO REAL</span>
                  </span>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-xs w-14 sm:w-16 text-right text-[#10B981]">{pct(netProfit)}</span>
                    <span className={`font-mono text-base sm:text-xl font-extrabold ${netProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                      {brl(netProfit)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5 pl-4 sm:pl-6 text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <HandCoins className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>(-) Retiradas do Dono / Pró-labore</span>
                  </span>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-xs w-14 sm:w-16 text-right text-muted-foreground">-{pct(totalWithdrawals)}</span>
                    <span className="font-mono text-xs sm:text-sm text-muted-foreground">- {brl(totalWithdrawals)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 font-semibold text-white px-3">
                  <span className="text-xs sm:text-sm">(=) SALDO FINAL DISPONÍVEL NO CAIXA</span>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-xs w-14 sm:w-16 text-right text-muted-foreground">{pct(retainedResult)}</span>
                    <span className={`font-mono text-base sm:text-lg font-bold ${retainedResult >= 0 ? "text-white" : "text-[#EF4444]"}`}>
                      {brl(retainedResult)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Saldo Inicial" value={data.initial_balance} icon={Landmark} tone="muted" testId="cf-initial" />
            <StatCard label="Entradas" value={data.inflow} icon={ArrowUpCircle} tone="success" testId="cf-inflow" />
            <StatCard label="Saídas" value={data.outflow} icon={ArrowDownCircle} tone="danger" testId="cf-outflow" />
            <StatCard label="Saldo Atual" value={data.balance} icon={Scale} tone={data.balance >= 0 ? "primary" : "danger"} big testId="cf-balance" />
          </div>

          <Card className="p-6 bg-[#131826] border-[#1F293D]" data-testid="cashflow-chart">
            <h3 className="mb-4 font-display text-base font-bold text-white">Movimentação Diária de Entradas e Saídas</h3>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#131826", border: "1px solid #1F293D", borderRadius: 8, color: "#fff" }}
                    formatter={(v) => brl(v)}
                  />
                  <Bar dataKey="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saídas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Sem movimentações neste mês.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

