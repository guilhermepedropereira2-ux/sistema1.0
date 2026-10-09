import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Scissors, FileBarChart, Trophy, KeyRound, Crown, AlertCircle, Lock, Shield, Coins } from "lucide-react";
import { brl, pct, monthRange } from "@/lib/format";
import { useUnit } from "@/context/UnitContext";
import { useBalcao } from "@/context/BalcaoContext";

function BarberDialog({ existing, services, products, onDone, isAtLimit, openUpgradeModal, plan, maxBarbers }) {
  const [open, setOpen] = useState(false);
  const { units = [], activeUnit } = useUnit();
  const defaultUnitId = activeUnit?.id && activeUnit?.id !== "all" ? activeUnit.id : (units[0]?.id || "");
  const blank = {
    name: "", phone: "", email: "", join_date: "", photo_url: "",
    unit_ids: defaultUnitId ? [defaultUnitId] : [],
    commission_type: "percentual", commission_percent: 40, commission_value: 0,
    authorized_services: services.map((s) => s.id), authorized_products: products.map((p) => p.id),
    commission_overrides: {}, active: true, username: "", password: "",
  };
  const [form, setForm] = useState(existing ? {
    ...blank,
    ...existing,
    unit_ids: existing.unit_ids || (existing.unit_id ? [existing.unit_id] : (defaultUnitId ? [defaultUnitId] : [])),
  } : blank);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggle = (key, id) => setForm((f) => {
    const arr = f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id];
    return { ...f, [key]: arr };
  });

  const toggleUnit = (unitId) => setForm((f) => {
    const current = f.unit_ids || [];
    const next = current.includes(unitId)
      ? current.filter((id) => id !== unitId)
      : [...current, unitId];
    return { ...f, unit_ids: next.length ? next : [unitId] };
  });

  const authorizedItems = useMemo(() => [
    ...services.filter((s) => form.authorized_services.includes(s.id)).map((s) => ({ ...s, kind: "Serviço" })),
    ...products.filter((p) => form.authorized_products.includes(p.id)).map((p) => ({ ...p, kind: "Produto" })),
  ], [form.authorized_services, form.authorized_products, services, products]);

  const setOverride = (id, field, value) => setForm((f) => {
    const ov = { ...(f.commission_overrides || {}) };
    if (field === "mode") {
      if (value === "padrao") delete ov[id];
      else ov[id] = { type: value, value: ov[id]?.value ?? 0 };
    } else {
      if (ov[id]) ov[id] = { ...ov[id], value: parseFloat(value) || 0 };
    }
    return { ...f, commission_overrides: ov };
  });

  const submit = async () => {
    if (!form.name?.trim()) return toast.error("Informe o nome do barbeiro");
    const assignedUnits = form.unit_ids && form.unit_ids.length
      ? form.unit_ids
      : (defaultUnitId ? [defaultUnitId] : []);
    const payload = {
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      join_date: form.join_date || null,
      photo_url: form.photo_url || null,
      unit_ids: assignedUnits,
      unit_id: assignedUnits[0] || null,
      commission_type: form.commission_type || "percentual",
      commission_percent: parseFloat(form.commission_percent) || 0,
      commission_value: parseFloat(form.commission_value) || 0,
      commission_overrides: form.commission_overrides || {},
      authorized_services: form.authorized_services,
      authorized_products: form.authorized_products,
      active: form.active,
      username: form.username?.trim() || null,
      password: form.password || null,
    };
    try {
      if (existing) await api.put(`/barbers/${existing.id}`, payload);
      else await api.post("/barbers", payload);
      toast.success("Barbeiro salvo com sucesso!");
      setOpen(false);
      if (onDone) onDone();
    } catch (e) {
      const errDetail = e.response?.data?.detail || "Erro ao salvar barbeiro";
      toast.error(errDetail);
      if (e.response?.status === 403 && openUpgradeModal) {
        openUpgradeModal({
          title: "Limite de Barbeiros Atingido",
          message: errDetail,
          targetPlan: plan?.id === "starter" ? "pro" : "premium",
          feature: "max_barbers",
        });
      }
    }
  };

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) return toast.error("Imagem muito grande (máx. 800KB)");
    const r = new FileReader(); r.onload = () => set("photo_url", r.result); r.readAsDataURL(file);
  };

  const hasLogin = existing?.user_id;

  // Se for novo barbeiro e já atingiu o limite do plano, botão aciona o modal de upgrade
  if (!existing && isAtLimit) {
    return (
      <Button
        onClick={() =>
          openUpgradeModal({
            title: "Limite de Barbeiros Atingido",
            message: `Seu plano atual (${plan?.name}) permite no máximo ${maxBarbers} barbeiro(s). Faça o upgrade para expandir sua equipe!`,
            targetPlan: plan?.id === "starter" ? "pro" : "premium",
            feature: "max_barbers",
          })
        }
        className="gap-2 bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold rounded-[4px] shadow-none cursor-pointer"
        data-testid="add-barber-button"
      >
        <Crown className="h-4 w-4 stroke-[2.5]" />
        <span>+ Novo Barbeiro (Upgrade)</span>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setForm(existing ? { ...blank, ...existing } : blank); }}>
      <DialogTrigger asChild>
        {existing ? <Button variant="ghost" size="icon" className="h-8 w-8 rounded-[4px]" data-testid={`edit-barber-${existing.id}`}><Pencil className="h-4 w-4" /></Button>
          : <Button className="gap-2 rounded-[4px] shadow-none" data-testid="add-barber-button"><Plus className="h-4 w-4" /> Novo Barbeiro</Button>}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-[4px] border-white/10 bg-[#12141F]">
        <DialogHeader><DialogTitle className="font-display">{existing ? "Editar" : "Novo"} Barbeiro</DialogTitle></DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 sm:col-span-2">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#0A0D14]">
              {form.photo_url ? <img src={form.photo_url} alt="" className="h-full w-full object-cover" /> : <Scissors className="h-6 w-6 text-muted-foreground" />}
            </div>
            <label className="cursor-pointer text-xs">
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} data-testid="barber-photo" />
              <span className="rounded-[3px] border border-white/10 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-xs text-muted-foreground hover:text-white transition-colors">Enviar foto</span>
            </label>
          </div>
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="barber-name" /></div>
          <div><Label>Data de entrada</Label><Input type="date" value={form.join_date || ""} onChange={(e) => set("join_date", e.target.value)} data-testid="barber-joindate" /></div>
          <div><Label>Telefone</Label><Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} data-testid="barber-phone" /></div>
          <div><Label>E-mail</Label><Input value={form.email || ""} onChange={(e) => set("email", e.target.value)} data-testid="barber-email" /></div>

          {units && units.length > 0 && (
            <div className="sm:col-span-2 rounded-[4px] border border-white/10 bg-[#0A0D14] p-3.5 space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Onde este barbeiro atende? (Unidades)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {units.map((u) => {
                  const isChecked = (form.unit_ids || []).includes(u.id);
                  return (
                    <label key={u.id} className="flex items-center gap-2 text-xs text-slate-300 p-1.5 rounded hover:bg-white/5 cursor-pointer">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleUnit(u.id)}
                        data-testid={`barber-unit-${u.id}`}
                      />
                      <span className="font-medium text-white">{u.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Commission */}
        <div className="rounded-[4px] border border-white/10 bg-[#0A0D14] p-4">
          <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Comissão padrão</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Tipo</Label>
              <Select value={form.commission_type} onValueChange={(v) => set("commission_type", v)}>
                <SelectTrigger data-testid="barber-commtype"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.commission_type === "percentual" ? (
              <div><Label>Percentual (%)</Label><Input type="number" value={form.commission_percent} onChange={(e) => set("commission_percent", e.target.value)} data-testid="barber-commission" /></div>
            ) : (
              <div><Label>Valor fixo (R$)</Label><Input type="number" value={form.commission_value} onChange={(e) => set("commission_value", e.target.value)} data-testid="barber-commvalue" /></div>
            )}
          </div>
        </div>

        {/* Authorized services / products */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[4px] border border-white/10 bg-[#0A0D14] p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Serviços autorizados</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.authorized_services.includes(s.id)} onCheckedChange={() => toggle("authorized_services", s.id)} data-testid={`auth-service-${s.id}`} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-[4px] border border-white/10 bg-[#0A0D14] p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Produtos autorizados</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.authorized_products.includes(p.id)} onCheckedChange={() => toggle("authorized_products", p.id)} data-testid={`auth-product-${p.id}`} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Per-item commission overrides */}
        {authorizedItems.length > 0 && (
          <div className="rounded-[4px] border border-white/10 bg-[#0A0D14] p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Comissões específicas (opcional)</p>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {authorizedItems.map((it) => {
                const ov = form.commission_overrides?.[it.id];
                const mode = ov?.type || "padrao";
                return (
                  <div key={it.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                    <span className="text-sm">{it.name} <span className="text-xs text-muted-foreground">· {it.kind}</span></span>
                    <Select value={mode} onValueChange={(v) => setOverride(it.id, "mode", v)}>
                      <SelectTrigger className="h-8 w-28" data-testid={`override-mode-${it.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="padrao">Padrão</SelectItem>
                        <SelectItem value="percentual">%</SelectItem>
                        <SelectItem value="fixo">Fixo</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" className="h-8 w-20" disabled={mode === "padrao"} value={ov?.value ?? ""} onChange={(e) => setOverride(it.id, "value", e.target.value)} data-testid={`override-value-${it.id}`} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Login access */}
        <div className="rounded-[4px] border border-white/10 bg-[#0A0D14] p-4">
          <div className="mb-2 flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase text-muted-foreground">Acesso individual</p></div>
          {hasLogin ? (
            <p className="text-sm text-muted-foreground">Este barbeiro já possui um login criado.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Usuário</Label><Input value={form.username} onChange={(e) => set("username", e.target.value)} data-testid="barber-username" placeholder="opcional" /></div>
              <div><Label>Senha</Label><Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} data-testid="barber-password" placeholder="opcional" /></div>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} data-testid="barber-active" /> Barbeiro ativo
        </label>

        <DialogFooter><Button onClick={submit} className="rounded-[4px] shadow-none" data-testid="barber-submit">Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Ranking({ isBalcaoMode }) {
  const { month } = useMonth();
  const { start, end } = monthRange(month);
  const { data, loading } = useApi((api) => api.get("/barbers/ranking", { start, end }), [start, end]);
  if (loading) return <Loading />;
  if (!data?.length) return <EmptyState title="Sem dados de ranking" />;
  return (
    <Card className="overflow-hidden rounded-[4px] border border-white/10 bg-[#12141F] shadow-none" data-testid="ranking-table">
      <div className="overflow-x-auto">
        <Table className="min-w-[650px]">
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Barbeiro</TableHead>
              <TableHead className="text-right">Atendimentos</TableHead>
              <TableHead className="text-right">Serviços</TableHead>
              <TableHead className="text-right">Produtos</TableHead>
              {!isBalcaoMode && <TableHead className="text-right">Comissão</TableHead>}
              <TableHead className="text-right">Total gerado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((b, i) => (
              <TableRow key={b.barber_id} data-testid={`ranking-row-${b.barber_id}`}>
                <TableCell>{i === 0 ? <Trophy className="h-4 w-4 text-primary" /> : i + 1}</TableCell>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell className="text-right tabular-nums">{b.atendimentos}</TableCell>
                <TableCell className="text-right tabular-nums">{brl(b.servicos)}</TableCell>
                <TableCell className="text-right tabular-nums">{brl(b.produtos)}</TableCell>
                {!isBalcaoMode && (
                  <TableCell className="text-right tabular-nums text-muted-foreground">{brl(b.comissao)}</TableCell>
                )}
                <TableCell className="text-right tabular-nums font-semibold text-primary">{brl(b.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export default function Equipe() {
  const { refresh } = useMonth();
  const { isBalcaoMode } = useBalcao();
  const navigate = useNavigate();
  const { plan, openUpgradeModal, activeUnit } = useUnit();
  const { data: barbers, loading, mutate: refreshBarbers } = useApi((api) => api.get("/barbers"), [activeUnit?.id]);
  const { data: services } = useApi((api) => api.get("/services"));
  const { data: products } = useApi((api) => api.get("/products"));

  const handleRefresh = async () => {
    refresh();
    if (refreshBarbers) refreshBarbers();
  };

  const act = async (fn, msg) => {
    try {
      await fn();
      toast.success(msg);
      handleRefresh();
    } catch {
      toast.error("Erro ao realizar ação");
    }
  };
  if (loading || !services || !products) return <Loading />;

  const activeBarbers = (barbers || []).filter((b) => b.active !== false);
  const maxBarbers = plan?.max_barbers || 4;
  const isAtLimit = activeBarbers.length >= maxBarbers;
  const usagePct = Math.min(100, Math.round((activeBarbers.length / maxBarbers) * 100));

  return (
    <div className="space-y-5 max-w-full 2xl:max-w-[1920px] mx-auto" data-testid="equipe-page">
      {/* Banner de Capacidade & Plano da Equipe */}
      <Card className="p-4 bg-[#12141F] border border-white/10 rounded-[4px] shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-[2px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <Crown className="h-4 w-4" />
              </div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#D4AF37]">
                {plan?.name}
              </span>
              <Badge
                className={`text-[10px] font-bold rounded-[2px] ${
                  isAtLimit
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {isAtLimit ? "Capacidade Máxima Atingida" : `${maxBarbers - activeBarbers.length} vagas disponíveis`}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Você tem <b>{activeBarbers.length}</b> de <b>{maxBarbers}</b> barbeiro(s) ativos cadastrados para sua barbearia.
            </p>
            {/* Barra de Progresso */}
            <div className="w-full max-w-md h-2 bg-white/10 rounded-[2px] overflow-hidden mt-2">
              <div
                className={`h-full rounded-[2px] transition-all ${
                  isAtLimit
                    ? "bg-amber-500"
                    : "bg-[#D4AF37]"
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {plan?.id !== "premium" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  openUpgradeModal({
                    title: "Aumentar Limite de Barbeiros",
                    message: "Escale sua equipe de barbeiros sem travas desbloqueando mais vagas agora mesmo.",
                    targetPlan: plan?.id === "starter" ? "pro" : "premium",
                    feature: "max_barbers",
                  })
                }
                className="bg-[#0A0D14] border-white/10 text-[#D4AF37] hover:bg-white/5 hover:border-[#D4AF37]/60 text-xs font-bold rounded-[4px] gap-1.5 shadow-none cursor-pointer"
              >
                <Crown className="h-3.5 w-3.5" />
                <span>Liberar Mais Vagas</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="barbeiros">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="barbeiros" data-testid="tab-barbeiros">Barbeiros</TabsTrigger>
            <TabsTrigger value="ranking" data-testid="tab-ranking">Ranking</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/comissoes")}
              className="gap-2 rounded-[4px] border-[#D4AF37]/30 bg-[#12141F] text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs font-semibold shadow-none cursor-pointer"
              data-testid="go-to-comissoes-btn"
            >
              <Coins className="h-4 w-4" />
              <span>Gestão de Comissões</span>
            </Button>
            <BarberDialog
              services={services}
              products={products}
              onDone={handleRefresh}
              isAtLimit={isAtLimit}
              openUpgradeModal={openUpgradeModal}
              plan={plan}
              maxBarbers={maxBarbers}
            />
          </div>
        </div>

        <TabsContent value="barbeiros" className="mt-5">
          {!barbers?.length ? <EmptyState title="Nenhum barbeiro cadastrado" /> : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {barbers.map((b) => (
                <Card key={b.id} className="p-5 rounded-[4px] border border-white/10 bg-[#12141F] shadow-none" data-testid={`barber-card-${b.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary border border-white/10">
                        {b?.photo_url ? <img src={b.photo_url} alt="" className="h-full w-full object-cover" /> : <Scissors className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-display font-bold">{b.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isBalcaoMode
                            ? "Profissional Parceiro"
                            : b.commission_type === "fixo"
                            ? `Fixo ${brl(b.commission_value)}`
                            : `Comissão ${pct(b.commission_percent)}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={b.active ? "default" : "secondary"} className={`rounded-[2px] ${b.active ? "bg-success text-success-foreground" : ""}`}>{b.active ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  {b.user_id && <div className="mt-2"><Badge variant="secondary" className="gap-1 rounded-[2px]"><KeyRound className="h-3 w-3" /> Login criado</Badge></div>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" className="gap-1.5 rounded-[4px]" onClick={() => navigate(`/equipe/${b.id}`)} data-testid={`report-barber-${b.id}`}>
                      <FileBarChart className="h-3.5 w-3.5" /> Relatório
                    </Button>
                    <BarberDialog existing={b} services={services} products={products} onDone={handleRefresh} />
                    <Button size="sm" variant="ghost" className="rounded-[4px]" onClick={() => act(() => api.put(`/barbers/${b.id}`, { ...b, active: !b.active }), b.active ? "Desativado" : "Ativado")} data-testid={`toggle-barber-${b.id}`}>
                      {b.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive rounded-[4px]" onClick={() => act(() => api.del(`/barbers/${b.id}`), "Removido")} data-testid={`delete-barber-${b.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-5">
          <Ranking isBalcaoMode={isBalcaoMode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
