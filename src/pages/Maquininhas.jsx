import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { Loading, EmptyState } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Plus, Pencil, Trash2, Banknote, Smartphone, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { canManagePaymentMethods } from "@/lib/roles";

const TYPE_FIELDS = {
  dinheiro: ["dinheiro"],
  pix: ["pix"],
  maquininha: ["debito", "credito_vista", "credito_parcelado", "pix"],
};
const FEE_LABELS = {
  dinheiro: "Dinheiro", pix: "PIX", debito: "Débito",
  credito_vista: "Crédito à vista", credito_parcelado: "Crédito parcelado",
};
const KIND_ICON = { dinheiro: Banknote, pix: Smartphone, maquininha: CreditCard };

function MachineDialog({ existing, onDone }) {
  const [open, setOpen] = useState(false);
  const init = existing || { name: "", kind: "maquininha", fees: {}, settlement_days: {}, active: true };
  const [form, setForm] = useState(init);
  const fields = TYPE_FIELDS[form.kind] || [];

  const setFee = (k, v) => setForm((f) => ({ ...f, fees: { ...f.fees, [k]: parseFloat(v) || 0 } }));
  const setDay = (k, v) => setForm((f) => ({ ...f, settlement_days: { ...f.settlement_days, [k]: parseInt(v) || 0 } }));

  const submit = async () => {
    if (!form.name) return toast.error("Informe o nome");
    const fees = {}, days = {};
    fields.forEach((k) => { fees[k] = Number(form.fees[k] || 0); days[k] = Number(form.settlement_days[k] || 0); });
    const payload = { name: form.name, kind: form.kind, fees, settlement_days: days, active: true };
    try {
      if (existing) await api.put(`/payment-methods/${existing.id}`, payload);
      else await api.post("/payment-methods", payload);
      toast.success("Salvo");
      setOpen(false);
      onDone();
    } catch { toast.error("Erro ao salvar"); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setForm(init); }}>
      <DialogTrigger asChild>
        {existing ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`edit-machine-${existing.id}`}><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button className="gap-2" data-testid="add-machine-button"><Plus className="h-4 w-4" /> Nova Forma de Pagamento</Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{existing ? "Editar" : "Nova"} Forma de Pagamento</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} data-testid="machine-name" placeholder="Ex: Ton" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: v }))}>
                <SelectTrigger data-testid="machine-kind"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maquininha">Maquininha</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-[4px] border border-white/10 bg-[#0A0D14] p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Taxas e prazos por tipo</p>
            <div className="space-y-3">
              {fields.map((k) => (
                <div key={k} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <span className="text-sm">{FEE_LABELS[k]}</span>
                  <div className="flex items-center gap-1">
                    <Input type="number" step="0.01" className="w-20" value={form.fees[k] ?? ""} onChange={(e) => setFee(k, e.target.value)} data-testid={`fee-${k}`} placeholder="0" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input type="number" className="w-16" value={form.settlement_days[k] ?? ""} onChange={(e) => setDay(k, e.target.value)} data-testid={`days-${k}`} placeholder="0" />
                    <span className="text-xs text-muted-foreground">dias</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit} data-testid="machine-submit">Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Maquininhas() {
  const { user } = useAuth();
  const { refresh } = useMonth();
  const { data: methods, loading } = useApi((api) => api.get("/payment-methods"));

  const remove = async (id) => {
    try { await api.del(`/payment-methods/${id}`); toast.success("Removido"); refresh(); }
    catch { toast.error("Erro"); }
  };

  if (!canManagePaymentMethods(user)) {
    return (
      <div className="p-6 max-w-xl mx-auto mt-10" data-testid="maquininhas-restricted">
        <Card className="p-8 text-center bg-[#12141F] border border-amber-500/20 rounded-[6px] shadow-lg">
          <ShieldAlert className="h-12 w-12 text-[#D4AF37] mx-auto mb-3" />
          <h2 className="font-display text-lg font-bold text-white">Acesso Restrito ao Administrador</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            A configuração de maquininhas, taxas e meios de pagamento é restrita exclusivamente a administradores e gerentes da barbearia.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-5 max-w-full 2xl:max-w-[1920px] mx-auto" data-testid="maquininhas-page">
      <div className="flex justify-end"><MachineDialog onDone={refresh} /></div>
      {!methods?.length ? (
        <EmptyState title="Nenhuma forma de pagamento" subtitle="Cadastre maquininhas, PIX e dinheiro com suas taxas." />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((m) => {
            const Icon = KIND_ICON[m.kind] || CreditCard;
            return (
              <Card key={m.id} className="p-5" data-testid={`machine-card-${m.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary"><Icon className="h-5 w-5" /></div>
                    <div>
                      <p className="font-display font-bold">{m.name}</p>
                      <Badge variant="secondary" className="mt-1 capitalize">{m.kind}</Badge>
                    </div>
                  </div>
                  <div className="flex">
                    <MachineDialog existing={m} onDone={refresh} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(m.id)} data-testid={`delete-machine-${m.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-sm">
                  {Object.keys(m.fees || {}).map((k) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{FEE_LABELS[k]}</span>
                      <span className="tabular-nums">{m.fees[k]}% · {m.settlement_days?.[k] || 0}d</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
