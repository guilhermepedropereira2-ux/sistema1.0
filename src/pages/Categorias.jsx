import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { Loading } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";

const GROUPS = ["Estrutura", "Operação", "Equipe", "Marketing", "Manutenção", "Outros"];

function CategoryDialog({ existing, onDone }) {
  const [open, setOpen] = useState(false);
  const init = existing || { name: "", group: "Operação", type: "despesa", color: "#c9a227" };
  const [form, setForm] = useState(init);
  const submit = async () => {
    if (!form.name) return toast.error("Informe o nome");
    const payload = { name: form.name, group: form.group, type: "despesa", color: form.color };
    try {
      if (existing) await api.put(`/categories/${existing.id}`, payload);
      else await api.post("/categories", payload);
      toast.success("Salvo"); setOpen(false); onDone();
    } catch { toast.error("Erro"); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setForm(init); }}>
      <DialogTrigger asChild>
        {existing ? <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`edit-cat-${existing.id}`}><Pencil className="h-4 w-4" /></Button>
          : <Button className="gap-2" data-testid="add-category-button"><Plus className="h-4 w-4" /> Nova Categoria</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">{existing ? "Editar" : "Nova"} Categoria</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} data-testid="category-name" /></div>
          <div>
            <Label>Grupo</Label>
            <Select value={form.group} onValueChange={(v) => setForm((f) => ({ ...f, group: v }))}>
              <SelectTrigger data-testid="category-group"><SelectValue /></SelectTrigger>
              <SelectContent>{GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={submit} data-testid="category-submit">Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Categorias() {
  const { refresh } = useMonth();
  const { data: categories, loading } = useApi((api) => api.get("/categories"));
  const remove = async (id) => { try { await api.del(`/categories/${id}`); toast.success("Removido"); refresh(); } catch { toast.error("Erro"); } };
  if (loading) return <Loading />;
  const grouped = GROUPS.map((g) => ({ group: g, items: (categories || []).filter((c) => c.group === g) })).filter((x) => x.items.length);
  return (
    <div className="space-y-5" data-testid="categorias-page">
      <div className="flex justify-end"><CategoryDialog onDone={refresh} /></div>
      <div className="grid gap-4 md:grid-cols-2">
        {grouped.map((grp) => (
          <Card key={grp.group} className="p-5" data-testid={`cat-group-${grp.group}`}>
            <div className="mb-3 flex items-center gap-2"><Tags className="h-4 w-4 text-primary" /><h3 className="font-display font-bold">{grp.group}</h3></div>
            <div className="space-y-2">
              {grp.items.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md bg-secondary px-3 py-2" data-testid={`cat-${c.id}`}>
                  <span className="text-sm">{c.name}</span>
                  <div className="flex">
                    <CategoryDialog existing={c} onDone={refresh} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(c.id)} data-testid={`delete-cat-${c.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
