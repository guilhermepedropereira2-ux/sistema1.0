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
  Scissors, Clock, CheckCircle2, EyeOff, Shield,
  ArrowRightLeft, Contact, Search, RefreshCw, FileText, Check,
} from "lucide-react";
import { emitirNFSeSimplificada, isValidCPF } from "@/lib/fiscalEngine";

export default function PainelBalcao({
  onOpenNovoAtendimento,
  isBalcaoMode,
  toggleBalcaoMode,
  user,
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal NFS-e Simplificada
  const [nfseModalOpen, setNfseModalOpen] = useState(false);
  const [selectedItemNFSe, setSelectedItemNFSe] = useState(null);
  const [nfseCpf, setNfseCpf] = useState("");
  const [nfseEmail, setNfseEmail] = useState("");
  const [emittingNFSe, setEmittingNFSe] = useState(false);
  const [lastEmission, setLastEmission] = useState(null);

  const today = todayISO();

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
        totalAmount: selectedItemNFSe?.paid_amount || selectedItemNFSe?.gross_amount || 45,
        services: [{ name: selectedItemNFSe?.service_name || "Corte de Cabelo" }],
        barberName: selectedItemNFSe?.barber_name || "",
      });
      setLastEmission(res);
      toast.success(`NFS-e emitida com sucesso! Protocolo: ${res.protocolo}`);
    } catch {
      toast.error("Erro ao emitir NFS-e.");
    } finally {
      setEmittingNFSe(false);
    }
  };

  const loadBalcaoData = async () => {
    try {
      setLoading(true);
      const [aRes, rRes] = await Promise.all([
        api.get(`/appointments?date=${today}`).catch(() => []),
        api.get(`/revenues?date=${today}`).catch(() => []),
      ]);
      setAppointments(Array.isArray(aRes) ? aRes : []);
      setRevenues(Array.isArray(rRes) ? rRes.filter((r) => r.status === "ativo") : []);
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

  const todayAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    if (!searchTerm.trim()) return todayAppointments;
    const term = searchTerm.toLowerCase();
    return todayAppointments.filter(
      (a) =>
        a.client_name?.toLowerCase().includes(term) ||
        a.barber_name?.toLowerCase().includes(term) ||
        a.service_name?.toLowerCase().includes(term)
    );
  }, [todayAppointments, searchTerm]);

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-full" data-testid="painel-balcao-seguro">
      {/* 1. Banner Superior Minimalista de Segurança Operacional */}
      <div className="rounded-[4px] bg-[#12141F] border border-amber-500/20 px-3.5 py-2.5 sm:px-4 flex items-center justify-between gap-3 shadow-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-[2px] bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Shield className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <h2 className="font-display text-xs sm:text-sm font-bold text-white tracking-tight truncate">
              Painel do Caixa & Balcão
            </h2>
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[9px] font-semibold uppercase rounded-[2px] px-1.5 py-0.5 shrink-0">
              Visão Segura
            </Badge>
          </div>
        </div>

        <div className="shrink-0">
          {toggleBalcaoMode && user?.role !== "caixa" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleBalcaoMode}
              className="h-8 px-3 text-xs bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 hover:text-amber-200 rounded-[4px] gap-1.5 font-semibold shadow-none transition-colors cursor-pointer"
              title="Sair da visão segura e retornar ao dashboard completo"
              data-testid="balcao-btn-toggle-modo"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>Sair do Modo Caixa</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={loadBalcaoData}
              disabled={loading}
              className="h-8 px-3 text-xs bg-[#0A0D14] hover:bg-white/5 border-white/10 text-slate-300 hover:text-white rounded-[4px] gap-1.5 shadow-none transition-colors cursor-pointer"
              title="Atualizar dados do balcão"
              data-testid="balcao-btn-refresh"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-amber-400" : ""}`} />
              <span>Atualizar</span>
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

      {/* 3. Cards de Métricas Operacionais do Dia */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Agendamentos de Hoje */}
        <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 sm:p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Agenda do Dia
            </span>
            <div className="h-8 w-8 rounded-[2px] bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {todayAppointments.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">horários marcados para hoje</p>
          </div>
        </div>

        {/* Card 2: Concluídos Hoje */}
        <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 sm:p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Atendimentos Realizados
            </span>
            <div className="h-8 w-8 rounded-[2px] bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {revenues.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">cobranças finalizadas hoje</p>
          </div>
        </div>

        {/* Card 3: Acesso Rápido */}
        <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 sm:p-5 shadow-none flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Operação de Balcão
            </span>
            <div className="h-8 w-8 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Scissors className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <Button
              onClick={onOpenNovoAtendimento}
              size="sm"
              className="w-full bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold rounded-[4px] text-xs h-8"
            >
              + Lançar Atendimento
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Área Principal: Agendamentos de Hoje & Atendimentos Concluídos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Agendamentos do Dia (7 colunas) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-5 shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#D4AF37]" />
                  <span>Agendamentos do Dia</span>
                </h3>
                <p className="text-xs text-slate-400">Clientes agendados para hoje</p>
              </div>

              <div className="relative w-48">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 text-xs bg-[#0A0D14] border-white/10 text-white rounded-[3px]"
                />
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="text-center py-10">
                <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">Nenhum agendamento para hoje</p>
                <p className="text-xs text-slate-500 mt-0.5">Os agendamentos online e manuais aparecerão aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 mt-3 space-y-2">
                {filteredAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 rounded-[4px] bg-[#0A0D14] border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#D4AF37]">{apt.time || "—"}</span>
                        <span className="text-xs font-bold text-white">{apt.client_name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {apt.service_name} • Profissional: {apt.barber_name || "Qualquer"}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={onOpenNovoAtendimento}
                      className="h-7 text-xs bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold rounded-[3px]"
                    >
                      Atender / Cobrar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Atendimentos Concluídos Hoje (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-5 shadow-none">
            <div className="pb-3 border-b border-white/10">
              <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Atendimentos Concluídos Hoje</span>
              </h3>
              <p className="text-xs text-slate-400">Comprovantes e emissão de recibos fiscais</p>
            </div>

            {revenues.length === 0 ? (
              <div className="text-center py-10">
                <Scissors className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">Nenhum atendimento realizado hoje</p>
                <p className="text-xs text-slate-500 mt-0.5">Clique em Novo Atendimento para registrar uma venda.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 mt-3 space-y-2 max-h-[400px] overflow-y-auto">
                {revenues.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 rounded-[4px] bg-[#0A0D14] border border-white/5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{rev.client_name}</span>
                        <Badge className="bg-emerald-500/15 text-emerald-300 text-[10px] rounded-[2px] py-0">
                          {brl(rev.paid_amount || rev.gross_amount || 0)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {rev.service_name} • {rev.barber_name} ({rev.time || "—"})
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenNFSeModal(rev)}
                      className="h-7 text-[11px] border-white/10 hover:bg-white/5 text-slate-300 rounded-[3px] gap-1 shrink-0"
                      title="Emitir NFS-e Simplificada"
                    >
                      <FileText className="h-3 w-3" />
                      <span>NFS-e</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Emissão NFS-e Simplificada */}
      <Dialog open={nfseModalOpen} onOpenChange={setNfseModalOpen}>
        <DialogContent className="bg-[#12141F] border border-white/10 text-white sm:max-w-md rounded-[4px]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#D4AF37]" />
              <span>Emitir Recibo / NFS-e Simplificada</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Gere o comprovante fiscal para o cliente referente a este atendimento.
            </DialogDescription>
          </DialogHeader>

          {selectedItemNFSe && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded bg-[#0A0D14] border border-white/10 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cliente:</span>
                  <span className="font-bold text-white">{selectedItemNFSe.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Serviço:</span>
                  <span className="text-white">{selectedItemNFSe.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Valor Total:</span>
                  <span className="font-bold text-emerald-400">
                    {brl(selectedItemNFSe.paid_amount || selectedItemNFSe.gross_amount || 0)}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs">CPF do Cliente (Opcional)</Label>
                <Input
                  value={nfseCpf}
                  onChange={(e) => setNfseCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="bg-[#0A0D14] border-white/10 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">E-mail para envio (Opcional)</Label>
                <Input
                  value={nfseEmail}
                  onChange={(e) => setNfseEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="bg-[#0A0D14] border-white/10 text-xs mt-1"
                />
              </div>

              {lastEmission && (
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Check className="h-4 w-4" /> NFS-e Emitida com Sucesso!
                  </p>
                  <p className="text-[11px] text-slate-300 font-mono">
                    Protocolo: {lastEmission.protocolo}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNfseModalOpen(false)}
              className="border-white/10 text-xs"
            >
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={handleEmitirNFSe}
              disabled={emittingNFSe}
              className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs"
            >
              {emittingNFSe ? "Emitindo..." : "Emitir NFS-e"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
