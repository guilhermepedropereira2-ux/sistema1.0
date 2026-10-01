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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { brl } from "@/lib/format";

function ServiceDialog({ existing, onDone }) {
  const [open, setOpen] = useState(false);
  const init = existing || { name: "", price: "", duration_min: 30, active: true };
  const [form, setForm] = useState(init);
  const submit = async () => {
    if (!form.name) return toast.error("Informe o nome");
    const payload = { name: form.name, price: parseFloat(form.price) || 0, duration_min: parseInt(form.duration_min) || 30, active: true };
    try {
      if (existing) await api.put(`/services/${existing.id}`, payload);
      else await api.post("/services", payload);
      toast.success("Salvo"); setOpen(false); onDone();
    } catch { toast.error("Erro"); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setForm(init); }}>
      <DialogTrigger asChild>
        {existing ? <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`edit-service-${existing.id}`}><Pencil className="h-4 w-4" /></Button>
          : <Button className="gap-2" data-testid="add-service-button"><Plus className="h-4 w-4" /> Novo Serviço</Button>}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{existing ? "Editar" : "Novo"} Serviço</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} data-testid="service-name" /></div>
          <div><Label>Preço (R$)</Label><Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} data-testid="service-price" /></div>
          <div><Label>Duração (min)</Label><Input type="number" value={form.duration_min} onChange={(e) => setForm((f) => ({ ...f, duration_min: e.target.value }))} data-testid="service-duration" /></div>
        </div>
        <DialogFooter><Button onClick={submit} data-testid="service-submit">Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Servicos() {
  const { refresh } = useMonth();
  const { data, loading } = useApi((api) => api.get("/services"));
  const remove = async (id) => { try { await api.del(`/services/${id}`); toast.success("Removido"); refresh(); } catch { toast.error("Erro"); } };
  if (loading) return <Loading />;
  return (
    <div className="space-y-5 max-w-full 2xl:max-w-[1920px] mx-auto" data-testid="servicos-page">
      <div className="flex justify-end"><ServiceDialog onDone={refresh} /></div>
      {!data?.length ? <EmptyState title="Nenhum serviço cadastrado" subtitle="Cadastre os serviços oferecidos pela barbearia." /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader><TableRow><TableHead>Serviço</TableHead><TableHead className="text-right">Preço</TableHead><TableHead className="text-right">Duração</TableHead><TableHead className="text-right"></TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((s) => (
                  <TableRow key={s.id} data-testid={`service-row-${s.id}`}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(s.price)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{s.duration_min} min</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <ServiceDialog existing={s} onDone={refresh} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(s.id)} data-testid={`delete-service-${s.id}`}><Trash2 className="h-4 w-4" /></Button>
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
