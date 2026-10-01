import { useMemo, useState, useEffect, useCallback, memo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useFinancialMetricsPolling } from "@/hooks/useFinancialMetricsPolling";
import { brl, fmtDate, paymentTypeLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Scissors, Plus, RefreshCw, Calendar, Clock, ChevronRight,
  CalendarDays, CheckCircle2, User, Sparkles, Filter,
  WifiOff, CloudOff, Package,
} from "lucide-react";
import LancarAtendimentoModal from "@/components/LancarAtendimentoModal";
import { useOfflineSync } from "@/hooks/useOfflineSync";

// Componente memoizado para os cards de métricas do barbeiro
const BarberStatsGrid = memo(function BarberStatsGrid({ faturamento, comissao, atendimentos }) {
  const formattedComissao = brl(comissao || 0);
  const comissaoText = formattedComissao.startsWith("R$")
    ? `+${formattedComissao}`
    : `+R$ ${formattedComissao}`;

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3" data-testid="barber-stats-grid">
      <div className="rounded-2xl bg-[#10131E] border border-white/[0.08] p-3.5 sm:p-4 text-left shadow-sm">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Faturamento Hoje</p>
        <p className="text-base sm:text-xl font-extrabold font-mono text-white mt-1 tracking-tight" data-testid="barber-stat-faturamento">
          {brl(faturamento || 0)}
        </p>
      </div>
      <div className="rounded-2xl bg-[#10131E] border border-white/[0.08] p-3.5 sm:p-4 text-left shadow-sm">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Minha Comissão</p>
        <p className="text-base sm:text-xl font-extrabold font-mono text-emerald-400 mt-1 tracking-tight" data-testid="barber-stat-comissao">
          {comissaoText}
        </p>
      </div>
      <div className="rounded-2xl bg-[#10131E] border border-white/[0.08] p-3.5 sm:p-4 text-left shadow-sm">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Atendimentos</p>
        <p className="text-base sm:text-xl font-extrabold font-mono text-[#D4AF37] mt-1 tracking-tight" data-testid="barber-stat-atendimentos">
          {atendimentos}
        </p>
      </div>
    </div>
  );
});

// Linha de atendimento individual memoizada para lista ultra rápida
const BarberAtendimentoRow = memo(function BarberAtendimentoRow({ atendimento, onSelect, testId }) {
  const serviceNames = Array.isArray(atendimento?.items) && atendimento.items.length
    ? atendimento.items.map((i) => i?.name || "Serviço").join(", ")
    : atendimento?.service_name || "Atendimento";

  const paidVal = atendimento?.paid ?? atendimento?.paid_amount ?? 0;
  const commissionVal = atendimento?.commission ?? atendimento?.commission_amount ?? 0;
  const isPaid = Boolean(atendimento?.commission_paid);

  const isProduct =
    atendimento?.item_kind === "produto" ||
    atendimento?.service_type === "produto" ||
    (Array.isArray(atendimento?.items) &&
      atendimento.items.some((i) => i?.item_kind === "produto")) ||
    /pomada|óleo|shampoo|cera|minoxidil|balm|produto|creme|gel/i.test(serviceNames);

  return (
    <div
      onClick={() => onSelect(atendimento)}
      className="flex items-center justify-between rounded-xl bg-[#0B0D14] border border-white/[0.08] p-3 hover:border-[#D4AF37]/40 cursor-pointer select-none transition-colors"
      data-testid={testId}
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        {/* Miniatura / Ícone estilizado à esquerda */}
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
            isProduct
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
              : "bg-[#D4AF37]/10 border-[#D4AF37]/25 text-[#D4AF37]"
          }`}
        >
          {isProduct ? (
            <Package className="h-5 w-5" />
          ) : (
            <Scissors className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-xs sm:text-sm font-semibold text-white">
            {serviceNames}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {fmtDate(atendimento?.date)} às {atendimento?.time || "12:00"} · {atendimento?.client_name || "Sem cliente"} · {atendimento?.payment_method_name || "Dinheiro"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="text-right">
          <p className="text-xs sm:text-sm font-bold text-white">
            {brl(paidVal)}
          </p>
          <p className="text-[11px] font-bold text-emerald-400">
            +{brl(commissionVal)}
          </p>
        </div>

        {atendimento?.is_offline ? (
          <Badge
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-300 border-amber-500/40 inline-flex items-center gap-1"
            title="Salvo localmente no dispositivo. Aguardando sincronização com o servidor."
          >
            <CloudOff className="h-3 w-3" />
            Offline
          </Badge>
        ) : (
          <Badge
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-[2px] hidden sm:inline-flex ${
              isPaid
                ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                : "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
            }`}
          >
            {isPaid ? "Paga" : "Pendente"}
          </Badge>
        )}

        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
});

export default function BarberHome() {
  const navigate = useNavigate();
  const outletCtx = useOutletContext();
  const { user } = useAuth();
  const {
    data,
    loading,
    reload,
    faturamentoDiario,
    totalAtendimentos,
    comissaoDiaria,
    isSyncing,
  } = useFinancialMetricsPolling({
    endpoint: "/barber/dashboard",
    interval: 30000, // Polling leve a cada 30 segundos
  });
  const { isOnline, pendingCount, isSyncing: isOfflineSyncing, syncNow, queue } = useOfflineSync();
  const [localModalOpen, setLocalModalOpen] = useState(false);

  // Escuta evento global de atendimento criado para atualizar cards e fluxo em tempo real
  useEffect(() => {
    const onCreated = () => {
      reload();
    };
    window.addEventListener("barber-atendimento-created", onCreated);
    return () => window.removeEventListener("barber-atendimento-created", onCreated);
  }, [reload]);

  const handleOpenLancar = useCallback(() => {
    if (outletCtx?.openLancarModal) {
      outletCtx.openLancarModal();
    } else {
      setLocalModalOpen(true);
    }
  }, [outletCtx]);

  const barberName = user?.name || data?.barber_name || "Barbeiro";
  const primeiroNome = (barberName || "Barbeiro").trim().split(" ")[0];
  const barberId = data?.barber_id || user?.barber_id || "b1";

  // Data de hoje
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filtro operacional de atendimentos: "hoje", "semana", "mes"
  const [timeFilter, setTimeFilter] = useState("hoje");
  const [selectedAtendimento, setSelectedAtendimento] = useState(null);

  // Atendimentos realizados
  const atendimentosHoje = data?.atendimentos ?? 0;
  const ultimos = Array.isArray(data?.ultimos) ? data.ultimos : [];

  // Métricas offline e cálculo diário considerando atendimentos salvos localmente
  const offlineGrossToday = useMemo(() => {
    return (queue || [])
      .filter((q) => q.date === todayStr)
      .reduce((acc, it) => acc + (Number(it.paid) || 0), 0);
  }, [queue, todayStr]);

  const offlineCommToday = useMemo(() => {
    return (queue || [])
      .filter((q) => q.date === todayStr)
      .reduce((acc, it) => acc + (Number(it.commission) || 0), 0);
  }, [queue, todayStr]);

  const offlineCountToday = useMemo(() => {
    return (queue || []).filter((q) => q.date === todayStr).length;
  }, [queue, todayStr]);

  const effectiveFaturamento = (faturamentoDiario || 0) + offlineGrossToday;
  const effectiveComissao = (comissaoDiaria || 0) + offlineCommToday;
  const effectiveAtendimentos = (totalAtendimentos || 0) + offlineCountToday;

  // Filtragem dos atendimentos conforme a aba operacional selecionada (inclui offline pendentes)
  const filteredAtendimentos = useMemo(() => {
    let list = ultimos;
    if (timeFilter === "hoje") {
      list = ultimos.filter((a) => a.date === todayStr);
    } else if (timeFilter === "semana") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const weekAgoStr = d.toISOString().slice(0, 10);
      list = ultimos.filter((a) => a.date >= weekAgoStr);
    }

    // Prepend itens offline da fila local
    const offlineItems = (queue || [])
      .filter((q) => {
        if (timeFilter === "hoje") return q.date === todayStr;
        if (timeFilter === "semana") {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          return q.date >= d.toISOString().slice(0, 10);
        }
        return true;
      })
      .map((it) => ({
        id: it.id,
        sale_group_id: it.sale_group_id,
        date: it.date,
        time: it.time,
        client_name: it.client_name,
        payment_method_name: it.payment_method_name,
        paid: it.paid,
        paid_amount: it.paid,
        commission: it.commission,
        commission_amount: it.commission,
        commission_paid: false,
        items: it.items,
        is_offline: true,
      }));

    return [...offlineItems, ...list];
  }, [ultimos, timeFilter, todayStr, queue]);

  // Data formatada para cabeçalho operacional
  const formattedToday = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date());
    } catch {
      return fmtDate(todayStr);
    }
  }, [todayStr]);

  return (
    <div className="space-y-4" data-testid="barber-home">
      {/* 1. Saudação e Boas-Vindas Fixa */}
      <div
        className="flex items-center px-4 py-3 rounded-2xl bg-[#10131E] border border-white/[0.08] text-xs shadow-sm"
        data-testid="barber-daily-greeting"
      >
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse shrink-0" />
          <p className="text-slate-200 text-xs sm:text-sm font-medium">
            • Olá, <span className="font-bold text-white">{primeiroNome}</span>. Bem-vindo ao seu Hub Pessoal de Sucesso.
          </p>
        </div>
      </div>

      {/* 1.1 Banner Informativo de Conexão Offline e Sincronização Local */}
      {(!isOnline || pendingCount > 0) && (
        <div
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs flex flex-wrap items-center justify-between gap-2.5 text-amber-200 animate-in fade-in duration-150 shadow-sm"
          data-testid="offline-sync-banner"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
              {!isOnline ? <WifiOff className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
            </div>
            <div>
              <p className="font-bold text-white text-xs">
                {!isOnline ? "Modo Offline Ativo" : "Atendimentos Salvos Localmente"}
              </p>
              <p className="text-[11px] text-amber-300/80">
                {!isOnline
                  ? "Sem conexão à internet. Você pode continuar registrando atendimentos normalmente — eles ficam salvos no seu aparelho e sobem assim que a internet voltar."
                  : `${pendingCount} atendimento(s) salvo(s) localmente aguardando sincronização com o servidor.`}
              </p>
            </div>
          </div>

          {isOnline && pendingCount > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={syncNow}
              disabled={isOfflineSyncing}
              className="h-8 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-none gap-1.5 cursor-pointer ml-auto"
              data-testid="btn-sync-now"
            >
              <RefreshCw className={`h-3 w-3 ${isOfflineSyncing ? "animate-spin" : ""}`} />
              <span>{isOfflineSyncing ? "Sincronizando..." : "Sincronizar Agora"}</span>
            </Button>
          )}
        </div>
      )}

      {/* 2. Botão Principal de Ação Rápida (Lançar Atendimento) */}
      <Button
        onClick={handleOpenLancar}
        className="w-full h-12 bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-display font-extrabold text-sm tracking-wide rounded-2xl shadow-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer border border-[#D4AF37]/40"
        data-testid="home-lancar"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[#0B0D14]/15 text-[#0B0D14]">
          <Scissors className="h-4 w-4 stroke-[2.5]" />
        </div>
        <span>+ LANÇAR ATENDIMENTO</span>
      </Button>

      {/* 2.1 Cards de Faturamento e Operação do Dia */}
      <BarberStatsGrid
        faturamento={effectiveFaturamento}
        comissao={effectiveComissao}
        atendimentos={effectiveAtendimentos}
      />

      {/* 3. Barra de Status Operacional e Agenda do Dia */}
      <div className="rounded-2xl bg-[#10131E] border border-white/[0.08] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm sm:text-base font-bold text-white tracking-tight">
                Fluxo de Atendimentos
              </h2>
              <Badge className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/60 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-[0_0_8px_rgba(212,175,55,0.12)]">
                {effectiveAtendimentos} HOJE
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">
              {formattedToday}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Filtros rápidos: Hoje, 7 dias, Todos */}
            <div className="flex items-center rounded-[3px] bg-[#0A0D14] border border-white/10 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setTimeFilter("hoje")}
                className={`px-3 py-1 rounded-[2px] font-medium transition-colors cursor-pointer ${
                  timeFilter === "hoje"
                    ? "bg-[#D4AF37] text-[#0D0E12] font-bold shadow-none"
                    : "text-muted-foreground hover:text-white"
                }`}
                data-testid="filter-hoje"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter("semana")}
                className={`px-3 py-1 rounded-[2px] font-medium transition-colors cursor-pointer ${
                  timeFilter === "semana"
                    ? "bg-[#D4AF37] text-[#0D0E12] font-bold shadow-none"
                    : "text-muted-foreground hover:text-white"
                }`}
                data-testid="filter-semana"
              >
                7 Dias
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter("mes")}
                className={`px-3 py-1 rounded-[2px] font-medium transition-colors cursor-pointer ${
                  timeFilter === "mes"
                    ? "bg-[#D4AF37] text-[#0D0E12] font-bold shadow-none"
                    : "text-muted-foreground hover:text-white"
                }`}
                data-testid="filter-mes"
              >
                Mês
              </button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={reload}
              disabled={loading}
              className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10 rounded-[4px] border border-white/10 cursor-pointer shadow-none"
              title="Atualizar atendimentos"
              data-testid="barber-refresh-btn"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#D4AF37]" : ""}`} />
            </Button>
          </div>
        </div>

        {/* 4. Lista dos Atendimentos Operacionais */}
        {loading && !filteredAtendimentos.length ? (
          <div className="py-10 text-center text-muted-foreground flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-[#D4AF37]" />
            <span className="text-xs">Carregando seus atendimentos...</span>
          </div>
        ) : !filteredAtendimentos.length ? (
          <div className="flex flex-col items-center justify-center rounded-[4px] border border-dashed border-white/10 py-10 px-4 text-center space-y-2.5">
            <div className="h-10 w-10 rounded-[2px] bg-[#0A0D14] border border-white/10 flex items-center justify-center text-muted-foreground">
              <Scissors className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div className="space-y-0.5">
              <p className="font-display text-sm font-bold text-white">
                {timeFilter === "hoje" ? "Nenhum atendimento realizado hoje" : "Nenhum atendimento neste período"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Registre os serviços realizados para acompanhar o fluxo diário em tempo real.
              </p>
            </div>
            <Button
              onClick={handleOpenLancar}
              size="sm"
              className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0D0E12] font-bold text-xs rounded-[4px] shadow-none mt-1.5 gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Lançar Atendimento
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAtendimentos.map((g, idx) => {
              const uniqueKey = g?.id ? `${g.id}_${idx}` : g?.sale_group_id ? `${g.sale_group_id}_${idx}` : `atend_${idx}`;
              return (
                <BarberAtendimentoRow
                  key={uniqueKey}
                  atendimento={g}
                  onSelect={setSelectedAtendimento}
                  testId={`home-atend-${g?.sale_group_id || g?.id || idx}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Atendimento */}
      <Dialog open={!!selectedAtendimento} onOpenChange={(o) => !o && setSelectedAtendimento(null)}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto bg-[#12141F] border-white/10 text-white p-5 sm:p-6 rounded-[4px] shadow-none" data-testid="atend-detail">
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-display text-base font-bold text-white flex items-center gap-2">
              <Scissors className="h-4 w-4 text-[#D4AF37]" />
              Detalhes do Atendimento
            </DialogTitle>
          </DialogHeader>
          {selectedAtendimento && (
            <div className="space-y-3 text-sm pt-2">
              <div className="p-3 rounded-[3px] bg-[#0A0D14] border border-white/10">
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-bold text-sm text-white">{selectedAtendimento.client_name || "Cliente sem cadastro"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {fmtDate(selectedAtendimento.date)} às {selectedAtendimento.time || "12:00"}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Itens Realizados</p>
                {(selectedAtendimento.items || []).map((i, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1 border-b border-white/5">
                    <span className="text-white">
                      {i.name}{i.quantity > 1 ? ` x${i.quantity}` : ""}
                    </span>
                    <span className="font-medium text-white">{brl(i.paid)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 border-t border-white/10 pt-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor pago</span>
                  <span className="font-bold text-white">{brl(selectedAtendimento.paid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Forma de pagamento</span>
                  <span className="text-white">{selectedAtendimento.payment_method_name}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-muted-foreground">Sua comissão</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#10B981] text-sm">{brl(selectedAtendimento.commission)}</span>
                    <Badge
                      className={`text-[9px] font-bold uppercase px-1.5 py-0 rounded-[2px] ${
                        selectedAtendimento.commission_paid
                          ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                          : "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                      }`}
                    >
                      {selectedAtendimento.commission_paid ? "Paga" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Local Fallback caso BarberLayout context não esteja ativo */}
      {localModalOpen && !outletCtx?.openLancarModal && (
        <LancarAtendimentoModal
          open={localModalOpen}
          onClose={() => setLocalModalOpen(false)}
          onSuccess={reload}
        />
      )}
    </div>
  );
}
