import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { todayISO } from "@/lib/format";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HandCoins, Check } from "lucide-react";

export default function NovaRetiradaModal({ open, onOpenChange, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: todayISO(),
    value: "",
    reason: "",
    source: "dinheiro",
  });

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const val = parseFloat(form.value);
    if (isNaN(val) || val <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/withdrawals", {
        date: form.date,
        value: val,
        reason: form.reason || "Pró-labore / Uso pessoal",
        source: form.source,
      });
      toast.success("Retirada registrada com sucesso!");
      onOpenChange(false);
      setForm({ date: todayISO(), value: "", reason: "", source: "dinheiro" });
      onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erro ao registrar retirada");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto bg-[#12141F] border-white/10 text-foreground p-5 sm:p-6 rounded-[4px] shadow-none">
        <DialogHeader className="pb-3 border-b border-white/10 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
            <div className="h-8 w-8 rounded-[2px] bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
              <HandCoins className="h-4 w-4" />
            </div>
            <span>Retirada do Dono (Pró-labore)</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Valor (R$)
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="mt-1.5 bg-[#0D0E12] border-[#262936] text-white font-semibold focus-visible:ring-[#D4AF37]"
              autoFocus
              required
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Data da Retirada
            </Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="mt-1.5 bg-[#0D0E12] border-[#262936] text-white focus-visible:ring-[#D4AF37]"
              required
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Motivo / Destino
            </Label>
            <Input
              placeholder="Ex: Pró-labore mensal, Despesa pessoal"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="mt-1.5 bg-[#0D0E12] border-[#262936] text-white focus-visible:ring-[#D4AF37]"
            />
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            * Retiradas do proprietário são contabilizadas separadamente dos custos operacionais para manter a clareza do fluxo de caixa.
          </p>

          <DialogFooter className="pt-3 pb-1 border-t border-[#262936] sm:justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-white hover:bg-[#262936]/40"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0D0E12] font-bold shadow-lg shadow-[#D4AF37]/20 gap-2"
            >
              <Check className="h-4 w-4" />
              {loading ? "Salvando..." : "Registrar Retirada"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
