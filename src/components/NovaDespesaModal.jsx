import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { todayISO } from "@/lib/format";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Receipt, Check } from "lucide-react";

export default function NovaDespesaModal({ open, onOpenChange, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    value: "",
    type: "variavel",
    category_id: "",
    due_date: todayISO(),
    recurrence: "nenhuma",
    occurrences: 1,
    payment_method: "pix",
    paid: true,
  });

  useEffect(() => {
    if (open) {
      api.get("/categories", { kind: "despesa" })
        .then((cats) => {
          setCategories(cats || []);
          if (cats?.length && !form.category_id) {
            setForm((f) => ({ ...f, category_id: cats[0].id }));
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.name || !form.value) {
      toast.error("Preencha o nome e o valor da despesa.");
      return;
    }
    const val = parseFloat(form.value);
    if (isNaN(val) || val <= 0) {
      toast.error("O valor deve ser maior que zero.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/expenses", {
        name: form.name,
        value: val,
        category_id: form.category_id || null,
        type: form.type,
        due_date: form.due_date,
        recurrence: form.type === "fixa" ? "mensal" : form.recurrence,
        occurrences: form.type === "fixa" ? 12 : 1,
        payment_method: form.payment_method,
        payment_date: form.paid ? form.due_date : null,
      });
      toast.success("Despesa cadastrada com sucesso!");
      onOpenChange(false);
      setForm({
        name: "",
        value: "",
        type: "variavel",
        category_id: categories[0]?.id || "",
        due_date: todayISO(),
        recurrence: "nenhuma",
        occurrences: 1,
        payment_method: "pix",
        paid: true,
      });
      onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erro ao registrar despesa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto bg-[#12141F] border-white/10 text-foreground p-5 sm:p-6 rounded-[4px] shadow-none">
        <DialogHeader className="pb-3 border-b border-white/10 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
            <div className="h-8 w-8 rounded-[2px] bg-[#EF4444]/15 text-[#EF4444] flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
            <span>Nova Despesa</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Descrição / Nome da Despesa
            </Label>
            <Input
              placeholder="Ex: Lâminas de barbear, Conta de Luz"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1.5 bg-[#0D0E12] border-[#262936] text-white focus-visible:ring-[#D4AF37]"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tipo de Custo
              </Label>
              <Select
                value={form.type}
                onValueChange={(val) => setForm({ ...form, type: val })}
              >
                <SelectTrigger className="mt-1.5 bg-[#0D0E12] border-[#262936] text-white focus:ring-[#D4AF37]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161822] border-[#262936] text-white">
                  <SelectItem value="variavel">Variável (Pontual)</SelectItem>
                  <SelectItem value="fixa">Fixa (Recorrente)</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categoria
              </Label>
              <Select
                value={form.category_id}
                onValueChange={(val) => setForm({ ...form, category_id: val })}
              >
                <SelectTrigger className="mt-1.5 bg-[#0D0E12] border-[#262936] text-white focus:ring-[#D4AF37]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#161822] border-[#262936] text-white">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vencimento
              </Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="mt-1.5 bg-[#0D0E12] border-[#262936] text-white focus-visible:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="expense-paid-check"
              checked={form.paid}
              onChange={(e) => setForm({ ...form, paid: e.target.checked })}
              className="h-4 w-4 rounded border-[#262936] bg-[#0D0E12] text-[#D4AF37] focus:ring-[#D4AF37]"
            />
            <Label htmlFor="expense-paid-check" className="text-xs font-medium text-white cursor-pointer">
              Marcar como já pago hoje ({form.due_date})
            </Label>
          </div>

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
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold shadow-lg shadow-[#EF4444]/20 gap-2"
            >
              <Check className="h-4 w-4" />
              {loading ? "Salvando..." : "Salvar Despesa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
