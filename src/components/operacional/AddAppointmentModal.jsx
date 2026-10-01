import { useState, useEffect, useMemo } from "react";
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
import { Calendar as CalendarIcon } from "lucide-react";
import ClientAutocomplete from "@/components/ClientAutocomplete";

export default function AddAppointmentModal({ open, onOpenChange, barbers, services, clients = [], date, onSuccess }) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientId, setClientId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [time, setTime] = useState("14:00");
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setClientName("");
      setClientPhone("");
      setClientId("");
      setBarberId(barbers[0]?.id || "");
      setTime("14:00");
      setSelectedServiceIds(services[0] ? [services[0].id] : []);
      setNotes("");
    }
  }, [open, barbers, services]);

  const toggleService = (id) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const totalPrice = useMemo(() => {
    return services
      .filter((s) => selectedServiceIds.includes(s.id))
      .reduce((acc, s) => acc + s.price, 0);
  }, [services, selectedServiceIds]);

  const totalDuration = useMemo(() => {
    return (
      services
        .filter((s) => selectedServiceIds.includes(s.id))
        .reduce((acc, s) => acc + (s.duration_min || 30), 0) || 30
    );
  }, [services, selectedServiceIds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) return toast.error("Informe o nome do cliente");
    if (!barberId) return toast.error("Selecione um barbeiro");
    if (selectedServiceIds.length === 0) return toast.error("Selecione ao menos um serviço");

    setSaving(true);
    try {
      await api.post("/appointments", {
        client_id: clientId || undefined,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || undefined,
        barber_id: barberId,
        service_ids: selectedServiceIds,
        date,
        time,
        duration_min: totalDuration,
        price: totalPrice,
        notes: notes.trim() || undefined,
        status: "confirmado",
      });
      toast.success("Agendamento criado com sucesso!");
      onSuccess();
    } catch {
      toast.error("Erro ao criar agendamento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto bg-[#12141F] border-white/10 text-white rounded-[4px] shadow-none p-5 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#D4AF37]" />
            Novo Agendamento de Horário
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Nome do Cliente *</Label>
              <ClientAutocomplete
                value={clientName}
                clients={clients}
                placeholder="Ex: Carlos Eduardo"
                required
                onChange={(typedName, client) => {
                  setClientName(typedName);
                  if (client) {
                    setClientId(client.id);
                    if (client.phone) setClientPhone(client.phone);
                  } else {
                    setClientId("");
                  }
                }}
                onSelectClient={(client) => {
                  setClientName(client.name);
                  setClientId(client.id);
                  if (client.phone) setClientPhone(client.phone);
                }}
                inputClassName="bg-[#0A0D14] border-white/10 text-xs text-white rounded-[4px]"
                testId="input-apt-client-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">WhatsApp / Telefone</Label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="bg-[#0A0D14] border-white/10 text-xs text-white rounded-[4px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Barbeiro *</Label>
              <Select value={barberId} onValueChange={setBarberId}>
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

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Horário Marcado *</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-[#0A0D14] border-white/10 text-xs text-white rounded-[4px]"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-300">Serviços *</Label>
              <span className="text-xs font-semibold text-[#D4AF37]">
                {totalDuration} min • {formatBRL(totalPrice)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {services.map((s) => {
                const checked = selectedServiceIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleService(s.id)}
                    className={`cursor-pointer rounded-[3px] border p-2 flex items-center justify-between transition-colors ${
                      checked
                        ? "border-[#D4AF37] bg-[#D4AF37]/10"
                        : "border-white/10 bg-[#0A0D14] hover:bg-[#181D2E]"
                    }`}
                  >
                    <div className="truncate mr-1">
                      <span className="text-xs font-medium text-slate-200 block truncate">
                        {s.name}
                      </span>
                      <span className="text-[10px] text-slate-400">{s.duration_min || 30} min</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-white whitespace-nowrap">
                      {formatBRL(s.price)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Observações (Opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Cliente prefere toalha morna"
              className="bg-[#0A0D14] border-white/10 text-xs text-white rounded-[4px]"
            />
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
              className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs h-9 px-5 rounded-[4px] shadow-none cursor-pointer"
              data-testid="btn-submit-appointment"
            >
              {saving ? "Salvando..." : "Confirmar Agendamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
