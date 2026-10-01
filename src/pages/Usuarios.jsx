import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { useAuth } from "@/context/AuthContext";
import { isDono as checkIsDono, rolesOf, rolesLabel } from "@/lib/roles";
import { Loading, EmptyState } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ShieldCheck, UserCircle2, Lock, Pencil, KeyRound } from "lucide-react";

function ResetPasswordButton({ user }) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState("");
  const run = async () => {
    try {
      const res = await api.post(`/users/${user.id}/reset-password`, {});
      setTemp(res.temporary_password); setOpen(true);
    } catch { toast.error("Erro ao redefinir"); }
  };
  return (
    <>
      <Button size="sm" variant="ghost" className="gap-1.5" onClick={run} data-testid={`reset-user-${user.id}`}><KeyRound className="h-3.5 w-3.5" /> Redefinir senha</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] sm:max-w-sm max-h-[85vh] overflow-y-auto" data-testid="reset-result">
          <DialogHeader><DialogTitle className="font-display">Senha temporária</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Informe esta senha ao usuário <b>@{user.username}</b>. Guarde com segurança — ela não é exibida novamente.</p>
          <div className="rounded-md bg-secondary p-4 text-center font-mono text-2xl font-bold tracking-widest" data-testid="temp-password">{temp}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const primaryOf = (roles) => roles.includes("dono") ? "dono" : roles.includes("gerente") ? "gerente" : "barbeiro";

function UserDialog({ existing, barbers, onDone }) {
  const [open, setOpen] = useState(false);
  const build = () => {
    const roles = existing ? rolesOf(existing) : ["gerente"];
    return {
      name: existing?.name || "", username: existing?.username || "", password: "",
      email: existing?.email || "", roles, active: existing?.active ?? true,
      barber_id: existing?.barber_id || "",
      barberMode: "link", // link | create
      commission_type: "percentual", commission_percent: 40, commission_value: 0,
    };
  };
  const [form, setForm] = useState(build);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isExistingDono = existing && rolesOf(existing).includes("dono");
  const hasBarbeiro = form.roles.includes("barbeiro");
  const alreadyLinked = existing?.barber_id;

  const toggleRole = (r, on) => setForm((f) => {
    let roles = on ? [...new Set([...f.roles, r])] : f.roles.filter((x) => x !== r);
    if (!roles.length) roles = [r];
    return { ...f, roles };
  });

  const submit = async () => {
    if (!form.name || !form.username) return toast.error("Preencha nome e usuário");
    if (!existing && !form.password) return toast.error("Defina uma senha");
    if (hasBarbeiro && !alreadyLinked && form.barberMode === "link" && !form.barber_id)
      return toast.error("Selecione o barbeiro a vincular ou crie um novo perfil");
    const role = primaryOf(form.roles);
    try {
      if (existing) {
        const payload = { name: form.name, username: form.username, email: form.email || null, role, roles: form.roles, active: form.active };
        if (form.password) payload.password = form.password;
        if (hasBarbeiro && !alreadyLinked && form.barberMode === "link") payload.barber_id = form.barber_id;
        await api.put(`/users/${existing.id}`, payload);
      } else {
        const payload = {
          name: form.name, username: form.username, password: form.password, email: form.email || null,
          role, roles: form.roles, active: true,
        };
        if (hasBarbeiro) {
          if (form.barberMode === "create") {
            payload.create_barber = true;
            payload.commission_type = form.commission_type;
            payload.commission_percent = parseFloat(form.commission_percent) || 0;
            payload.commission_value = parseFloat(form.commission_value) || 0;
          } else {
            payload.barber_id = form.barber_id;
          }
        }
        await api.post("/users", payload);
      }
      toast.success("Salvo"); setOpen(false); onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao salvar"); }
  };

  const unlinkedBarbers = barbers.filter((b) => !b.user_id || b.user_id === existing?.id);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setForm(build()); }}>
      <DialogTrigger asChild>
        {existing ? <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`edit-user-${existing.id}`}><Pencil className="h-4 w-4" /></Button>
          : <Button className="gap-2" data-testid="add-user-button"><Plus className="h-4 w-4" /> Novo Usuário</Button>}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{existing ? "Editar" : "Novo"} Usuário</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="user-name" /></div>
          <div><Label>Usuário</Label><Input value={form.username} onChange={(e) => set("username", e.target.value)} data-testid="user-username" /></div>
          <div><Label>Senha {existing && <span className="text-xs text-muted-foreground">(vazio p/ manter)</span>}</Label><Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} data-testid="user-password" /></div>
          <div className="sm:col-span-2"><Label>E-mail</Label><Input value={form.email || ""} onChange={(e) => set("email", e.target.value)} data-testid="user-email" /></div>
          <div className="sm:col-span-2">
            <Label>Funções (acumuláveis)</Label>
            <div className="mt-1 flex flex-wrap gap-3 rounded-md border border-border p-3">
              {isExistingDono && <label className="flex items-center gap-2 text-sm"><Checkbox checked disabled data-testid="role-dono" /> Dono</label>}
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.roles.includes("gerente")} onCheckedChange={(v) => toggleRole("gerente", v)} data-testid="role-gerente" /> Gerente</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={hasBarbeiro} onCheckedChange={(v) => toggleRole("barbeiro", v)} data-testid="role-barbeiro" /> Barbeiro</label>
            </div>
          </div>
          {hasBarbeiro && (
            <div className="sm:col-span-2 space-y-3 rounded-md bg-secondary p-3">
              {alreadyLinked ? (
                <p className="text-sm text-muted-foreground">Perfil de barbeiro já vinculado a este usuário.</p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant={form.barberMode === "create" ? "default" : "outline"} onClick={() => set("barberMode", "create")} data-testid="barber-mode-create">Criar novo perfil</Button>
                    <Button type="button" size="sm" variant={form.barberMode === "link" ? "default" : "outline"} onClick={() => set("barberMode", "link")} data-testid="barber-mode-link">Vincular existente</Button>
                  </div>
                  {form.barberMode === "link" ? (
                    <Select value={form.barber_id || ""} onValueChange={(v) => set("barber_id", v)}>
                      <SelectTrigger data-testid="user-barber"><SelectValue placeholder="Selecione o barbeiro" /></SelectTrigger>
                      <SelectContent>{unlinkedBarbers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : existing ? (
                    <p className="text-xs text-muted-foreground">Um novo perfil de barbeiro será criado e vinculado a este usuário (comissão padrão de 40%, ajustável em Equipe).</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Comissão</Label>
                        <Select value={form.commission_type} onValueChange={(v) => set("commission_type", v)}>
                          <SelectTrigger data-testid="commission-type"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="percentual">Percentual</SelectItem><SelectItem value="fixo">Valor fixo</SelectItem></SelectContent>
                        </Select>
                      </div>
                      {form.commission_type === "percentual"
                        ? <div><Label>%</Label><Input type="number" value={form.commission_percent} onChange={(e) => set("commission_percent", e.target.value)} data-testid="commission-percent" /></div>
                        : <div><Label>R$</Label><Input type="number" value={form.commission_value} onChange={(e) => set("commission_value", e.target.value)} data-testid="commission-value" /></div>}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <DialogFooter><Button onClick={submit} data-testid="user-submit">Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissionsDialog({ user, catalog, onDone }) {
  const [open, setOpen] = useState(false);
  const [perms, setPerms] = useState(user.permissions || {});
  const groups = useMemo(() => {
    const list = Array.isArray(catalog) ? catalog : (catalog?.catalog || []);
    const g = {};
    list.forEach((p) => { (g[p.group] = g[p.group] || []).push(p); });
    return g;
  }, [catalog]);

  const save = async () => {
    try { await api.put(`/users/${user.id}/permissions`, perms); toast.success("Permissões salvas"); setOpen(false); onDone(); }
    catch { toast.error("Erro"); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setPerms(user.permissions || {}); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-1.5" data-testid={`perms-user-${user.id}`}><ShieldCheck className="h-3.5 w-3.5" /> Permissões</Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Permissões · {user.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{group}</p>
              <div className="space-y-2">
                {items.map((p) => (
                  <label key={p.key} className="flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">{p.sensitive && <Lock className="h-3.5 w-3.5 text-destructive" />}{p.label}</span>
                    <Switch checked={!!perms[p.key]} onCheckedChange={(v) => setPerms((s) => ({ ...s, [p.key]: v }))} data-testid={`perm-${p.key}`} />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter><Button onClick={save} data-testid="perms-save">Salvar permissões</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Usuarios() {
  const { user, ready } = useAuth();
  const { refresh } = useMonth();
  const { data: users, loading } = useApi((api) => api.get("/users"));
  const { data: barbers } = useApi((api) => api.get("/barbers"));
  const { data: cat } = useApi((api) => api.get("/permissions/catalog"));
  const remove = async (id) => { try { await api.del(`/users/${id}`); toast.success("Removido"); refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Erro"); } };

  if (ready && user && !checkIsDono(user)) {
    return <Navigate to="/" replace />;
  }

  if (loading || !barbers || !cat) return <Loading />;

  return (
    <div className="space-y-5 max-w-full 2xl:max-w-[1920px] mx-auto" data-testid="usuarios-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Funções acumuláveis: Dono, Gerente e Barbeiro. Um Dono/Gerente também pode ser Barbeiro.</p>
        <UserDialog barbers={barbers} onDone={refresh} />
      </div>
      {!users?.length ? <EmptyState title="Nenhum usuário" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => {
            const roles = rolesOf(u);
            const userIsDono = roles.includes("dono");
            const isGerente = roles.includes("gerente");
            return (
              <Card key={u.id} className="p-5" data-testid={`user-card-${u.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary"><UserCircle2 className="h-6 w-6" /></div>
                    <div>
                      <p className="font-display font-bold">{u.name}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </div>
                  <Badge className={userIsDono ? "bg-primary text-primary-foreground" : ""} variant={userIsDono ? "default" : "secondary"} data-testid={`user-roles-${u.id}`}>{rolesLabel(u)}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {isGerente && <PermissionsDialog user={u} catalog={Array.isArray(cat) ? cat : (cat?.catalog || [])} onDone={refresh} />}
                  <UserDialog existing={u} barbers={barbers} onDone={refresh} />
                  {!userIsDono && <ResetPasswordButton user={u} />}
                  {!userIsDono && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(u.id)} data-testid={`delete-user-${u.id}`}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
