import React, { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  buildDynamicChannels,
  getAvailableMethodsForChannel,
  getDefaultMethodForChannel,
} from "@/lib/paymentChannels";
import { useAuth } from "@/context/AuthContext";
import { isBarber, canManagePaymentMethods } from "@/lib/roles";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Building2, CreditCard, Plus, AlertCircle, Info } from "lucide-react";

/**
 * PaymentChannelSelector
 * Componente padronizado com carregamento dinâmico de maquininhas e separação em dois campos dependentes:
 * 
 * 1. Campo 1: "Meio de Recebimento" (Canal/Destino)
 *    - Caixa Físico / Dinheiro (padrão)
 *    - Maquininhas cadastradas ativas (Ton, Stone, InfinitePay, etc.)
 *    - Fallback: "Outra Maquininha / Cartão" se nenhuma maquininha cadastrada (apenas admin/owner)
 *    - Pix Direto / Conta Bancária
 * 
 * 2. Campo 2: "Forma de Pagamento" (Modalidade)
 *    - Se Caixa Físico: fixa automaticamente em "Dinheiro"
 *    - Se Maquininha: Cartão de Crédito, Cartão de Débito, Pix no Terminal
 *    - Se Pix Direto: fixa automaticamente em "Pix Direto"
 * 
 * 3. Regra RBAC Estrita:
 *    - Barbeiros comuns NUNCA veem botões, links ou atalhos de cadastro de maquininha.
 *    - Se não houver maquininhas, barbeiro vê aviso informativo ("Nenhuma maquininha configurada pelo administrador") e apenas Caixa Físico.
 */
export default function PaymentChannelSelector({
  channel = "caixa_fisico",
  method = "cash",
  paymentMethods = null,
  onChannelChange,
  onMethodChange,
  onMachineCreated,
  className = "",
  labelChannel = "Meio de Recebimento",
  labelMethod = "Forma de Pagamento",
  disabled = false,
  showQuickAdd = true,
  isBarberView = false,
}) {
  const { user } = useAuth() || {};
  const [internalMethods, setInternalMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [newMachineForm, setNewMachineForm] = useState({
    name: "",
    debito_fee: "1.49",
    credito_fee: "2.99",
    pix_fee: "0",
  });
  const [savingMachine, setSavingMachine] = useState(false);

  // Determina se a visão atual é estritamente de Barbeiro ou se tem poderes de gerenciamento
  const userIsBarber = isBarberView || isBarber(user);
  const canManage = !userIsBarber && canManagePaymentMethods(user) && showQuickAdd;

  // Se métodos não foram passados como prop, busca dinamicamente do backend
  useEffect(() => {
    if (paymentMethods && Array.isArray(paymentMethods) && paymentMethods.length > 0) {
      setInternalMethods(paymentMethods);
    } else {
      setLoadingMethods(true);
      api
        .get("/payment-methods")
        .then((data) => {
          if (Array.isArray(data)) {
            setInternalMethods(data);
          }
        })
        .catch((err) => {
          console.warn("Falha ao carregar payment-methods:", err);
        })
        .finally(() => setLoadingMethods(false));
    }
  }, [paymentMethods]);

  // Lista dinâmica de canais construída a partir dos métodos ativos e perfil do usuário
  const { channels, hasMachines } = useMemo(() => {
    return buildDynamicChannels(internalMethods, { isBarber: userIsBarber });
  }, [internalMethods, userIsBarber]);

  // Resolve o canal selecionado ou busca equivalência
  const currentChannelObj = useMemo(() => {
    // 1. Busca exata por ID
    let found = channels.find((c) => c.id === channel);
    if (found) return found;

    // 2. Busca por compatibilidade de ID legado ou nome
    const lower = String(channel || "").toLowerCase();
    found = channels.find(
      (c) =>
        c.id.toLowerCase() === lower ||
        c.name.toLowerCase() === lower ||
        (lower.includes("stone") && c.name.toLowerCase().includes("stone")) ||
        (lower.includes("infinite") && c.name.toLowerCase().includes("infinite")) ||
        (lower.includes("ton") && c.name.toLowerCase().includes("ton")) ||
        (lower.includes("gaveta") && c.kind === "cash") ||
        (lower.includes("dinheiro") && c.kind === "cash") ||
        (lower.includes("pix") && c.kind === "transfer")
    );

    return found || channels[0] || { id: "caixa_fisico", name: "Caixa Físico / Dinheiro", kind: "cash" };
  }, [channels, channel]);

  // Métodos disponíveis baseados no canal atual
  const availableMethods = useMemo(() => {
    return getAvailableMethodsForChannel(currentChannelObj.id, internalMethods);
  }, [currentChannelObj.id, internalMethods]);

  const isFixedMethod = availableMethods.length === 1;

  // Ao mudar o canal, sincroniza o método de pagamento e dispara eventos
  const handleChannelSelect = (selectedChannelId) => {
    const channelObj = channels.find((c) => c.id === selectedChannelId) || {
      id: selectedChannelId,
      name: selectedChannelId,
      kind: "terminal",
    };

    onChannelChange?.(selectedChannelId, channelObj);

    // Ajusta o método automaticamente
    let nextMethod = method;
    if (channelObj.kind === "cash") {
      nextMethod = "cash";
    } else if (channelObj.kind === "transfer") {
      nextMethod = "direct_pix";
    } else {
      // Se era dinheiro ou pix direto e mudou para maquininha, muda para crédito
      if (nextMethod === "cash" || nextMethod === "direct_pix" || !nextMethod) {
        nextMethod = "credit_card";
      }
    }
    onMethodChange?.(nextMethod);
  };

  // Criação rápida de maquininha on-the-fly (apenas administradores e gerentes)
  const handleQuickAddSubmit = async (e) => {
    e?.preventDefault();
    if (!canManage) {
      return toast.error("Apenas administradores podem cadastrar maquininhas.");
    }
    if (!newMachineForm.name.trim()) {
      return toast.error("Informe o nome da maquininha (ex: Stone, Ton, Balcão)");
    }

    setSavingMachine(true);
    try {
      const payload = {
        name: newMachineForm.name.trim(),
        kind: "maquininha",
        fees: {
          debito: parseFloat(newMachineForm.debito_fee) || 0,
          credito_vista: parseFloat(newMachineForm.credito_fee) || 0,
          credito_parcelado: (parseFloat(newMachineForm.credito_fee) || 0) + 1.5,
          pix: parseFloat(newMachineForm.pix_fee) || 0,
        },
        settlement_days: {
          debito: 1,
          credito_vista: 1,
          credito_parcelado: 30,
          pix: 0,
        },
        active: true,
      };

      const created = await api.post("/payment-methods", payload);
      toast.success(`Maquininha '${created.name}' cadastrada com sucesso!`);

      // Atualiza lista local
      const updated = [...internalMethods, created];
      setInternalMethods(updated);

      // Seleciona a nova maquininha imediatamente
      onChannelChange?.(created.id, {
        id: created.id,
        name: created.name,
        kind: "terminal",
        pmId: created.id,
      });
      onMethodChange?.("credit_card");
      onMachineCreated?.(created);

      setQuickAddOpen(false);
      setNewMachineForm({
        name: "",
        debito_fee: "1.49",
        credito_fee: "2.99",
        pix_fee: "0",
      });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erro ao cadastrar maquininha");
    } finally {
      setSavingMachine(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Campo 1: Meio de Recebimento (Canal / Maquininha / Caixa) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>{labelChannel}</span>
            </Label>

            {/* Atalho de cadastro: Visível APENAS para administradores e gerentes */}
            {canManage && (
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="text-[11px] text-[#D4AF37] hover:text-[#e0be48] flex items-center gap-1 cursor-pointer transition-colors"
                title="Cadastrar nova maquininha para esta barbearia"
                data-testid="quick-add-machine-button"
              >
                <Plus className="h-3 w-3" />
                <span>+ Maquininha</span>
              </button>
            )}
          </div>

          <Select
            value={currentChannelObj.id}
            onValueChange={handleChannelSelect}
            disabled={disabled || loadingMethods}
          >
            <SelectTrigger
              data-testid="select-payment-channel"
              className="h-10 bg-[#0A0D14] border-white/15 text-white text-xs focus:ring-[#D4AF37] focus:border-[#D4AF37] rounded-[4px]"
            >
              <SelectValue placeholder="Selecione o meio" />
            </SelectTrigger>
            <SelectContent className="bg-[#121522] border-white/15 text-white rounded-[4px]">
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id} className="text-xs">
                  <div className="flex items-center justify-between w-full gap-2">
                    <span>{ch.name}</span>
                    {ch.kind === "terminal" && ch.isCustomMachine && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 rounded">
                        Terminal
                      </span>
                    )}
                    {ch.isFallback && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1 rounded">
                        Padrão
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Campo 2: Forma de Pagamento (Modalidade) */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>{labelMethod}</span>
          </Label>
          <Select
            value={method}
            onValueChange={(val) => onMethodChange?.(val)}
            disabled={disabled || isFixedMethod}
          >
            <SelectTrigger
              data-testid="select-payment-method"
              className={`h-10 bg-[#0A0D14] border-white/15 text-white text-xs focus:ring-[#D4AF37] focus:border-[#D4AF37] rounded-[4px] ${
                isFixedMethod ? "opacity-90 bg-white/5 cursor-not-allowed" : ""
              }`}
            >
              <SelectValue placeholder="Selecione a forma" />
            </SelectTrigger>
            <SelectContent className="bg-[#121522] border-white/15 text-white rounded-[4px]">
              {availableMethods.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alerta/Mensagem quando não há maquininhas cadastradas */}
      {!hasMachines && (
        <>
          {canManage ? (
            /* Administrador: Fallback seguro com atalho de cadastro */
            <div className="flex items-center justify-between text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-[4px]">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Nenhuma maquininha configurada. Usando "Outra Maquininha / Cartão".</span>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 shrink-0 ml-2 cursor-pointer"
              >
                + Cadastrar maquininha
              </button>
            </div>
          ) : (
            /* Barbeiro Comum: Mensagem puramente informativa SEM botões ou atalhos */
            <div
              data-testid="barber-no-machines-notice"
              className="flex items-center gap-2 text-[11px] text-slate-300 bg-[#121522] border border-white/10 px-3 py-1.5 rounded-[4px]"
            >
              <Info className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
              <span>Nenhuma maquininha configurada pelo administrador.</span>
            </div>
          )}
        </>
      )}

      {/* Modal Rápido de Cadastro de Maquininha (Renderizado APENAS para Dono / Gerente) */}
      {canManage && (
        <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
          <DialogContent className="sm:max-w-md bg-[#121522] border-white/15 text-white rounded-[4px] shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#D4AF37]" />
                <span>Nova Maquininha de Cartão</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleQuickAddSubmit} className="space-y-4 py-2">
              <div>
                <Label className="text-xs text-slate-300">
                  Nome da Maquininha / Terminal <span className="text-[#D4AF37]">*</span>
                </Label>
                <Input
                  value={newMachineForm.name}
                  onChange={(e) =>
                    setNewMachineForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: Terminal Balcão 1, Maquininha Principal, Totem"
                  className="mt-1 h-9 bg-[#0A0D14] border-white/15 text-white text-xs focus-visible:ring-[#D4AF37]"
                  autoFocus
                  required
                />
              </div>

              <div className="rounded-[4px] border border-white/10 bg-[#0A0D14] p-3 space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Taxas estimadas do terminal (opcional)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] text-slate-400">Débito (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newMachineForm.debito_fee}
                      onChange={(e) =>
                        setNewMachineForm((prev) => ({ ...prev, debito_fee: e.target.value }))
                      }
                      className="h-8 text-xs bg-[#121522] border-white/10 text-white font-mono"
                      placeholder="1.49"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-400">Crédito à vista (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newMachineForm.credito_fee}
                      onChange={(e) =>
                        setNewMachineForm((prev) => ({ ...prev, credito_fee: e.target.value }))
                      }
                      className="h-8 text-xs bg-[#121522] border-white/10 text-white font-mono"
                      placeholder="2.99"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-400">Pix no Terminal (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newMachineForm.pix_fee}
                      onChange={(e) =>
                        setNewMachineForm((prev) => ({ ...prev, pix_fee: e.target.value }))
                      }
                      className="h-8 text-xs bg-[#121522] border-white/10 text-white font-mono"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-white/10 sm:justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setQuickAddOpen(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingMachine || !newMachineForm.name.trim()}
                  className="text-xs bg-[#D4AF37] hover:bg-[#c29f30] text-black font-semibold gap-1.5"
                >
                  {savingMachine ? "Salvando..." : "Salvar e Selecionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
