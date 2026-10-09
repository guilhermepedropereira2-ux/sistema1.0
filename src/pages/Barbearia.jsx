import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { useUnit } from "@/context/UnitContext";
import { Loading } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Store,
  Save,
  Upload,
  ScissorsSquare,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Pencil,
  Crown,
  MapPin,
  Phone,
} from "lucide-react";

export default function Barbearia() {
  const { refresh } = useMonth();
  const {
    units = [],
    activeUnitId,
    switchUnit,
    refreshUnits,
    isPremium,
    openUpgradeModal,
    plan,
  } = useUnit();

  const { data, loading } = useApi((apiClient) => apiClient.get("/barbershop"));
  const [form, setForm] = useState(null);
  const [copied, setCopied] = useState(false);

  // Modal de Unidade (Criar / Editar)
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState({
    name: "",
    short_name: "",
    address: "",
    phone: "",
    city: "",
    state: "SP",
    is_main: false,
  });
  const [savingUnit, setSavingUnit] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        ...data,
        slug: data.slug || "barbearia",
      });
    }
  }, [data]);

  if (loading || !form) return <Loading />;

  const currentSlug = form.slug || "barbearia";
  const shopPublicUrl = `${window.location.origin}/agendar/${currentSlug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shopPublicUrl);
    setCopied(true);
    toast.success("Link de agendamento copiado!");
    setTimeout(() => setCopied(false), 2500);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) return toast.error("Imagem muito grande (máx. 800KB)");
    const reader = new FileReader();
    reader.onload = () => set("logo_url", reader.result);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    try {
      await api.put("/barbershop", {
        name: form.name || "",
        slug: form.slug || "barbearia",
        document: form.document || null,
        phone: form.phone || null,
        address: form.address || null,
        logo_url: form.logo_url || null,
        opening_hours: form.opening_hours || null,
      });
      toast.success("Cadastro da barbearia salvo com sucesso!");
      refresh();
      refreshUnits?.();
    } catch {
      toast.error("Erro ao salvar dados da barbearia.");
    }
  };

  const handleOpenAddUnit = () => {
    if (!isPremium) {
      openUpgradeModal?.({
        title: "Multiunidades é Exclusivo do Plano PREMIUM",
        message: "Gerencie múltiplas unidades, filiais e centros de custo em um único painel com o Plano PREMIUM.",
        targetPlan: "premium",
        feature: "multi_unidades",
      });
      return;
    }
    setEditingUnit(null);
    setUnitForm({
      name: "",
      short_name: "",
      address: "",
      phone: "",
      city: form.city || "",
      state: form.state || "SP",
      is_main: false,
    });
    setUnitModalOpen(true);
  };

  const handleOpenEditUnit = (u) => {
    setEditingUnit(u);
    setUnitForm({
      name: u.name || "",
      short_name: u.short_name || "",
      address: u.address || "",
      phone: u.phone || "",
      city: u.city || "",
      state: u.state || "SP",
      is_main: Boolean(u.is_main),
    });
    setUnitModalOpen(true);
  };

  const handleSaveUnit = async () => {
    if (!unitForm.name.trim()) {
      toast.error("Informe o nome da unidade.");
      return;
    }
    setSavingUnit(true);
    try {
      if (editingUnit) {
        await api.put(`/units/${editingUnit.id}`, unitForm);
        toast.success(`Unidade "${unitForm.name}" atualizada com sucesso!`);
      } else {
        await api.post("/units", unitForm);
        toast.success(`Unidade "${unitForm.name}" criada com sucesso!`);
      }
      setUnitModalOpen(false);
      refreshUnits?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar unidade.");
    } finally {
      setSavingUnit(false);
    }
  };

  return (
    <div className="w-full max-w-5xl 2xl:max-w-[1920px] mx-auto space-y-6 antialiased" data-testid="barbearia-page">
      {/* 1. Card de Link Público Exclusivo */}
      <Card className="p-6 border border-white/10 bg-[#12141F] relative overflow-hidden rounded-[4px] shadow-none">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#D4AF37]" />
            <h3 className="font-display text-base font-bold text-white">
              Link Exclusivo de Agendamento Online
            </h3>
          </div>
          <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30 text-xs font-bold rounded-[2px]">
            Página de Agendamento
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Este é o link direto da sua barbearia para seus clientes agendarem horários com praticidade.
        </p>

        <div className="p-3.5 rounded-[4px] bg-[#0A0D14] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              URL Pública da Barbearia
            </span>
            <div className="text-xs font-mono font-bold text-[#D4AF37] truncate mt-0.5">
              {shopPublicUrl}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={copyLink}
              className="h-9 px-3.5 text-xs bg-[#D4AF37] hover:bg-[#C59F2E] text-slate-950 font-bold rounded-[4px] gap-1.5 shadow-none cursor-pointer"
              data-testid="barbearia-copy-link-btn"
            >
              {copied ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copiado!" : "Copiar Link"}</span>
            </Button>

            <a
              href={`/agendar/${currentSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3 text-xs border border-white/10 hover:bg-white/5 text-white font-medium rounded-[4px] inline-flex items-center gap-1.5 transition-all"
            >
              <span>Abrir</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </Card>

      {/* 2. Card Minhas Unidades / Barbearias */}
      <Card className="p-6 border border-white/10 bg-[#12141F] rounded-[4px] shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-[#D4AF37]" />
            <div>
              <h3 className="font-display text-base font-bold text-white">Minhas Unidades</h3>
              <p className="text-xs text-muted-foreground">
                Gerencie os endereços físicos e filiais da sua barbearia.
              </p>
            </div>
          </div>

          <Button
            onClick={handleOpenAddUnit}
            className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs h-9 rounded-[4px] gap-1.5 shadow-none cursor-pointer"
            data-testid="btn-add-unit"
          >
            {isPremium ? <Plus className="h-4 w-4 stroke-[2.5]" /> : <Crown className="h-4 w-4" />}
            <span>{isPremium ? "+ Nova Unidade" : "+ Nova Unidade (Premium)"}</span>
          </Button>
        </div>

        <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((u) => {
            const isActive = activeUnitId === u.id;
            return (
              <div
                key={u.id}
                className={`p-4 rounded-[4px] border transition-all flex flex-col justify-between ${
                  isActive
                    ? "bg-[#0E1422] border-[#D4AF37] ring-1 ring-[#D4AF37]/40 shadow-lg"
                    : "bg-[#0A0D14] border-white/10 hover:border-white/20"
                }`}
                data-testid={`unit-card-${u.id}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate">{u.name}</span>
                        {u.is_main && (
                          <Badge className="bg-[#D4AF37]/15 text-[#E5C365] border-[#D4AF37]/30 text-[9px] rounded-[2px] py-0">
                            Matriz
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{u.city || "São Paulo"} - {u.state || "SP"}</span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEditUnit(u)}
                      className="h-7 w-7 text-slate-400 hover:text-white rounded-[3px]"
                      title="Editar unidade"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300 mt-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                      <span className="truncate">{u.address || "Endereço não informado"}</span>
                    </div>
                    {u.phone && (
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                        <span>{u.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-[#E5C365]" : "text-slate-500"}`}>
                    {isActive ? "✓ Unidade Ativa" : "Unidade Cadastrada"}
                  </span>
                  {!isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => switchUnit(u.id)}
                      className="h-7 text-xs border-white/10 hover:bg-white/5 text-slate-300 rounded-[3px]"
                    >
                      Selecionar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3. Card de Dados Gerais da Barbearia */}
      <Card className="p-6 border border-white/10 bg-[#12141F] rounded-[4px] shadow-none">
        <div className="mb-5 flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <h3 className="font-display text-base font-bold">Cadastro Geral da Barbearia</h3>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[4px] border border-white/10 bg-[#0A0D14]">
              {form.logo_url ? (
                <img src={form.logo_url} alt="logo" className="h-full w-full object-cover" data-testid="logo-preview" />
              ) : (
                <ScissorsSquare className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="logo-input" />
              <span className="inline-flex items-center gap-2 rounded-[4px] border border-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/5 cursor-pointer">
                <Upload className="h-3.5 w-3.5" /> Enviar logo
              </span>
            </label>
          </div>

          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome da barbearia</Label>
              <Input
                className="rounded-[4px]"
                value={form.name || ""}
                onChange={(e) => set("name", e.target.value)}
                data-testid="shop-name"
                placeholder="Ex: Minha Barbearia"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Link Exclusivo (Slug)</Label>
              <Input
                value={form.slug || ""}
                onChange={(e) => {
                  const clean = e.target.value
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9_-]/g, "-");
                  set("slug", clean);
                }}
                data-testid="shop-slug"
                placeholder="ex: barbearia-estilo"
                className="font-mono text-xs font-bold rounded-[4px]"
              />
            </div>
            <div>
              <Label>CNPJ / CPF</Label>
              <Input
                className="rounded-[4px]"
                value={form.document || ""}
                onChange={(e) => set("document", e.target.value)}
                data-testid="shop-document"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                className="rounded-[4px]"
                value={form.phone || ""}
                onChange={(e) => set("phone", e.target.value)}
                data-testid="shop-phone"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Endereço</Label>
              <Input
                className="rounded-[4px]"
                value={form.address || ""}
                onChange={(e) => set("address", e.target.value)}
                data-testid="shop-address"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Horário de funcionamento</Label>
              <Textarea
                className="rounded-[4px]"
                value={form.opening_hours || ""}
                onChange={(e) => set("opening_hours", e.target.value)}
                data-testid="shop-hours"
                placeholder="Seg-Sáb 09:00 às 20:00"
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={save} className="gap-2 rounded-[4px] shadow-none cursor-pointer" data-testid="shop-save">
            <Save className="h-4 w-4" /> Salvar Alterações
          </Button>
        </div>
      </Card>

      {/* Modal Adicionar / Editar Unidade */}
      <Dialog open={unitModalOpen} onOpenChange={setUnitModalOpen}>
        <DialogContent className="bg-[#12141F] border border-white/10 text-white sm:max-w-md rounded-[4px]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold flex items-center gap-2">
              <Store className="h-4 w-4 text-[#D4AF37]" />
              <span>{editingUnit ? "Editar Unidade" : "Nova Unidade"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Nome da Unidade *</Label>
              <Input
                value={unitForm.name}
                onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Unidade Shopping, Unidade Zona Sul"
                className="bg-[#0A0D14] border-white/10 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Apelido Curto</Label>
              <Input
                value={unitForm.short_name}
                onChange={(e) => setUnitForm((f) => ({ ...f, short_name: e.target.value }))}
                placeholder="Ex: Shopping, Sul"
                className="bg-[#0A0D14] border-white/10 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Endereço Completo</Label>
              <Input
                value={unitForm.address}
                onChange={(e) => setUnitForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Av. Principal, 1000"
                className="bg-[#0A0D14] border-white/10 text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Cidade</Label>
                <Input
                  value={unitForm.city}
                  onChange={(e) => setUnitForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="São Paulo"
                  className="bg-[#0A0D14] border-white/10 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Telefone</Label>
                <Input
                  value={unitForm.phone}
                  onChange={(e) => setUnitForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 90000-0000"
                  className="bg-[#0A0D14] border-white/10 text-xs mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnitModalOpen(false)}
              className="border-white/10 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveUnit}
              disabled={savingUnit}
              className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs"
            >
              {savingUnit ? "Salvando..." : "Salvar Unidade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
