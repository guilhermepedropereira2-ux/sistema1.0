import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { Loading } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Store, Save, Upload, ScissorsSquare, Link2, Copy, Check, ExternalLink } from "lucide-react";

export default function Barbearia() {
  const { refresh } = useMonth();
  const { data, loading } = useApi((api) => api.get("/barbershop"));
  const [form, setForm] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        ...data,
        slug: data.slug || "barbearia-vintage",
      });
    }
  }, [data]);

  if (loading || !form) return <Loading />;

  const currentSlug = form.slug || "barbearia-vintage";
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
        slug: form.slug || "barbearia-vintage",
        document: form.document || null,
        phone: form.phone || null,
        address: form.address || null,
        logo_url: form.logo_url || null,
        opening_hours: form.opening_hours || null,
      });
      toast.success("Cadastro da barbearia salvo");
      refresh();
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  return (
    <div className="max-w-3xl space-y-6" data-testid="barbearia-page">
      {/* Card de Link Público Exclusivo */}
      <Card className="p-6 border border-white/10 bg-[#12141F] relative overflow-hidden rounded-[4px] shadow-none">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#D4AF37]" />
            <h3 className="font-display text-base font-bold text-white">
              Link Exclusivo de Agendamento Online
            </h3>
          </div>
          <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30 text-xs font-bold rounded-[2px]">
            Multi-Tenant
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Este é o link direto da sua barbearia para seus clientes agendarem horários sem login burocrático.
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
              className="h-9 px-3.5 text-xs bg-[#D4AF37] hover:bg-[#C59F2E] text-slate-950 font-bold rounded-[4px] gap-1.5 shadow-none"
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

      <Card className="p-6 border border-white/10 bg-[#12141F] rounded-[4px] shadow-none">
        <div className="mb-5 flex items-center gap-2"><Store className="h-5 w-5 text-primary" /><h3 className="font-display text-base font-bold">Cadastro da Barbearia</h3></div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[4px] border border-white/10 bg-[#0A0D14]">
              {form.logo_url
                ? <img src={form.logo_url} alt="logo" className="h-full w-full object-cover" data-testid="logo-preview" />
                : <ScissorsSquare className="h-10 w-10 text-muted-foreground" />}
            </div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="logo-input" />
              <span className="inline-flex items-center gap-2 rounded-[4px] border border-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/5"><Upload className="h-3.5 w-3.5" /> Enviar logo</span>
            </label>
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome da barbearia</Label>
              <Input className="rounded-[4px]" value={form.name || ""} onChange={(e) => set("name", e.target.value)} data-testid="shop-name" placeholder="Ex: Barbearia do Guilherme" />
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
              <Input className="rounded-[4px]" value={form.document || ""} onChange={(e) => set("document", e.target.value)} data-testid="shop-document" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input className="rounded-[4px]" value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} data-testid="shop-phone" />
            </div>
            <div className="sm:col-span-2">
              <Label>Endereço</Label>
              <Input className="rounded-[4px]" value={form.address || ""} onChange={(e) => set("address", e.target.value)} data-testid="shop-address" />
            </div>
            <div className="sm:col-span-2">
              <Label>Horário de funcionamento</Label>
              <Textarea className="rounded-[4px]" value={form.opening_hours || ""} onChange={(e) => set("opening_hours", e.target.value)} data-testid="shop-hours" placeholder="Seg-Sáb 09:00 às 20:00" rows={2} />
            </div>
          </div>
        </div>
        <div className="mt-6">
          <Button onClick={save} className="gap-2 rounded-[4px] shadow-none" data-testid="shop-save"><Save className="h-4 w-4" /> Salvar</Button>
        </div>
      </Card>
    </div>
  );
}
