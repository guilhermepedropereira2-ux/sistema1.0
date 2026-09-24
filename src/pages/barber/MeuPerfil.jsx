import { useState } from "react";
import { toast } from "sonner";
import { useFetch } from "@/hooks/useFetch";
import { Loading } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brl, fmtDate, pct } from "@/lib/format";
import { Scissors, Phone, Mail, CalendarDays, Percent, Info, Link2, Copy, Check, ExternalLink } from "lucide-react";

export default function MeuPerfil() {
  const { data, loading } = useFetch((api) => api.get("/barber/me"));
  const { data: shop } = useFetch((api) => api.get("/barbershop"));
  const [copied, setCopied] = useState(false);

  if (loading || !data) return <Loading />;
  const b = data.barber;
  const u = data.user;

  const shopSlug = shop?.slug || "barbearia-vintage";
  const myBookingUrl = `${window.location.origin}/agendar/${shopSlug}?barber=${b?.id || "b1"}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(myBookingUrl);
    setCopied(true);
    toast.success("Link de agendamento exclusivo copiado!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-lg space-y-5" data-testid="meu-perfil">
      <h2 className="font-display text-lg font-extrabold">Meu Perfil</h2>
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary">
            {b.photo_url ? <img src={b.photo_url} alt="" className="h-full w-full object-cover" /> : <Scissors className="h-7 w-7" />}
          </div>
          <div>
            <p className="font-display text-lg font-extrabold">{b.name}</p>
            <Badge className={b.active ? "bg-success text-success-foreground" : ""} variant={b.active ? "default" : "secondary"}>{b.active ? "Ativo" : "Inativo"}</Badge>
          </div>
        </div>
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {b.phone || "—"}</div>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {b.email || u.email || "—"}</div>
          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /> Entrada: {b.join_date ? fmtDate(b.join_date) : "—"}</div>
          <div className="flex items-center gap-2"><Percent className="h-4 w-4 text-muted-foreground" /> Comissão: {b.commission_type === "fixo" ? `fixo ${brl(b.commission_value)}` : pct(b.commission_percent)}</div>
          <div className="flex items-center gap-2"><Info className="h-4 w-4 text-muted-foreground" /> Usuário: @{u.username}</div>
        </div>
      </Card>

      {/* Card do Link de Agendamento */}
      <Card className="p-5 border border-white/10 bg-[#12141F] rounded-[4px] shadow-none">
        <div className="flex items-center gap-2.5 mb-2">
          <Link2 className="h-4 w-4 text-[#D4AF37]" />
          <h3 className="font-display text-sm font-bold text-white">Link Exclusivo de Agendamento</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Compartilhe este link com seus clientes para que eles agendem direto com você:
        </p>
        <div className="p-2.5 rounded-[4px] bg-[#0A0D14] border border-white/10 break-all font-mono text-xs text-[#D4AF37] mb-3 select-all">
          {myBookingUrl}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleCopy}
            className="h-8 text-xs bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0D0E12] font-bold gap-1.5 rounded-[4px] shadow-none"
          >
            {copied ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copiado!" : "Copiar Link"}</span>
          </Button>
          <a
            href={myBookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3 text-xs border border-white/10 hover:bg-white/5 text-white font-medium rounded-[4px] inline-flex items-center gap-1.5 transition-all"
          >
            <span>Abrir</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        </div>
      </Card>

      <Card className="p-5 rounded-[4px] border border-white/10 bg-[#12141F] shadow-none">
        <p className="text-sm text-muted-foreground">Para alterar seus dados de cadastro ou redefinir sua senha, procure o Dono ou Gerente da barbearia.</p>
      </Card>
    </div>
  );
}
