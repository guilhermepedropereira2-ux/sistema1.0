import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { Loading, EmptyState, StatCard } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { brl, fmtDate, paymentTypeLabel, PERIOD_OPTIONS, periodRange, todayISO } from "@/lib/format";
import { downloadCsv, formatBrlNumber } from "@/lib/exportCsv";
import {
  Coins,
  HandCoins,
  CheckCircle2,
  Clock,
  CalendarDays,
  Users,
  FileSpreadsheet,
  TrendingUp,
  PiggyBank,
  Check,
  AlertCircle,
  Scissors,
  ArrowRightLeft,
  Receipt,
} from "lucide-react";

export default function Comissoes() {
  const [period, setPeriod] = useState("mes");
  const [custom, setCustom] = useState({ start: "", end: "" });
  const [selectedBarberId, setSelectedBarberId] = useState("todos");
  const [activeTab, setActiveTab] = useState("barbeiros"); // "barbeiros" | "atendimentos" | "historico"
  const [tick, setTick] = useState(0);

  // Modal de Liquidação / Pagamento
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingBarber, setPayingBarber] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("pix");
  const [payDate, setPayDate] = useState(todayISO());
  const [payNotes, setPayNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { start, end } = useMemo(() => periodRange(period, custom), [period, custom]);

  const { data: responseData, loading, reload } = useApi(
    (api) =>
      api.get("/commissions/summary", {
        start,
        end,
        barber_id: selectedBarberId === "todos" ? undefined : selectedBarberId,
        period,
      }),
    [start, end, selectedBarberId, period, tick]
  );

  const { data: barbersList } = useApi((api) => api.get("/barbers"));

  const summary = responseData?.summary || {
    faturamento_total: 0,
    comissao_gerada: 0,
    comissao_paga: 0,
    saldo_pendente: 0,
    atendimentos_total: 0,
  };

  const barbers = responseData?.barbers || [];
  const paymentsHistory = responseData?.historico_liquidacoes || [];

  // Coleta todos os atendimentos para a aba detalhada
  const allAtendimentos = useMemo(() => {
    return barbers.flatMap((b) =>
      (b.atendimentos || []).map((att) => ({
        ...att,
        barber_name: b.barber_name,
      }))
    );
  }, [barbers]);

  const openPayModal = (barber = null) => {
    const target = barber || barbers[0] || null;
    setPayingBarber(target);
    const pendingVal = target ? target.saldo_pendente : summary.saldo_pendente;
    setPayAmount(pendingVal > 0 ? String(pendingVal) : "");
    setPayMethod("pix");
    setPayDate(todayISO());
    setPayNotes("");
    setPayModalOpen(true);
  };

  const handleConfirmPayment = async (e) => {
    e?.preventDefault?.();
    if (!payingBarber) {
      toast.error("Selecione o profissional.");
      return;
    }
    const val = Number(payAmount);
    if (!val || val <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/commissions/pay", {
        barber_id: payingBarber.barber_id || payingBarber.id,
        amount: val,
        payment_method: payMethod,
        payment_date: payDate,
        period_start: start,
        period_end: end,
        notes: payNotes || `Fechamento de comissões (${fmtDate(start)} a ${fmtDate(end)})`,
      });

      toast.success(
        `Pagamento de ${brl(val)} registrado com sucesso para ${payingBarber.barber_name || payingBarber.name}! Lançado nas Despesas Operacionais.`
      );
      setPayModalOpen(false);
      setTick((t) => t + 1);
      reload();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Erro ao registrar liquidação.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    if (!barbers.length && !allAtendimentos.length) {
      toast.error("Nenhum dado no período selecionado para exportar.");
      return;
    }

    const headers = [
      "Profissional",
      "Data/Hora",
      "Cliente",
      "Serviço/Item",
      "Forma de Pagamento",
      "Valor Bruto (R$)",
      "Comissão (%)",
      "Comissão Gerada (R$)",
      "Status da Comissão",
    ];

    const rows = allAtendimentos.map((a) => [
      a.barber_name,
      `${fmtDate(a.date)} ${a.time || ""}`.trim(),
      a.client_name,
      a.service_name,
      a.payment_method_name,
      formatBrlNumber(a.gross_amount),
      `${a.commission_percent}%`,
      formatBrlNumber(a.commission_amount),
      a.commission_paid ? "Paga / Liquidada" : "Pendente de Quitação",
    ]);

    const filename = `Kupola_Comissoes_${start}_${end}.csv`;
    downloadCsv({ filename, headers, rows });
    toast.success("Extrato de comissões exportado com sucesso!");
  };

  if (loading && !responseData) return <Loading />;

  return (
    <div className="space-y-6 max-w-full 2xl:max-w-[1920px] mx-auto" data-testid="comissoes-page">
      {/* Topo / Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-[4px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white">
                Comissões dos Barbeiros
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Fechamento financeiro, cálculo de repasses e quitação integrada com o Fluxo de Caixa.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            className="rounded-[4px] border-white/10 bg-[#12141F] text-slate-300 hover:text-white hover:border-[#D4AF37]/50 font-semibold text-xs h-9 gap-1.5 shadow-none transition-all cursor-pointer"
            data-testid="export-comissoes-csv"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#D4AF37]" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>

          <Button
            onClick={() => openPayModal()}
            className="rounded-[4px] bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs h-9 px-4 gap-2 shadow-none cursor-pointer"
            data-testid="btn-abrir-liquidacao-geral"
          >
            <HandCoins className="h-4 w-4 stroke-[2.5]" />
            <span>Pagar / Quitar Comissão</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros: Barbeiro + Período */}
      <Card className="p-3 sm:p-4 bg-[#12141F] border border-white/10 rounded-[4px] shadow-none">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filtro Barbeiro */}
          <div>
            <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Profissional / Barbeiro
            </Label>
            <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
              <SelectTrigger className="h-9 rounded-[4px] bg-[#0C0E16] border-white/10 text-xs" data-testid="filter-barber-select">
                <SelectValue placeholder="Todos os barbeiros" />
              </SelectTrigger>
              <SelectContent className="bg-[#131622] border-white/10 text-white rounded-[4px]">
                <SelectItem value="todos" className="text-xs">
                  Todos os Barbeiros ({barbersList?.length || 0})
                </SelectItem>
                {(barbersList || []).map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.name} ({b.commission_percent || 40}% comissão)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Período Rápido */}
          <div>
            <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Período de Apuração
            </Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-9 rounded-[4px] bg-[#0C0E16] border-white/10 text-xs" data-testid="filter-period-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#131622] border-white/10 text-white rounded-[4px]">
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Se Personalizado: Datas início e fim */}
          {period === "personalizado" ? (
            <>
              <div>
                <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Data Inicial
                </Label>
                <Input
                  type="date"
                  value={custom.start}
                  onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))}
                  className="h-9 rounded-[4px] bg-[#0C0E16] border-white/10 text-xs"
                  data-testid="filter-custom-start"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Data Final
                </Label>
                <Input
                  type="date"
                  value={custom.end}
                  onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))}
                  className="h-9 rounded-[4px] bg-[#0C0E16] border-white/10 text-xs"
                  data-testid="filter-custom-end"
                />
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 flex items-center justify-between px-3 py-2 rounded-[4px] bg-[#0C0E16] border border-white/5">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#D4AF37]" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Intervalo Selecionado
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {fmtDate(start)} até {fmtDate(end)}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#D4AF37] px-2 py-0.5 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                {summary.atendimentos_total} atendimentos
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Cards de Resumo Geral (KPIs do Período) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Faturamento do Período"
          value={brl(summary.faturamento_total)}
          icon={TrendingUp}
          tone="primary"
          testId="stat-faturamento-comissoes"
        />

        <StatCard
          label="Total Comissões Geradas"
          value={brl(summary.comissao_gerada)}
          icon={Coins}
          testId="stat-comissao-gerada"
        />

        <StatCard
          label="Total Já Liquidado / Pago"
          value={brl(summary.comissao_paga)}
          icon={CheckCircle2}
          tone="success"
          testId="stat-comissao-paga"
        />

        <div
          className={`relative overflow-hidden rounded-[4px] border p-4 transition-all ${
            summary.saldo_pendente > 0
              ? "bg-[#18151D] border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/30"
              : "bg-[#12141F] border-white/10"
          }`}
          data-testid="stat-saldo-pendente"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Saldo a Quitar (Pendente)
            </span>
            <div
              className={`h-8 w-8 rounded-[4px] flex items-center justify-center ${
                summary.saldo_pendente > 0 ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-emerald-500/20 text-emerald-400"
              }`}
            >
              {summary.saldo_pendente > 0 ? <Clock className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            </div>
          </div>
          <p
            className={`mt-2 font-display text-xl sm:text-2xl font-black tabular-nums tracking-tight ${
              summary.saldo_pendente > 0 ? "text-[#D4AF37]" : "text-emerald-400"
            }`}
          >
            {brl(summary.saldo_pendente)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {summary.saldo_pendente > 0
              ? "Valores pendentes de fechamento"
              : "Todas as comissões deste período estão quitadas"}
          </p>
        </div>
      </div>

      {/* Abas de Navegação Interna: Barbeiros, Atendimentos Detalhados, Histórico */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("barbeiros")}
          className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "barbeiros"
              ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          data-testid="tab-resumo-barbeiros"
        >
          <Users className="h-3.5 w-3.5" />
          <span>Resumo por Barbeiro ({barbers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("atendimentos")}
          className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "atendimentos"
              ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          data-testid="tab-atendimentos-detalhados"
        >
          <Scissors className="h-3.5 w-3.5" />
          <span>Atendimentos ({allAtendimentos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("historico")}
          className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "historico"
              ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          data-testid="tab-historico-liquidacoes"
        >
          <Receipt className="h-3.5 w-3.5" />
          <span>Histórico de Quitações ({paymentsHistory.length})</span>
        </button>
      </div>

      {/* ABA 1: RESUMO FINANCEIRO POR BARBEIRO COM BOTÃO DE QUITAÇÃO */}
      {activeTab === "barbeiros" && (
        <Card className="border border-white/10 bg-[#12141F] rounded-[4px] overflow-hidden shadow-none">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-base text-white">
                Demonstrativo de Comissões por Profissional
              </h2>
              <p className="text-xs text-muted-foreground">
                Apuração individual com cálculo automático do faturamento bruto e comissão contratada.
              </p>
            </div>
          </div>

          {!barbers.length ? (
            <div className="p-8">
              <EmptyState
                title="Nenhum atendimento ou comissão registrada"
                subtitle="Altere o filtro de período ou profissional para visualizar os cálculos."
              />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <Table className="min-w-[850px]">
                <TableHeader className="bg-[#0C0E16]">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white text-xs font-bold whitespace-nowrap">Barbeiro / Profissional</TableHead>
                    <TableHead className="text-center text-white text-xs font-bold whitespace-nowrap">% Comissão</TableHead>
                    <TableHead className="text-center text-white text-xs font-bold whitespace-nowrap">Atendimentos</TableHead>
                    <TableHead className="text-right text-white text-xs font-bold whitespace-nowrap">Faturamento Bruto</TableHead>
                    <TableHead className="text-right text-white text-xs font-bold whitespace-nowrap">Comissão Gerada</TableHead>
                    <TableHead className="text-right text-white text-xs font-bold whitespace-nowrap">Total Já Pago</TableHead>
                    <TableHead className="text-right text-white text-xs font-bold whitespace-nowrap">Saldo a Quitar</TableHead>
                    <TableHead className="text-right text-white text-xs font-bold whitespace-nowrap">Ação de Liquidação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {barbers.map((b) => {
                    const initials = (b.barber_name || "B")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase();

                    const hasPending = b.saldo_pendente > 0;

                    return (
                      <TableRow
                        key={b.barber_id}
                        className="border-white/5 hover:bg-white/[0.03] transition-colors"
                        data-testid={`barber-row-${b.barber_id}`}
                      >
                        {/* Profissional */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#EAB308] to-[#D4AF37] flex items-center justify-center text-[#0B0F19] font-black text-xs shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-xs sm:text-sm text-white leading-tight">
                                {b.barber_name}
                              </p>
                              <span className="text-[10px] text-muted-foreground">{b.role}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* % Comissão Contratada */}
                        <TableCell className="text-center">
                          <span className="inline-block px-2 py-0.5 rounded-[3px] bg-[#D4AF37]/15 text-[#D4AF37] font-bold text-xs border border-[#D4AF37]/30">
                            {b.commission_percent}%
                          </span>
                        </TableCell>

                        {/* Atendimentos Realizados */}
                        <TableCell className="text-center font-mono font-medium text-xs sm:text-sm">
                          {b.atendimentos_total}
                        </TableCell>

                        {/* Faturamento Gerado */}
                        <TableCell className="text-right font-mono font-semibold text-xs sm:text-sm text-slate-200">
                          {brl(b.faturamento_total)}
                        </TableCell>

                        {/* Comissão Gerada */}
                        <TableCell className="text-right font-mono font-bold text-xs sm:text-sm text-white">
                          {brl(b.comissao_gerada)}
                        </TableCell>

                        {/* Total Já Pago */}
                        <TableCell className="text-right font-mono text-xs sm:text-sm text-emerald-400">
                          {brl(b.comissao_paga)}
                        </TableCell>

                        {/* Saldo a Quitar */}
                        <TableCell className="text-right font-mono font-black text-xs sm:text-sm">
                          <span
                            className={
                              hasPending
                                ? "text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-1 rounded border border-[#D4AF37]/20"
                                : "text-slate-400"
                            }
                          >
                            {brl(b.saldo_pendente)}
                          </span>
                        </TableCell>

                        {/* Botão de Quitar */}
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            onClick={() => openPayModal(b)}
                            disabled={!hasPending}
                            className={`h-8 px-3 rounded-[3px] font-bold text-xs shadow-none gap-1.5 transition-colors cursor-pointer ${
                              hasPending
                                ? "bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14]"
                                : "bg-white/5 text-slate-500 cursor-not-allowed"
                            }`}
                            data-testid={`btn-pagar-barber-${b.barber_id}`}
                          >
                            <HandCoins className="h-3.5 w-3.5" />
                            <span>{hasPending ? "Quitar Comissão" : "Quitado"}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}

      {/* ABA 2: LISTA DE ATENDIMENTOS DETALHADA DO PERÍODO */}
      {activeTab === "atendimentos" && (
        <Card className="border border-white/10 bg-[#12141F] rounded-[4px] overflow-hidden shadow-none">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-base text-white">
                Atendimentos & Vendas no Período
              </h2>
              <p className="text-xs text-muted-foreground">
                Detalhamento item por item que gerou comissão para os barbeiros.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              Total: {allAtendimentos.length} atendimentos
            </span>
          </div>

          {!allAtendimentos.length ? (
            <div className="p-8">
              <EmptyState title="Nenhum atendimento encontrado neste período." />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <Table className="min-w-[850px]">
                <TableHeader className="bg-[#0C0E16]">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white text-xs font-bold whitespace-nowrap">Data & Hora</TableHead>
                    <TableHead className="text-white text-xs font-bold whitespace-nowrap">Profissional</TableHead>
                    <TableHead className="text-white text-xs font-bold whitespace-nowrap">Cliente</TableHead>
                    <TableHead className="text-white text-xs font-bold whitespace-nowrap">Serviço / Produto</TableHead>
                    <TableHead className="text-white text-xs font-bold whitespace-nowrap">Forma de Pagto</TableHead>
                    <TableHead className="text-right text-white text-xs font-bold whitespace-nowrap">Valor Bruto</TableHead>
                    <TableHead className="text-center text-white text-xs font-bold whitespace-nowrap">%</TableHead>
                    <TableHead className="text-right text-white text-xs font-bold whitespace-nowrap">Comissão</TableHead>
                    <TableHead className="text-center text-white text-xs font-bold whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allAtendimentos.map((a) => (
                    <TableRow key={a.id} className="border-white/5 hover:bg-white/[0.03]">
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {fmtDate(a.date)} {a.time || ""}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-white">
                        {a.barber_name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        {a.client_name}
                      </TableCell>
                      <TableCell className="text-xs text-white">
                        {a.service_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.payment_method_name}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-slate-200">
                        {brl(a.gross_amount)}
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono text-muted-foreground">
                        {a.commission_percent}%
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-[#D4AF37]">
                        {brl(a.commission_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {a.commission_paid ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <Check className="h-3 w-3" /> Paga
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="h-3 w-3" /> Pendente
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}

      {/* ABA 3: HISTÓRICO DE QUITAÇÕES / FECHAMENTOS COM REGISTRO DE DESPESA */}
      {activeTab === "historico" && (
        <Card className="border border-white/10 bg-[#12141F] rounded-[4px] overflow-hidden shadow-none">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-base text-white">
                Histórico de Pagamentos de Comissões
              </h2>
              <p className="text-xs text-muted-foreground">
                Comprovantes e saídas financeiras integradas às Despesas Operacionais e Fluxo de Caixa.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              {paymentsHistory.length} pagamentos realizados
            </span>
          </div>

          {!paymentsHistory.length ? (
            <div className="p-8">
              <EmptyState
                title="Nenhum pagamento de comissão registrado"
                subtitle="Ao realizar a quitação de comissões, o recibo aparecerá listado aqui."
              />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-[#0C0E16]">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white text-xs font-bold whitespace-nowrap">Data do Pagto</TableHead>
                    <TableHead className="text-white text-xs font-bold whitespace-nowrap">Barbeiro / Profissional</TableHead>
                    <TableHead className="text-white text-xs font-bold whitespace-nowrap">Forma de Pagamento</TableHead>
                    <TableHead className="text-white text-xs font-bold whitespace-nowrap">Observações / Descrição</TableHead>
                    <TableHead className="text-right text-white text-xs font-bold whitespace-nowrap">Valor Quitado</TableHead>
                    <TableHead className="text-center text-white text-xs font-bold whitespace-nowrap">Lançamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsHistory.map((p) => {
                    const methodLabel =
                      p.payment_method === "pix"
                        ? "PIX"
                        : p.payment_method === "dinheiro"
                        ? "Dinheiro em Espécie"
                        : p.payment_method === "transferencia"
                        ? "Transferência Bancária"
                        : "Cartão / Débito";

                    return (
                      <TableRow key={p.id} className="border-white/5 hover:bg-white/[0.03]">
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {fmtDate(p.date)}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-white">
                          {p.barber_name}
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          <span className="inline-block px-2 py-0.5 rounded bg-white/5 border border-white/10 font-medium">
                            {methodLabel}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.notes || "Quitação de comissões acumuladas"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs sm:text-sm text-emerald-400">
                          {brl(p.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                            Despesa Registrada
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}

      {/* MODAL DE CONFIRMAÇÃO: PAGAR / QUITAR COMISSÃO */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto bg-[#131622] border-white/10 text-white rounded-[4px] p-5 sm:p-6 shadow-2xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white">
              <HandCoins className="h-5 w-5 text-[#D4AF37]" />
              <span>Liquidação de Comissão</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Confirme os dados para registrar o pagamento e dar baixa no saldo pendente do profissional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmPayment} className="space-y-4 mt-2">
            {/* Seleção do Barbeiro */}
            <div>
              <Label className="text-xs font-semibold text-slate-300">Barbeiro / Profissional *</Label>
              <Select
                value={payingBarber?.barber_id || payingBarber?.id || ""}
                onValueChange={(val) => {
                  const b = barbers.find((x) => x.barber_id === val);
                  setPayingBarber(b);
                  if (b) setPayAmount(b.saldo_pendente > 0 ? String(b.saldo_pendente) : "");
                }}
              >
                <SelectTrigger className="mt-1 h-9 rounded-[4px] bg-[#0C0E16] border-white/10 text-xs" data-testid="modal-select-barber">
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent className="bg-[#131622] border-white/10 text-white rounded-[4px]">
                  {barbers.map((b) => (
                    <SelectItem key={b.barber_id} value={b.barber_id} className="text-xs">
                      {b.barber_name} (Saldo: {brl(b.saldo_pendente)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Resumo da Apuração */}
            {payingBarber && (
              <div className="rounded-[4px] bg-[#0C0E16] border border-white/10 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Período apurado:</span>
                  <span className="font-semibold text-white">
                    {fmtDate(start)} a {fmtDate(end)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Comissão total gerada:</span>
                  <span className="font-mono text-white">{brl(payingBarber.comissao_gerada)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total já pago / adiantado:</span>
                  <span className="font-mono text-emerald-400">{brl(payingBarber.comissao_paga)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/10 font-bold">
                  <span className="text-slate-200">Saldo Pendente Atual:</span>
                  <span className="font-mono text-[#D4AF37] text-sm">
                    {brl(payingBarber.saldo_pendente)}
                  </span>
                </div>
              </div>
            )}

            {/* Valor do Pagamento */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-300">Valor a Pagar (R$) *</Label>
                {payingBarber?.saldo_pendente > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(payingBarber.saldo_pendente))}
                    className="text-[10px] text-[#D4AF37] hover:underline font-bold cursor-pointer"
                  >
                    Usar Saldo Total ({brl(payingBarber.saldo_pendente)})
                  </button>
                )}
              </div>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 h-9 rounded-[4px] bg-[#0C0E16] border-white/10 font-mono text-sm"
                data-testid="modal-pay-amount-input"
              />
            </div>

            {/* Método de Pagamento */}
            <div>
              <Label className="text-xs font-semibold text-slate-300">Forma de Pagamento *</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="mt-1 h-9 rounded-[4px] bg-[#0C0E16] border-white/10 text-xs" data-testid="modal-select-pay-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#131622] border-white/10 text-white rounded-[4px]">
                  <SelectItem value="pix" className="text-xs">PIX (Chave Pix do Barbeiro)</SelectItem>
                  <SelectItem value="dinheiro" className="text-xs">Dinheiro em Espécie (Caixa)</SelectItem>
                  <SelectItem value="transferencia" className="text-xs">Transferência Bancária (TED/DOC)</SelectItem>
                  <SelectItem value="debito" className="text-xs">Cartão de Débito</SelectItem>
                  <SelectItem value="outro" className="text-xs">Outro Meio de Pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data do Pagamento */}
            <div>
              <Label className="text-xs font-semibold text-slate-300">Data do Pagamento *</Label>
              <Input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="mt-1 h-9 rounded-[4px] bg-[#0C0E16] border-white/10 text-xs"
                data-testid="modal-pay-date-input"
              />
            </div>

            {/* Observações / Recibo */}
            <div>
              <Label className="text-xs font-semibold text-slate-300">Observações (opcional)</Label>
              <Input
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Ex: Quitação quinzenal referente à 1ª quinzena do mês"
                className="mt-1 h-9 rounded-[4px] bg-[#0C0E16] border-white/10 text-xs"
                data-testid="modal-pay-notes-input"
              />
            </div>

            {/* Card Informativo de Integração Automática */}
            <div className="rounded-[4px] bg-emerald-500/10 border border-emerald-500/25 p-2.5 flex items-start gap-2 text-emerald-300 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <p className="leading-snug">
                Esta transação será automaticamente registrada como <strong>Despesa Operacional</strong> e refletirá imediatamente no <strong>Fluxo de Caixa</strong> da barbearia.
              </p>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPayModalOpen(false)}
                className="rounded-[4px] text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-[4px] bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs gap-1.5 shadow-none"
                data-testid="modal-submit-pay-btn"
              >
                {submitting ? "Processando..." : "Confirmar e Registrar Saída"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
