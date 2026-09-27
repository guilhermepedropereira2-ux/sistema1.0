import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { brl, todayISO } from "@/lib/format";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Scissors, User, CreditCard, Sparkles, Check } from "lucide-react";
import ClientAutocomplete from "@/components/ClientAutocomplete";
import PaymentChannelSelector from "@/components/PaymentChannelSelector";
import {
  getChannelNameById,
  getMethodNameById,
  toLegacyPaymentType,
} from "@/lib/paymentChannels";

export default function NovoAtendimentoModal({ open, onOpenChange, onSuccess }) {
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [methods, setMethods] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    client_name: "",
    client_id: "",
    barber_id: "",
    item_kind: "servico",
    item_id: "",
    service_name: "",
    gross_amount: "",
    discount_amount: "0",
    payment_method_id: "",
    payment_type: "dinheiro",
    payment_channel: "caixa_fisico",
    payment_method: "cash",
    date: todayISO(),
    time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  });

  useEffect(() => {
    if (open) {
      Promise.all([
        api.get("/barbers"),
        api.get("/services"),
        api.get("/products"),
        api.get("/payment-methods"),
        api.get("/clients"),
      ]).then(([b, s, p, m, c]) => {
        setBarbers(b.filter((x) => x.active));
        setServices(s.filter((x) => x.active));
        setProducts(p.filter((x) => x.active));
        setMethods(m.filter((x) => x.active));
        setClients(c || []);
        if (b.length && !form.barber_id) setForm((f) => ({ ...f, barber_id: b[0].id }));
        if (m.length && !form.payment_method_id) setForm((f) => ({ ...f, payment_method_id: m[0].id }));
      }).catch((err) => console.error("Error loading resources:", err));
    }
  }, [open]);

  const handlePickService = (svcId) => {
    const list = form.item_kind === "produto" ? products : services;
    const item = list.find((it) => it.id === svcId);
    if (item) {
      setForm((f) => ({
        ...f,
        item_id: item.id,
        service_name: item.name,
        gross_amount: String(item.price),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.service_name || !form.gross_amount) {
      toast.error("Informe o serviço e o valor do atendimento.");
      return;
    }
    const gross = parseFloat(form.gross_amount) || 0;
    if (gross <= 0) {
      toast.error("O valor deve ser maior que zero.");
      return;
    }
    setLoading(true);
    const channelName = getChannelNameById(form.payment_channel, methods);
    const methodName = getMethodNameById(form.payment_method);
    const legacyType = toLegacyPaymentType(form.payment_channel, form.payment_method);

    try {
      await api.post("/revenues", {
        ...form,
        gross_amount: gross,
        discount_amount: parseFloat(form.discount_amount) || 0,
        service_type: form.item_kind === "produto" ? "produto" : "corte",
        quantity: 1,
        payment_channel: channelName,
        payment_method: methodName,
        payment_type: legacyType,
      });
      toast.success("Atendimento registrado com sucesso!");
      onOpenChange(false);
      setForm({
        client_name: "",
        barber_id: barbers[0]?.id || "",
        item_kind: "servico",
        item_id: "",
        service_name: "",
        gross_amount: "",
        discount_amount: "0",
        payment_method_id: methods[0]?.id || "",
        payment_type: "dinheiro",
        payment_channel: "caixa_fisico",
        payment_method: "cash",
        date: todayISO(),
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      });
      onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erro ao registrar atendimento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#12141F] border-white/10 text-foreground p-6 rounded-[4px] shadow-none">
        <DialogHeader className="pb-3 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
            <div className="h-8 w-8 rounded-[2px] bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
              <Scissors className="h-4 w-4" />
            </div>
            <span>Novo Atendimento</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Cliente com Autocomplete Inteligente */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Nome do Cliente
            </Label>
            <ClientAutocomplete
              value={form.client_name}
              clients={clients}
              placeholder="Ex: Carlos Eduardo (ou digite um novo)"
              autoFocus
              onChange={(typedName, client) => {
                setForm((prev) => ({
                  ...prev,
                  client_name: typedName,
                  client_id: client ? client.id : "",
                }));
              }}
              onSelectClient={(client) => {
                setForm((prev) => ({
                  ...prev,
                  client_name: client.name,
                  client_id: client.id,
                }));
              }}
              inputClassName="bg-[#0D0E12] border-[#262936] text-white focus-visible:ring-[#D4AF37]"
              testId="novo-atendimento-client-autocomplete"
            />
          </div>

          {/* Barbeiro */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Barbeiro Responsável
            </Label>
            <Select
              value={form.barber_id}
              onValueChange={(val) => setForm({ ...form, barber_id: val })}
            >
              <SelectTrigger className="mt-1.5 bg-[#0D0E12] border-[#262936] text-white focus:ring-[#D4AF37]">
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent className="bg-[#161822] border-[#262936] text-white">
                {barbers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo e Serviço */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tipo
              </Label>
              <Select
                value={form.item_kind}
                onValueChange={(val) => {
                  setForm({ ...form, item_kind: val, item_id: "", service_name: "", gross_amount: "" });
                }}
              >
                <SelectTrigger className="mt-1.5 bg-[#0D0E12] border-[#262936] text-white focus:ring-[#D4AF37]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161822] border-[#262936] text-white">
                  <SelectItem value="servico">Serviço</SelectItem>
                  <SelectItem value="produto">Produto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Item / Procedimento
              </Label>
              <Select
                value={form.item_id}
                onValueChange={handlePickService}
              >
                <SelectTrigger className="mt-1.5 bg-[#0D0E12] border-[#262936] text-white focus:ring-[#D4AF37]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#161822] border-[#262936] text-white">
                  {(form.item_kind === "produto" ? products : services).map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.name} ({brl(it.price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Valores: Bruto e Desconto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Valor Total (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.gross_amount}
                onChange={(e) => setForm({ ...form, gross_amount: e.target.value })}
                className="mt-1.5 bg-[#0D0E12] border-[#262936] text-white focus-visible:ring-[#D4AF37] font-semibold"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Desconto (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.discount_amount}
                onChange={(e) => setForm({ ...form, discount_amount: e.target.value })}
                className="mt-1.5 bg-[#0D0E12] border-[#262936] text-muted-foreground focus-visible:ring-[#D4AF37]"
              />
            </div>
          </div>

          {/* Pagamento com Hierarquia Meio de Recebimento -> Forma de Pagamento */}
          <PaymentChannelSelector
            channel={form.payment_channel}
            method={form.payment_method}
            paymentMethods={methods}
            onChannelChange={(ch, chObj) => {
              const leg = toLegacyPaymentType(ch, form.payment_method);
              let pmId = chObj?.pmId || form.payment_method_id;
              if (methods?.length) {
                if (ch === "caixa_fisico") {
                  pmId = methods.find((x) => x.kind === "dinheiro")?.id || methods[0].id;
                } else if (ch === "pix_direto") {
                  pmId = methods.find((x) => x.kind === "pix")?.id || methods[0].id;
                } else {
                  pmId = chObj?.pmId || methods.find((x) => x.id === ch || x.kind === "maquininha" || x.kind === "cartao")?.id || methods[0].id;
                }
              }
              setForm((prev) => ({
                ...prev,
                payment_channel: ch,
                payment_type: leg,
                payment_method_id: pmId,
              }));
            }}
            onMethodChange={(m) => {
              const leg = toLegacyPaymentType(form.payment_channel, m);
              setForm((prev) => ({
                ...prev,
                payment_method: m,
                payment_type: leg,
              }));
            }}
            onMachineCreated={(newPm) => {
              setMethods((prev) => [...prev, newPm]);
            }}
          />

          <DialogFooter className="pt-3 border-t border-[#262936] sm:justify-end gap-2">
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
              {loading ? "Salvando..." : "Confirmar Atendimento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
