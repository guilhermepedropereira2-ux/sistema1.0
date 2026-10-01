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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { brl } from "@/lib/format";

function ProductDialog({ existing, onDone }) {
  const [open, setOpen] = useState(false);
  const init = existing || { name: "", price: "", cost: "", stock: 0, active: true };
  const [form, setForm] = useState(init);
  const submit = async () => {
    if (!form.name) return toast.error("Informe o nome");
    const payload = { name: form.name, price: parseFloat(form.price) || 0, cost: parseFloat(form.cost) || 0, stock: parseInt(form.stock) || 0, active: true };
    try {
      if (existing) await api.put(`/products/${existing.id}`, payload);
      else await api.post("/products", payload);
      toast.success("Salvo"); setOpen(false); onDone();
    } catch { toast.error("Erro"); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setForm(init); }}>
      <DialogTrigger asChild>
        {existing ? <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`edit-product-${existing.id}`}><Pencil className="h-4 w-4" /></Button>
          : <Button className="gap-2" data-testid="add-product-button"><Plus className="h-4 w-4" /> Novo Produto</Button>}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{existing ? "Editar" : "Novo"} Produto</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} data-testid="product-name" /></div>
          <div><Label>Preço (R$)</Label><Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} data-testid="product-price" /></div>
          <div><Label>Custo (R$)</Label><Input type="number" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} data-testid="product-cost" /></div>
          <div><Label>Estoque</Label><Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} data-testid="product-stock" /></div>
        </div>
        <DialogFooter><Button onClick={submit} data-testid="product-submit">Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Produtos() {
  const { refresh } = useMonth();
  const { data, loading } = useApi((api) => api.get("/products"));
  const remove = async (id) => { try { await api.del(`/products/${id}`); toast.success("Removido"); refresh(); } catch { toast.error("Erro"); } };
  if (loading) return <Loading />;
  return (
    <div className="space-y-5 max-w-full 2xl:max-w-[1920px] mx-auto" data-testid="produtos-page">
      <div className="flex justify-end"><ProductDialog onDone={refresh} /></div>
      {!data?.length ? <EmptyState title="Nenhum produto cadastrado" subtitle="Cadastre os produtos vendidos pela barbearia." /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[550px]">
              <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Preço</TableHead><TableHead className="text-right">Custo</TableHead><TableHead className="text-right">Estoque</TableHead><TableHead className="text-right"></TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((p) => (
                  <TableRow key={p.id} data-testid={`product-row-${p.id}`}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(p.price)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{brl(p.cost)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.stock}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <ProductDialog existing={p} onDone={refresh} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(p.id)} data-testid={`delete-product-${p.id}`}><Trash2 className="h-4 w-4" /></Button>
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
