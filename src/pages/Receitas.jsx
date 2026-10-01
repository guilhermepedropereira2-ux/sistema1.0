import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { useBalcao } from "@/context/BalcaoContext";
import { Loading, EmptyState } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { brl, fmtDate, todayISO, PAYMENT_TYPES, paymentTypeLabel } from "@/lib/format";
import { Plus, MoreVertical, Trash2, Ban, RotateCcw, Shield, EyeOff, FileSpreadsheet, Download, Filter } from "lucide-react";
import { downloadCsv, formatBrlNumber } from "@/lib/exportCsv";
import ClientAutocomplete from "@/components/ClientAutocomplete";
import PaymentChannelSelector from "@/components/PaymentChannelSelector";
import {
  getChannelNameById,
  getMethodNameById,
  toLegacyPaymentType,
  formatChannelMethodLabel,
} from "@/lib/paymentChannels";

const STATUS_BADGE = {
  ativo: null,
  cancelado: <Badge variant="secondary">Cancelado</Badge>,
  estornado: <Badge variant="destructive">Estornado</Badge>,
};

function RevenueDialog({ methods, barbers, settings, services, products, clients = [], onDone }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: todayISO(), time: "12:00", item_kind: "servico", item_id: "",
    service_type: "servico", service_name: "",
    gross_amount: "", discount_amount: "", payment_method_id: "", payment_type: "dinheiro",
    payment_channel: "caixa_fisico", payment_method: "cash",
    barber_id: "", client_name: "", client_id: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const barber = barbers.find((b) => b.id === form.barber_id);
  const method = methods.find((m) => m.id === form.payment_method_id) || methods[0];

  const catalog = form.item_kind === "produto" ? products : services;
  const catalogFiltered = barber
    ? catalog.filter((it) => (form.item_kind === "produto" ? barber.authorized_products : barber.authorized_services)?.includes(it.id) ?? true)
    : catalog;

  const pickItem = (id) => {
    const it = catalog.find((x) => x.id === id);
    if (!it) return;
    setForm((f) => ({ ...f, item_id: id, service_name: it.name, gross_amount: String(it.price) }));
  };

  const calc = useMemo(() => {
    const gross = parseFloat(form.gross_amount) || 0;
    const discount = parseFloat(form.discount_amount) || 0;
    const paid = Math.max(0, gross - discount);
    const feePct = method ? Number(method.fees?.[form.payment_type] || 0) : 0;
    const fee = +(paid * feePct / 100).toFixed(2);
    const net = +(paid - fee).toFixed(2);
    const base = settings?.commission_on === "original" ? gross : paid;
    let commission = 0;
    let commLabel = "";
    if (barber) {
      const ov = (barber.commission_overrides || {})[form.item_id];
      const type = ov?.value != null ? ov.type : barber.commission_type || "percentual";
      const val = ov?.value != null ? Number(ov.value) : (type === "fixo" ? Number(barber.commission_value || 0) : Number(barber.commission_percent || 0));
      if (type === "fixo") { commission = +val.toFixed(2); commLabel = `fixo ${brl(val)}`; }
      else { commission = +(base * val / 100).toFixed(2); commLabel = `${val}%`; }
    }
    commission = Math.min(commission, Math.max(net, 0));
    const shop = +(net - commission).toFixed(2);
    return { gross, discount, paid, feePct, fee, net, commission, shop, commLabel };
  }, [form, method, barber, settings]);

  const submit = async () => {
    if (!form.service_name) return toast.error("Selecione ou descreva o item");
    if (!form.gross_amount) return toast.error("Informe o valor bruto");
    const channelName = getChannelNameById(form.payment_channel, methods);
    const methodName = getMethodNameById(form.payment_method);
    const legacyType = toLegacyPaymentType(form.payment_channel, form.payment_method);

    try {
      await api.post("/revenues", {
        ...form,
        service_type: form.item_kind === "produto" ? "produto" : "servico",
        item_id: form.item_id || null,
        gross_amount: parseFloat(form.gross_amount),
        discount_amount: parseFloat(form.discount_amount) || 0,
        payment_channel: channelName,
        payment_method: methodName,
        payment_type: legacyType,
        payment_method_id: form.payment_method_id || methods[0]?.id || "pm_dinheiro",
        barber_id: form.barber_id || null,
        client_name: form.client_name || null,
      });
      toast.success("Receita registrada");
      setOpen(false);
      setForm((f) => ({ ...f, item_id: "", service_name: "", gross_amount: "", discount_amount: "", client_name: "" }));
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao registrar receita");
    }
  };

  const resetForm = () => setForm({
    date: todayISO(), time: "12:00", item_kind: "servico", item_id: "",
    service_type: "servico", service_name: "",
    gross_amount: "", discount_amount: "", payment_method_id: methods[0]?.id || "", payment_type: "dinheiro",
    payment_channel: "caixa_fisico", payment_method: "cash",
    barber_id: "", client_name: "", client_id: "",
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button data-testid="add-revenue-button" className="gap-2">
          <Plus className="h-4 w-4" /> Nova Receita
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Registrar Receita</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Tipo</Label>
            <Select value={form.item_kind} onValueChange={(v) => { set("item_kind", v); set("item_id", ""); }}>
              <SelectTrigger data-testid="revenue-item-kind"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="servico">Serviço</SelectItem>
                <SelectItem value="produto">Produto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{form.item_kind === "produto" ? "Produto" : "Serviço"} do catálogo</Label>
            <Select value={form.item_id} onValueChange={pickItem}>
              <SelectTrigger data-testid="revenue-catalog-item"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
              <SelectContent>
                {catalogFiltered.map((it) => <SelectItem key={it.id} value={it.id}>{it.name} · {brl(it.price)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Input value={form.service_name} onChange={(e) => set("service_name", e.target.value)} data-testid="revenue-service-name" placeholder="Ex: Corte, Pomada..." />
          </div>
          <div>
            <Label>Valor bruto (R$)</Label>
            <Input type="number" value={form.gross_amount} onChange={(e) => set("gross_amount", e.target.value)} data-testid="revenue-gross" placeholder="50,00" />
          </div>
          <div>
            <Label>Desconto (R$)</Label>
            <Input type="number" value={form.discount_amount} onChange={(e) => set("discount_amount", e.target.value)} data-testid="revenue-discount" placeholder="0,00" />
          </div>
          <div className="sm:col-span-2">
            <PaymentChannelSelector
              channel={form.payment_channel}
              method={form.payment_method}
              paymentMethods={methods}
              onChannelChange={(ch, chObj) => {
                const leg = toLegacyPaymentType(ch, form.payment_method);
                let pmId = chObj?.pmId || form.payment_method_id;
                if (!chObj?.pmId && methods?.length) {
                  if (ch === "caixa_fisico") {
                    pmId = methods.find((x) => x.kind === "dinheiro")?.id || methods[0].id;
                  } else if (ch === "pix_direto") {
                    pmId = methods.find((x) => x.kind === "pix")?.id || methods[0].id;
                  } else {
                    pmId = methods.find((x) => x.id === ch || x.kind === "maquininha" || x.kind === "cartao")?.id || methods[0].id;
                  }
                }
                setForm((prev) => ({
                  ...prev,
                  payment_channel: ch,
                  payment_type: leg,
                  payment_method_id: pmId,
                }));
              }}
              onMethodChange={(m) => {
                const leg = toLegacyPaymentType(form.payment_channel, m);
                setForm((prev) => ({
                  ...prev,
                  payment_method: m,
                  payment_type: leg,
                }));
              }}
            />
          </div>
          <div>
            <Label>Barbeiro</Label>
            <Select value={form.barber_id} onValueChange={(v) => set("barber_id", v)}>
              <SelectTrigger data-testid="revenue-barber"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {barbers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Cliente (opcional)</Label>
            <ClientAutocomplete
              value={form.client_name}
              clients={clients}
              placeholder="Ex: Carlos Eduardo (ou digite um novo)"
              onChange={(typedName, client) => {
                setForm((prev) => ({
                  ...prev,
                  client_name: typedName,
                  client_id: client ? client.id : "",
                }));
              }}
              onSelectClient={(client) => {
                setForm((prev) => ({
                  ...prev,
                  client_name: client.name,
                  client_id: client.id,
                }));
              }}
              testId="revenue-client-autocomplete"
            />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} data-testid="revenue-date" />
          </div>
          <div>
            <Label>Horário</Label>
            <Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} data-testid="revenue-time" />
          </div>
        </div>

        {/* Live calculation */}
        <div className="mt-2 rounded-[4px] border border-white/10 bg-[#0A0D14] p-4" data-testid="revenue-calc">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cálculo automático</p>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-muted-foreground">Valor bruto</span>
            <span className="text-right font-medium">{brl(calc.gross)}</span>
            {calc.discount > 0 && <>
              <span className="text-muted-foreground">Desconto</span>
              <span className="text-right font-medium text-destructive">- {brl(calc.discount)}</span>
              <span className="text-muted-foreground">Valor pago</span>
              <span className="text-right font-medium">{brl(calc.paid)}</span>
            </>}
            <span className="text-muted-foreground">Taxa da maquininha ({calc.feePct}%)</span>
            <span className="text-right font-medium text-destructive">- {brl(calc.fee)}</span>
            <span className="text-muted-foreground">Valor líquido recebido</span>
            <span className="text-right font-medium text-success">{brl(calc.net)}</span>
            <span className="text-muted-foreground">Comissão do barbeiro ({calc.commLabel || "—"})</span>
            <span className="text-right font-medium text-destructive">- {brl(calc.commission)}</span>
            <span className="col-span-2 my-1 border-t border-border" />
            <span className="font-display font-bold">Valor da barbearia</span>
            <span className="text-right font-display font-extrabold text-primary">{brl(calc.shop)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} data-testid="revenue-submit">Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Receitas() {
  const { month, refresh } = useMonth();
  const { isBalcaoMode } = useBalcao();
  const { data: revenues, loading } = useApi((api) => api.get("/revenues", { month }));
  const { data: methods } = useApi((api) => api.get("/payment-methods"));
  const { data: barbers } = useApi((api) => api.get("/barbers"));
  const { data: settings } = useApi((api) => api.get("/settings"));
  const { data: services } = useApi((api) => api.get("/services"));
  const { data: products } = useApi((api) => api.get("/products"));
  const { data: clients } = useApi((api) => api.get("/clients"));

  const action = async (fn, msg) => {
    try { await fn(); toast.success(msg); refresh(); }
    catch { toast.error("Erro na operação"); }
  };

  if (loading || !methods || !barbers || !services || !products) return <Loading />;

  const total = (revenues || []).filter((r) => r.status === "ativo").reduce((a, r) => a + r.paid_amount, 0);

  const handleExportCsv = () => {
    if (!revenues || !revenues.length) {
      toast.error("Nenhum dado disponível para exportar no período selecionado.");
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

    const rows = revenues.map((r) => {
      const dateTime = `${fmtDate(r.date)} ${r.time || ""}`.trim();
      const barberName = r.barber_name || "Não informado";
      const itemName = r.service_name || (r.item_kind === "produto" ? "Produto" : "Serviço");
      const payMethod = formatChannelMethodLabel(
        r.payment_channel,
        r.payment_method,
        r.payment_method_name,
        r.payment_type
      );
      const grossVal = formatBrlNumber(r.gross_amount ?? r.paid_amount);
      const commissionVal = formatBrlNumber(r.commission_amount ?? 0);
      const shopVal = formatBrlNumber(r.shop_amount ?? (r.net_amount - (r.commission_amount || 0)));
      const statusLabel = r.status === "cancelado" ? "Cancelado" : r.status === "estornado" ? "Estornado" : "Ativo";
      const clientName = r.client_name || "-";

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

    const filename = `Kupola_Vendas_Financeiro_${month || "periodo"}.csv`;
    downloadCsv({ filename, headers, rows });
    toast.success("Planilha gerada com sucesso! Download iniciado.");
  };

  return (
    <div className="space-y-5 max-w-full 2xl:max-w-[1920px] mx-auto" data-testid="receitas-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Total do mês</p>
          {isBalcaoMode ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xl text-slate-400">••••••</span>
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 gap-1 text-[10px]">
                <Shield className="h-3 w-3" /> Modo Caixa Ativo
              </Badge>
            </div>
          ) : (
            <p className="font-display text-2xl font-extrabold">{brl(total)}</p>
          )}
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
          <RevenueDialog methods={methods} barbers={barbers} settings={settings} services={services} products={products} clients={clients || []} onDone={refresh} />
        </div>
      </div>

      {!revenues?.length ? (
        <EmptyState title="Nenhuma receita neste mês" subtitle="Registre a primeira venda para começar a acompanhar o financeiro." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[750px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Barbeiro</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                  {!isBalcaoMode && <TableHead className="text-right">Comissão</TableHead>}
                  {!isBalcaoMode && <TableHead className="text-right">Barbearia</TableHead>}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenues.map((r) => (
                  <TableRow key={r.id} data-testid={`revenue-row-${r.id}`} className={r.status !== "ativo" ? "opacity-50" : ""}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(r.date)} {r.time}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.service_name}</div>
                      {r.client_name && <div className="text-xs text-muted-foreground">{r.client_name}</div>}
                      {STATUS_BADGE[r.status]}
                    </TableCell>
                    <TableCell>{r.barber_name || "-"}</TableCell>
                    <TableCell>
                      {r.payment_channel ? (
                        <div>
                          <span className="text-sm font-medium text-white">{r.payment_channel}</span>
                          <div className="text-xs text-amber-400/90 font-medium">{r.payment_method || paymentTypeLabel(r.payment_type)}</div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm">{r.payment_method_name}</span>
                          <div className="text-xs text-muted-foreground">{paymentTypeLabel(r.payment_type)}</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {brl(r.gross_amount)}
                      {r.discount_amount > 0 && (
                        <div className="text-xs text-destructive">desc. {brl(r.discount_amount)}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-success">{brl(r.net_amount)}</TableCell>
                    {!isBalcaoMode && (
                      <TableCell className="text-right tabular-nums text-muted-foreground">{brl(r.commission_amount)}</TableCell>
                    )}
                    {!isBalcaoMode && (
                      <TableCell className="text-right tabular-nums font-semibold text-primary">{brl(r.shop_amount)}</TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`revenue-menu-${r.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {r.status === "ativo" && (
                            <>
                              <DropdownMenuItem onClick={() => action(() => api.post(`/revenues/${r.id}/cancel?mode=cancelado`), "Venda cancelada")}>
                                <Ban className="mr-2 h-4 w-4" /> Cancelar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => action(() => api.post(`/revenues/${r.id}/cancel?mode=estornado`), "Venda estornada")}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Estornar
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => action(() => api.del(`/revenues/${r.id}`), "Receita excluída")}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
