import { useState } from "react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { useAuth } from "@/context/AuthContext";
import { isDono } from "@/lib/roles";
import { Loading, EmptyState } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { brl, fmtDate, todayISO } from "@/lib/format";
import { Plus, Trash2, HandCoins, ShieldAlert } from "lucide-react";

export default function Retiradas() {
  const { user, ready } = useAuth();
  const { month, refresh } = useMonth();
  const { data: list, loading } = useApi((api) => api.get("/withdrawals", { month }));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: todayISO(), value: "", reason: "" });

  if (ready && user && !isDono(user)) {
    return <Navigate to="/" replace />;
  }

  const submit = async () => {
    if (!form.value) return toast.error("Informe o valor");
    try {
      await api.post("/withdrawals", { date: form.date, value: parseFloat(form.value), reason: form.reason, source: "dinheiro" });
      toast.success("Retirada registrada"); setOpen(false); setForm({ date: todayISO(), value: "", reason: "" }); refresh();
    } catch { toast.error("Erro"); }
  };
  const remove = async (id) => { try { await api.del(`/withdrawals/${id}`); toast.success("Removido"); refresh(); } catch { toast.error("Erro"); } };

  if (loading) return <Loading />;
  const total = (list || []).reduce((a, w) => a + w.value, 0);

  return (
    <div className="space-y-5" data-testid="retiradas-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Total retirado no mês</p><p className="font-display text-xl font-extrabold">{brl(total)}</p></Card>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2" data-testid="add-withdrawal-button"><Plus className="h-4 w-4" /> Nova Retirada</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">Retirada do Proprietário</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div><Label>Valor (R$)</Label><Input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} data-testid="withdrawal-value" /></div>
              <div><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} data-testid="withdrawal-date" /></div>
              <div><Label>Motivo</Label><Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} data-testid="withdrawal-reason" placeholder="Ex: Uso pessoal" /></div>
            </div>
            <DialogFooter><Button onClick={submit} data-testid="withdrawal-submit">Registrar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">Retiradas são separadas das despesas operacionais para não misturar o dinheiro da empresa com o pessoal.</p>

      {!list?.length ? <EmptyState title="Nenhuma retirada neste mês" /> : (
        <div className="space-y-2">
          {list.map((w) => (
            <Card key={w.id} className="flex items-center justify-between p-4" data-testid={`withdrawal-${w.id}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary"><HandCoins className="h-5 w-5" /></div>
                <div>
                  <p className="font-display font-bold">{brl(w.value)}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(w.date)} · {w.reason || "Sem motivo"}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(w.id)} data-testid={`delete-withdrawal-${w.id}`}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
