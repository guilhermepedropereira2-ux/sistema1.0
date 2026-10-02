import { useState, useMemo } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { Loading, EmptyState } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Crown,
  Plus,
  Pencil,
  Trash2,
  Users,
  CheckCircle2,
  Ticket,
  CalendarDays,
  Scissors,
  Repeat,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const emptyPlanForm = {
  name: "",
  price: "",
  billing_cycle: "mensal",
  is_unlimited: false,
  total_credits: 4,
  notes: "",
  services: [
    { service_name: "Corte de Cabelo", limit: 4 },
  ],
};

export default function PlanosClientes() {
  const navigate = useNavigate();
  const { data: plans, loading: loadingPlans, reload: reloadPlans } = useFetch((api) =>
    api.get("/customer-plans")
  );
  const { data: clients, loading: loadingClients, reload: reloadClients } = useFetch((api) =>
    api.get("/clients")
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(emptyPlanForm);
  const [saving, setSaving] = useState(false);

  // Clientes com plano ativo
  const subscribers = useMemo(() => {
    return (clients || []).filter((c) => c.has_plan && c.plan);
  }, [clients]);

  // Estatísticas de recorrência
  const stats = useMemo(() => {
    const totalSubscribers = subscribers.length;
    const monthlyMRR = subscribers.reduce((acc, c) => acc + (Number(c.plan?.price) || 0), 0);
    const unlimitedCount = subscribers.filter((c) => c.plan?.is_unlimited).length;
    return { totalSubscribers, monthlyMRR, unlimitedCount };
  }, [subscribers]);

  const openNew = () => {
    setEditingPlan(null);
    setForm(emptyPlanForm);
    setModalOpen(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name || "",
      price: plan.price != null ? String(plan.price) : "",
      billing_cycle: plan.billing_cycle || "mensal",
      is_unlimited: Boolean(plan.is_unlimited),
      total_credits: plan.total_credits || 4,
      notes: plan.notes || "",
      services: Array.isArray(plan.services) && plan.services.length
        ? plan.services
        : [{ service_name: "Corte de Cabelo", limit: plan.total_credits || 4 }],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Informe o nome do plano");
    const numPrice = Number(form.price);
    if (isNaN(numPrice) || numPrice < 0) {
      return toast.error("Informe um preço mensal válido");
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: numPrice,
        billing_cycle: "mensal",
        is_unlimited: form.is_unlimited,
        total_credits: form.is_unlimited ? 999 : Number(form.total_credits || 4),
        notes: form.notes.trim(),
        services: form.services,
      };

      if (editingPlan) {
        await api.put(`/customer-plans/${editingPlan.id}`, payload);
        toast.success(`Plano "${form.name}" atualizado com sucesso!`);
      } else {
        await api.post("/customer-plans", payload);
        toast.success(`Plano "${form.name}" criado com sucesso!`);
      }
      setModalOpen(false);
      reloadPlans();
      reloadClients();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar plano");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan) => {
    if (
      !window.confirm(
        `Deseja realmente excluir o plano "${plan.name}"? Os clientes já vinculados manterão seus benefícios até a data de renovação.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/customer-plans/${plan.id}`);
      toast.success("Plano excluído com sucesso");
      reloadPlans();
    } catch {
      toast.error("Erro ao excluir plano");
    }
  };

  const addServiceRule = () => {
    setForm((f) => ({
      ...f,
      services: [...f.services, { service_name: "Barba Completa", limit: 2 }],
    }));
  };

  const removeServiceRule = (index) => {
    setForm((f) => ({
      ...f,
      services: f.services.filter((_, idx) => idx !== index),
    }));
  };

  const updateServiceRule = (index, key, value) => {
    setForm((f) => {
      const copy = [...f.services];
      copy[index] = { ...copy[index], [key]: value };
      return { ...f, services: copy };
    });
  };

  if (loadingPlans || loadingClients) return <Loading />;

  return (
    <div className="space-y-6 max-w-full 2xl:max-w-[1920px] mx-auto" data-testid="planos-clientes-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2">
              <Crown className="h-6 w-6 text-[#D4AF37]" />
              Planos & Assinaturas de Clientes
            </h1>
            <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30 text-xs rounded-[3px]">
              Recorrência
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Crie clubes de assinatura mensal para fidelizar seus clientes com planos ilimitados ou pacotes com limite mensal de cortes e barbas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => navigate("/clientes")}
            className="border-white/10 text-slate-300 hover:text-white rounded-[4px] text-xs h-9"
          >
            <Users className="h-3.5 w-3.5 mr-1.5" /> Ver Clientes
          </Button>
          <Button
            onClick={openNew}
            className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold rounded-[4px] text-xs h-9 shadow-none gap-1.5 cursor-pointer"
            data-testid="btn-novo-plano"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" /> Criar Novo Plano
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="p-4 bg-[#12141F] border border-white/10 rounded-[4px] shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Assinantes Ativos</span>
            <Users className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-white mt-2">
            {stats.totalSubscribers}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.unlimitedCount} no modelo ilimitado
          </p>
        </Card>

        <Card className="p-4 bg-[#12141F] border border-white/10 rounded-[4px] shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Receita Recorrente (MRR)</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
            {brl(stats.monthlyMRR)}/mês
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Previsibilidade de caixa garantida
          </p>
        </Card>

        <Card className="p-4 bg-[#12141F] border border-white/10 rounded-[4px] shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Modelos Cadastrados</span>
            <Repeat className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-white mt-2">
            {plans?.length || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Ciclo mensal com renovação automática
          </p>
        </Card>
      </div>

      {/* Grid of Plans */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Modelos de Planos Disponíveis
        </h2>

        {!plans?.length ? (
          <EmptyState
            title="Nenhum plano cadastrado"
            subtitle="Crie modelos como 'Corte Livre Ilimitado' ou 'VIP Mensal' para oferecer aos seus clientes."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => {
              const isUnlimited = Boolean(p.is_unlimited);
              return (
                <Card
                  key={p.id}
                  className="flex flex-col justify-between p-5 bg-[#12141F] border border-white/10 hover:border-[#D4AF37]/50 rounded-[6px] shadow-none transition-all group"
                  data-testid={`card-customer-plan-${p.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-bold text-base text-white group-hover:text-[#D4AF37] transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Cobrança mensal recorrente
                        </p>
                      </div>
                      {isUnlimited ? (
                        <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/40 text-[10px] font-bold uppercase rounded-[3px] gap-1">
                          <Crown className="h-3 w-3" /> Ilimitado
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px] font-bold uppercase rounded-[3px]">
                          {p.total_credits || 4} no mês
                        </Badge>
                      )}
                    </div>

                    <div className="pt-1">
                      <span className="text-2xl font-extrabold font-mono text-white">
                        {brl(p.price)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium"> / mês</span>
                    </div>

                    {p.notes && (
                      <p className="text-xs text-slate-300 bg-[#0A0D14] p-2.5 rounded-[4px] border border-white/5">
                        {p.notes}
                      </p>
                    )}

                    <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        Regra de Serviços:
                      </p>
                      {isUnlimited ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Cortes & serviços liberados quantas vezes o cliente desejar</span>
                        </div>
                      ) : (
                        <ul className="space-y-1 text-slate-300 text-xs">
                          {p.services && p.services.length ? (
                            p.services.map((s, idx) => (
                              <li key={idx} className="flex items-center gap-1.5">
                                <Scissors className="h-3 w-3 text-[#D4AF37]" />
                                <span>
                                  <strong>{s.limit}x</strong> {s.service_name}
                                </span>
                              </li>
                            ))
                          ) : (
                            <li className="flex items-center gap-1.5">
                              <Scissors className="h-3 w-3 text-[#D4AF37]" />
                              <span>{p.total_credits || 4} utilizações no ciclo mensal</span>
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      <strong>{p.subscribers_count || 0}</strong> cliente(s) ativo(s)
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-white rounded-[3px]"
                        onClick={() => openEdit(p)}
                        title="Editar plano"
                        data-testid={`edit-plan-${p.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/15 rounded-[3px]"
                        onClick={() => handleDelete(p)}
                        title="Excluir plano"
                        data-testid={`delete-plan-${p.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Subscribed Clients List */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Clientes Vinculados a Planos ({subscribers.length})
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate("/clientes")}
            className="text-xs text-[#D4AF37] hover:text-[#C59F2E] gap-1 cursor-pointer"
          >
            <span>Gerenciar na Base de Clientes</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {!subscribers.length ? (
          <p className="text-xs text-slate-400">Nenhum cliente possui assinatura vinculada no momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {subscribers.map((c) => {
              const p = c.plan;
              return (
                <Card
                  key={c.id}
                  className="p-3.5 bg-[#0F121C] border border-white/10 rounded-[4px] flex items-center justify-between gap-3"
                  data-testid={`subscriber-card-${c.id}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-xs sm:text-sm text-white truncate">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-[#D4AF37] font-medium truncate mt-0.5">
                      {p.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      {p.is_unlimited ? (
                        <span className="text-emerald-400 font-semibold">Uso Ilimitado</span>
                      ) : (
                        <span>
                          Consumo: <strong>{p.used}/{p.total}</strong> ({p.remaining} restantes)
                        </span>
                      )}
                      {p.due && (
                        <span>· Renova {fmtDate(p.due)}</span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs border-white/10 hover:border-[#D4AF37]/40 text-slate-200 rounded-[3px] shrink-0"
                    onClick={() => navigate("/clientes")}
                  >
                    Ver
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição de Plano */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-[6px] border-white/10 bg-[#12141F] text-white p-5 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-display flex items-center gap-2">
              <Crown className="h-5 w-5 text-[#D4AF37]" />
              {editingPlan ? "Editar Plano de Assinatura" : "Novo Plano de Assinatura"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Configure o valor mensal e as regras de serviço (limite ou uso ilimitado).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Nome do Plano */}
            <div>
              <Label className="text-xs text-slate-300">Nome do Plano *</Label>
              <Input
                placeholder="Ex.: VIP Mensal, Corte Livre, Clube da Barba"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 bg-[#0A0D14] border-white/10 rounded-[4px] text-xs"
                data-testid="input-plan-name"
              />
            </div>

            {/* Preço Mensal */}
            <div>
              <Label className="text-xs text-slate-300">Preço Mensal (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="99.90"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="mt-1 bg-[#0A0D14] border-white/10 rounded-[4px] text-xs font-mono"
                data-testid="input-plan-price"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Valor cobrado a cada 30 dias para renovação do ciclo.
              </p>
            </div>

            {/* Modalidade: Uso Ilimitado vs Limite de Serviços */}
            <div className="p-3 rounded-[4px] bg-[#0A0D14] border border-white/10 space-y-3">
              <Label className="text-xs font-bold text-white block">
                Regra de Consumo no Mês:
              </Label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_unlimited: false })}
                  className={`p-2.5 rounded-[4px] border text-left cursor-pointer transition-colors ${
                    !form.is_unlimited
                      ? "border-[#D4AF37] bg-[#D4AF37]/10 text-white font-semibold"
                      : "border-white/10 bg-[#12141F] text-slate-400 hover:text-white"
                  }`}
                  data-testid="opt-limited-plan"
                >
                  <p className="text-xs font-bold">Quantidade Limitada</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Ex: 4 cortes e 2 barbas por mês
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_unlimited: true })}
                  className={`p-2.5 rounded-[4px] border text-left cursor-pointer transition-colors ${
                    form.is_unlimited
                      ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] font-semibold"
                      : "border-white/10 bg-[#12141F] text-slate-400 hover:text-white"
                  }`}
                  data-testid="opt-unlimited-plan"
                >
                  <p className="text-xs font-bold flex items-center gap-1">
                    <Crown className="h-3 w-3" /> Uso Ilimitado
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Cliente corta quantas vezes quiser
                  </p>
                </button>
              </div>

              {!form.is_unlimited && (
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-slate-300">Total de Utilizações no Mês *</Label>
                      <p className="text-[10px] text-slate-400">Total de créditos debitados a cada visita</p>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={form.total_credits}
                      onChange={(e) => setForm({ ...form, total_credits: Number(e.target.value) })}
                      className="w-24 bg-[#12141F] border-white/10 rounded-[4px] text-xs font-mono text-center"
                      data-testid="input-plan-credits"
                    />
                  </div>

                  {/* Detalhamento dos Serviços do Pacote */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Detalhamento por Serviço (Opcional):
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addServiceRule}
                        className="h-6 text-[10px] text-[#D4AF37] hover:text-[#C59F2E] px-2"
                      >
                        + Adicionar Serviço
                      </Button>
                    </div>

                    {form.services.map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder="Nome do Serviço (ex: Corte de Cabelo)"
                          value={rule.service_name}
                          onChange={(e) => updateServiceRule(idx, "service_name", e.target.value)}
                          className="flex-1 h-8 bg-[#12141F] border-white/10 rounded-[3px] text-xs"
                        />
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qtd"
                          value={rule.limit}
                          onChange={(e) => updateServiceRule(idx, "limit", Number(e.target.value))}
                          className="w-16 h-8 bg-[#12141F] border-white/10 rounded-[3px] text-xs text-center"
                        />
                        {form.services.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeServiceRule(idx)}
                            className="h-8 w-8 text-destructive rounded-[3px]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Observações / Descrição */}
            <div>
              <Label className="text-xs text-slate-300">Descrição / Benefícios (Opcional)</Label>
              <Textarea
                placeholder="Ex.: Inclui toalha quente, bebidas especiais e atendimento com hora marcada prioritária."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="mt-1 bg-[#0A0D14] border-white/10 rounded-[4px] text-xs"
                data-testid="input-plan-notes"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="rounded-[4px] text-xs"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold rounded-[4px] text-xs shadow-none cursor-pointer"
              data-testid="btn-save-plan"
            >
              {saving ? "Salvando..." : editingPlan ? "Salvar Alterações" : "Criar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
