import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { Loading, EmptyState } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { brl, fmtDate } from "@/lib/format";
import { Search, User, ChevronRight, Ticket } from "lucide-react";

export default function MeusClientes() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [note, setNote] = useState("");
  const { data, loading, reload } = useFetch((api) => api.get("/barber/clientes"));
  const { data: hist } = useFetch(
    (api) => sel ? api.get(`/barber/cliente/historico?client_id=${sel.id}&name=${encodeURIComponent(sel.name)}`) : Promise.resolve(null),
    [sel?.id]
  );

  const filtered = useMemo(
    () => (data || []).filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || "").includes(q)),
    [data, q]
  );

  const openClient = (c) => { setSel(c); setNote(c.notes || ""); };
  const saveNote = async () => {
    try { await api.post("/barber/cliente/nota", { client_id: sel.id, note }); toast.success("Observação salva"); reload(); setSel(null); }
    catch { toast.error("Erro ao salvar"); }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4" data-testid="meus-clientes">
      <h2 className="font-display text-lg font-extrabold">Clientes da Barbearia</h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} data-testid="client-search" />
      </div>

      {!filtered.length ? <EmptyState title="Nenhum cliente encontrado" subtitle="Cadastre clientes ao lançar um atendimento." /> : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Card key={c.id} className="flex cursor-pointer items-center gap-3 p-4" onClick={() => openClient(c)} data-testid={`client-${c.id}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary"><User className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.atendimentos} atend. {c.last_date ? `· último ${fmtDate(c.last_date)}` : ""}
                </p>
                {c.has_plan && c.plan && (
                  <Badge variant="secondary" className="mt-1 gap-1 text-[10px]"><Ticket className="h-3 w-3" /> {c.plan.remaining}/{c.plan.total} · {c.plan.status}</Badge>
                )}
              </div>
              <span className="text-sm font-semibold">{brl(c.total)}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="client-detail">
          <DialogHeader><DialogTitle className="font-display">{sel?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {sel?.has_plan && sel?.plan && (
              <div className="rounded-md border border-primary/40 bg-primary/10 p-3" data-testid="client-plan">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-primary"><Ticket className="h-4 w-4" /> {sel.plan.name}</p>
                <p className="text-xs text-muted-foreground">Restam {sel.plan.remaining} de {sel.plan.total} · {sel.plan.status}</p>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Observações</p>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} data-testid="client-note" placeholder="Preferências, notas..." />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Meu histórico com o cliente</p>
              <div className="space-y-2">
                {(hist || []).map((g, idx) => (
                  <div key={g.sale_group_id ? `${g.sale_group_id}_${idx}` : g.id ? `${g.id}_${idx}` : `hist_${idx}`} className="rounded-md bg-secondary px-3 py-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">{fmtDate(g.date)}</span><span className="font-semibold">{brl(g.paid)}</span></div>
                    <p className="text-xs">{g.items.map((i) => i.name).join(", ")}{g.plan_used ? " · (plano)" : ""}</p>
                  </div>
                ))}
                {!hist?.length && <p className="text-sm text-muted-foreground">Sem histórico.</p>}
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={saveNote} data-testid="save-note">Salvar observação</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
