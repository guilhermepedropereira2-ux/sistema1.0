import { useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { brl, fmtDate, todayISO } from "@/lib/format";
import { Plus, MoreVertical, Trash2, Check, Shield, FileSpreadsheet } from "lucide-react";
import { downloadCsv, formatBrlNumber } from "@/lib/exportCsv";

const STATUS = {
  pago: { label: "Pago", cls: "bg-success text-success-foreground" },
  pendente: { label: "Pendente", cls: "bg-secondary text-secondary-foreground" },
  vencido: { label: "Vencido", cls: "bg-destructive text-destructive-foreground" },
};

function ExpenseDialog({ type, categories, onDone }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", value: "", category_id: "", due_date: todayISO(),
    recurrence: type === "fixa" ? "mensal" : "nenhuma", occurrences: 12,
    payment_method: "", paid: false,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.value) return toast.error("Preencha nome e valor");
    try {
      await api.post("/expenses", {
        name: form.name, value: parseFloat(form.value), category_id: form.category_id || null,
        type, due_date: form.due_date, recurrence: form.recurrence,
        occurrences: parseInt(form.occurrences) || 12, payment_method: form.payment_method || null,
        payment_date: form.paid ? form.due_date : null,
      });
      toast.success("Despesa cadastrada");
      setOpen(false);
      setForm((f) => ({ ...f, name: "", value: "" }));
      onDone();
    } catch { toast.error("Erro ao cadastrar"); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid={`add-expense-${type}`}><Plus className="h-4 w-4" /> Nova Despesa</Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{type === "fixa" ? "Despesa Fixa" : "Despesa Variável"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="expense-name" placeholder="Ex: Aluguel" />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" value={form.value} onChange={(e) => set("value", e.target.value)} data-testid="expense-value" />
          </div>
          <div>
            <Label>Vencimento</Label>
            <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} data-testid="expense-date" />
          </div>
          <div className="sm:col-span-2">
            <Label>Categoria</Label>
            <Select value={form.category_id} onValueChange={(v) => set("category_id", v)}>
              <SelectTrigger data-testid="expense-category"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.group}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {type === "fixa" && (
            <>
              <div>
                <Label>Recorrência</Label>
                <Select value={form.recurrence} onValueChange={(v) => set("recurrence", v)}>
                  <SelectTrigger data-testid="expense-recurrence"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="nenhuma">Única</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.recurrence === "mensal" && (
                <div>
                  <Label>Nº de meses</Label>
                  <Input type="number" value={form.occurrences} onChange={(e) => set("occurrences", e.target.value)} data-testid="expense-occurrences" />
                </div>
              )}
            </>
          )}
          <div className="sm:col-span-2">
            <Label>Forma de pagamento</Label>
            <Input value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)} data-testid="expense-payment" placeholder="Ex: PIX, Dinheiro" />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.paid} onChange={(e) => set("paid", e.target.checked)} data-testid="expense-paid" />
            Já está pago
          </label>
        </div>
        <DialogFooter>
          <Button onClick={submit} data-testid="expense-submit">Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Despesas() {
  const { month, refresh } = useMonth();
  const { isBalcaoMode } = useBalcao();
  const [tab, setTab] = useState("fixa");
  const { data: expenses, loading } = useApi((api) => api.get("/expenses", { month, type: tab }), [tab]);
  const { data: categories } = useApi((api) => api.get("/categories"));

  const act = async (fn, msg) => {
    try { await fn(); toast.success(msg); refresh(); } catch { toast.error("Erro"); }
  };

  const total = (expenses || []).reduce((a, e) => a + e.value, 0);
  const paid = (expenses || []).filter((e) => e.status === "pago").reduce((a, e) => a + e.value, 0);

  const handleExportCsv = () => {
    if (!expenses || !expenses.length) {
      toast.error("Nenhuma despesa para exportar neste mês.");
      return;
    }

    const headers = [
      "Vencimento",
      "Descrição",
      "Tipo",
      "Valor (R$)",
      "Status",
      "Recorrência",
    ];

    const rows = expenses.map((e) => [
      fmtDate(e.due_date),
      e.name || "-",
      e.type === "fixa" ? "Fixa" : "Variável",
      formatBrlNumber(e.value),
      STATUS[e.status]?.label || e.status,
      e.recurrence || "-",
    ]);

    const filename = `Kupola_Despesas_${tab}_${month}.csv`;
    downloadCsv({ filename, headers, rows });
    toast.success("Despesas exportadas com sucesso!");
  };

  return (
    <div className="space-y-5 max-w-full 2xl:max-w-[1920px] mx-auto" data-testid="despesas-page">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="fixa" data-testid="tab-fixas">Fixas</TabsTrigger>
            <TabsTrigger value="variavel" data-testid="tab-variaveis">Variáveis</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportCsv}
              className="rounded-[4px] border-[#D4AF37]/40 bg-[#12141F] text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] font-semibold text-xs gap-1.5 shadow-none transition-all cursor-pointer h-9 px-3"
              data-testid="export-csv-despesas-btn"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>Exportar para Excel (.csv)</span>
            </Button>
            {categories && <ExpenseDialog type={tab} categories={categories} onDone={refresh} />}
          </div>
        </div>
      </Tabs>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-muted-foreground">Total</p>
            {isBalcaoMode && <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[9px]"><Shield className="h-2.5 w-2.5 mr-1" /> Caixa</Badge>}
          </div>
          <p className="font-display text-xl font-extrabold">{isBalcaoMode ? "••••••" : brl(total)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Pago</p>
          <p className="font-display text-xl font-extrabold text-success">{isBalcaoMode ? "••••••" : brl(paid)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Em aberto</p>
          <p className="font-display text-xl font-extrabold text-destructive">{isBalcaoMode ? "••••••" : brl(total - paid)}</p>
        </Card>
      </div>

      {loading ? <Loading /> : !expenses?.length ? (
        <EmptyState title="Nenhuma despesa neste mês" subtitle="Cadastre despesas para acompanhar os gastos." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[650px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id} data-testid={`expense-row-${e.id}`}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(e.due_date)}</TableCell>
                    <TableCell className="font-medium">{e.name}{e.recurrence === "mensal" && <span className="ml-2 text-xs text-muted-foreground">(recorrente)</span>}</TableCell>
                    <TableCell className="text-muted-foreground">{e.category_name || "-"}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{brl(e.value)}</TableCell>
                    <TableCell><Badge className={STATUS[e.status].cls}>{STATUS[e.status].label}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`expense-menu-${e.id}`}><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {e.status !== "pago" && (
                            <DropdownMenuItem onClick={() => act(() => api.post(`/expenses/${e.id}/pay`, {}), "Marcado como pago")} data-testid={`expense-pay-${e.id}`}>
                              <Check className="mr-2 h-4 w-4" /> Marcar como pago
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => act(() => api.del(`/expenses/${e.id}`), "Excluído")}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                          {e.recurrence === "mensal" && (
                            <DropdownMenuItem className="text-destructive" onClick={() => act(() => api.del(`/expenses/${e.id}`, { all_recurrences: true }), "Série excluída")}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir todas recorrências
                            </DropdownMenuItem>
                          )}
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
