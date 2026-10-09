import React, { useState, useMemo, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import AtendimentosMetrics from "@/components/atendimentos/AtendimentosMetrics";
import AtendimentosFilters from "@/components/atendimentos/AtendimentosFilters";
import AtendimentosTable from "@/components/atendimentos/AtendimentosTable";
import NovoAtendimentoModal from "@/components/atendimentos/NovoAtendimentoModal";
import AtendimentoDetailsModal from "@/components/atendimentos/AtendimentoDetailsModal";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import {
  filterAttendances,
  countActiveAdvancedFilters,
} from "@/lib/attendanceFilters";
import { toast } from "sonner";

export default function Atendimentos() {
  const [refreshTick, setRefreshTick] = useState(0);

  // Busca dados reais do Backend Central
  const { data: rawRevenues, loading: loadingRevenues, reload: reloadRevenues } = useApi(
    (apiClient) => apiClient.get("/revenues"),
    [refreshTick]
  );
  const { data: rawBarbers } = useApi(
    (apiClient) => apiClient.get("/barbers"),
    [refreshTick]
  );
  const { data: rawPaymentMethods } = useApi(
    (apiClient) => apiClient.get("/payment-methods"),
    [refreshTick]
  );
  const { data: rawServices } = useApi(
    (apiClient) => apiClient.get("/services"),
    [refreshTick]
  );
  const { data: rawClients } = useApi(
    (apiClient) => apiClient.get("/clients"),
    [refreshTick]
  );

  const barbers = useMemo(() => {
    if (!Array.isArray(rawBarbers)) return [];
    return rawBarbers.map((b) => ({
      id: b.id,
      name: b.name,
      shortName: b.name?.split(" ")[0] || b.name,
      role: b.role || "Barbeiro",
      isDono: b.role === "Dono" || b.commission_percent === 100,
      avatar: b.avatar || "",
      phone: b.phone || "",
      active: b.active !== false,
    }));
  }, [rawBarbers]);

  const paymentMethods = useMemo(() => {
    if (!Array.isArray(rawPaymentMethods)) return [];
    return rawPaymentMethods.map((pm) => ({
      id: pm.id,
      name: pm.name,
      type: pm.kind || pm.id,
      kind: pm.kind || "outro",
      active: pm.active !== false,
    }));
  }, [rawPaymentMethods]);

  // Transforma as receitas do backend no formato de atendimento do KUPOLA (1 atendimento = conjunto de serviços/produtos)
  const attendances = useMemo(() => {
    if (!Array.isArray(rawRevenues)) return [];

    const activeRevs = rawRevenues.filter((r) => r.status !== "cancelado");
    const groups = {};

    activeRevs.forEach((r) => {
      const gid = r.sale_group_id || r.id;
      if (!groups[gid]) {
        const barber = barbers.find((b) => b.id === r.barber_id) || {
          id: r.barber_id || "barber-unknown",
          name: r.barber_name || "Barbeiro",
          shortName: (r.barber_name || "Barbeiro").split(" ")[0],
          isDono: false,
          avatar: "",
        };

        const client = (Array.isArray(rawClients) ? rawClients : []).find(
          (c) => c.id === r.client_id || (c.name && c.name.toLowerCase() === (r.client_name || "").toLowerCase())
        );

        groups[gid] = {
          id: gid,
          revenue_id: r.id,
          sale_group_id: gid,
          date: r.date,
          time: r.time || "12:00",
          clientName: r.client_name || client?.name || "Cliente Avulso",
          clientPhone: client?.phone || r.client_phone || "—",
          clientAvatar: client?.avatar || client?.photo || "",
          clientId: r.client_id || client?.id,
          barberId: barber.id,
          barberName: barber.name,
          barberShortName: barber.shortName,
          barberAvatar: barber.avatar,
          isBarberDono: barber.isDono,
          paymentMethod: r.payment_method || r.payment_method_name || (r.payment_type === "pix" ? "PIX" : "Dinheiro"),
          paymentType: r.payment_type || "dinheiro",
          status: "concluido",
          note: r.notes || r.note || "",
          items: [],
          services: [],
          products: [],
          subtotal: 0,
          discount: 0,
          value: 0,
          commissionAmount: 0,
          shopAmount: 0,
        };
      }

      const isItemProduto = r.item_kind === "produto" || r.service_type === "produto";
      const itemName = r.service_name || (isItemProduto ? "Produto" : "Serviço");
      const qty = Number(r.quantity || 1);

      groups[gid].items.push({
        id: r.id,
        name: itemName,
        kind: isItemProduto ? "produto" : "servico",
        quantity: qty,
        gross_amount: Number(r.gross_amount ?? r.paid_amount ?? 0),
        discount_amount: Number(r.discount_amount ?? 0),
        paid_amount: Number(r.paid_amount ?? r.gross_amount ?? 0),
        commission_amount: Number(r.commission_amount ?? 0),
        shop_amount: Number(r.shop_amount ?? 0),
      });

      if (isItemProduto) {
        groups[gid].products.push(`${qty > 1 ? `${qty}x ` : ""}${itemName}`);
      } else {
        groups[gid].services.push(`${qty > 1 ? `${qty}x ` : ""}${itemName}`);
      }

      groups[gid].subtotal = Number((groups[gid].subtotal + Number(r.gross_amount ?? r.paid_amount ?? 0)).toFixed(2));
      groups[gid].discount = Number((groups[gid].discount + Number(r.discount_amount ?? 0)).toFixed(2));
      groups[gid].value = Number((groups[gid].value + Number(r.paid_amount ?? r.gross_amount ?? 0)).toFixed(2));
      groups[gid].commissionAmount = Number((groups[gid].commissionAmount + Number(r.commission_amount ?? 0)).toFixed(2));
      groups[gid].shopAmount = Number((groups[gid].shopAmount + Number(r.shop_amount ?? 0)).toFixed(2));
    });

    const list = Object.values(groups).map((grp) => {
      const allLabels = [...grp.services, ...grp.products];
      return {
        ...grp,
        serviceName: allLabels.join(", ") || "Atendimento",
        serviceLabel: allLabels.join(", ") || "Atendimento",
      };
    });

    list.sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
    return list;
  }, [rawRevenues, barbers, rawClients]);

  // Filtros de busca e período
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [period, setPeriod] = useState("hoje");
  const [customStartDate, setCustomStartDate] = useState(todayStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState("");

  // Filtros avançados
  const [barberFilter, setBarberFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  // Modals
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false);
  const [selectedAttendanceForModal, setSelectedAttendanceForModal] = useState(null);

  // Sincronização em tempo real quando ocorrem novos atendimentos
  useEffect(() => {
    const handleSync = () => {
      setRefreshTick((t) => t + 1);
    };

    window.addEventListener("barber-atendimento-created", handleSync);
    window.addEventListener("data-sync-needed", handleSync);
    return () => {
      window.removeEventListener("barber-atendimento-created", handleSync);
      window.removeEventListener("data-sync-needed", handleSync);
    };
  }, []);

  // Filtragem dos atendimentos
  const filteredAttendances = useMemo(() => {
    return filterAttendances(attendances, {
      period,
      customStartDate,
      customEndDate,
      barberFilter,
      paymentFilter,
      statusFilter,
      serviceFilter,
      searchQuery,
    });
  }, [
    attendances,
    period,
    customStartDate,
    customEndDate,
    barberFilter,
    paymentFilter,
    statusFilter,
    serviceFilter,
    searchQuery,
  ]);

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    return countActiveAdvancedFilters({
      statusFilter,
      serviceFilter,
      barberFilter,
      paymentFilter,
      period,
      customStartDate,
      customEndDate,
    });
  }, [
    statusFilter,
    serviceFilter,
    barberFilter,
    paymentFilter,
    period,
    customStartDate,
    customEndDate,
  ]);

  // Limpar todos os filtros
  const handleResetFilters = () => {
    setStatusFilter("all");
    setServiceFilter("all");
    setBarberFilter("all");
    setPaymentFilter("all");
    setPeriod("hoje");
    setSearchQuery("");
    toast.success("Todos os filtros foram redefinidos.");
  };

  // Cálculo de métricas dinâmicas com base nos atendimentos reais
  const computedMetrics = useMemo(() => {
    const list = filteredAttendances;
    const totalCount = list.length;
    const totalRevenue = list.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    const totalDiscounts = list.reduce((sum, a) => sum + (Number(a.discount) || 0), 0);
    const totalCommissions = list.reduce((sum, a) => {
      if (a.commissionAmount !== undefined && a.commissionAmount !== null) {
        return sum + Number(a.commissionAmount);
      }
      const val = Number(a.value) || 0;
      return sum + (a.isBarberDono ? 0 : val * 0.4);
    }, 0);

    // Comparativo com dia anterior dos registros reais
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yStr = yesterdayDate.toISOString().slice(0, 10);
    const yesterdayList = attendances.filter((a) => a.date === yStr);
    const yesterdayCount = yesterdayList.length;
    const yesterdayRevenue = yesterdayList.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    const yesterdayDiscount = yesterdayList.reduce((sum, a) => sum + (Number(a.discount) || 0), 0);
    const yesterdayCommission = yesterdayList.reduce((sum, a) => {
      if (a.commissionAmount) return sum + Number(a.commissionAmount);
      const val = Number(a.value) || 0;
      return sum + (a.isBarberDono ? 0 : val * 0.4);
    }, 0);

    // Cálculo percentual seguro sem dados falsos
    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? "100%" : "0%";
      const pct = Math.round(((curr - prev) / prev) * 100);
      return `${pct > 0 ? "+" : ""}${pct}%`;
    };

    return {
      totalCount,
      countTrend: calcTrend(totalCount, yesterdayCount),
      yesterdayCount,
      totalRevenue,
      revenueTrend: calcTrend(totalRevenue, yesterdayRevenue),
      yesterdayRevenue,
      totalDiscounts,
      discountTrend: calcTrend(totalDiscounts, yesterdayDiscount),
      yesterdayDiscount,
      totalCommissions,
      commissionTrend: calcTrend(totalCommissions, yesterdayCommission),
      yesterdayCommission,
    };
  }, [filteredAttendances, attendances]);

  // Salvar novo atendimento e recarregar dados reais
  const handleSaveNovoAtendimento = () => {
    setRefreshTick((t) => t + 1);
    reloadRevenues();
  };

  // Excluir atendimento no backend real
  const handleDeleteAttendance = async (id) => {
    try {
      await api.delete(`/revenues/${id}`);
      toast.success("Registro de atendimento excluído com sucesso.");
      setRefreshTick((t) => t + 1);
      reloadRevenues();
    } catch (err) {
      toast.error("Erro ao excluir registro de atendimento.");
    }
  };

  return (
    <div
      className="space-y-4 sm:space-y-5 lg:space-y-6 w-full max-w-[1600px] mx-auto pb-24 sm:pb-28 lg:pb-12 antialiased select-none overflow-x-hidden"
      data-testid="atendimentos-page"
    >
      {/* ======================================================== */}
      {/* 1. TÍTULO DA PÁGINA + BOTÃO NOVO ATENDIMENTO DOURADO     */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
            Atendimentos
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Registre os atendimentos realizados
          </p>
        </div>

        {/* Botão Oficial Dourado: + Novo Atendimento */}
        <button
          type="button"
          onClick={() => setIsNovoModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5C365] hover:brightness-110 text-[#070A0F] font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-[#D4AF37]/20 active:scale-95 transition-all cursor-pointer w-full sm:w-auto"
          data-testid="btn-novo-atendimento"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo Atendimento</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 2. CARDS DE MÉTRICAS OPERACIONAIS                        */}
      {/* ======================================================== */}
      <AtendimentosMetrics metrics={computedMetrics} />

      {/* ======================================================== */}
      {/* 3. BARRA DE FILTROS & BUSCA EM TEMPO REAL                */}
      {/* ======================================================== */}
      <div className="rounded-2xl sm:rounded-3xl bg-[#0A0E15] border border-[#161E2C] p-3 sm:p-4 shadow-xl">
        <AtendimentosFilters
          period={period}
          onPeriodChange={setPeriod}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomDateChange={({ startDate, endDate }) => {
            setCustomStartDate(startDate);
            setCustomEndDate(endDate);
            setPeriod("personalizado");
          }}
          barberFilter={barberFilter}
          onBarberFilterChange={setBarberFilter}
          barbers={barbers}
          paymentFilter={paymentFilter}
          onPaymentFilterChange={setPaymentFilter}
          paymentMethods={paymentMethods}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          serviceFilter={serviceFilter}
          onServiceFilterChange={setServiceFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onResetFilters={handleResetFilters}
          activeFiltersCount={activeFiltersCount}
        />
      </div>

      {/* ======================================================== */}
      {/* 4. TABELA / CARDS DE ATENDIMENTOS REALIZADOS             */}
      {/* ======================================================== */}
      {loadingRevenues && attendances.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl bg-[#0A0E15] border border-[#161E2C] p-12 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5C365]" />
          <p className="text-xs sm:text-sm text-slate-400">Carregando atendimentos reais...</p>
        </div>
      ) : (
        <AtendimentosTable
          attendances={filteredAttendances}
          onSelectAttendance={(att) => setSelectedAttendanceForModal(att)}
          onDeleteAttendance={handleDeleteAttendance}
        />
      )}

      {/* ======================================================== */}
      {/* 5. MODAL DE NOVO ATENDIMENTO                             */}
      {/* ======================================================== */}
      <NovoAtendimentoModal
        isOpen={isNovoModalOpen}
        onClose={() => setIsNovoModalOpen(false)}
        onSave={handleSaveNovoAtendimento}
      />

      {/* ======================================================== */}
      {/* 6. MODAL DE DETALHES / COMPROVANTE                       */}
      {/* ======================================================== */}
      <AtendimentoDetailsModal
        attendance={selectedAttendanceForModal}
        isOpen={!!selectedAttendanceForModal}
        onClose={() => setSelectedAttendanceForModal(null)}
      />
    </div>
  );
}
