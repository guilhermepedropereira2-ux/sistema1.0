import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Ticket,
  Clock,
  Crown,
  X,
  MessageCircle,
  MoreVertical,
  SlidersHorizontal,
  User,
  Users,
  CheckCircle2,
  Calendar,
  Mail,
  Infinity as InfinityIcon,
  Scissors,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Package,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ClientAvatar from "@/components/ClientAvatar";
import ClientPhotoUpload from "@/components/ClientPhotoUpload";
import { INITIAL_CLIENTS, CLIENTES_METRICS } from "@/data/clientesData";

export default function Clientes() {
  const navigate = useNavigate();

  // Lista de clientes com estado local para permitir adicionar, editar e excluir
  const [clients, setClients] = useState(INITIAL_CLIENTS);

  // Cliente selecionado no painel lateral desktop (Lucas Fernandes por padrão no gabarito)
  const [selectedClientId, setSelectedClientId] = useState("cli-1");

  // Cliente para visualização em Sheet/Drawer no mobile
  const [mobileDetailClient, setMobileDetailClient] = useState(null);

  // Filtros e busca
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("todos"); // "todos" | "com_plano" | "sem_plano" | "ativos" | "inativos"
  const [filterPlan, setFilterPlan] = useState("todos"); // "todos" | "vip" | "corte_livre" | "fidelidade" | "barba" | "mensal" | "sem_plano"
  const [filterSignature, setFilterSignature] = useState("todas"); // "todas" | "ativa" | "vencendo" | "vencida" | "sem_assinatura"

  // Modal de Novo / Editar Cliente
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    cpf: "",
    birthdate: "",
    photo: "",
    avatar: "",
    plan_id: "",
    notes: "",
  });

  // Aba ativa no painel de detalhes (desktop & mobile)
  const [activeTab, setActiveTab] = useState("visao_geral"); // "visao_geral" | "atendimentos" | "assinatura" | "historico"

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 31;

  // Cliente selecionado atualmente no painel lateral
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || clients[0] || null;
  }, [clients, selectedClientId]);

  // Filtragem da lista
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Busca por nome, telefone ou CPF
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = (c.phone || "").toLowerCase().includes(q);
        const matchCpf = (c.cpf || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCpf) return false;
      }

      // Filtro tipo (chips no mobile / dropdown desktop)
      if (filterType === "com_plano" && !c.hasPlan) return false;
      if (filterType === "sem_plano" && c.hasPlan) return false;
      if (filterType === "ativos" && c.status === "inativo") return false;
      if (filterType === "inativos" && c.status !== "inativo") return false;

      // Filtro plano
      if (filterPlan !== "todos") {
        if (filterPlan === "sem_plano" && c.hasPlan) return false;
        if (filterPlan !== "sem_plano" && (!c.plan || c.plan.type !== filterPlan)) return false;
      }

      // Filtro assinatura
      if (filterSignature !== "todas") {
        if (filterSignature === "sem_assinatura" && c.hasPlan) return false;
        if (filterSignature === "ativa" && c.status !== "ativo") return false;
        if (filterSignature === "vencendo" && c.status !== "vencendo") return false;
        if (filterSignature === "vencida" && c.status !== "vencida") return false;
      }

      return true;
    });
  }, [clients, searchQuery, filterType, filterPlan, filterSignature]);

  // Abertura do formulário de novo cliente
  const openNew = () => {
    setEditingClient(null);
    setForm({
      name: "",
      phone: "",
      email: "",
      cpf: "",
      birthdate: "",
      photo: "",
      avatar: "",
      plan_id: "",
      notes: "",
    });
    setModalOpen(true);
  };

  // Abertura do formulário de edição
  const openEdit = (client, e) => {
    e?.stopPropagation();
    setEditingClient(client);
    setForm({
      name: client.name || "",
      phone: client.phone || "",
      email: client.email || "",
      cpf: client.cpf || "",
      birthdate: client.birthdate || "",
      photo: client.photo || client.avatar || "",
      avatar: client.avatar || client.photo || "",
      plan_id: client.plan?.type || "",
      notes: client.notes || "",
    });
    setModalOpen(true);
  };

  // Salvar cliente
  const handleSaveClient = () => {
    if (!form.name.trim()) {
      toast.error("Por favor, informe o nome do cliente.");
      return;
    }

    if (editingClient) {
      // Atualiza cliente existente
      setClients((prev) =>
        prev.map((c) =>
          c.id === editingClient.id
            ? {
                ...c,
                name: form.name.trim(),
                phone: form.phone.trim() || c.phone,
                email: form.email.trim() || c.email,
                cpf: form.cpf.trim() || c.cpf,
                birthdate: form.birthdate || c.birthdate,
                photo: form.photo || "",
                avatar: form.photo || "",
                notes: form.notes || c.notes,
              }
            : c
        )
      );
      toast.success("Cliente atualizado com sucesso!");
    } else {
      // Cria novo cliente
      const newClient = {
        id: `cli-${Date.now()}`,
        name: form.name.trim(),
        phone: form.phone.trim() || "(67) 99000-0000",
        email: form.email.trim() || "cliente@email.com",
        cpf: form.cpf.trim() || "000.000.000-00",
        birthdate: form.birthdate || "1995-01-01",
        photo: form.photo || "",
        avatar: form.photo || "",
        clientSince: new Date().toLocaleDateString("pt-BR"),
        status: form.plan_id ? "ativo" : "sem_plano",
        statusLabel: form.plan_id ? "Ativa" : "Sem plano",
        hasPlan: Boolean(form.plan_id),
        plan: form.plan_id
          ? {
              type: form.plan_id,
              name: form.plan_id === "vip" ? "VIP Mensal" : "Plano Mensal",
              subtitle: "4 Cortes + 2 Barbas",
              price: 129.90,
              period: "/mês",
              used: 0,
              total: 4,
              remaining: 4,
              isUnlimited: false,
              renewalDate: "06/11/2026",
              status: "ativo",
              statusBadge: "Assinatura Ativa",
            }
          : null,
        totalVisits: 1,
        totalSpent: 40.00,
        lastAttendance: {
          date: new Date().toLocaleDateString("pt-BR"),
          time: "10:00",
          service: "Corte Masculino",
          price: 40.00,
          barber: "Carlos",
        },
        recentAttendances: [
          {
            id: `at-${Date.now()}`,
            date: new Date().toLocaleDateString("pt-BR"),
            time: "10:00",
            service: "Corte Masculino",
            price: 40.00,
            barber: "Carlos",
          },
        ],
        notes: form.notes || "",
      };

      setClients((prev) => [newClient, ...prev]);
      setSelectedClientId(newClient.id);
      toast.success("Cliente cadastrado com sucesso!");
    }

    setModalOpen(false);
  };

  // Excluir cliente
  const handleDeleteClient = (client, e) => {
    e?.stopPropagation();
    if (window.confirm(`Deseja realmente excluir o cliente "${client.name}"?`)) {
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      if (selectedClientId === client.id) {
        const remaining = clients.filter((c) => c.id !== client.id);
        if (remaining.length > 0) {
          setSelectedClientId(remaining[0].id);
        }
      }
      setMobileDetailClient(null);
      toast.success("Cliente removido com sucesso.");
    }
  };

  // Disparo de WhatsApp
  const handleOpenWhatsApp = (client, e) => {
    e?.stopPropagation();
    if (!client.phone) {
      toast.error("Telefone não informado.");
      return;
    }
    const cleanPhone = client.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${client.name.split(" ")[0]}, tudo bem? Aqui é da barbearia KUPOLA!`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
    toast.success(`Abrindo WhatsApp para ${client.name.split(" ")[0]}...`);
  };

  // Renderiza o badge de plano com barra de progresso no estilo KUPOLA 2.0
  const renderPlanBadge = (client) => {
    if (!client.hasPlan || !client.plan) {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-300 bg-[#121824] border border-[#1C2536]">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            Sem plano
          </span>
          <span className="text-[10px] text-slate-400">Nenhuma assinatura ativa</span>
        </div>
      );
    }

    const { plan } = client;

    // Plano ilimitado
    if (plan.isUnlimited) {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-blue-300 bg-[#0F233E] border border-blue-500/40 shadow-sm">
            <InfinityIcon className="w-3.5 h-3.5 text-blue-400" />
            {plan.name}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <InfinityIcon className="w-2.5 h-2.5 text-blue-400" />
            <span>Uso ilimitado</span>
          </div>
        </div>
      );
    }

    // Plano Fidelidade
    if (plan.type === "fidelity") {
      return (
        <div className="flex flex-col items-start gap-1 min-w-[130px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-300 bg-[#2A1E0D] border border-amber-500/40">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            {plan.name}
          </span>
          <div className="flex items-center gap-2 w-full">
            <span className="text-[10px] text-slate-400 whitespace-nowrap">
              <strong className="text-amber-300">{plan.used}/{plan.total}</strong> utilizados
            </span>
            <div className="flex-1 h-1.5 bg-[#080B10] rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${(plan.used / plan.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      );
    }

    // Barba Premium
    if (plan.type === "barba") {
      return (
        <div className="flex flex-col items-start gap-1 min-w-[130px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-purple-300 bg-[#251230] border border-purple-500/40">
            <Scissors className="w-3.5 h-3.5 text-purple-400" />
            {plan.name}
          </span>
          <div className="flex items-center gap-2 w-full">
            <span className="text-[10px] text-slate-400 whitespace-nowrap">
              <strong className="text-purple-300">{plan.used}/{plan.total}</strong> utilizados
            </span>
            <div className="flex-1 h-1.5 bg-[#080B10] rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-purple-400 rounded-full"
                style={{ width: `${(plan.used / plan.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      );
    }

    // Plano Mensal (Vencido)
    if (plan.status === "vencida" || plan.type === "mensal") {
      return (
        <div className="flex flex-col items-start gap-1 min-w-[130px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-red-300 bg-[#2D1217] border border-red-500/40">
            <Ticket className="w-3.5 h-3.5 text-red-400" />
            {plan.name}
          </span>
          <div className="flex items-center gap-2 w-full">
            <span className="text-[10px] text-slate-400 whitespace-nowrap">
              <strong className="text-red-400">{plan.used}/{plan.total}</strong> utilizados
            </span>
            <div className="flex-1 h-1.5 bg-[#080B10] rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{ width: `${(plan.used / plan.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      );
    }

    // VIP Mensal (Padrão Gold)
    return (
      <div className="flex flex-col items-start gap-1 min-w-[130px]">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#E5C365] bg-[#221B0E] border border-[#D4AF37]/50 shadow-sm">
          <Crown className="w-3.5 h-3.5 text-[#E5C365]" />
          {plan.name}
        </span>
        <div className="flex items-center gap-2 w-full">
          <span className="text-[10px] text-slate-400 whitespace-nowrap">
            <strong className="text-[#E5C365]">{plan.used}/{plan.total}</strong> utilizados
          </span>
          <div className="flex-1 h-1.5 bg-[#080B10] rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E5C365] rounded-full"
              style={{ width: `${(plan.used / plan.total) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Renderiza o badge de status do cliente
  const renderStatusBadge = (client) => {
    if (!client.hasPlan) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-400 bg-white/5 border border-white/10">
          <Package className="w-3 h-3 text-slate-400" />
          Sem plano
        </span>
      );
    }

    if (client.status === "vencida") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Vencida
        </span>
      );
    }

    if (client.status === "vencendo") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Vence em 14 dias
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#20C997] bg-[#20C997]/15 border border-[#20C997]/30">
        <span className="w-1.5 h-1.5 rounded-full bg-[#20C997]" />
        Ativa
      </span>
    );
  };

  return (
    <div className="space-y-5 max-w-full 2xl:max-w-[1920px] mx-auto select-none" data-testid="clientes-page">
      {/* 1. TÍTULO E BOTÕES DE AÇÃO SUPERIORES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
            Clientes
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Gerencie seus clientes, planos e assinaturas
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={openNew}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#E5C365] text-[#05070B] font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-lg shadow-lg shadow-[#D4AF37]/10 transition-all cursor-pointer hover:scale-[1.01]"
            data-testid="btn-novo-cliente"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Cliente</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/planos-clientes")}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-[#0D121B] hover:bg-[#121824] text-[#E5C365] border border-[#D4AF37]/40 hover:border-[#D4AF37] font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-lg transition-all cursor-pointer"
            data-testid="btn-gerenciar-planos"
          >
            <Ticket className="w-4 h-4 text-[#D4AF37]" />
            <span>Gerenciar Planos</span>
          </button>
        </div>
      </div>

      {/* 2. QUATRO CARDS DE INDICADORES (Desktop em linha / Mobile 2x2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {/* Card 1: Clientes cadastrados */}
        <div className="p-4 rounded-xl bg-[#0D121B] border border-[#161E2C] hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#111722] border border-[#1C2536] flex items-center justify-center text-[#E5C365] shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#E5C365]" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#20C997] bg-[#20C997]/15 border border-[#20C997]/30 px-1.5 py-0.5 rounded-md">
              ↑ 12%
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[11px] sm:text-xs font-medium text-slate-400 block leading-tight">
              Clientes cadastrados
            </span>
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 block">
              {CLIENTES_METRICS.totalClients}
            </span>
            <span className="text-[10.5px] text-slate-400 mt-1 block truncate">
              {CLIENTES_METRICS.totalClientsComparison}
            </span>
          </div>
        </div>

        {/* Card 2: Clientes ativos */}
        <div className="p-4 rounded-xl bg-[#0D121B] border border-[#161E2C] hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#111722] border border-[#1C2536] flex items-center justify-center text-[#E5C365] shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#E5C365]" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#20C997] bg-[#20C997]/15 border border-[#20C997]/30 px-1.5 py-0.5 rounded-md">
              ↑ 8%
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[11px] sm:text-xs font-medium text-slate-400 block leading-tight">
              Clientes ativos
            </span>
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 block">
              {CLIENTES_METRICS.activeClients}
            </span>
            <span className="text-[10.5px] text-slate-400 mt-1 block truncate">
              {CLIENTES_METRICS.activeClientsComparison}
            </span>
          </div>
        </div>

        {/* Card 3: Assinaturas ativas */}
        <div className="p-4 rounded-xl bg-[#0D121B] border border-[#161E2C] hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#111722] border border-[#1C2536] flex items-center justify-center text-[#E5C365] shrink-0">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-[#E5C365]" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#20C997] bg-[#20C997]/15 border border-[#20C997]/30 px-1.5 py-0.5 rounded-md">
              ↑ 20%
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[11px] sm:text-xs font-medium text-slate-400 block leading-tight">
              Assinaturas ativas
            </span>
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 block">
              {CLIENTES_METRICS.activeSubscriptions}
            </span>
            <span className="text-[10.5px] text-slate-400 mt-1 block truncate">
              {CLIENTES_METRICS.activeSubscriptionsComparison}
            </span>
          </div>
        </div>

        {/* Card 4: Receita recorrente */}
        <div className="p-4 rounded-xl bg-[#0D121B] border border-[#161E2C] hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#111722] border border-[#1C2536] flex items-center justify-center text-[#E5C365] shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-[#E5C365]" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#20C997] bg-[#20C997]/15 border border-[#20C997]/30 px-1.5 py-0.5 rounded-md">
              ↑ 15%
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[11px] sm:text-xs font-medium text-slate-400 block leading-tight">
              Receita recorrente
            </span>
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 block">
              {CLIENTES_METRICS.recurrentRevenue}
            </span>
            <span className="text-[10.5px] text-slate-400 mt-1 block truncate">
              {CLIENTES_METRICS.recurrentRevenueComparison}
            </span>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS E BUSCA */}
      <div className="space-y-3">
        {/* Linha de Busca + Filtros Desktop */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Campo de Busca */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar clientes..."
              className="w-full pl-9 pr-3 py-2 bg-[#0D121B] border border-[#161E2C] hover:border-slate-700 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-lg text-xs text-white placeholder:text-slate-500 outline-none transition-all"
            />
          </div>

          {/* Select: Todos os clientes */}
          <div className="hidden lg:block w-44">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full py-2 px-3 bg-[#0D121B] border border-[#161E2C] hover:border-slate-700 rounded-lg text-xs text-white outline-none cursor-pointer"
            >
              <option value="todos">Todos os clientes</option>
              <option value="ativos">Clientes ativos</option>
              <option value="inativos">Clientes inativos</option>
              <option value="com_plano">Com plano ativo</option>
              <option value="sem_plano">Sem plano vinculado</option>
            </select>
          </div>

          {/* Select: Todos os planos */}
          <div className="hidden lg:block w-44">
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="w-full py-2 px-3 bg-[#0D121B] border border-[#161E2C] hover:border-slate-700 rounded-lg text-xs text-white outline-none cursor-pointer"
            >
              <option value="todos">Todos os planos</option>
              <option value="vip">VIP Mensal</option>
              <option value="unlimited">Corte Livre</option>
              <option value="fidelity">Plano Fidelidade</option>
              <option value="barba">Barba Premium</option>
              <option value="mensal">Plano Mensal</option>
              <option value="sem_plano">Sem plano</option>
            </select>
          </div>

          {/* Select: Todas as assinaturas */}
          <div className="hidden lg:block w-48">
            <select
              value={filterSignature}
              onChange={(e) => setFilterSignature(e.target.value)}
              className="w-full py-2 px-3 bg-[#0D121B] border border-[#161E2C] hover:border-slate-700 rounded-lg text-xs text-white outline-none cursor-pointer"
            >
              <option value="todas">Todas as assinaturas</option>
              <option value="ativa">Assinatura Ativa</option>
              <option value="vencendo">Vencendo em breve</option>
              <option value="vencida">Assinatura Vencida</option>
              <option value="sem_assinatura">Nenhuma assinatura</option>
            </select>
          </div>

          {/* Botão de Filtros Avançados */}
          <button
            type="button"
            className="p-2 rounded-lg bg-[#0D121B] border border-[#161E2C] hover:border-[#D4AF37]/50 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Filtros avançados"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Chips de Filtro Mobile (Aparece em telas < lg conforme Imagem 2) */}
        <div className="flex lg:hidden items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "todos", label: "Todos" },
            { id: "com_plano", label: "Com plano" },
            { id: "sem_plano", label: "Sem plano" },
            { id: "ativos", label: "Ativos" },
            { id: "inativos", label: "Inativos" },
          ].map((chip) => {
            const isSelected = filterType === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilterType(chip.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#E5C365] text-[#05070B] shadow-md"
                    : "bg-[#0D121B] text-slate-300 border border-[#161E2C] hover:border-slate-700"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. COMPOSIÇÃO DESKTOP: TABELA COMPACTA + PAINEL LATERAL (LG e UP) */}
      <div className="hidden lg:flex items-start gap-4">
        {/* Tabela de Clientes */}
        <div className="flex-1 min-w-0 bg-[#0D121B] border border-[#161E2C] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#161E2C] bg-[#0A0E15]/50 text-slate-400 font-semibold text-[11px]">
                  <th className="py-3 px-4">Cliente ↕</th>
                  <th className="py-3 px-4">Telefone</th>
                  <th className="py-3 px-4">Plano / Assinatura</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Último atendimento</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161E2C]">
                {filteredClients.map((client) => {
                  const isSelected = selectedClientId === client.id;
                  return (
                    <tr
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`group transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#121824] relative border-l-2 border-l-[#D4AF37]"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Cliente (Avatar + Nome + Data) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <ClientAvatar
                            name={client.name}
                            photo={client.photo || client.avatar}
                            size="md"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate group-hover:text-[#E5C365] transition-colors">
                              {client.name}
                            </span>
                            <span className="text-[10.5px] text-slate-400 block truncate">
                              Cliente desde {client.clientSince}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Telefone + WhatsApp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleOpenWhatsApp(client, e)}
                            className="w-5 h-5 rounded-full bg-emerald-500/20 text-[#20C997] flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3 fill-current" />
                          </button>
                          <span className="text-slate-300 font-medium">
                            {client.phone}
                          </span>
                        </div>
                      </td>

                      {/* Plano / Assinatura */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderPlanBadge(client)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge(client)}
                      </td>

                      {/* Último atendimento */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {client.lastAttendance ? (
                          <div>
                            <span className="text-slate-200 font-medium block">
                              {client.lastAttendance.date}
                            </span>
                            <span className="text-[10.5px] text-slate-400 block">
                              {client.lastAttendance.service}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* WhatsApp */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenWhatsApp(client, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#20C997] hover:bg-[#20C997]/10 transition-colors cursor-pointer"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={(e) => openEdit(client, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#E5C365] hover:bg-white/5 transition-colors cursor-pointer"
                            title="Editar cliente"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Menu Dropdown Mais Opções */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#0D121B] border-[#161E2C] text-white text-xs w-44">
                              <DropdownMenuItem
                                onClick={() => setSelectedClientId(client.id)}
                                className="hover:bg-white/5 cursor-pointer text-slate-300"
                              >
                                Visualizar detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => openEdit(client, e)}
                                className="hover:bg-white/5 cursor-pointer text-slate-300"
                              >
                                Editar cadastro
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate("/planos-clientes")}
                                className="hover:bg-white/5 cursor-pointer text-[#E5C365]"
                              >
                                Gerenciar planos
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[#161E2C]" />
                              <DropdownMenuItem
                                onClick={(e) => handleDeleteClient(client, e)}
                                className="hover:bg-red-500/10 text-red-400 cursor-pointer"
                              >
                                Excluir cliente
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação da Tabela */}
          <div className="py-3 px-4 border-t border-[#161E2C] flex items-center justify-between text-xs text-slate-400">
            <span>Mostrando 1–{filteredClients.length} de {CLIENTES_METRICS.totalClients} clientes</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="w-7 h-7 rounded-md bg-[#111722] border border-[#161E2C] flex items-center justify-center hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-md bg-[#D4AF37] text-[#05070B] font-bold flex items-center justify-center shadow-sm cursor-pointer"
              >
                1
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-md bg-[#111722] border border-[#161E2C] flex items-center justify-center hover:text-white transition-colors cursor-pointer"
              >
                2
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-md bg-[#111722] border border-[#161E2C] flex items-center justify-center hover:text-white transition-colors cursor-pointer"
              >
                3
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-md bg-[#111722] border border-[#161E2C] flex items-center justify-center hover:text-white transition-colors cursor-pointer"
              >
                4
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-md bg-[#111722] border border-[#161E2C] flex items-center justify-center hover:text-white transition-colors cursor-pointer"
              >
                5
              </button>
              <span className="px-1 text-slate-600">...</span>
              <button
                type="button"
                className="w-7 h-7 rounded-md bg-[#111722] border border-[#161E2C] flex items-center justify-center hover:text-white transition-colors cursor-pointer"
              >
                31
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-md bg-[#111722] border border-[#161E2C] flex items-center justify-center hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* PAINEL LATERAL DIREITO (DESKTOP) */}
        {selectedClient && (
          <div className="w-[380px] xl:w-[410px] 2xl:w-[440px] shrink-0 bg-[#0D121B] border border-[#161E2C] rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in-50 duration-200">
            {/* Cabeçalho do Painel: Avatar Grande + Nome + Status + Fechar */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#161E2C]">
              <div className="flex items-center gap-3 min-w-0">
                <ClientAvatar
                  name={selectedClient.name}
                  photo={selectedClient.photo || selectedClient.avatar}
                  size="lg"
                  className="ring-2 ring-[#D4AF37]/40 shadow-lg"
                />
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-base truncate font-display">
                    {selectedClient.name}
                  </h3>
                  <div className="mt-0.5">
                    {renderStatusBadge(selectedClient)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClientId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Fechar painel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas do Painel */}
            <div className="flex items-center gap-4 border-b border-[#161E2C] text-xs font-semibold">
              {[
                { id: "visao_geral", label: "Visão geral" },
                { id: "atendimentos", label: "Atendimentos" },
                { id: "assinatura", label: "Assinatura" },
                { id: "historico", label: "Histórico" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-2.5 transition-colors relative cursor-pointer ${
                      isActive
                        ? "text-[#E5C365] border-b-2 border-[#E5C365]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Conteúdo da Aba: Visão Geral */}
            <div className="space-y-4 text-xs">
              {/* Card de Contatos & Ações Rápidas */}
              <div className="p-3.5 rounded-xl bg-[#090D14] border border-[#161E2C] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleOpenWhatsApp(selectedClient, e)}
                      className="w-5 h-5 rounded-full bg-emerald-500/20 text-[#20C997] flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                    >
                      <MessageCircle className="w-3 h-3 fill-current" />
                    </button>
                    <span className="text-white font-medium">{selectedClient.phone}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => openEdit(selectedClient, e)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E5C365] hover:text-[#f3d98b] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 px-2 py-1 rounded-md transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-[11.5px]">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{selectedClient.email || "Sem e-mail informado"}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-[11.5px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cliente desde {selectedClient.clientSince}</span>
                </div>
              </div>

              {/* Card de Assinatura / Plano */}
              {selectedClient.hasPlan && selectedClient.plan ? (
                <div className="p-3.5 rounded-xl bg-[#090D14] border border-[#D4AF37]/25 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E5C365] bg-[#221B0E] border border-[#D4AF37]/50 px-2.5 py-1 rounded-md">
                      <Crown className="w-3.5 h-3.5 text-[#E5C365]" />
                      {selectedClient.plan.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#20C997]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#20C997]" />
                      {selectedClient.plan.statusBadge}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-white font-medium block">
                      {selectedClient.plan.subtitle}
                    </span>
                    <span className="text-xs font-bold text-slate-300 block mt-0.5">
                      R$ {selectedClient.plan.price.toFixed(2).replace(".", ",")}{selectedClient.plan.period}
                    </span>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-semibold">
                        {selectedClient.plan.used}/{selectedClient.plan.total} utilizados
                      </span>
                      <span className="text-slate-400">
                        {selectedClient.plan.remaining} créditos restantes
                      </span>
                    </div>
                    <div className="h-2 bg-[#121824] rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E5C365] rounded-full"
                        style={{
                          width: `${(selectedClient.plan.used / selectedClient.plan.total) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 text-right block">
                      Renova em: {selectedClient.plan.renewalDate}
                    </span>
                  </div>

                  {/* Botões do Plano */}
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <button
                      type="button"
                      className="flex-1 py-1.5 text-center text-xs font-medium text-slate-300 bg-[#121824] hover:bg-[#182030] rounded-lg border border-[#1C2536] transition-colors cursor-pointer"
                    >
                      Ver detalhes
                    </button>
                    <button
                      type="button"
                      className="flex-1 py-1.5 text-center text-xs font-medium text-[#E5C365] bg-[#221B0E] hover:bg-[#2C2313] rounded-lg border border-[#D4AF37]/40 transition-colors cursor-pointer"
                    >
                      Renovar
                    </button>
                    <button
                      type="button"
                      className="flex-1 py-1.5 text-center text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/30 transition-colors cursor-pointer"
                    >
                      Desvincular
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#090D14] border border-[#161E2C] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Sem plano vinculado</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Nenhuma assinatura ativa</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/planos-clientes")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#E5C365] border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3 py-1.5 rounded-lg hover:bg-[#D4AF37]/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Vincular Plano
                  </button>
                </div>
              )}

              {/* Estatísticas Rápidas (3 cards) */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-[#090D14] border border-[#161E2C]">
                  <span className="text-[10px] text-slate-400 block">Total atendimentos</span>
                  <span className="text-sm font-black text-white mt-0.5 block">{selectedClient.totalVisits}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#090D14] border border-[#161E2C]">
                  <span className="text-[10px] text-slate-400 block">Total gasto</span>
                  <span className="text-sm font-black text-white mt-0.5 block">R$ {selectedClient.totalSpent.toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#090D14] border border-[#161E2C]">
                  <span className="text-[10px] text-slate-400 block">Último atendimento</span>
                  <span className="text-[11px] font-bold text-white mt-0.5 block truncate">
                    {selectedClient.lastAttendance?.date || "—"}
                  </span>
                  <span className="text-[9.5px] text-slate-400 truncate block">
                    {selectedClient.lastAttendance?.service || ""}
                  </span>
                </div>
              </div>

              {/* Últimos Atendimentos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Últimos atendimentos</span>
                  <button
                    type="button"
                    onClick={() => navigate("/atendimentos")}
                    className="text-[11px] font-semibold text-[#E5C365] hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    Ver todos →
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(selectedClient.recentAttendances || []).map((att) => (
                    <div
                      key={att.id}
                      className="p-2.5 rounded-lg bg-[#090D14] border border-[#161E2C] flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-slate-300 font-medium block truncate">
                            {att.date} {att.time} · {att.service}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-white font-bold block">
                          R$ {att.price.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{att.barber}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <span className="font-bold text-white text-xs block">Observações</span>
                <p className="text-[11px] text-slate-300 bg-[#090D14] border border-[#161E2C] p-2.5 rounded-lg leading-relaxed">
                  {selectedClient.notes || "Nenhuma observação registrada."}
                </p>
              </div>

              {/* Botões Inferiores do Painel */}
              <div className="space-y-2 pt-2 border-t border-[#161E2C]">
                <button
                  type="button"
                  onClick={(e) => handleOpenWhatsApp(selectedClient, e)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#221B0E] hover:bg-[#2C2313] border border-[#D4AF37]/50 text-[#E5C365] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  Enviar mensagem
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteClient(selectedClient, e)}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-500/5 hover:bg-red-500/15 border border-red-500/30 text-red-400 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir cliente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. COMPOSIÇÃO MOBILE: CARDS VERTICAIS DE CLIENTES (< LG) */}
      <div className="block lg:hidden space-y-3">
        {filteredClients.map((client) => {
          return (
            <div
              key={client.id}
              className="p-4 rounded-2xl bg-[#0D121B] border border-[#161E2C] space-y-3.5 shadow-lg"
            >
              {/* Linha Superior: Avatar Grande + Nome + WhatsApp + Menu */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <ClientAvatar
                    name={client.name}
                    photo={client.photo || client.avatar}
                    size="lg"
                    className="ring-2 ring-[#D4AF37]/30 shadow-md shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-white text-sm truncate font-display">
                        {client.name}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => handleOpenWhatsApp(client, e)}
                        className="w-4 h-4 rounded-full bg-emerald-500/20 text-[#20C997] flex items-center justify-center shrink-0"
                      >
                        <MessageCircle className="w-2.5 h-2.5 fill-current" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-300 font-medium block mt-0.5">
                      {client.phone}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Cliente desde {client.clientSince}
                    </span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#0D121B] border-[#161E2C] text-white text-xs">
                    <DropdownMenuItem
                      onClick={() => setMobileDetailClient(client)}
                      className="hover:bg-white/5 cursor-pointer"
                    >
                      Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => openEdit(client, e)}
                      className="hover:bg-white/5 cursor-pointer"
                    >
                      Editar cliente
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => handleDeleteClient(client, e)}
                      className="hover:bg-red-500/10 text-red-400 cursor-pointer"
                    >
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Seção do Plano do Cliente */}
              {client.hasPlan && client.plan ? (
                <div className="pt-2 border-t border-[#161E2C] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                      client.plan.isUnlimited
                        ? "text-blue-300 bg-[#0F233E] border border-blue-500/40"
                        : "text-[#E5C365] bg-[#221B0E] border border-[#D4AF37]/50"
                    }`}>
                      {client.plan.isUnlimited ? (
                        <InfinityIcon className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <Crown className="w-3.5 h-3.5 text-[#E5C365]" />
                      )}
                      {client.plan.name}
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#20C997]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#20C997]" />
                      {client.plan.statusBadge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-medium">{client.plan.subtitle}</span>
                    <span className="font-semibold text-slate-300">
                      {client.plan.isUnlimited ? "Uso ilimitado" : `${client.plan.used}/${client.plan.total} utilizados`}
                    </span>
                  </div>

                  {/* Barra de Progresso Mobile */}
                  <div className="h-2 bg-[#090D14] rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full ${
                        client.plan.isUnlimited
                          ? "bg-blue-500 w-full"
                          : "bg-gradient-to-r from-[#D4AF37] to-[#E5C365]"
                      }`}
                      style={{
                        width: client.plan.isUnlimited
                          ? "100%"
                          : `${(client.plan.used / client.plan.total) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      {client.plan.isUnlimited
                        ? "Assinatura Ilimitada"
                        : `${client.plan.remaining} créditos restantes`}
                    </span>
                    <span>Renova em: {client.plan.renewalDate}</span>
                  </div>

                  {/* Botões do Card Mobile */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setMobileDetailClient(client)}
                      className="py-2 text-center text-xs font-semibold text-slate-200 bg-[#121824] hover:bg-[#182030] rounded-xl border border-[#1C2536] transition-colors cursor-pointer"
                    >
                      Ver detalhes
                    </button>
                    <button
                      type="button"
                      className="py-2 text-center text-xs font-semibold text-[#E5C365] bg-[#221B0E] hover:bg-[#2C2313] rounded-xl border border-[#D4AF37]/40 transition-colors cursor-pointer"
                    >
                      Renovar
                    </button>
                    <button
                      type="button"
                      className="py-2 text-center text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/30 transition-colors cursor-pointer"
                    >
                      Desvincular
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-[#161E2C] space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-300 bg-[#121824] border border-[#1C2536]">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    Sem plano vinculado
                  </span>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">Nenhuma assinatura ativa</span>
                    <button
                      type="button"
                      onClick={() => navigate("/planos-clientes")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#E5C365] border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3 py-1.5 rounded-lg hover:bg-[#D4AF37]/20 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Vincular Plano
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 6. SHEET/MODAL DE DETALHES DO CLIENTE NO MOBILE */}
      <Sheet open={Boolean(mobileDetailClient)} onOpenChange={(open) => !open && setMobileDetailClient(null)}>
        <SheetContent side="bottom" className="bg-[#0D121B] border-t border-[#161E2C] text-white p-5 max-h-[85vh] overflow-y-auto rounded-t-3xl">
          {mobileDetailClient && (
            <div className="space-y-4 text-xs">
              <SheetHeader className="text-left flex flex-row items-center justify-between pb-3 border-b border-[#161E2C]">
                <div className="flex items-center gap-3">
                  <ClientAvatar
                    name={mobileDetailClient.name}
                    photo={mobileDetailClient.photo || mobileDetailClient.avatar}
                    size="lg"
                    className="ring-2 ring-[#D4AF37]/40"
                  />
                  <div>
                    <SheetTitle className="text-lg font-bold text-white font-display">
                      {mobileDetailClient.name}
                    </SheetTitle>
                    <div className="mt-0.5">
                      {renderStatusBadge(mobileDetailClient)}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Informações de contato */}
              <div className="p-3 rounded-xl bg-[#090D14] border border-[#161E2C] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">{mobileDetailClient.phone}</span>
                  <button
                    type="button"
                    onClick={(e) => handleOpenWhatsApp(mobileDetailClient, e)}
                    className="text-xs font-semibold text-[#20C997] flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                </div>
                <div className="text-slate-400 text-[11px]">{mobileDetailClient.email}</div>
                <div className="text-slate-500 text-[10.5px]">Cliente desde {mobileDetailClient.clientSince}</div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-[#090D14] border border-[#161E2C]">
                  <span className="text-[10px] text-slate-400 block">Visitas</span>
                  <span className="text-sm font-black text-white mt-0.5 block">{mobileDetailClient.totalVisits}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#090D14] border border-[#161E2C]">
                  <span className="text-[10px] text-slate-400 block">Total</span>
                  <span className="text-sm font-black text-white mt-0.5 block">R$ {mobileDetailClient.totalSpent.toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#090D14] border border-[#161E2C]">
                  <span className="text-[10px] text-slate-400 block">Último corte</span>
                  <span className="text-[11px] font-bold text-white mt-0.5 block truncate">
                    {mobileDetailClient.lastAttendance?.date || "—"}
                  </span>
                </div>
              </div>

              {/* Observações */}
              <div className="p-3 rounded-xl bg-[#090D14] border border-[#161E2C]">
                <span className="font-bold text-white text-xs block mb-1">Observações</span>
                <p className="text-[11px] text-slate-300">{mobileDetailClient.notes || "Nenhuma observação."}</p>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    const c = mobileDetailClient;
                    setMobileDetailClient(null);
                    openEdit(c, e);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-[#05070B] font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar Cadastro
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteClient(mobileDetailClient, e)}
                  className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 7. MODAL DE CADASTRO E EDIÇÃO COM IDENTIFICAÇÃO E FOTO PREMIUM */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          data-testid="client-form-dialog"
          className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#161E2C] bg-[#0A0E15] text-white p-6 sm:p-7 shadow-2xl"
        >
          {/* Topo do Formulário: Avatar Grande + Identificação */}
          <div className="pt-2 pb-1 flex flex-col items-center">
            <ClientPhotoUpload
              photo={form.photo}
              name={form.name}
              onChange={(newPhoto) => setForm((f) => ({ ...f, photo: newPhoto, avatar: newPhoto }))}
              onRemove={() => setForm((f) => ({ ...f, photo: "", avatar: "" }))}
            />

            <div className="mt-3 text-center">
              <DialogTitle className="font-display text-lg sm:text-xl font-bold text-white tracking-tight">
                {editingClient ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                {editingClient
                  ? "Atualize as informações cadastrais e a foto de perfil"
                  : "Cadastre um novo cliente"}
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4 pt-2 text-xs">
            {/* Nome Completo */}
            <div>
              <Label className="text-xs font-semibold text-slate-200">
                Nome completo <span className="text-[#D4AF37]">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Lucas Fernandes"
                className="mt-1.5 h-10 bg-[#0D121B] border-[#161E2C] hover:border-slate-700 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-lg text-xs text-white placeholder:text-slate-500"
                data-testid="client-name-input"
              />
            </div>

            {/* Telefone e E-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="text-xs font-semibold text-slate-200">
                  Telefone <span className="text-[#D4AF37]">*</span>
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(67) 99234-5678"
                  className="mt-1.5 h-10 bg-[#0D121B] border-[#161E2C] hover:border-slate-700 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-lg text-xs text-white placeholder:text-slate-500"
                  data-testid="client-phone-input"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-200">
                  E-mail <span className="text-slate-500 font-normal">(Opcional)</span>
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="lucas@email.com"
                  className="mt-1.5 h-10 bg-[#0D121B] border-[#161E2C] hover:border-slate-700 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-lg text-xs text-white placeholder:text-slate-500"
                  data-testid="client-email-input"
                />
              </div>
            </div>

            {/* CPF e Data de Nascimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="text-xs font-semibold text-slate-200">
                  CPF <span className="text-slate-500 font-normal">(Opcional)</span>
                </Label>
                <Input
                  value={form.cpf}
                  onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                  className="mt-1.5 h-10 bg-[#0D121B] border-[#161E2C] hover:border-slate-700 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-lg text-xs text-white font-mono placeholder:text-slate-500"
                  data-testid="client-cpf-input"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-200">
                  Data de nascimento <span className="text-slate-500 font-normal">(Opcional)</span>
                </Label>
                <Input
                  type="date"
                  value={form.birthdate}
                  onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))}
                  className="mt-1.5 h-10 bg-[#0D121B] border-[#161E2C] hover:border-slate-700 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-lg text-xs text-white"
                  data-testid="client-birth-input"
                />
              </div>
            </div>

            {/* Vínculo de Plano Inicial (Apenas para novos) */}
            {!editingClient && (
              <div className="p-3.5 bg-[#0D121B] border border-[#161E2C] rounded-lg space-y-1.5">
                <Label className="text-xs font-semibold text-[#D4AF37] flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5" />
                  Plano / Assinatura inicial (Opcional)
                </Label>
                <select
                  value={form.plan_id}
                  onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}
                  className="w-full bg-[#0A0E15] border border-[#161E2C] hover:border-[#D4AF37]/40 text-xs rounded-md p-2.5 text-white outline-none transition-colors cursor-pointer"
                  data-testid="select-initial-plan"
                >
                  <option value="">Sem plano vinculado (atendimento avulso)</option>
                  <option value="vip">VIP Mensal — R$ 129,90/mês (4 créditos)</option>
                  <option value="unlimited">Corte Livre — R$ 99,90/mês (Uso Ilimitado)</option>
                  <option value="fidelity">Plano Fidelidade — R$ 159,00/mês (6 créditos)</option>
                  <option value="barba">Barba Premium — R$ 89,90/mês (3 créditos)</option>
                </select>
                <p className="text-[10.5px] text-slate-400">
                  O ciclo de assinatura e os créditos serão iniciados na data do cadastro.
                </p>
              </div>
            )}

            {/* Observações */}
            <div>
              <Label className="text-xs font-semibold text-slate-200">
                Observações <span className="text-slate-500 font-normal">(Opcional)</span>
              </Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Preferências de corte, barba, restrições ou observações gerais..."
                rows={2}
                className="mt-1.5 bg-[#0D121B] border-[#161E2C] hover:border-slate-700 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-lg text-xs text-white placeholder:text-slate-500 resize-none"
                data-testid="client-notes-input"
              />
            </div>
          </div>

          <DialogFooter className="mt-5 pt-3 border-t border-white/5 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              className="rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 h-10 px-4 cursor-pointer"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveClient}
              className="rounded-lg shadow-lg bg-[#D4AF37] hover:bg-[#C59F2E] text-[#05070B] font-bold text-xs h-10 px-5 cursor-pointer transition-all hover:scale-[1.01]"
              data-testid="save-client-btn"
            >
              {editingClient ? "Salvar Alterações" : "Cadastrar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
