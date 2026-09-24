import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { todayISO, fmtDate, brl } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Scissors, Clock, CheckCircle2, UserCheck, Plus, EyeOff, Shield,
  ArrowRightLeft, Contact, Search, Play, Check, X, Phone, Calendar as CalendarIcon,
  RefreshCw, UserPlus, Sparkles, FileText, Tag, Copy, ExternalLink,
} from "lucide-react";
import { emitirNFSeSimplificada, isValidCPF } from "@/lib/fiscalEngine";
import { getActiveIdlePromotions } from "@/lib/marketingEngine";

export default function PainelBalcao({
  onOpenNovoAtendimento,
  isBalcaoMode,
  toggleBalcaoMode,
  user,
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [activeTab, setActiveTab] = useState("fila"); // "fila" | "agenda" | "concluidos"
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal Adicionar à Fila Rápida
  const [modalFilaOpen, setModalFilaOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [submittingQueue, setSubmittingQueue] = useState(false);

  // Modal NFS-e Simplificada
  const [nfseModalOpen, setNfseModalOpen] = useState(false);
  const [selectedItemNFSe, setSelectedItemNFSe] = useState(null);
  const [nfseCpf, setNfseCpf] = useState("");
  const [nfseEmail, setNfseEmail] = useState("");
  const [emittingNFSe, setEmittingNFSe] = useState(false);
  const [lastEmission, setLastEmission] = useState(null);

  const today = todayISO();
  const idlePromos = useMemo(() => getActiveIdlePromotions(new Date()), []);

  const handleOpenNFSeModal = (item) => {
    setSelectedItemNFSe(item);
    setNfseCpf("");
    setNfseEmail("");
    setLastEmission(null);
    setNfseModalOpen(true);
  };

  const handleEmitirNFSe = async () => {
    if (nfseCpf && !isValidCPF(nfseCpf)) {
      toast.error("CPF informado é inválido. Digite 11 números válidos ou deixe em branco.");
      return;
    }
    setEmittingNFSe(true);
    try {
      const res = await emitirNFSeSimplificada({
        saleId: selectedItemNFSe?.id,
        clientName: selectedItemNFSe?.client_name || "Consumidor Final",
        clientCpf: nfseCpf,
        clientEmail: nfseEmail,
        totalAmount: selectedItemNFSe?.price || 45,
        services: [{ name: selectedItemNFSe?.service_name || "Corte de Cabelo" }],
        barberName: selectedItemNFSe?.barber_name || "",
      });
      setLastEmission(res);
      toast.success(`NFS-e emitida com sucesso! Protocolo: ${res.protocolo}`);
    } catch (e) {
      toast.error("Erro ao emitir NFS-e.");
    } finally {
      setEmittingNFSe(false);
    }
  };

  const loadBalcaoData = async () => {
    try {
      setLoading(true);
      const [qRes, aRes, bRes, sRes] = await Promise.all([
        api.get(`/queue?date=${today}`).catch(() => []),
        api.get(`/appointments?date=${today}`).catch(() => []),
        api.get("/barbers").catch(() => []),
        api.get("/services").catch(() => []),
      ]);
      setQueue(Array.isArray(qRes) ? qRes : []);
      setAppointments(Array.isArray(aRes) ? aRes : []);
      setBarbers(Array.isArray(bRes) ? bRes.filter((b) => b.active) : []);
      setServices(Array.isArray(sRes) ? sRes.filter((s) => s.active) : []);
    } catch (err) {
      console.error("Erro ao carregar dados do balcão:", err);
      toast.error("Erro ao atualizar dados do balcão");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalcaoData();
  }, []);

  const waitingList = useMemo(() => {
    return queue.filter((item) => item.status === "aguardando");
  }, [queue]);

  const inServiceList = useMemo(() => {
    return queue.filter((item) => item.status === "em_atendimento");
  }, [queue]);

  const finishedList = useMemo(() => {
    return queue.filter((item) => item.status === "concluido");
  }, [queue]);

  const todayAppointments = useMemo(() => {
    return appointments.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [appointments]);

  // Avançar cliente na fila para atendimento
  const handleCallToChair = async (item) => {
    try {
      await api.patch(`/queue/${item.id}/status`, { status: "em_atendimento" });
      toast.success(`${item.client_name} chamado para a cadeira!`);
      loadBalcaoData();
    } catch (err) {
      toast.error("Erro ao chamar cliente");
    }
  };

  // Marcar atendimento como concluído
  const handleFinishService = async (item) => {
    try {
      await api.patch(`/queue/${item.id}/status`, { status: "concluido" });
      toast.success(`Atendimento de ${item.client_name} concluído!`);
      loadBalcaoData();
    } catch (err) {
      toast.error("Erro ao concluir atendimento");
    }
  };

  // Remover / Cancelar da fila
  const handleRemoveFromQueue = async (item) => {
    if (!window.confirm(`Remover ${item.client_name} da fila?`)) return;
    try {
      await api.del(`/queue/${item.id}`);
      toast.success("Cliente removido da fila");
      loadBalcaoData();
    } catch (err) {
      toast.error("Erro ao remover da fila");
    }
  };

  // Enviar novo cliente para a fila
  const handleAddToQueue = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    setSubmittingQueue(true);
    try {
      await api.post("/queue", {
        client_name: newClientName.trim(),
        client_phone: newClientPhone.trim() || null,
        barber_id: selectedBarberId || null,
        service_id: selectedServiceId || null,
        date: today,
        status: "aguardando",
      });
      toast.success(`${newClientName} adicionado à fila com sucesso!`);
      setNewClientName("");
      setNewClientPhone("");
      setSelectedBarberId("");
      setSelectedServiceId("");
      setModalFilaOpen(false);
      loadBalcaoData();
    } catch (err) {
      toast.error("Erro ao adicionar cliente à fila");
    } finally {
      setSubmittingQueue(false);
    }
  };

  // Filtrar lista de espera por termo de busca
  const filteredWaiting = useMemo(() => {
    if (!searchTerm.trim()) return waitingList;
    const term = searchTerm.toLowerCase();
    return waitingList.filter(
      (c) =>
        c.client_name?.toLowerCase().includes(term) ||
        c.barber_name?.toLowerCase().includes(term) ||
        c.service_name?.toLowerCase().includes(term)
    );
  }, [waitingList, searchTerm]);

  return (
    <div className="space-y-6 w-full max-w-full" data-testid="painel-balcao-seguro">
      {/* 1. Banner Superior de Segurança Operacional */}
      <div className="rounded-[4px] bg-[#12141F] border border-amber-500/30 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-none">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-[2px] bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base sm:text-lg font-extrabold text-white tracking-tight">
                Painel do Caixa & Balcão (Visão Segura)
              </h2>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold uppercase rounded-[2px]">
                Tela Protegida
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Dados financeiros confidenciais (lucros, retiradas, margens e saldos) foram ocultados para segurança visual na recepção.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBalcaoData}
            disabled={loading}
            className="h-9 px-3 text-xs bg-[#0A0D14] border-white/10 text-slate-300 hover:text-white rounded-[4px] gap-1.5 shadow-none"
            title="Atualizar fila e agendamentos"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          {toggleBalcaoMode && user?.role !== "caixa" && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleBalcaoMode}
              className="h-9 px-3 text-xs bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 rounded-[4px] gap-1.5 font-semibold shadow-none"
              title="Sair da visão segura e retornar ao dashboard completo com métricas financeiras"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>Sair do Modo Caixa</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Botões de Ação Rápida de Balcão */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <Button
          onClick={onOpenNovoAtendimento}
          className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-black text-xs sm:text-sm uppercase tracking-tight h-11 px-5 rounded-[4px] shadow-none transition-colors gap-2 cursor-pointer"
          data-testid="balcao-btn-novo-atendimento"
        >
          <Scissors className="h-4 w-4 stroke-[2.5]" />
          <span>+ Novo Atendimento / Cobrar</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => setModalFilaOpen(true)}
          className="h-11 px-4 text-xs font-bold bg-[#12141F] border-white/10 text-white hover:bg-[#181D2E] hover:border-[#D4AF37]/50 rounded-[4px] shadow-none gap-2 transition-colors cursor-pointer"
          data-testid="balcao-btn-add-fila"
        >
          <UserPlus className="h-4 w-4 text-[#D4AF37]" />
          <span>+ Adicionar à Fila de Espera</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate("/fechamento")}
          className="h-11 px-4 text-xs font-bold bg-[#12141F] border-white/10 text-slate-200 hover:text-white hover:bg-[#181D2E] rounded-[4px] shadow-none gap-2 transition-colors cursor-pointer"
          data-testid="balcao-btn-fechamento"
        >
          <ArrowRightLeft className="h-4 w-4 text-blue-400" />
          <span>Fechar Caixa do Dia</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate("/clientes")}
          className="h-11 px-4 text-xs font-bold bg-[#12141F] border-white/10 text-slate-200 hover:text-white hover:bg-[#181D2E] rounded-[4px] shadow-none gap-2 transition-colors cursor-pointer"
          data-testid="balcao-btn-clientes"
        >
          <Contact className="h-4 w-4 text-emerald-400" />
          <span>Buscar Clientes</span>
        </Button>
      </div>

      {/* Banner de Ocupação Ociosa (Preços Dinâmicos) */}
      {idlePromos.length > 0 && (
        <div className="rounded-[4px] bg-[#12141F] border border-amber-500/30 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-none">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[2px] bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{idlePromos[0].name}</span>
                <Badge className="bg-amber-500/20 text-amber-400 text-[9px] py-0 border-amber-500/30 rounded-[2px]">
                  {idlePromos[0].badgeLabel}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{idlePromos[0].description}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const text = idlePromos[0].whatsappCopy("nossa barbearia", `${window.location.origin}/agendar`);
              navigator.clipboard.writeText(text);
              toast.success("Mensagem promocional copiada para o WhatsApp!");
            }}
            className="h-7 text-[11px] border-amber-500/40 text-amber-300 hover:bg-amber-500/10 gap-1.5 rounded-[4px] shadow-none"
          >
            <Copy className="h-3 w-3" />
            <span>Copiar Oferta</span>
          </Button>
        </div>
      )}

      {/* 3. 4 Cards de Métricas Estritamente Operacionais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Aguardando na Recepção */}
        <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 sm:p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
              </span>
              Na Espera
            </span>
            <div className="h-8 w-8 rounded-[2px] bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {waitingList.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">clientes aguardando vez</p>
          </div>
        </div>

        {/* Card 2: Na Cadeira (Cortando) */}
        <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 sm:p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Na Cadeira
            </span>
            <div className="h-8 w-8 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Scissors className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {inServiceList.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">em atendimento agora</p>
          </div>
        </div>

        {/* Card 3: Agendamentos de Hoje */}
        <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 sm:p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Agenda do Dia
            </span>
            <div className="h-8 w-8 rounded-[2px] bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <CalendarIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {todayAppointments.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">horários marcados para hoje</p>
          </div>
        </div>

        {/* Card 4: Concluídos Hoje */}
        <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 sm:p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Concluídos Hoje
            </span>
            <div className="h-8 w-8 rounded-[2px] bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {finishedList.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">atendimentos finalizados</p>
          </div>
        </div>
      </div>

      {/* 4. Área Principal Operacional: Fila ao Vivo e Agendamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda (Fila de Espera e Em Atendimento - 7 colunas) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-5 shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-[#D4AF37]" />
                  <span>Fila de Atendimento do Balcão</span>
                </h3>
                <p className="text-xs text-slate-400">Controle de entrada e chamada dos clientes</p>
              </div>

              {/* Tabs Rápidas */}
              <div className="flex items-center gap-1 bg-[#0A0D14] p-1 rounded-[3px] border border-white/10">
                <button
                  onClick={() => setActiveTab("fila")}
                  className={`px-3 py-1 text-xs font-bold rounded-[2px] transition-colors cursor-pointer ${
                    activeTab === "fila" ? "bg-[#D4AF37] text-[#0B0F19]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Aguardando ({waitingList.length})
                </button>
                <button
                  onClick={() => setActiveTab("cadeira")}
                  className={`px-3 py-1 text-xs font-bold rounded-[2px] transition-colors cursor-pointer ${
                    activeTab === "cadeira" ? "bg-emerald-500 text-[#0B0F19]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Na Cadeira ({inServiceList.length})
                </button>
                <button
                  onClick={() => setActiveTab("concluidos")}
                  className={`px-3 py-1 text-xs font-bold rounded-[2px] transition-colors cursor-pointer ${
                    activeTab === "concluidos" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Concluídos ({finishedList.length})
                </button>
              </div>
            </div>

            {/* Conteúdo da Fila: Aguardando */}
            {activeTab === "fila" && (
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    placeholder="Filtrar cliente ou barbeiro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs bg-[#0A0D14] border-white/10 text-white rounded-[4px]"
                  />
                </div>

                {filteredWaiting.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                    <UserCheck className="h-8 w-8 mx-auto text-slate-600" />
                    <p>Nenhum cliente aguardando no momento.</p>
                    <Button
                      size="sm"
                      onClick={() => setModalFilaOpen(true)}
                      className="text-xs bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/25 rounded-[4px] shadow-none cursor-pointer"
                    >
                      + Inserir Cliente na Fila
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredWaiting.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="rounded-[3px] bg-[#0A0D14] border border-white/10 p-3.5 flex items-center justify-between gap-3 hover:border-[#D4AF37]/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-[2px] bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-xs">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-white leading-tight">{item.client_name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {item.service_name || "Corte / Barba"} • Barbeiro:{" "}
                              <span className="text-[#D4AF37] font-semibold">{item.barber_name || "Qualquer Barbeiro"}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleCallToChair(item)}
                            className="h-8 px-3 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-[4px] gap-1 shadow-none cursor-pointer"
                            title="Chamar cliente para a cadeira"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>Chamar</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFromQueue(item)}
                            className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-[4px] cursor-pointer"
                            title="Remover da fila"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da Fila: Na Cadeira */}
            {activeTab === "cadeira" && (
              <div className="mt-4 space-y-2.5">
                {inServiceList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                    <Scissors className="h-8 w-8 mx-auto text-slate-600" />
                    <p>Nenhuma cadeira ocupada no momento.</p>
                  </div>
                ) : (
                  inServiceList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="rounded-[3px] bg-[#0A0D14] border border-emerald-500/30 p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-[2px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          <Scissors className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-xs text-white leading-tight">{item.client_name}</p>
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] py-0 rounded-[2px]">Cortando</Badge>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {item.service_name || "Serviço"} • Atendido por:{" "}
                            <span className="text-white font-semibold">{item.barber_name || "Barbeiro"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            handleFinishService(item);
                            onOpenNovoAtendimento();
                          }}
                          className="h-8 px-3 text-xs font-bold bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] rounded-[4px] gap-1 shadow-none cursor-pointer transition-colors"
                          title="Finalizar e lançar pagamento no caixa"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                          <span>Finalizar & Cobrar</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Conteúdo da Fila: Concluídos */}
            {activeTab === "concluidos" && (
              <div className="mt-4 space-y-2.5">
                {finishedList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    <p>Nenhum atendimento finalizado hoje ainda.</p>
                  </div>
                ) : (
                  finishedList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="rounded-[3px] bg-[#0A0D14] border border-white/10 p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-200">{item.client_name}</p>
                        <p className="text-[11px] text-slate-400">
                          {item.service_name || "Serviço"} • Barbeiro: {item.barber_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-white/10 text-slate-300 text-[10px] rounded-[2px]">Concluído</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenNFSeModal(item)}
                          className="h-7 text-[11px] bg-white/5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1 rounded-[4px] shadow-none cursor-pointer"
                          title="Emitir NFS-e Simplificada (Salão Parceiro)"
                        >
                          <FileText className="h-3 w-3" />
                          <span>NFS-e</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita (Agendamentos de Hoje - 5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-5 shadow-none">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-400" />
                <h3 className="font-display text-sm font-bold text-white">Agendamentos de Hoje</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/atendimentos")}
                className="h-7 text-[11px] bg-transparent border-white/10 text-slate-300 hover:text-white rounded-[4px] shadow-none"
              >
                Abrir Agenda Completa
              </Button>
            </div>

            <div className="mt-4 space-y-2.5">
              {todayAppointments.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                  <CalendarIcon className="h-8 w-8 mx-auto text-slate-600" />
                  <p>Sem agendamentos registrados para o dia de hoje.</p>
                </div>
              ) : (
                todayAppointments.slice(0, 8).map((apt, idx) => (
                  <div
                    key={apt.id || idx}
                    className="rounded-[3px] bg-[#0A0D14] border border-white/10 p-3 flex items-center justify-between gap-3 text-xs hover:border-blue-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-[2px] border border-blue-500/20">
                        {apt.time ? apt.time.slice(0, 5) : "--:--"}
                      </span>
                      <div>
                        <p className="font-bold text-white">{apt.client_name}</p>
                        <p className="text-[11px] text-slate-400">
                          {apt.service_name || "Serviço"} • {apt.barber_name}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        api.post("/queue", {
                          client_name: apt.client_name,
                          client_phone: apt.client_phone || null,
                          barber_id: apt.barber_id || null,
                          service_id: apt.service_id || null,
                          date: today,
                          status: "aguardando",
                        }).then(() => {
                          toast.success(`${apt.client_name} inserido na fila de espera!`);
                          loadBalcaoData();
                        }).catch(() => toast.error("Erro ao inserir na fila"));
                      }}
                      className="h-7 text-[11px] bg-white/10 hover:bg-[#D4AF37] hover:text-[#0B0F19] text-slate-300 font-semibold rounded-[4px] transition-colors cursor-pointer shadow-none"
                    >
                      Check-in
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Adicionar Cliente à Fila de Espera */}
      <Dialog open={modalFilaOpen} onOpenChange={setModalFilaOpen}>
        <DialogContent className="bg-[#12141F] border-white/10 text-white max-w-md rounded-[4px] shadow-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserPlus className="h-5 w-5 text-[#D4AF37]" />
              <span>Adicionar Cliente à Fila</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Registre a chegada de um cliente no balcão da recepção.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddToQueue} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Nome do Cliente *</Label>
              <Input
                required
                placeholder="Ex: Carlos Eduardo"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="bg-[#0A0D14] border-white/10 text-white text-xs h-9 rounded-[4px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Telefone / WhatsApp (Opcional)</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                className="bg-[#0A0D14] border-white/10 text-white text-xs h-9 rounded-[4px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Barbeiro Preferido</Label>
              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className="w-full bg-[#0A0D14] border border-white/10 rounded-[4px] text-white text-xs h-9 px-3 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              >
                <option value="">Qualquer Barbeiro (Próximo Disponível)</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Serviço Pretendido</Label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full bg-[#0A0D14] border border-white/10 rounded-[4px] text-white text-xs h-9 px-3 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              >
                <option value="">Selecione o serviço</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({brl(s.price)})
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalFilaOpen(false)}
                className="text-xs text-slate-400 hover:text-white rounded-[4px] cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingQueue}
                className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs rounded-[4px] shadow-none cursor-pointer transition-colors"
              >
                {submittingQueue ? "Inserindo..." : "Inserir na Fila"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Emissão NFS-e Simplificada */}
      <Dialog open={nfseModalOpen} onOpenChange={setNfseModalOpen}>
        <DialogContent className="bg-[#12141F] border-white/10 text-white max-w-md rounded-[4px] shadow-none">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              <span>Emissão Fiscal NFS-e Simplificada</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Conformidade Lei do Salão Parceiro (Lei 13.352/2016)
            </DialogDescription>
          </DialogHeader>

          {lastEmission ? (
            <div className="space-y-4 py-2">
              <div className="rounded-[4px] bg-[#0A0D14] border border-emerald-500/40 p-4 text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="h-5 w-5 stroke-[3]" />
                </div>
                <p className="font-bold text-emerald-300 text-sm">Nota Fiscal Autorizada!</p>
                <p className="text-xs text-slate-300 font-mono">
                  Protocolo: {lastEmission.protocolo}
                </p>
                <p className="text-[11px] text-slate-400">
                  Número: {lastEmission.numero_nota} • ISS: {lastEmission.aliquota_iss}%
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  onClick={() => setNfseModalOpen(false)}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs rounded-[4px] shadow-none cursor-pointer"
                >
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-[3px] bg-[#0A0D14] border border-white/10 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cliente:</span>
                  <span className="font-bold text-white">{selectedItemNFSe?.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Serviço:</span>
                  <span className="text-slate-200">{selectedItemNFSe?.service_name || "Serviço de Barbearia"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Profissional Parceiro:</span>
                  <span className="text-slate-200">{selectedItemNFSe?.barber_name || "Barbeiro"}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/10">
                  <span className="text-slate-400 font-semibold">Valor do Serviço:</span>
                  <span className="font-bold text-[#D4AF37]">{brl(selectedItemNFSe?.price || 45)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  CPF do Cliente (Opcional)
                </Label>
                <Input
                  placeholder="000.000.000-00 (em branco para Consumidor Final)"
                  value={nfseCpf}
                  onChange={(e) => setNfseCpf(e.target.value)}
                  className="bg-[#0A0D14] border-white/10 text-white text-xs h-9 rounded-[4px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  E-mail para envio da NFS-e (Opcional)
                </Label>
                <Input
                  type="email"
                  placeholder="cliente@email.com"
                  value={nfseEmail}
                  onChange={(e) => setNfseEmail(e.target.value)}
                  className="bg-[#0A0D14] border-white/10 text-white text-xs h-9 rounded-[4px]"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setNfseModalOpen(false)}
                  className="text-xs text-slate-400 hover:text-white rounded-[4px] cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleEmitirNFSe}
                  disabled={emittingNFSe}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 rounded-[4px] shadow-none cursor-pointer"
                >
                  {emittingNFSe ? (
                    "Transmitindo..."
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5" />
                      <span>Emitir NFS-e</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
