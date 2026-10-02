import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { brl, fmtDate } from "@/lib/format";
import {
  Search,
  User,
  Plus,
  Pencil,
  Trash2,
  Phone,
  CalendarDays,
  Ticket,
  ChevronRight,
  MessageSquare,
  UserX,
  Clock,
  AlertTriangle,
  Send,
  Crown,
  Repeat,
  RefreshCw,
} from "lucide-react";
import {
  isClientInactive,
  calculateInactivityDays,
  generateReactivationWhatsAppUrl,
  REACTIVATION_TEMPLATES,
} from "@/lib/retention";

const emptyForm = {
  name: "",
  phone: "",
  birthdate: "",
  notes: "",
  plan_id: "",
};

const emptyPlan = {
  plan_id: "",
  name: "",
  price: "",
  is_unlimited: false,
  total: 4,
  used: 0,
  start: "",
  due: "",
};

export default function Clientes() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data, loading, reload } = useFetch((api) => api.get("/clients"));
  const { data: customerPlans } = useFetch((api) => api.get("/customer-plans"));

  const [filterInactiveOnly, setFilterInactiveOnly] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("amigavel");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [detail, setDetail] = useState(null); // full client with history
  const [planOpen, setPlanOpen] = useState(false);
  const [targetClientForPlan, setTargetClientForPlan] = useState(null);
  const [plan, setPlan] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);
  const [renewing, setRenewing] = useState(false);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(term) || (c.phone || "").includes(term)
    );
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

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone || "",
      birthdate: c.birthdate || "",
      notes: c.notes || "",
      plan_id: c.plan?.plan_id || "",
    });
    setFormOpen(true);
  };

  const saveClient = async () => {
    if (!form.name.trim()) return toast.error("Informe o nome do cliente");
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        birthdate: form.birthdate || null,
        notes: form.notes || null,
        plan_id: form.plan_id || undefined,
      };

      if (editing) {
        await api.put(`/clients/${editing.id}`, body);
        toast.success("Cliente atualizado com sucesso!");
      } else {
        await api.post("/clients", body);
        toast.success("Cliente cadastrado com sucesso!");
      }
      setFormOpen(false);
      reload();
    } catch (e) {
      const det = e.response?.data?.detail;
      if (e.response?.status === 409) {
        const existing = det?.client;
        toast.error(det?.message || "Cliente já cadastrado");
        if (existing) {
          setFormOpen(false);
          openDetail(existing.id);
        }
      } else {
        toast.error(det?.message || det || "Erro ao salvar");
      }
    } finally {
      setSaving(false);
    }
  };

  const removeClient = async (c) => {
    if (
      !window.confirm(
        `Excluir o cliente "${c.name}"? O histórico de atendimentos é mantido.`
      )
    )
      return;
    try {
      await api.del(`/clients/${c.id}`);
      toast.success("Cliente removido com sucesso");
      reload();
    } catch {
      toast.error("Erro ao remover cliente");
    }
  };

  const openDetail = async (cid) => {
    try {
      const full = await api.get(`/clients/${cid}`);
      setDetail(full);
    } catch {
      toast.error("Erro ao carregar detalhes do cliente");
    }
  };

  // Abre o modal de Vincular/Editar Plano
  const openPlanModal = (targetClient) => {
    setTargetClientForPlan(targetClient);
    const existing = targetClient?.plan;

    const today = new Date().toISOString().slice(0, 10);
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const dueDefault = in30Days.toISOString().slice(0, 10);

    if (existing) {
      setPlan({
        plan_id: existing.plan_id || "",
        name: existing.name || "Assinatura Mensal",
        price: existing.price != null ? String(existing.price) : "",
        is_unlimited: Boolean(existing.is_unlimited),
        total: existing.is_unlimited ? 999 : Number(existing.total || 4),
        used: Number(existing.used || 0),
        start: existing.start || today,
        due: existing.due || dueDefault,
      });
    } else {
      // Se tiver planos cadastrados na barbearia, pré-seleciona o primeiro
      const first = (customerPlans || [])[0];
      if (first) {
        setPlan({
          plan_id: first.id,
          name: first.name,
          price: String(first.price),
          is_unlimited: Boolean(first.is_unlimited),
          total: first.is_unlimited ? 999 : Number(first.total_credits || 4),
          used: 0,
          start: today,
          due: dueDefault,
        });
      } else {
        setPlan({
          ...emptyPlan,
          name: "Plano Mensal",
          price: "99.90",
          start: today,
          due: dueDefault,
        });
      }
    }
    setPlanOpen(true);
  };

  // Seleciona um plano predefinido
  const handleSelectCustomerPlan = (planId) => {
    if (planId === "custom") {
      setPlan((p) => ({ ...p, plan_id: "custom" }));
      return;
    }
    const found = (customerPlans || []).find((cp) => cp.id === planId);
    if (found) {
      const today = new Date().toISOString().slice(0, 10);
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      setPlan({
        plan_id: found.id,
        name: found.name,
        price: String(found.price),
        is_unlimited: Boolean(found.is_unlimited),
        total: found.is_unlimited ? 999 : Number(found.total_credits || 4),
        used: 0,
        start: today,
        due: in30Days.toISOString().slice(0, 10),
      });
    }
  };

  const savePlan = async () => {
    if (!plan.name.trim()) return toast.error("Informe o nome do plano");
    if (!plan.is_unlimited && (!plan.total || Number(plan.total) < 1)) {
      return toast.error("Informe a quantidade total de utilizações no mês");
    }

    setSaving(true);
    try {
      const clientId = targetClientForPlan?.id || detail?.id;
      const payload = {
        plan_id: plan.plan_id !== "custom" ? plan.plan_id : undefined,
        name: plan.name.trim(),
        price: Number(plan.price || 0),
        is_unlimited: plan.is_unlimited,
        total: plan.is_unlimited ? 999 : parseInt(String(plan.total), 10),
        used: Number(plan.used || 0),
        start: plan.start || null,
        due: plan.due || null,
      };

      const updatedClient = await api.put(`/clients/${clientId}/plan`, payload);
      toast.success(`Plano "${plan.name}" vinculado a ${targetClientForPlan?.name || "cliente"}!`);
      setPlanOpen(false);

      if (detail && detail.id === clientId) {
        setDetail((d) => ({ ...d, ...updatedClient }));
      }
      reload();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar plano");
    } finally {
      setSaving(false);
    }
  };

  const renewPlan = async (clientToRenew) => {
    const cid = clientToRenew?.id || detail?.id;
    if (!cid) return;
    setRenewing(true);
    try {
      const updated = await api.post(`/clients/${cid}/plan/renew`, {});
      toast.success(
        `Plano renovado com sucesso! Ciclo estendido por mais 30 dias e utilizações reiniciadas.`
      );
      if (detail && detail.id === cid) {
        setDetail((d) => ({ ...d, ...updated }));
      }
      reload();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao renovar plano");
    } finally {
      setRenewing(false);
    }
  };

  const removePlan = async (clientToRemovePlan) => {
    const cid = clientToRemovePlan?.id || detail?.id;
    if (!cid) return;
    if (!window.confirm("Deseja realmente remover o plano deste cliente?")) return;
    try {
      const updated = await api.del(`/clients/${cid}/plan`);
      toast.success("Plano removido com sucesso");
      if (detail && detail.id === cid) {
        setDetail((d) => ({ ...d, ...updated }));
      }
      reload();
    } catch {
      toast.error("Erro ao remover plano");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-5 max-w-full 2xl:max-w-[1920px] mx-auto" data-testid="clientes-page">
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

      {/* Action Bar & Plan Manager Shortcut */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filterInactiveOnly ? "cliente(s) inativo(s)" : "cliente(s) cadastrado(s)"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => navigate("/planos-clientes")}
            className="border-[#D4AF37]/40 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] font-semibold text-xs h-9 rounded-[4px] gap-1.5 cursor-pointer shadow-none"
            data-testid="btn-gerenciar-planos"
          >
            <Crown className="h-4 w-4" />
            <span>Gerenciar Planos & Assinaturas</span>
          </Button>

          <Button
            className="gap-2 rounded-[4px] shadow-none bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs h-9 cursor-pointer"
            onClick={openNew}
            data-testid="new-client-btn"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" /> Novo cliente
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 rounded-[4px] bg-[#12141F] border-white/10 text-xs text-white"
          placeholder="Buscar por nome ou telefone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="client-search"
        />
      </div>

      {/* Grid of Client Cards */}
      {!filtered.length ? (
        <EmptyState
          title={filterInactiveOnly ? "Nenhum cliente inativo" : "Nenhum cliente cadastrado"}
          subtitle={
            filterInactiveOnly
              ? "Parabéns! Toda a sua base visitou a barbearia nos últimos 30 dias."
              : "Cadastre o primeiro cliente da barbearia."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((c) => {
            const isInactive = isClientInactive(c, 30);
            const hasPlan = Boolean(c.has_plan && c.plan);
            const isUnlimited = Boolean(c.plan?.is_unlimited);

            return (
              <Card
                key={c.id}
                className="flex flex-col justify-between p-4 relative overflow-hidden rounded-[6px] border border-white/10 bg-[#12141F] hover:border-[#D4AF37]/40 shadow-none transition-all"
                data-testid={`client-card-${c.id}`}
              >
                {/* Top Section */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary border border-white/10 mt-0.5">
                    <User className="h-5 w-5" />
                  </div>

                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
                    onClick={() => openDetail(c.id)}
                    data-testid={`open-client-${c.id}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-semibold text-sm text-white">{c.name}</p>
                      {isInactive && (
                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.2 text-[9px] font-bold rounded-[2px] bg-amber-500/15 text-amber-400 border border-amber-500/20">
                          +30d
                        </span>
                      )}
                    </div>

                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground mt-0.5">
                      {c.phone ? (
                        <>
                          <Phone className="h-3 w-3 text-slate-500" /> {c.phone}
                        </>
                      ) : (
                        "Sem telefone"
                      )}
                    </p>
                  </button>

                  {/* Actions Header */}
                  <div className="flex items-center gap-1 shrink-0">
                    {c.phone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 rounded-[4px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendWhatsApp(c, "amigavel");
                        }}
                        title="Disparar mensagem no WhatsApp"
                        data-testid={`whatsapp-client-${c.id}`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-white rounded-[4px]"
                      onClick={() => openEdit(c)}
                      data-testid={`edit-client-${c.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/15 rounded-[4px]"
                      onClick={() => removeClient(c)}
                      data-testid={`delete-client-${c.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Plan Status / Quick Action Section */}
                <div className="mt-3 pt-3 border-t border-white/5">
                  {hasPlan ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white truncate flex items-center gap-1">
                          <Ticket className="h-3.5 w-3.5 text-[#D4AF37]" />
                          {c.plan.name}
                        </span>

                        {isUnlimited ? (
                          <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/40 text-[10px] font-bold rounded-[3px] gap-1">
                            <Crown className="h-2.5 w-2.5" /> Ilimitado
                          </Badge>
                        ) : (
                          <span className="text-[11px] font-mono text-[#D4AF37] font-bold">
                            {c.plan.used}/{c.plan.total} utilizados
                          </span>
                        )}
                      </div>

                      {!isUnlimited && (
                        <Progress
                          value={Math.min(100, (c.plan.used / c.plan.total) * 100)}
                          className="h-1.5 bg-[#0A0D14]"
                        />
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>
                          {isUnlimited
                            ? "Assinatura Ativa"
                            : `${c.plan.remaining} crédito(s) restante(s)`}
                        </span>
                        {c.plan.due && (
                          <span>Renova em: {fmtDate(c.plan.due)}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openPlanModal(c)}
                          className="h-6 text-[10px] text-slate-300 hover:text-white px-2 rounded-[2px]"
                          data-testid={`btn-edit-plan-${c.id}`}
                        >
                          Editar Plano
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => renewPlan(c)}
                          className="h-6 text-[10px] text-emerald-400 hover:bg-emerald-500/10 px-2 rounded-[2px] gap-1"
                          data-testid={`btn-renew-plan-${c.id}`}
                        >
                          <RefreshCw className="h-2.5 w-2.5" /> Renovar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">Sem plano vinculado</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPlanModal(c)}
                        className="h-7 text-xs border-dashed border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-[3px] gap-1 cursor-pointer font-medium"
                        data-testid={`btn-vincular-plano-${c.id}`}
                      >
                        <Plus className="h-3 w-3 stroke-[2.5]" /> Vincular Plano
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro / Edição de Cliente */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          data-testid="client-form-dialog"
          className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto rounded-[6px] border-white/10 bg-[#12141F] text-white p-5 sm:p-6"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-display">
              {editing ? "Editar cliente" : "Novo cliente"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Preencha os dados cadastrais básicos e vincule um plano opcional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1 text-xs">
            <div>
              <Label className="text-xs text-slate-300">Nome Completo *</Label>
              <Input
                value={form.name}
                onChange={setF("name")}
                placeholder="Ex.: Gabriel Souza"
                className="mt-1 bg-[#0A0D14] border-white/10 rounded-[4px] text-xs text-white"
                data-testid="client-name-input"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-300">Telefone / WhatsApp (Opcional)</Label>
              <Input
                value={form.phone}
                onChange={setF("phone")}
                placeholder="(11) 90000-0000"
                className="mt-1 bg-[#0A0D14] border-white/10 rounded-[4px] text-xs text-white"
                data-testid="client-phone-input"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-300">
                Data de nascimento <span className="text-slate-500 font-normal">(Opcional)</span>
              </Label>
              <Input
                type="date"
                value={form.birthdate}
                onChange={setF("birthdate")}
                className="mt-1 bg-[#0A0D14] border-white/10 rounded-[4px] text-xs text-white"
                data-testid="client-birth-input"
              />
            </div>

            {!editing && (
              <div className="p-3 bg-[#0A0D14] border border-white/10 rounded-[4px] space-y-1.5">
                <Label className="text-xs font-semibold text-[#D4AF37] flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5" />
                  Vínculo de Plano Inicial (Opcional)
                </Label>
                <select
                  value={form.plan_id}
                  onChange={setF("plan_id")}
                  className="w-full bg-[#12141F] border border-white/10 text-xs rounded-[4px] p-2 text-white outline-none"
                  data-testid="select-initial-plan"
                >
                  <option value="">Sem plano (atendimento avulso)</option>
                  {(customerPlans || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {brl(p.price)}/mês {p.is_unlimited ? "(Ilimitado)" : `(${p.total_credits} usos)`}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  Ao vincular um plano no cadastro, o ciclo de 30 dias é iniciado imediatamente.
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs text-slate-300">Observações (Opcional)</Label>
              <Textarea
                value={form.notes}
                onChange={setF("notes")}
                placeholder="Preferências, corte favorito, alergias..."
                rows={2}
                className="mt-1 bg-[#0A0D14] border-white/10 rounded-[4px] text-xs text-white"
                data-testid="client-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-[4px] text-xs"
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveClient}
              disabled={saving}
              className="rounded-[4px] shadow-none bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs cursor-pointer"
              data-testid="save-client-btn"
            >
              {saving ? "Salvando..." : "Salvar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent
          className="w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-[6px] border-white/10 bg-[#12141F] text-white p-5 sm:p-6"
          data-testid="client-detail-dialog"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-display text-lg text-white">
              {detail?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {detail?.phone || "Sem telefone"} · {detail?.visits || 0} visita(s) · {brl(detail?.total_spent || 0)} gastos
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4 pt-1">
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

              {/* Status do Plano Vinculado (Painel do Cliente) */}
              <Card className="p-4 rounded-[4px] border border-white/10 bg-[#0A0D14] shadow-none space-y-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Crown className="h-4 w-4 text-[#D4AF37]" />
                    Status do Plano & Assinatura
                  </p>
                  {detail.has_plan && detail.plan ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs rounded-[3px]"
                        onClick={() => openPlanModal(detail)}
                        data-testid="edit-plan-btn"
                      >
                        Editar Plano
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={renewing}
                        className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-[3px] gap-1"
                        onClick={() => renewPlan(detail)}
                        data-testid="renew-plan-btn"
                      >
                        <RefreshCw className={`h-3 w-3 ${renewing ? "animate-spin" : ""}`} />
                        Renovar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10 rounded-[3px]"
                        onClick={() => removePlan(detail)}
                        data-testid="remove-plan-btn"
                      >
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="h-7 text-xs rounded-[3px] shadow-none bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold"
                      onClick={() => openPlanModal(detail)}
                      data-testid="assign-plan-btn"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5 stroke-[2.5]" /> Vincular Plano
                    </Button>
                  )}
                </div>

                {detail.has_plan && detail.plan ? (
                  <div className="space-y-3 bg-[#12141F] p-3.5 rounded-[4px] border border-white/5" data-testid="plan-info">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-white block">
                          {detail.plan.name}
                        </span>
                        {detail.plan.price != null && (
                          <span className="text-[11px] text-[#D4AF37] font-semibold">
                            {brl(detail.plan.price)} / mês
                          </span>
                        )}
                      </div>

                      {detail.plan.is_unlimited ? (
                        <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/40 text-xs font-bold gap-1 rounded-[3px]">
                          <Crown className="h-3 w-3" /> Assinatura Ativa (Ilimitado)
                        </Badge>
                      ) : (
                        <Badge
                          variant={detail.plan.status === "ativo" ? "default" : "secondary"}
                          className="text-xs rounded-[3px]"
                        >
                          {detail.plan.status === "ativo" ? "Ativo" : detail.plan.status}
                        </Badge>
                      )}
                    </div>

                    {/* Barra de progresso de consumo quando for plano com limite */}
                    {!detail.plan.is_unlimited && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">
                            Barra de Consumo Mensal:
                          </span>
                          <span className="font-bold text-white font-mono">
                            {detail.plan.used} / {detail.plan.total} utilizados
                          </span>
                        </div>
                        <Progress
                          value={Math.min(100, (detail.plan.used / detail.plan.total) * 100)}
                          className="h-2 rounded-[2px]"
                        />
                        <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                          <span>{detail.plan.remaining} crédito(s) restante(s)</span>
                          {detail.plan.due && (
                            <span className="flex items-center gap-1 text-slate-300">
                              <CalendarDays className="h-3 w-3 text-[#D4AF37]" />
                              Renovação: {fmtDate(detail.plan.due)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Indicador para modelo Ilimitado */}
                    {detail.plan.is_unlimited && (
                      <div className="p-2.5 rounded-[4px] bg-[#0A0D14] border border-white/5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Uso Ilimitado Ativo</span>
                        </div>
                        {detail.plan.due && (
                          <span className="text-[11px] text-slate-300">
                            Próxima renovação: <strong>{fmtDate(detail.plan.due)}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Este cliente não possui plano ativo no momento. Clique em "+ Vincular Plano" para associá-lo a um clube de assinatura.
                  </p>
                )}
              </Card>

              {detail.notes && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Observações
                  </p>
                  <p className="text-sm bg-[#0A0D14] p-2.5 rounded-[4px] border border-white/5">
                    {detail.notes}
                  </p>
                </div>
              )}

              {/* Histórico */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Histórico de atendimentos
                </p>
                <div className="space-y-2">
                  {(detail.history || []).map((g) => (
                    <div
                      key={g.sale_group_id}
                      className="rounded-[3px] bg-[#0A0D14] border border-white/5 px-3 py-2 text-sm"
                      data-testid="history-item"
                    >
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">
                          {fmtDate(g.date)} · {g.barber_name || "-"}
                        </span>
                        <span className="font-semibold text-xs text-white">
                          {brl(g.paid)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {g.items
                          .map((i) => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ""}`)
                          .join(", ")}
                      </p>
                      <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
                        {g.discount > 0 && <span>desc {brl(g.discount)}</span>}
                        <span>{g.payment_method_name}</span>
                        {g.plan_used && (
                          <Badge variant="secondary" className="text-[9px] rounded-[2px]">
                            plano
                          </Badge>
                        )}
                        {g.status !== "ativo" && (
                          <Badge variant="destructive" className="text-[9px] rounded-[2px]">
                            {g.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {!detail.history?.length && (
                    <p className="text-xs text-muted-foreground">Sem histórico de visitas ainda.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Vincular / Editar Plano */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent
          data-testid="plan-dialog"
          className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto rounded-[6px] border-white/10 bg-[#12141F] text-white p-5 sm:p-6"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-display flex items-center gap-2">
              <Crown className="h-5 w-5 text-[#D4AF37]" />
              Vincular Plano de Assinatura
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Cliente: <strong>{targetClientForPlan?.name || detail?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1 text-xs">
            {/* Escolha de Modelo Pré-cadastrado */}
            {customerPlans && customerPlans.length > 0 && (
              <div>
                <Label className="text-xs text-slate-300">
                  Modelo de Plano Cadastrado:
                </Label>
                <select
                  value={plan.plan_id || "custom"}
                  onChange={(e) => handleSelectCustomerPlan(e.target.value)}
                  className="mt-1 w-full bg-[#0A0D14] border border-white/10 rounded-[4px] p-2 text-xs text-white outline-none"
                  data-testid="select-customer-plan"
                >
                  <option value="custom">Personalizar Manualmente...</option>
                  {customerPlans.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name} — {brl(cp.price)}/mês {cp.is_unlimited ? "(Ilimitado)" : `(${cp.total_credits} usos)`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="text-xs text-slate-300">Nome do Plano *</Label>
              <Input
                value={plan.name}
                onChange={(e) => setPlan({ ...plan, name: e.target.value })}
                placeholder="Ex.: VIP Mensal, Corte Livre"
                className="mt-1 bg-[#0A0D14] border-white/10 rounded-[4px] text-xs text-white"
                data-testid="plan-name-input"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-300">Preço da Mensalidade (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={plan.price}
                onChange={(e) => setPlan({ ...plan, price: e.target.value })}
                placeholder="99.90"
                className="mt-1 bg-[#0A0D14] border-white/10 rounded-[4px] text-xs font-mono text-white"
                data-testid="plan-price-input"
              />
            </div>

            {/* Modalidade */}
            <div className="p-3 rounded-[4px] bg-[#0A0D14] border border-white/10 space-y-2.5">
              <Label className="text-xs font-semibold text-white block">Regra de Consumo:</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlan({ ...plan, is_unlimited: false, total: 4 })}
                  className={`p-2 rounded-[4px] border text-left cursor-pointer transition-colors ${
                    !plan.is_unlimited
                      ? "border-[#D4AF37] bg-[#D4AF37]/10 text-white font-semibold"
                      : "border-white/10 bg-[#12141F] text-slate-400 hover:text-white"
                  }`}
                >
                  <p className="text-xs font-bold">Com Limite</p>
                  <p className="text-[10px] text-slate-400">Ex: 4 utilizações</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPlan({ ...plan, is_unlimited: true, total: 999 })}
                  className={`p-2 rounded-[4px] border text-left cursor-pointer transition-colors ${
                    plan.is_unlimited
                      ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] font-semibold"
                      : "border-white/10 bg-[#12141F] text-slate-400 hover:text-white"
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1">
                    <Crown className="h-3 w-3" /> Ilimitado
                  </p>
                  <p className="text-[10px] text-slate-400">Cortes à vontade</p>
                </button>
              </div>

              {!plan.is_unlimited && (
                <div className="flex items-center justify-between pt-1">
                  <Label className="text-xs text-slate-300">Total de Utilizações no Mês *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={plan.total}
                    onChange={(e) => setPlan({ ...plan, total: Number(e.target.value) })}
                    className="w-20 bg-[#12141F] border-white/10 rounded-[4px] text-xs text-center font-mono"
                    data-testid="plan-total-input"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Data de Início</Label>
                <Input
                  type="date"
                  value={plan.start}
                  onChange={(e) => setPlan({ ...plan, start: e.target.value })}
                  className="mt-1 bg-[#0A0D14] border-white/10 rounded-[4px] text-xs text-white"
                  data-testid="plan-start-input"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Vencimento / Renovação</Label>
                <Input
                  type="date"
                  value={plan.due}
                  onChange={(e) => setPlan({ ...plan, due: e.target.value })}
                  className="mt-1 bg-[#0A0D14] border-white/10 rounded-[4px] text-xs text-white"
                  data-testid="plan-due-input"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-[4px] text-xs"
              onClick={() => setPlanOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={savePlan}
              disabled={saving}
              className="rounded-[4px] shadow-none bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs cursor-pointer"
              data-testid="save-plan-btn"
            >
              {saving ? "Salvando..." : "Salvar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
