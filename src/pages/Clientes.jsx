import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { Loading, EmptyState } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { brl, fmtDate } from "@/lib/format";
import {
  Search, User, Plus, Pencil, Trash2, Phone, CalendarDays, Ticket, ChevronRight,
  MessageSquare, UserX, Sparkles, Clock, AlertTriangle, Send
} from "lucide-react";
import {
  isClientInactive,
  calculateInactivityDays,
  generateReactivationWhatsAppUrl,
  REACTIVATION_TEMPLATES
} from "@/lib/retention";

const emptyForm = { name: "", phone: "", birthdate: "", notes: "" };
const emptyPlan = { name: "", total: 4, start: "", due: "" };

export default function Clientes() {
  const [q, setQ] = useState("");
  const { data, loading, reload } = useFetch((api) => api.get("/clients"));
  const [filterInactiveOnly, setFilterInactiveOnly] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("amigavel");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [detail, setDetail] = useState(null);      // full client with history
  const [planOpen, setPlanOpen] = useState(false);
  const [plan, setPlan] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setP = (k) => (e) => setPlan((p) => ({ ...p, [k]: e.target.value }));

  // Clientes inativos (>30 dias)
  const inactiveClients = useMemo(() => {
    return (data || []).filter((c) => isClientInactive(c, 30));
  }, [data]);

  const filtered = useMemo(() => {
    let list = data || [];
    if (filterInactiveOnly) {
      list = list.filter((c) => isClientInactive(c, 30));
    }
    if (!q.trim()) return list;
    const term = q.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(term) || (c.phone || "").includes(term));
  }, [data, q, filterInactiveOnly]);

  const handleSendWhatsApp = (client, templateId = "amigavel") => {
    if (!client.phone) {
      toast.error("Este cliente não tem telefone cadastrado.");
      return;
    }
    const bookingUrl = `${window.location.origin}/agendar`;
    const url = generateReactivationWhatsAppUrl({
      phone: client.phone,
      clientName: client.name,
      shopName: "Barbearia",
      bookingUrl,
      templateId,
    });
    if (url) {
      window.open(url, "_blank");
      toast.success(`Abrindo WhatsApp para ${client.name.split(" ")[0]}...`);
    }
  };

  const openNew = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, phone: c.phone || "", birthdate: c.birthdate || "", notes: c.notes || "" }); setFormOpen(true); };

  const saveClient = async () => {
    if (!form.name.trim()) return toast.error("Informe o nome");
    setSaving(true);
    try {
      const body = { name: form.name.trim(), phone: form.phone.trim() || null, birthdate: form.birthdate || null, notes: form.notes || null };
      if (editing) await api.put(`/clients/${editing.id}`, body);
      else await api.post("/clients", body);
      toast.success(editing ? "Cliente atualizado" : "Cliente cadastrado");
      setFormOpen(false); reload();
    } catch (e) {
      const det = e.response?.data?.detail;
      if (e.response?.status === 409) {
        const existing = det?.client;
        toast.error(det?.message || "Cliente já cadastrado");
        if (existing) { setFormOpen(false); openDetail(existing.id); }
      } else {
        toast.error(det?.message || det || "Erro ao salvar");
      }
    } finally { setSaving(false); }
  };

  const removeClient = async (c) => {
    if (!window.confirm(`Excluir o cliente "${c.name}"? O histórico de atendimentos é mantido.`)) return;
    try { await api.del(`/clients/${c.id}`); toast.success("Cliente removido"); reload(); }
    catch { toast.error("Erro ao remover"); }
  };

  const openDetail = async (cid) => {
    try { const full = await api.get(`/clients/${cid}`); setDetail(full); }
    catch { toast.error("Erro ao carregar cliente"); }
  };

  const openPlan = (c) => {
    setPlan(c.plan
      ? { name: c.plan.name, total: c.plan.total, start: c.plan.start || "", due: c.plan.due || "" }
      : emptyPlan);
    setPlanOpen(true);
  };
  const savePlan = async () => {
    if (!plan.name.trim() || !plan.total) return toast.error("Preencha nome e total de utilizações");
    setSaving(true);
    try {
      const full = await api.put(`/clients/${detail.id}/plan`, {
        name: plan.name.trim(), total: parseInt(plan.total), start: plan.start || null, due: plan.due || null,
      });
      toast.success("Plano salvo");
      setPlanOpen(false); setDetail((d) => ({ ...d, ...full })); reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao salvar plano"); }
    finally { setSaving(false); }
  };
  const removePlan = async () => {
    if (!window.confirm("Remover o plano deste cliente?")) return;
    try { const full = await api.del(`/clients/${detail.id}/plan`); toast.success("Plano removido"); setDetail((d) => ({ ...d, ...full })); reload(); }
    catch { toast.error("Erro"); }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-5" data-testid="clientes-page">
      {/* Banner de Recuperação de Inativos (>30 dias) */}
      <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-none">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-[2px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold text-white">
                Motor de Retenção & Recuperação (WhatsApp)
              </h3>
              <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] border-emerald-500/30 rounded-[2px]">
                {inactiveClients.length} inativos (+30 dias)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reative clientes ausentes há mais de 30 dias com disparo direto de mensagem personalizada e link de agendamento.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filterInactiveOnly ? "default" : "outline"}
            onClick={() => setFilterInactiveOnly(!filterInactiveOnly)}
            className={`h-8 text-xs font-semibold rounded-[4px] gap-1.5 shadow-none cursor-pointer ${
              filterInactiveOnly
                ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                : "border-white/10 text-emerald-400 hover:bg-white/5"
            }`}
            data-testid="filter-inactive-btn"
          >
            <UserX className="h-3.5 w-3.5" />
            <span>{filterInactiveOnly ? "Exibindo Inativos (+30d)" : "Filtrar Inativos (+30d)"}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filterInactiveOnly ? "cliente(s) inativo(s)" : "cliente(s) cadastrado(s)"}
          </p>
        </div>
        <Button className="gap-2 rounded-[4px] shadow-none" onClick={openNew} data-testid="new-client-btn"><Plus className="h-4 w-4" /> Novo cliente</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9 rounded-[4px]" placeholder="Buscar por nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} data-testid="client-search" />
      </div>

      {!filtered.length ? (
        <EmptyState
          title={filterInactiveOnly ? "Nenhum cliente inativo" : "Nenhum cliente"}
          subtitle={filterInactiveOnly ? "Parabéns! Toda a sua base visitou a barbearia nos últimos 30 dias." : "Cadastre o primeiro cliente da barbearia."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const isInactive = isClientInactive(c, 30);
            return (
              <Card key={c.id} className="flex items-center gap-3 p-4 relative overflow-hidden rounded-[4px] border border-white/10 bg-[#12141F] shadow-none" data-testid={`client-card-${c.id}`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary border border-white/10">
                  <User className="h-5 w-5" />
                </div>
                <button className="min-w-0 flex-1 text-left cursor-pointer" onClick={() => openDetail(c.id)} data-testid={`open-client-${c.id}`}>
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold">{c.name}</p>
                    {isInactive && (
                      <span className="shrink-0 inline-flex items-center px-1.5 py-0.2 text-[9px] font-bold rounded-[2px] bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        +30d
                      </span>
                    )}
                  </div>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    {c.phone ? <><Phone className="h-3 w-3" /> {c.phone}</> : "Sem telefone"}
                  </p>
                  {c.has_plan && c.plan && (
                    <Badge variant="secondary" className="mt-1 gap-1 text-[10px] rounded-[2px]">
                      <Ticket className="h-3 w-3" /> {c.plan.remaining}/{c.plan.total} · {c.plan.status}
                    </Badge>
                  )}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {c.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 rounded-[4px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendWhatsApp(c, "amigavel");
                      }}
                      title="Disparar mensagem no WhatsApp"
                      data-testid={`whatsapp-client-${c.id}`}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[4px]" onClick={() => openEdit(c)} data-testid={`edit-client-${c.id}`}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-[4px]" onClick={() => removeClient(c)} data-testid={`delete-client-${c.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent data-testid="client-form-dialog" className="rounded-[4px] border-white/10 bg-[#12141F]">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={setF("name")} data-testid="client-name-input" /></div>
            <div><Label>Telefone</Label><Input value={form.phone} onChange={setF("phone")} placeholder="(11) 90000-0000" data-testid="client-phone-input" /></div>
            <div><Label>Data de nascimento</Label><Input type="date" value={form.birthdate} onChange={setF("birthdate")} data-testid="client-birth-input" /></div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={setF("notes")} rows={2} data-testid="client-notes-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-[4px]" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={saveClient} disabled={saving} className="rounded-[4px] shadow-none" data-testid="save-client-btn">{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-[4px] border-white/10 bg-[#12141F]" data-testid="client-detail-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">{detail?.name}</DialogTitle>
            <DialogDescription>{detail?.phone || "Sem telefone"} · {detail?.visits || 0} visita(s) · {brl(detail?.total_spent || 0)} gastos</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              {/* Card de Disparo WhatsApp e Retenção */}
              {detail.phone && (
                <Card className="p-3.5 bg-[#0A0D14] border border-white/10 rounded-[4px] shadow-none">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4" />
                      Disparo de Recuperação / Reativação
                    </span>
                    {isClientInactive(detail, 30) ? (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] rounded-[2px]">
                        Inativo (+30 dias)
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] rounded-[2px]">
                        Cliente Ativo
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="flex-1 text-xs rounded-[4px] bg-[#12141F] border border-white/10 text-white px-2.5 py-1.5 outline-none"
                      >
                        {REACTIVATION_TEMPLATES.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            Modelo: {tpl.title}
                          </option>
                        ))}
                      </select>

                      <Button
                        size="sm"
                        onClick={() => handleSendWhatsApp(detail, selectedTemplate)}
                        className="h-8 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 gap-1.5 shrink-0 rounded-[4px] shadow-none cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Abrir no WhatsApp</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Plan block */}
              <Card className="p-4 rounded-[4px] border border-white/10 bg-[#0A0D14] shadow-none">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-semibold"><Ticket className="h-4 w-4 text-primary" /> Plano do cliente</p>
                  {detail.plan
                    ? <div className="flex gap-2"><Button size="sm" variant="secondary" className="rounded-[4px]" onClick={() => openPlan(detail)} data-testid="edit-plan-btn">Editar</Button><Button size="sm" variant="ghost" className="text-destructive rounded-[4px]" onClick={removePlan} data-testid="remove-plan-btn">Remover</Button></div>
                    : <Button size="sm" className="rounded-[4px] shadow-none" onClick={() => openPlan(detail)} data-testid="assign-plan-btn"><Plus className="mr-1 h-4 w-4" /> Atribuir</Button>}
                </div>
                {detail.plan ? (
                  <div className="space-y-2" data-testid="plan-info">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{detail.plan.name}</span>
                      <Badge variant={detail.plan.status === "ativo" ? "default" : "secondary"} className="rounded-[2px]">{detail.plan.status}</Badge>
                    </div>
                    <Progress value={(detail.plan.used / detail.plan.total) * 100} className="h-2 rounded-[2px]" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Utilizados: {detail.plan.used}/{detail.plan.total}</span>
                      <span className="font-semibold text-primary">Restantes: {detail.plan.remaining}</span>
                      {detail.plan.due && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> vence {fmtDate(detail.plan.due)}</span>}
                    </div>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Sem plano ativo.</p>}
              </Card>

              {detail.notes && (
                <div><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Observações</p><p className="text-sm">{detail.notes}</p></div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Histórico de atendimentos</p>
                <div className="space-y-2">
                  {(detail.history || []).map((g) => (
                    <div key={g.sale_group_id} className="rounded-[3px] bg-[#0A0D14] border border-white/5 px-3 py-2 text-sm" data-testid="history-item">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{fmtDate(g.date)} · {g.barber_name || "-"}</span>
                        <span className="font-semibold">{brl(g.paid)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{g.items.map((i) => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ""}`).join(", ")}</p>
                      <div className="mt-1 flex gap-2 text-[11px] text-muted-foreground">
                        {g.discount > 0 && <span>desc {brl(g.discount)}</span>}
                        <span>{g.payment_method_name}</span>
                        {g.plan_used && <Badge variant="secondary" className="text-[9px] rounded-[2px]">plano</Badge>}
                        {g.status !== "ativo" && <Badge variant="destructive" className="text-[9px] rounded-[2px]">{g.status}</Badge>}
                      </div>
                    </div>
                  ))}
                  {!detail.history?.length && <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Plan dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent data-testid="plan-dialog" className="rounded-[4px] border-white/10 bg-[#12141F]">
          <DialogHeader><DialogTitle className="font-display">Plano do cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome do plano *</Label><Input value={plan.name} onChange={setP("name")} placeholder="Plano Mensal" data-testid="plan-name-input" /></div>
            <div><Label>Total de utilizações *</Label><Input type="number" min="1" value={plan.total} onChange={setP("total")} data-testid="plan-total-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início</Label><Input type="date" value={plan.start} onChange={setP("start")} data-testid="plan-start-input" /></div>
              <div><Label>Vencimento</Label><Input type="date" value={plan.due} onChange={setP("due")} data-testid="plan-due-input" /></div>
            </div>
            <p className="text-xs text-muted-foreground">Ao editar, o contador de utilizações é reiniciado.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-[4px]" onClick={() => setPlanOpen(false)}>Cancelar</Button>
            <Button onClick={savePlan} disabled={saving} className="rounded-[4px] shadow-none" data-testid="save-plan-btn">{saving ? "Salvando..." : "Salvar plano"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
