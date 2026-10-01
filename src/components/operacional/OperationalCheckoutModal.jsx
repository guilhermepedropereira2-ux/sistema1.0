import { useState, useMemo } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { brl as formatBRL } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import PaymentChannelSelector from "@/components/PaymentChannelSelector";
import {
  getChannelNameById,
  getMethodNameById,
  toLegacyPaymentType,
} from "@/lib/paymentChannels";

export default function OperationalCheckoutModal({
  open,
  onOpenChange,
  item,
  barbers,
  paymentMethods,
  onSuccess,
}) {
  if (!item) return null;

  const [grossAmount, setGrossAmount] = useState(item.estimated_price || 50);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentChannel, setPaymentChannel] = useState("infinitepay");
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [paymentMethodId, setPaymentMethodId] = useState(
    paymentMethods[0]?.id || "pm_cartao"
  );
  const [paymentType, setPaymentType] = useState("credito_vista");
  const [selectedBarberId, setSelectedBarberId] = useState(
    item.barber_id || barbers[0]?.id || ""
  );
  const [saving, setSaving] = useState(false);

  const selectedPm = useMemo(
    () => paymentMethods.find((p) => p.id === paymentMethodId) || paymentMethods[0],
    [paymentMethods, paymentMethodId]
  );

  const selectedBarber = useMemo(
    () => barbers.find((b) => b.id === selectedBarberId),
    [barbers, selectedBarberId]
  );

  // Financial preview calculation
  const gross = Number(grossAmount) || 0;
  const discount = Number(discountAmount) || 0;
  const paid = Math.max(gross - discount, 0);
  const feePercent = selectedPm?.fees?.[paymentType] || 0;
  const fee = Number(((paid * feePercent) / 100).toFixed(2));
  const net = Number((paid - fee).toFixed(2));

  let comm = 0;
  if (selectedBarber) {
    if (selectedBarber.commission_type === "fixo") {
      comm = selectedBarber.commission_value;
    } else {
      comm = Number(((paid * selectedBarber.commission_percent) / 100).toFixed(2));
    }
  }
  comm = Math.min(comm, Math.max(net, 0));
  const shop = Number((net - comm).toFixed(2));

  const handleFinish = async (e) => {
    e.preventDefault();
    setSaving(true);
    const channelName = getChannelNameById(paymentChannel, paymentMethods);
    const methodName = getMethodNameById(paymentMethod);
    const legType = toLegacyPaymentType(paymentChannel, paymentMethod);

    try {
      if (item.isAppointment) {
        await api.post(`/appointments/${item.id}/finish`, {
          gross_amount: gross,
          discount_amount: discount,
          payment_method_id: paymentMethodId,
          payment_type: legType,
          payment_channel: channelName,
          payment_method: methodName,
          barber_id: selectedBarberId,
        });
      } else {
        await api.post(`/queue/${item.id}/finish`, {
          gross_amount: gross,
          discount_amount: discount,
          payment_method_id: paymentMethodId,
          payment_type: legType,
          payment_channel: channelName,
          payment_method: methodName,
          barber_id: selectedBarberId,
        });
      }
      toast.success(`Atendimento de ${item.client_name} concluído e lançado no caixa!`);
      onSuccess();
    } catch {
      toast.error("Erro ao finalizar atendimento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto bg-[#12141F] border-white/10 text-white rounded-[4px] shadow-none p-5 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            Concluir Atendimento & Fechar no Caixa
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFinish} className="space-y-4 py-2">
          {/* Client & Services Overview */}
          <div className="rounded-[3px] border border-white/10 bg-[#0A0D14] p-3 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-white">{item.client_name}</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {item.service_names?.join(" + ") || "Serviço"}
              </p>
            </div>
            <span className="text-lg font-bold font-mono text-[#D4AF37]">
              {formatBRL(paid)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Valor Bruto (R$)</Label>
              <Input
                type="number"
                step="0.50"
                value={grossAmount}
                onChange={(e) => setGrossAmount(e.target.value)}
                className="bg-[#0A0D14] border-white/10 text-xs text-white rounded-[4px]"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Desconto (R$)</Label>
              <Input
                type="number"
                step="0.50"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="bg-[#0A0D14] border-white/10 text-xs text-white rounded-[4px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Barbeiro Responsável</Label>
            <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
              <SelectTrigger className="bg-[#0A0D14] border-white/10 text-xs text-white rounded-[4px]">
                <SelectValue placeholder="Selecione o barbeiro" />
              </SelectTrigger>
              <SelectContent className="bg-[#12141F] border-white/10 text-slate-200 rounded-[4px]">
                {barbers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PaymentChannelSelector
            channel={paymentChannel}
            method={paymentMethod}
            paymentMethods={paymentMethods}
            onChannelChange={(ch, chObj) => {
              setPaymentChannel(ch);
              const leg = toLegacyPaymentType(ch, paymentMethod);
              setPaymentType(leg);
              let targetPmId = chObj?.pmId;
              if (!targetPmId && paymentMethods?.length) {
                if (ch === "caixa_fisico") {
                  const pm = paymentMethods.find((p) => p.kind === "dinheiro") || paymentMethods[0];
                  targetPmId = pm.id;
                } else if (ch === "pix_direto") {
                  const pm = paymentMethods.find((p) => p.kind === "pix") || paymentMethods[0];
                  targetPmId = pm.id;
                } else {
                  const pm = paymentMethods.find((p) => p.id === ch || p.kind === "maquininha" || p.kind === "cartao") || paymentMethods[0];
                  targetPmId = pm.id;
                }
              }
              if (targetPmId) setPaymentMethodId(targetPmId);
            }}
            onMethodChange={(m) => {
              setPaymentMethod(m);
              const leg = toLegacyPaymentType(paymentChannel, m);
              setPaymentType(leg);
            }}
          />

          {/* Real-time Financial Breakdown Preview */}
          <div className="rounded-[3px] border border-white/10 bg-[#0A0D14] p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Valor Pago pelo Cliente:</span>
              <span className="font-semibold text-white font-mono">{formatBRL(paid)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Taxa Maquininha ({feePercent}%):</span>
              <span className="text-red-400 font-mono">- {formatBRL(fee)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Comissão Barbeiro ({selectedBarber?.name || "Barbeiro"}):</span>
              <span className="text-amber-400 font-mono">{formatBRL(comm)}</span>
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm">
              <span className="text-[#D4AF37]">Líquido Barbearia:</span>
              <span className="text-[#D4AF37] font-mono">{formatBRL(shop)}</span>
            </div>
          </div>

          <DialogFooter className="pt-3 pb-1 shrink-0 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white text-xs rounded-[4px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-[#0B0D14] font-bold text-xs h-9 px-4 rounded-[4px] shadow-none cursor-pointer"
              data-testid="btn-confirm-checkout"
            >
              {saving ? "Finalizando..." : "Finalizar & Lançar no Caixa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
