import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { brl as formatBRL } from "@/lib/format";
import { Loading } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Calendar as CalendarIcon,
  Clock,
  Scissors,
  CheckCircle2,
  Plus,
  Play,
  Check,
  X,
  CreditCard,
  DollarSign,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Timer,
  AlertCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import ClientAutocomplete from "@/components/ClientAutocomplete";
import PaymentChannelSelector from "@/components/PaymentChannelSelector";
import {
  getChannelNameById,
  getMethodNameById,
  toLegacyPaymentType,
} from "@/lib/paymentChannels";
import BarberFilterDropdown from "@/components/operacional/BarberFilterDropdown";
import AddQueueModal from "@/components/operacional/AddQueueModal";
import AddAppointmentModal from "@/components/operacional/AddAppointmentModal";
import CheckoutModal from "@/components/operacional/OperationalCheckoutModal";

export default function Operacional() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);

  // Date selection (default today)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // Filter & tab controls
  const [activeTab, setActiveTab] = useState("fila"); // "fila" | "agenda"
  const [selectedBarberFilter, setSelectedBarberFilter] = useState("todos");

  // Modals state
  const [showAddQueueModal, setShowAddQueueModal] = useState(false);
  const [showAddAppointmentModal, setShowAddAppointmentModal] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState(null); // item to finish & charge
  const [callModalItem, setCallModalItem] = useState(null); // item waiting with 'any barber' to be assigned

  // Load all operational data
  const loadData = async () => {
    try {
      const [sRes, bRes, svRes, pmRes, qRes, aRes, clRes] = await Promise.all([
        api.get("/settings"),
        api.get("/barbers"),
        api.get("/services"),
        api.get("/payment-methods"),
        api.get(`/queue?date=${selectedDate}`),
        api.get(`/appointments?date=${selectedDate}`),
        api.get("/clients"),
      ]);

      setSettings(sRes);
      setBarbers(bRes.filter((b) => b.active));
      setServices(svRes.filter((s) => s.active));
      setPaymentMethods(pmRes.filter((p) => p.active));
      setQueue(qRes);
      setAppointments(aRes);
      setClients(clRes || []);

      // Auto set active tab if mode is not hybrid
      if (sRes.operational_mode === "fila") {
        setActiveTab("fila");
      } else if (sRes.operational_mode === "agendamento") {
        setActiveTab("agenda");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados operacionais");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Date shift
  const shiftDay = (delta) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d + delta);
    setSelectedDate(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    );
  };

  const isToday = useMemo(() => {
    const d = new Date();
    const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return selectedDate === t;
  }, [selectedDate]);

  const formattedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "numeric",
        month: "long",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Queue column filtering
  const queueWaiting = useMemo(() => {
    let list = queue.filter((q) => q.status === "espera");
    if (selectedBarberFilter !== "todos") {
      list = list.filter((q) => !q.barber_id || q.barber_id === selectedBarberFilter);
    }
    return list.sort((a, b) => a.arrival_time.localeCompare(b.arrival_time));
  }, [queue, selectedBarberFilter]);

  const queueInChair = useMemo(() => {
    let list = queue.filter((q) => q.status === "cadeira");
    if (selectedBarberFilter !== "todos") {
      list = list.filter((q) => q.barber_id === selectedBarberFilter);
    }
    return list.sort((a, b) => (a.called_time || "").localeCompare(b.called_time || ""));
  }, [queue, selectedBarberFilter]);

  const queueFinished = useMemo(() => {
    let list = queue.filter((q) => q.status === "finalizado");
    if (selectedBarberFilter !== "todos") {
      list = list.filter((q) => q.barber_id === selectedBarberFilter);
    }
    return list.sort((a, b) => (b.finished_time || "").localeCompare(a.finished_time || ""));
  }, [queue, selectedBarberFilter]);

  // Appointments filtered
  const filteredAppointments = useMemo(() => {
    let list = [...appointments];
    if (selectedBarberFilter !== "todos") {
      list = list.filter((a) => a.barber_id === selectedBarberFilter);
    }
    return list.sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedBarberFilter]);

  // --- Queue Actions ---
  const handleCallClient = async (item, targetBarberId) => {
    try {
      const barberIdToUse = targetBarberId || item.barber_id;
      if (!barberIdToUse && barbers.length > 0) {
        // Needs to select barber
        setCallModalItem(item);
        return;
      }
      await api.post(`/queue/${item.id}/call`, { barber_id: barberIdToUse });
      toast.success(`${item.client_name} chamado para a cadeira!`);
      setCallModalItem(null);
      loadData();
    } catch {
      toast.error("Erro ao chamar cliente");
    }
  };

  const handleCancelQueueItem = async (item) => {
    if (!confirm(`Deseja remover ${item.client_name} da fila?`)) return;
    try {
      await api.delete(`/queue/${item.id}`);
      toast.success("Cliente removido da fila");
      loadData();
    } catch {
      toast.error("Erro ao remover da fila");
    }
  };

  // --- Appointment Actions ---
  const handleStartAppointmentChair = async (apt) => {
    try {
      await api.post(`/appointments/${apt.id}/start-chair`, {});
      toast.success(`Atendimento de ${apt.client_name} iniciado na cadeira!`);
      loadData();
    } catch {
      toast.error("Erro ao iniciar atendimento");
    }
  };

  const handleCancelAppointment = async (apt) => {
    if (!confirm(`Deseja cancelar o agendamento de ${apt.client_name}?`)) return;
    try {
      await api.delete(`/appointments/${apt.id}`);
      toast.success("Agendamento cancelado");
      loadData();
    } catch {
      toast.error("Erro ao cancelar agendamento");
    }
  };

  const operationalMode = settings?.operational_mode || "hibrido";

  if (loading) return <Loading />;

  return (
    <div className="space-y-6 max-w-full 2xl:max-w-[1920px] mx-auto" data-testid="operacional-page">
      {/* Top Banner / Operational Mode Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#1F293D] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold font-display tracking-tight text-white">
              Gestão do Dia & Atendimentos
            </h1>
            <Badge
              variant="outline"
              className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30 text-xs py-0.5 px-2.5 font-medium"
            >
              {operationalMode === "hibrido"
                ? "Modo Híbrido"
                : operationalMode === "fila"
                ? "Apenas Fila de Espera"
                : "Apenas Agendamento"}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Controle de fluxo em tempo real: chamada para a cadeira, fila virtual e cobrança integrada ao caixa.
          </p>
        </div>

        {/* Date Selector and Fast Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Day Navigator */}
          <div className="flex items-center rounded-[4px] border border-white/10 bg-[#12141F] px-1.5 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-white rounded-[2px]"
              onClick={() => shiftDay(-1)}
              title="Dia anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-semibold text-slate-200 capitalize min-w-[120px] text-center">
              {isToday ? "Hoje • " : ""}
              {formattedDate}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-white rounded-[2px]"
              onClick={() => shiftDay(1)}
              title="Próximo dia"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Add Buttons */}
          {(operationalMode === "hibrido" || operationalMode === "fila") && (
            <Button
              onClick={() => setShowAddQueueModal(true)}
              className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold tracking-tight shadow-none transition-colors gap-1.5 h-9 text-xs px-4 rounded-[4px] cursor-pointer"
              data-testid="btn-add-queue"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Adicionar à Fila
            </Button>
          )}

          {(operationalMode === "hibrido" || operationalMode === "agendamento") && (
            <Button
              onClick={() => setShowAddAppointmentModal(true)}
              variant="secondary"
              className="border border-white/10 hover:border-[#D4AF37]/50 bg-[#12141F] hover:bg-[#181D2E] text-slate-200 font-semibold gap-1.5 h-9 text-xs px-4 rounded-[4px] transition-colors shadow-none cursor-pointer"
              data-testid="btn-add-appointment"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-[#D4AF37]" />
              Novo Agendamento
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-[#12141F] border border-white/10 rounded-[4px] shadow-none hover:border-[#D4AF37]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Na Espera (Fila)</span>
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-display">{queueWaiting.length}</span>
            <span className="text-[11px] text-slate-400">clientes</span>
          </div>
        </Card>

        <Card className="p-4 bg-[#12141F] border border-white/10 rounded-[4px] shadow-none hover:border-[#D4AF37]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Na Cadeira</span>
            <Scissors className="h-3.5 w-3.5 text-[#D4AF37]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#D4AF37] font-display">{queueInChair.length}</span>
            <span className="text-[11px] text-slate-400">em atendimento</span>
          </div>
        </Card>

        <Card className="p-4 bg-[#12141F] border border-white/10 rounded-[4px] shadow-none hover:border-[#D4AF37]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Agendamentos Hoje</span>
            <CalendarIcon className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-display">{filteredAppointments.length}</span>
            <span className="text-[11px] text-slate-400">marcados</span>
          </div>
        </Card>

        <Card className="p-4 bg-[#12141F] border border-white/10 rounded-[4px] shadow-none hover:border-[#D4AF37]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Finalizados Hoje</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400 font-display">
              {queueFinished.length}
            </span>
            <span className="text-[11px] text-slate-400">concluídos</span>
          </div>
        </Card>
      </div>

      {/* Filter and Tab Bar (Mobile-friendly horizontal scroll segmented control & toggle barber filter) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-[#12141F] p-3 rounded-[4px] border border-white/10 shadow-none">
        {/* Mode Switcher Tabs (Only if Hybrid mode or for exploration) */}
        {operationalMode === "hibrido" ? (
          <div className="w-full md:w-auto overflow-x-auto scrollbar-none pb-0.5">
            <div className="inline-flex items-center gap-1.5 p-1 bg-[#0A0D14] border border-white/10 rounded-[6px] min-w-max">
              <button
                type="button"
                onClick={() => setActiveTab("fila")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-[4px] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "fila"
                    ? "bg-[#161A28] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
                data-testid="tab-fila"
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>Ordem de Chegada (Fila)</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[3px] border ${
                    activeTab === "fila"
                      ? "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30"
                      : "bg-white/5 text-slate-400 border-white/5"
                  }`}
                >
                  {queueWaiting.length + queueInChair.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("agenda")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-[4px] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "agenda"
                    ? "bg-[#161A28] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
                data-testid="tab-agenda"
              >
                <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                <span>Grade de Horários Agendados</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[3px] border ${
                    activeTab === "agenda"
                      ? "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30"
                      : "bg-white/5 text-slate-400 border-white/5"
                  }`}
                >
                  {filteredAppointments.length}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs font-semibold text-white">
              {operationalMode === "fila"
                ? "Visão: Ordem de Chegada (Fila)"
                : "Visão: Grade de Horários Agendados"}
            </span>
          </div>
        )}

        {/* Barber Filter with Toggle / Click-Outside behavior */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <Label className="text-xs text-slate-400 whitespace-nowrap shrink-0">
            Filtrar Barbeiro:
          </Label>
          <BarberFilterDropdown
            barbers={barbers}
            selected={selectedBarberFilter}
            onChange={setSelectedBarberFilter}
          />
        </div>
      </div>

      {/* VIEW 1: VIRTUAL QUEUE (KANBAN 3 COLUMNS) */}
      {activeTab === "fila" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="kanban-queue">
          {/* COLUMN 1: NA ESPERA */}
          <div className="flex flex-col rounded-[4px] border border-white/10 bg-[#0F121C] overflow-hidden">
            <div className="p-3.5 border-b border-white/10 bg-[#12141F] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-400" />
                <h3 className="text-sm font-bold text-white">1. Na Espera</h3>
              </div>
              <Badge variant="secondary" className="bg-[#0A0D14] border border-white/10 text-slate-300 text-xs font-semibold rounded-[2px]">
                {queueWaiting.length}
              </Badge>
            </div>

            <div className="p-3 space-y-3 min-h-[380px] flex-1">
              {queueWaiting.length === 0 ? (
                <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-4 text-slate-500">
                  <Users className="h-8 w-8 mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs font-medium">Nenhum cliente aguardando na fila</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs text-[#D4AF37] mt-1"
                    onClick={() => setShowAddQueueModal(true)}
                  >
                    + Adicionar à fila agora
                  </Button>
                </div>
              ) : (
                queueWaiting.map((item) => (
                  <Card
                    key={item.id}
                    className="p-3.5 bg-[#0A0D14] border-white/10 hover:border-[#D4AF37]/50 transition-colors text-left shadow-none rounded-[3px]"
                    data-testid={`queue-item-${item.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm text-white">{item.client_name}</h4>
                        {item.client_phone && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" />
                            {item.client_phone}
                          </p>
                        )}
                      </div>
                      <span className="rounded-[2px] bg-[#12141F] border border-white/10 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                        {item.arrival_time}
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {item.service_names?.map((svc, idx) => (
                        <span
                          key={idx}
                          className="rounded-[2px] bg-[#12141F] border border-white/10 px-2 py-0.5 text-[11px] text-slate-300"
                        >
                          {svc}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Scissors className="h-3 w-3 text-[#D4AF37]" />
                        <span className="truncate max-w-[110px] font-medium text-slate-300">
                          {item.barber_name || "Qualquer barbeiro"}
                        </span>
                      </div>
                      <span className="font-bold text-white font-mono">
                        {formatBRL(item.estimated_price)}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="mt-2 text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-[2px] px-2 py-1 italic">
                        "{item.notes}"
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCallClient(item)}
                        className="flex-1 bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs h-8 gap-1.5 rounded-[3px] shadow-none transition-colors cursor-pointer"
                        data-testid={`btn-call-${item.id}`}
                      >
                        <Play className="h-3 w-3 fill-current" />
                        Chamar p/ Cadeira
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelQueueItem(item)}
                        className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-[3px]"
                        title="Remover da fila"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: NA CADEIRA */}
          <div className="flex flex-col rounded-[4px] border border-[#D4AF37]/35 bg-[#0F121C] overflow-hidden">
            <div className="p-3.5 border-b border-[#D4AF37]/25 bg-[#12141F] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#D4AF37] animate-ping" />
                <h3 className="text-sm font-bold text-[#D4AF37] flex items-center gap-1.5">
                  <Scissors className="h-4 w-4" />
                  2. Na Cadeira (Em Atendimento)
                </h3>
              </div>
              <Badge className="bg-[#D4AF37] text-[#0B0D14] text-xs font-bold rounded-[2px]">
                {queueInChair.length}
              </Badge>
            </div>

            <div className="p-3 space-y-3 min-h-[380px] flex-1">
              {queueInChair.length === 0 ? (
                <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-4 text-slate-500">
                  <Scissors className="h-8 w-8 mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs font-medium">Nenhum cliente na cadeira no momento</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Chame um cliente da fila para iniciar o atendimento.
                  </p>
                </div>
              ) : (
                queueInChair.map((item) => (
                  <Card
                    key={item.id}
                    className="p-3.5 bg-[#0A0D14] border-[#D4AF37]/40 shadow-none text-left rounded-[3px]"
                    data-testid={`chair-item-${item.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <h4 className="font-semibold text-sm text-white">{item.client_name}</h4>
                        </div>
                        <p className="text-xs text-[#D4AF37] font-medium mt-1 flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          Atendido por: {item.barber_name}
                        </p>
                      </div>
                      <span className="rounded-[2px] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2 py-0.5 text-[11px] font-mono text-[#D4AF37]">
                        Início: {item.called_time || item.arrival_time}
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {item.service_names?.map((svc, idx) => (
                        <span
                          key={idx}
                          className="rounded-[2px] bg-[#12141F] border border-white/10 px-2 py-0.5 text-[11px] text-slate-200"
                        >
                          {svc}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Valor Estimado:</span>
                      <span className="font-bold text-white font-mono text-sm">
                        {formatBRL(item.estimated_price)}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setCheckoutItem(item)}
                      className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600 text-[#0B0D14] font-bold text-xs h-8 gap-1.5 shadow-none rounded-[3px] transition-colors cursor-pointer"
                      data-testid={`btn-finish-${item.id}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Concluir & Cobrar
                    </Button>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: FINALIZADOS HOJE */}
          <div className="flex flex-col rounded-[4px] border border-white/10 bg-[#0F121C] overflow-hidden">
            <div className="p-3.5 border-b border-white/10 bg-[#12141F] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                <h3 className="text-sm font-bold text-white">3. Finalizados Hoje</h3>
              </div>
              <Badge variant="secondary" className="bg-[#0A0D14] border border-white/10 text-slate-300 text-xs font-semibold rounded-[2px]">
                {queueFinished.length}
              </Badge>
            </div>

            <div className="p-3 space-y-3 min-h-[380px] flex-1">
              {queueFinished.length === 0 ? (
                <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-4 text-slate-500">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs font-medium">Nenhum atendimento finalizado hoje ainda</p>
                </div>
              ) : (
                queueFinished.map((item) => (
                  <Card
                    key={item.id}
                    className="p-3 bg-[#0A0D14] border-white/10 text-left opacity-90 rounded-[3px] shadow-none"
                    data-testid={`finished-item-${item.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-xs text-white">{item.client_name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Barbeiro: {item.barber_name}
                        </p>
                      </div>
                      <span className="rounded-[2px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">
                        {item.finished_time || "Concluído"}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-300">
                      {item.service_names?.join(", ")}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                      <Badge
                        variant="outline"
                        className={
                          item.revenue_id
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] py-0 rounded-[2px]"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] py-0 rounded-[2px]"
                        }
                      >
                        {item.revenue_id ? "✓ No Caixa" : "Aguardando Caixa"}
                      </Badge>
                      <span className="font-mono text-slate-200 font-semibold">
                        {formatBRL(item.estimated_price)}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SCHEDULING (AGENDA DE HORÁRIOS) */}
      {activeTab === "agenda" && (
        <div className="space-y-4" data-testid="agenda-view">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-display">
              Grade de Horários Agendados ({filteredAppointments.length})
            </h3>
            <Button
              onClick={() => setShowAddAppointmentModal(true)}
              className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 font-semibold text-xs gap-1.5 h-8"
              data-testid="btn-new-apt-top"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Horário
            </Button>
          </div>

          {filteredAppointments.length === 0 ? (
            <Card className="p-8 text-center bg-[#131826] border-[#1F293D]">
              <CalendarIcon className="h-10 w-10 mx-auto text-slate-500 opacity-40 mb-3" />
              <h4 className="text-sm font-semibold text-white">Nenhum agendamento para este dia</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Utilize o botão acima para marcar um novo horário de atendimento para seus barbeiros.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5">
              {filteredAppointments.map((apt) => {
                const isChair = apt.status === "cadeira";
                const isFinished = apt.status === "concluido";
                const isConfirmed = apt.status === "confirmado";

                return (
                  <Card
                    key={apt.id}
                    className={`p-4 transition-colors text-left rounded-[4px] shadow-none ${
                      isChair
                        ? "bg-[#12141F] border-[#D4AF37]/60"
                        : isFinished
                        ? "bg-[#12141F]/70 border-white/10 opacity-80"
                        : "bg-[#12141F] border-white/10 hover:border-white/20"
                    }`}
                    data-testid={`appointment-card-${apt.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-[2px] bg-[#0A0D14] border border-white/10 text-center min-w-[54px]">
                          <span className="text-xs font-mono font-bold text-white block">
                            {apt.time}
                          </span>
                          <span className="text-[9px] text-slate-400 block">
                            {apt.duration_min} min
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-white">{apt.client_name}</h4>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Scissors className="h-3 w-3 text-[#D4AF37]" />
                            {apt.barber_name}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={
                          isChair
                            ? "bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30 text-[10px] rounded-[2px] animate-pulse"
                            : isFinished
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] rounded-[2px]"
                            : isConfirmed
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] rounded-[2px]"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] rounded-[2px]"
                        }
                      >
                        {isChair
                          ? "Na Cadeira"
                          : isFinished
                          ? "Concluído"
                          : isConfirmed
                          ? "Confirmado"
                          : "Pendente"}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {apt.service_names?.map((svc, idx) => (
                        <span
                          key={idx}
                          className="rounded-[2px] bg-[#0A0D14] border border-white/10 px-2 py-0.5 text-[11px] text-slate-300"
                        >
                          {svc}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                      {apt.client_phone ? (
                        <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                          <Phone className="h-3 w-3" />
                          {apt.client_phone}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Sem telefone</span>
                      )}
                      <span className="font-bold text-white font-mono text-sm">
                        {formatBRL(apt.price)}
                      </span>
                    </div>

                    {apt.notes && (
                      <p className="mt-2 text-[11px] text-slate-400 italic">"{apt.notes}"</p>
                    )}

                    {/* Operational Action */}
                    <div className="mt-3 pt-2 flex items-center gap-2">
                      {!isFinished && !isChair && (
                        <Button
                          size="sm"
                          onClick={() => handleStartAppointmentChair(apt)}
                          className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 font-semibold text-xs h-8 gap-1.5"
                          data-testid={`btn-start-apt-${apt.id}`}
                        >
                          <Play className="h-3 w-3 fill-current" />
                          Chamar p/ Cadeira
                        </Button>
                      )}

                      {isChair && (
                        <Button
                          size="sm"
                          onClick={() =>
                            setCheckoutItem({
                              id: apt.id,
                              client_name: apt.client_name,
                              barber_id: apt.barber_id,
                              barber_name: apt.barber_name,
                              service_names: apt.service_names,
                              estimated_price: apt.price,
                              date: apt.date,
                              isAppointment: true,
                            })
                          }
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-8 gap-1.5"
                          data-testid={`btn-finish-apt-${apt.id}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Concluir & Cobrar
                        </Button>
                      )}

                      {!isFinished && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancelAppointment(apt)}
                          className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          title="Cancelar agendamento"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADICIONAR À FILA VIRTUAL */}
      <AddQueueModal
        open={showAddQueueModal}
        onOpenChange={setShowAddQueueModal}
        barbers={barbers}
        services={services}
        clients={clients}
        date={selectedDate}
        onSuccess={() => {
          setShowAddQueueModal(false);
          loadData();
        }}
      />

      {/* MODAL 2: NOVO AGENDAMENTO */}
      <AddAppointmentModal
        open={showAddAppointmentModal}
        onOpenChange={setShowAddAppointmentModal}
        barbers={barbers}
        services={services}
        clients={clients}
        date={selectedDate}
        onSuccess={() => {
          setShowAddAppointmentModal(false);
          loadData();
        }}
      />

      {/* MODAL 3: CHECKOUT & CONCLUIR ATENDIMENTO */}
      {checkoutItem && (
        <CheckoutModal
          open={Boolean(checkoutItem)}
          onOpenChange={(open) => !open && setCheckoutItem(null)}
          item={checkoutItem}
          barbers={barbers}
          paymentMethods={paymentMethods}
          onSuccess={() => {
            setCheckoutItem(null);
            loadData();
          }}
        />
      )}

      {/* MODAL 4: ATRIBUIR BARBEIRO AO CHAMAR (QUANDO NA ESPERA SEM BARBEIRO) */}
      {callModalItem && (
        <Dialog open={Boolean(callModalItem)} onOpenChange={() => setCallModalItem(null)}>
          <DialogContent className="sm:max-w-md bg-[#131826] border-[#1F293D] text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Scissors className="h-4 w-4 text-[#D4AF37]" />
                Qual barbeiro irá atender {callModalItem?.client_name}?
              </DialogTitle>
            </DialogHeader>
            <div className="py-3 space-y-3">
              <p className="text-xs text-slate-400">
                O cliente está com a opção "Qualquer disponível". Selecione a cadeira em que ele será atendido agora:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {barbers.map((b) => (
                  <Button
                    key={b.id}
                    variant="secondary"
                    onClick={() => handleCallClient(callModalItem, b.id)}
                    className="justify-between bg-[#0B0F19] hover:bg-[#1A2234] border border-[#1F293D] text-slate-200 text-xs h-11"
                  >
                    <span className="font-semibold">{b.name}</span>
                    <span className="text-[11px] text-slate-400">
                      Comissão: {b.commission_type === "fixo" ? formatBRL(b.commission_value) : `${b.commission_percent}%`}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
