import { useState, useEffect, useMemo } from "react";
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
  UserCheck,
  Timer,
  AlertCircle,
  Phone,
  Sparkles,
} from "lucide-react";

export default function Operacional() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);

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
      const [sRes, bRes, svRes, pmRes, qRes, aRes] = await Promise.all([
        api.get("/settings"),
        api.get("/barbers"),
        api.get("/services"),
        api.get("/payment-methods"),
        api.get(`/queue?date=${selectedDate}`),
        api.get(`/appointments?date=${selectedDate}`),
      ]);

      setSettings(sRes);
      setBarbers(bRes.filter((b) => b.active));
      setServices(svRes.filter((s) => s.active));
      setPaymentMethods(pmRes.filter((p) => p.active));
      setQueue(qRes);
      setAppointments(aRes);

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
    <div className="space-y-6 max-w-7xl mx-auto" data-testid="operacional-page">
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

      {/* Filter and Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#12141F] p-3 rounded-[4px] border border-white/10 shadow-none">
        {/* Mode Switcher Tabs (Only if Hybrid mode or for exploration) */}
        {operationalMode === "hibrido" ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-[#0A0D14] border border-white/10 p-0.5 rounded-[4px]">
              <TabsTrigger
                value="fila"
                className="text-xs data-[state=active]:bg-[#12141F] data-[state=active]:text-[#D4AF37] data-[state=active]:shadow-none gap-2 px-3 py-1.5 rounded-[3px]"
                data-testid="tab-fila"
              >
                <Users className="h-3.5 w-3.5" />
                Ordem de Chegada (Fila)
                <span className="rounded-[2px] bg-[#0A0D14] border border-white/10 px-1.5 py-0.2 text-[10px] text-slate-300">
                  {queueWaiting.length + queueInChair.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="agenda"
                className="text-xs data-[state=active]:bg-[#12141F] data-[state=active]:text-[#D4AF37] data-[state=active]:shadow-none gap-2 px-3 py-1.5 rounded-[3px]"
                data-testid="tab-agenda"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                Agenda de Horários
                <span className="rounded-[2px] bg-[#0A0D14] border border-white/10 px-1.5 py-0.2 text-[10px] text-slate-300">
                  {filteredAppointments.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs font-semibold text-white">
              {operationalMode === "fila" ? "Visão Fila Virtual" : "Visão Agenda de Horários"}
            </span>
          </div>
        )}

        {/* Barber Filter */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-slate-400 whitespace-nowrap">Filtrar Barbeiro:</Label>
          <Select value={selectedBarberFilter} onValueChange={setSelectedBarberFilter}>
            <SelectTrigger className="w-[180px] h-8 bg-[#0A0D14] border-white/10 text-xs text-slate-200 rounded-[4px]">
              <SelectValue placeholder="Todos os barbeiros" />
            </SelectTrigger>
            <SelectContent className="bg-[#12141F] border-white/10 text-slate-200 rounded-[4px]">
              <SelectItem value="todos">Todos os Barbeiros</SelectItem>
              {barbers.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* VIEW 1: VIRTUAL QUEUE (KANBAN 3 COLUMNS) */}
      {activeTab === "fila" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="kanban-queue">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
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

// ------------------------------------------------------------------------------------------------
// MODAL: ADICIONAR À FILA
// ------------------------------------------------------------------------------------------------
function AddQueueModal({ open, onOpenChange, barbers, services, date, onSuccess }) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [barberId, setBarberId] = useState("qualquer");
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setClientName("");
      setClientPhone("");
      setBarberId("qualquer");
      setSelectedServiceIds(services[0] ? [services[0].id] : []);
      setNotes("");
    }
  }, [open, services]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) {
      return toast.error("Informe o nome do cliente");
    }
    if (selectedServiceIds.length === 0) {
      return toast.error("Selecione ao menos um serviço");
    }

    setSaving(true);
    try {
      await api.post("/queue", {
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || undefined,
        barber_id: barberId === "qualquer" ? undefined : barberId,
        service_ids: selectedServiceIds,
        estimated_price: totalPrice,
        date,
        notes: notes.trim() || undefined,
      });
      toast.success(`${clientName} adicionado à fila!`);
      onSuccess();
    } catch {
      toast.error("Erro ao adicionar cliente à fila");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#12141F] border-white/10 text-white rounded-[4px] shadow-none">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[#D4AF37]" />
            Adicionar Cliente à Fila de Espera
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Nome do Cliente *</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Lucas Mendes"
                className="bg-[#0A0D14] border-white/10 text-xs text-white rounded-[4px]"
                required
                data-testid="input-queue-client-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Telefone / WhatsApp (Opcional)</Label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="bg-[#0A0D14] border-white/10 text-xs text-white rounded-[4px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Barbeiro Preferido</Label>
            <Select value={barberId} onValueChange={setBarberId}>
              <SelectTrigger className="bg-[#0A0D14] border-white/10 text-xs text-white rounded-[4px]">
                <SelectValue placeholder="Qualquer disponível" />
              </SelectTrigger>
              <SelectContent className="bg-[#12141F] border-white/10 text-slate-200 rounded-[4px]">
                <SelectItem value="qualquer">Qualquer Barbeiro Disponível (Primeiro Livre)</SelectItem>
                {barbers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-300">Serviços Desejados *</Label>
              <span className="text-xs font-semibold text-[#D4AF37]">
                Total: {formatBRL(totalPrice)}
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
                    <span className="text-xs font-medium text-slate-200 truncate mr-1">
                      {s.name}
                    </span>
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
              placeholder="Ex: Máquina 1 nas laterais, cliente com pressa"
              className="bg-[#0A0D14] border-white/10 text-xs text-white rounded-[4px]"
            />
          </div>

          <DialogFooter className="pt-2">
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
              data-testid="btn-submit-queue"
            >
              {saving ? "Adicionando..." : "Adicionar à Fila"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------------------------------------
// MODAL: NOVO AGENDAMENTO
// ------------------------------------------------------------------------------------------------
function AddAppointmentModal({ open, onOpenChange, barbers, services, date, onSuccess }) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [barberId, setBarberId] = useState("");
  const [time, setTime] = useState("14:00");
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setClientName("");
      setClientPhone("");
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
      <DialogContent className="sm:max-w-lg bg-[#12141F] border-white/10 text-white rounded-[4px] shadow-none">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#D4AF37]" />
            Novo Agendamento de Horário
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Nome do Cliente *</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Carlos Eduardo"
                className="bg-[#0A0D14] border-white/10 text-xs text-white rounded-[4px]"
                required
                data-testid="input-apt-client-name"
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

          <DialogFooter className="pt-2">
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

// ------------------------------------------------------------------------------------------------
// MODAL: CHECKOUT & CONCLUIR ATENDIMENTO (INTEGRAÇÃO FINANCEIRA COMPLETA)
// ------------------------------------------------------------------------------------------------
function CheckoutModal({ open, onOpenChange, item, barbers, paymentMethods, onSuccess }) {
  const [grossAmount, setGrossAmount] = useState(item.estimated_price || 50);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id || "pm_pix");
  const [paymentType, setPaymentType] = useState("pix");
  const [selectedBarberId, setSelectedBarberId] = useState(item.barber_id || barbers[0]?.id || "");
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
    try {
      if (item.isAppointment) {
        await api.post(`/appointments/${item.id}/finish`, {
          gross_amount: gross,
          discount_amount: discount,
          payment_method_id: paymentMethodId,
          payment_type: paymentType,
          barber_id: selectedBarberId,
        });
      } else {
        await api.post(`/queue/${item.id}/finish`, {
          gross_amount: gross,
          discount_amount: discount,
          payment_method_id: paymentMethodId,
          payment_type: paymentType,
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
      <DialogContent className="sm:max-w-lg bg-[#12141F] border-white/10 text-white rounded-[4px] shadow-none">
        <DialogHeader>
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

          <div className="grid grid-cols-2 gap-3">
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

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Forma de Pagamento</Label>
              <Select
                value={paymentType}
                onValueChange={(type) => {
                  setPaymentType(type);
                  // Match payment method if necessary
                  if (type === "pix") {
                    const pm = paymentMethods.find((p) => p.kind === "pix");
                    if (pm) setPaymentMethodId(pm.id);
                  } else if (type === "dinheiro") {
                    const pm = paymentMethods.find((p) => p.kind === "dinheiro");
                    if (pm) setPaymentMethodId(pm.id);
                  }
                }}
              >
                <SelectTrigger className="bg-[#0A0D14] border-white/10 text-xs text-white rounded-[4px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#12141F] border-white/10 text-slate-200 rounded-[4px]">
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                  <SelectItem value="debito">Cartão de Débito</SelectItem>
                  <SelectItem value="credito_vista">Cartão de Crédito à Vista</SelectItem>
                  <SelectItem value="credito_parcelado">Cartão de Crédito Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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

          <DialogFooter className="pt-2">
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
