import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { Loading, EmptyState, StatCard } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, fmtDate, paymentTypeLabel, PERIOD_OPTIONS, periodRange } from "@/lib/format";
import {
  ArrowLeft, Users, Scissors, Package, PiggyBank, Percent, HandCoins, CheckCircle2, Clock, FileSpreadsheet,
} from "lucide-react";
import { downloadCsv, formatBrlNumber } from "@/lib/exportCsv";

const STATUS_FILTER = [
  { value: "todos", label: "Todos os status" },
  { value: "ativo", label: "Ativos" },
  { value: "cancelado", label: "Cancelados" },
  { value: "estornado", label: "Estornados" },
];
const KIND_FILTER = [
  { value: "todos", label: "Serviços + Produtos" },
  { value: "servico", label: "Somente serviços" },
  { value: "produto", label: "Somente produtos" },
];

export default function BarberReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("mes");
  const [custom, setCustom] = useState({ start: "", end: "" });
  const [kind, setKind] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [pm, setPm] = useState("todos");
  const [tick, setTick] = useState(0);

  const { start, end } = useMemo(() => periodRange(period, custom), [period, custom]);

  const { data: methods } = useApi((api) => api.get("/payment-methods"));
  const { data: report, loading } = useApi(
    (api) => api.get(`/barbers/${id}/report`, { start, end }), [id, start, end, tick]);
  const { data: revenues } = useApi(
    (api) => api.get("/revenues", {
      barber_id: id, start, end,
      item_kind: kind === "todos" ? undefined : kind,
      status: status === "todos" ? undefined : status,
      payment_method_id: pm === "todos" ? undefined : pm,
    }), [id, start, end, kind, status, pm, tick]);

  const payCommissions = async () => {
    try {
      const res = await api.post(`/barbers/${id}/pay-commissions?start=${start}&end=${end}`);
      toast.success(`Comissões pagas: ${brl(res.total)} (${res.paid} vendas)`);
      setTick((t) => t + 1);
    } catch { toast.error("Erro ao pagar comissões"); }
  };

  const handleExportCsv = () => {
    if (!revenues || !revenues.length) {
      toast.error("Nenhuma venda no período selecionado para exportar.");
      return;
    }

    const headers = [
      "Data/Hora",
      "Barbeiro/Profissional",
      "Serviço/Produto",
      "Forma de Pagamento",
      "Valor Bruto (R$)",
      "Comissão (R$)",
      "Líquido da Casa (R$)",
      "Status",
      "Cliente",
    ];

    const rows = revenues.map((v) => {
      const dateTime = `${fmtDate(v.date)} ${v.time || ""}`.trim();
      const barberName = v.barber_name || r?.barber?.name || "Profissional";
      const itemName = v.service_name || (v.item_kind === "produto" ? "Produto" : "Serviço");
      const payMethod = `${v.payment_method_name || ""} (${paymentTypeLabel(v.payment_type)})`.trim();
      const grossVal = formatBrlNumber(v.gross_amount ?? v.paid_amount);
      const commissionVal = formatBrlNumber(v.commission_amount ?? 0);
      const shopVal = formatBrlNumber(v.shop_amount ?? (v.net_amount - (v.commission_amount || 0)));
      const statusLabel = v.status === "cancelado" ? "Cancelado" : v.status === "estornado" ? "Estornado" : "Ativo";
      const clientName = v.client_name || "-";

      return [
        dateTime,
        barberName,
        itemName,
        payMethod,
        grossVal,
        commissionVal,
        shopVal,
        statusLabel,
        clientName,
      ];
    });

    const safeName = (r?.barber?.name || "barbeiro").replace(/\s+/g, "_");
    const filename = `KingPro_Relatorio_${safeName}_${start}_${end}.csv`;
    downloadCsv({ filename, headers, rows });
    toast.success("Relatório exportado com sucesso!");
  };

  if (loading || !report) return <Loading />;
  const r = report;

  return (
    <div className="space-y-6" data-testid="barber-report-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/equipe")} data-testid="back-to-equipe"><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <p className="font-display text-xl font-extrabold">{r.barber.name}</p>
            <p className="text-sm text-muted-foreground">Relatório individual · {fmtDate(start)} a {fmtDate(end)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            className="rounded-[4px] border-[#D4AF37]/40 bg-[#12141F] text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] font-semibold text-xs sm:text-sm gap-2 shadow-none transition-all cursor-pointer"
            data-testid="export-csv-btn"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#D4AF37]" />
            <span>Exportar para Excel (.csv)</span>
          </Button>
          <Button onClick={payCommissions} className="gap-2" data-testid="pay-commissions-btn" disabled={r.comissao_pendente <= 0}>
            <HandCoins className="h-4 w-4" /> Pagar comissão pendente
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger data-testid="filter-period"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIOD_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger data-testid="filter-kind"><SelectValue /></SelectTrigger>
            <SelectContent>{KIND_FILTER.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={pm} onValueChange={setPm}>
            <SelectTrigger data-testid="filter-payment"><SelectValue placeholder="Forma de pagamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as formas</SelectItem>
              {(methods || []).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="filter-status"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_FILTER.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          {period === "personalizado" && (
            <>
              <Input type="date" value={custom.start} onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))} data-testid="custom-start" />
              <Input type="date" value={custom.end} onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))} data-testid="custom-end" />
            </>
          )}
        </div>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Atendimentos" value={String(r.atendimentos ?? 0)} icon={Users} testId="rep-atendimentos" />
        <StatCard label="Faturamento total" value={r.faturamento_total ?? r.paid ?? 0} icon={PiggyBank} tone="primary" testId="rep-faturamento" />
        <StatCard label="Comissão gerada" value={r.comissao_gerada ?? r.commission ?? 0} icon={HandCoins} testId="rep-comissao" />
        <StatCard label="Total p/ barbearia" value={r.total_barbearia ?? r.shop ?? 0} icon={PiggyBank} tone="success" testId="rep-barbearia" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Serviços vendidos" value={`${r.services_summary?.quantity ?? r.services_count ?? 0} · ${brl(r.services_summary?.paid ?? 0)}`} icon={Scissors} testId="rep-servicos" />
        <StatCard label="Produtos vendidos" value={`${r.products_summary?.quantity ?? r.products_count ?? 0} · ${brl(r.products_summary?.paid ?? 0)}`} icon={Package} testId="rep-produtos" />
        <StatCard label="Comissão paga" value={r.comissao_paga ?? r.commission_paid ?? 0} icon={CheckCircle2} tone="success" testId="rep-comm-paga" />
        <StatCard label="Comissão pendente" value={r.comissao_pendente ?? r.commission_pending ?? 0} icon={Clock} tone={(r.comissao_pendente ?? r.commission_pending ?? 0) > 0 ? "danger" : "muted"} testId="rep-comm-pendente" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Descontos concedidos" value={r.descontos ?? r.discounts ?? 0} icon={Percent} tone="muted" testId="rep-descontos" />
        <StatCard label="Taxas das máquinas" value={r.taxas ?? r.fees ?? 0} icon={Percent} tone="danger" testId="rep-taxas" />
        <StatCard label="Valor líquido" value={r.valor_liquido ?? r.net ?? 0} icon={PiggyBank} testId="rep-liquido" />
      </div>

      {/* Breakdown tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden" data-testid="services-breakdown">
          <div className="border-b border-border p-4"><h3 className="font-display font-bold">Serviços vendidos</h3></div>
          {(r.services_breakdown || []).length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Serviço</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>{(r.services_breakdown || []).map((s) => (
                <TableRow key={s.name}><TableCell>{s.name}</TableCell><TableCell className="text-right tabular-nums">{s.quantity}</TableCell><TableCell className="text-right tabular-nums">{brl(s.total)}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          ) : <p className="p-6 text-sm text-muted-foreground">Sem serviços no período.</p>}
        </Card>
        <Card className="overflow-hidden" data-testid="products-breakdown">
          <div className="border-b border-border p-4"><h3 className="font-display font-bold">Produtos vendidos</h3></div>
          {(r.products_breakdown || []).length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>{(r.products_breakdown || []).map((s) => (
                <TableRow key={s.name}><TableCell>{s.name}</TableCell><TableCell className="text-right tabular-nums">{s.quantity}</TableCell><TableCell className="text-right tabular-nums">{brl(s.total)}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          ) : <p className="p-6 text-sm text-muted-foreground">Sem produtos no período.</p>}
        </Card>
      </div>

      {/* Detailed history */}
      <Card className="overflow-hidden" data-testid="detailed-history">
        <div className="border-b border-border p-4"><h3 className="font-display font-bold">Histórico detalhado</h3></div>
        {!revenues?.length ? <EmptyState title="Nenhuma venda com os filtros atuais" /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead><TableHead>Item</TableHead><TableHead>Cliente</TableHead>
                  <TableHead>Pagamento</TableHead><TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Desc.</TableHead><TableHead className="text-right">Taxa</TableHead>
                  <TableHead className="text-right">Comissão</TableHead><TableHead className="text-right">Barbearia</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenues.map((v) => (
                  <TableRow key={v.id} data-testid={`hist-row-${v.id}`} className={v.status !== "ativo" ? "opacity-50" : ""}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(v.date)} {v.time}</TableCell>
                    <TableCell><div className="font-medium">{v.service_name}</div><span className="text-xs text-muted-foreground capitalize">{v.item_kind}</span></TableCell>
                    <TableCell>{v.client_name || "-"}</TableCell>
                    <TableCell><span className="text-sm">{v.payment_method_name}</span><div className="text-xs text-muted-foreground">{paymentTypeLabel(v.payment_type)}</div></TableCell>
                    <TableCell className="text-right tabular-nums">{brl(v.gross_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{v.discount_amount > 0 ? brl(v.discount_amount) : "-"}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{brl(v.fee_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(v.commission_amount)}{v.commission_paid && v.status === "ativo" && <div className="text-[10px] text-success">paga</div>}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-primary">{brl(v.shop_amount)}</TableCell>
                    <TableCell>{v.status === "ativo" ? <Badge variant="secondary">Ativo</Badge> : <Badge variant="destructive">{v.status}</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
