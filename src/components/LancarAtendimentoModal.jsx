import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { Loading } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { brl, todayISO, PAYMENT_TYPES } from "@/lib/format";
import {
  Plus,
  Trash2,
  Scissors,
  Package,
  RotateCcw,
  Check,
  Ticket,
  UserPlus,
  X,
  CreditCard,
  User,
  Loader2,
  WifiOff,
} from "lucide-react";
import PaymentChannelSelector from "@/components/PaymentChannelSelector";
import {
  getChannelNameById,
  getMethodNameById,
  toLegacyPaymentType,
} from "@/lib/paymentChannels";
import {
  saveToOfflineQueue,
  cacheBarberMetadata,
  getCachedBarberMetadata,
} from "@/lib/offlineSync";
import ClientAutocomplete from "@/components/ClientAutocomplete";
import { useAuth } from "@/context/AuthContext";
import { isBarber, canManagePaymentMethods } from "@/lib/roles";

const WALKIN = "__walkin__";

export default function LancarAtendimentoModal({ open, onClose, onSuccess }) {
  const { user } = useAuth() || {};
  const isUserBarber = isBarber(user) || !canManagePaymentMethods(user);
  const { data: meRaw } = useFetch((api) => api.get("/barber/me"));
  const { data: servicesRaw } = useFetch((api) => api.get("/services"));
  const { data: productsRaw } = useFetch((api) => api.get("/products"));
  const { data: methodsRaw } = useFetch((api) => api.get("/payment-methods"));
  const { data: dash, reload: reloadDash } = useFetch((api) => api.get("/barber/dashboard"));
  const { data: clientsRaw, reload: reloadClients } = useFetch((api) => api.get("/clients"));

  // Salva metadados no cache do localStorage sempre que houver dados da API
  useEffect(() => {
    if (meRaw) cacheBarberMetadata("me", meRaw);
  }, [meRaw]);
  useEffect(() => {
    if (servicesRaw?.length) cacheBarberMetadata("services", servicesRaw);
  }, [servicesRaw]);
  useEffect(() => {
    if (productsRaw?.length) cacheBarberMetadata("products", productsRaw);
  }, [productsRaw]);
  useEffect(() => {
    if (methodsRaw?.length) cacheBarberMetadata("methods", methodsRaw);
  }, [methodsRaw]);
  useEffect(() => {
    if (clientsRaw?.length) cacheBarberMetadata("clients", clientsRaw);
  }, [clientsRaw]);

  // Permite funcionamento 100% offline utilizando dados do cache local se a API estiver inacessível
  const me = meRaw || getCachedBarberMetadata("me");
  const services = servicesRaw || getCachedBarberMetadata("services") || [];
  const products = productsRaw || getCachedBarberMetadata("products") || [];
  const methods = methodsRaw || getCachedBarberMetadata("methods") || [];
  const clients = clientsRaw || getCachedBarberMetadata("clients") || [];

  const [items, setItems] = useState([]);
  const [clientSel, setClientSel] = useState(WALKIN);
  const [walkinName, setWalkinName] = useState("");
  const [usePlan, setUsePlan] = useState(false);
  const [discount, setDiscount] = useState("");
  const [pmId, setPmId] = useState("");
  const [ptype, setPtype] = useState("dinheiro");
  const [paymentChannel, setPaymentChannel] = useState("caixa_fisico");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saving, setSaving] = useState(false);

  // Modal interno de cadastro de novo cliente
  const [ncOpen, setNcOpen] = useState(false);
  const [nc, setNc] = useState({ name: "", phone: "" });

  // Definir método de pagamento padrão ao carregar
  useEffect(() => {
    if (methods?.length && !pmId) {
      setPmId(methods[0].id);
    }
  }, [methods, pmId]);

  // Reset do formulário quando o modal é aberto
  useEffect(() => {
    if (open) {
      setItems([]);
      setClientSel(WALKIN);
      setWalkinName("");
      setUsePlan(false);
      setDiscount("");
      setPaymentChannel("caixa_fisico");
      setPaymentMethod("cash");
      setPtype("dinheiro");
      setSaving(false);
      reloadDash();
      reloadClients();
    }
  }, [open]);

  // Fecha o modal com tecla ESC explicitamente
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const method = (methods || []).find((m) => m.id === pmId);
  const availableTypes = method
    ? PAYMENT_TYPES.filter((t) => t.value in (method.fees || {}))
    : PAYMENT_TYPES;

  const barber = me?.barber;
  const authServices = (services || []).filter(
    (s) =>
      !barber?.authorized_services?.length ||
      barber.authorized_services.includes(s.id)
  );
  const authProducts = (products || []).filter(
    (p) =>
      !barber?.authorized_products?.length ||
      barber.authorized_products.includes(p.id)
  );

  const selectedClient = (clients || []).find((c) => c.id === clientSel);
  const activePlan = useMemo(() => {
    if (!selectedClient?.has_plan || !selectedClient?.plan) return null;
    const p = selectedClient.plan;
    const isUnlimited = Boolean(p.is_unlimited);
    const total = Number(p.totalServices ?? p.total ?? p.total_credits ?? 4);
    const used = Number(p.used ?? 0);
    let remaining = isUnlimited ? "Ilimitado" : Math.max(0, total - used);
    if (!isUnlimited && p.remaining != null && !isNaN(Number(p.remaining))) {
      remaining = Number(p.remaining);
    }
    const status = p.status || (remaining === 0 && !isUnlimited ? "esgotado" : "ativo");

    if (status !== "ativo") return null;
    if (!isUnlimited && remaining <= 0) return null;

    return {
      ...p,
      name: p.name || "Plano de Assinatura",
      is_unlimited: isUnlimited,
      total,
      used,
      remaining,
      status,
    };
  }, [selectedClient]);

  const addItem = (kind, id) => {
    const list = kind === "servico" ? services : products;
    const it = list?.find((x) => x.id === id);
    if (!it) return;
    setItems((arr) => [
      ...arr,
      {
        key: `${id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        item_kind: kind,
        item_id: id,
        name: it.name,
        price: it.price,
        quantity: 1,
      },
    ]);
  };

  const updItem = (key, field, value) =>
    setItems((arr) =>
      arr.map((i) => (i.key === key ? { ...i, [field]: value } : i))
    );

  const rmItem = (key) => setItems((arr) => arr.filter((i) => i.key !== key));

  const totals = useMemo(() => {
    const gross = items.reduce(
      (a, i) => a + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1),
      0
    );
    const disc = Math.min(parseFloat(discount) || 0, gross);
    return {
      gross: +gross.toFixed(2),
      disc: +disc.toFixed(2),
      paid: +(gross - disc).toFixed(2),
    };
  }, [items, discount]);

  const repeatLast = () => {
    const last = dash?.ultimos?.[0];
    if (!last || !last.items?.length) {
      return toast.info("Nenhum atendimento anterior para repetir");
    }
    setItems(
      last.items.map((i, idx) => ({
        key: `r-${idx}-${Date.now()}`,
        item_kind: i.kind || "servico",
        item_id: i.id || null,
        name: i.name,
        price: i.paid || i.price || 0,
        quantity: i.quantity || 1,
      }))
    );
    if (last.client_name && last.client_name !== "Cliente sem cadastro") {
      setWalkinName(last.client_name);
    }
    toast.success("Itens preenchidos com o último atendimento!");
  };

  const createClient = async () => {
    if (!nc.name.trim()) return toast.error("Informe o nome do cliente");
    try {
      const c = await api.post("/clients", {
        name: nc.name.trim(),
        phone: nc.phone.trim() || null,
      });
      toast.success("Cliente cadastrado com sucesso!");
      setNcOpen(false);
      setNc({ name: "", phone: "" });
      await reloadClients();
      setClientSel(c.id);
    } catch (e) {
      const det = e.response?.data?.detail;
      if (e.response?.status === 409 && det?.client) {
        toast.error(det.message);
        setClientSel(det.client.id);
        setNcOpen(false);
      } else {
        toast.error(det?.message || det || "Erro ao cadastrar cliente");
      }
    }
  };

  const finalize = async () => {
    if (!items.length) {
      return toast.error("Adicione ao menos um serviço ou produto");
    }
    if (!pmId) {
      return toast.error("Selecione a forma de pagamento");
    }
    setSaving(true);

    const isRegistered = clientSel !== WALKIN && selectedClient;
    const channelName = getChannelNameById(paymentChannel, methods);
    const methodName = getMethodNameById(paymentMethod);
    const legacyType = toLegacyPaymentType(paymentChannel, paymentMethod);

    const payload = {
      date: todayISO(),
      client_id: isRegistered ? clientSel : null,
      client_name: isRegistered ? selectedClient.name : walkinName || null,
      use_plan: !!(usePlan && activePlan),
      payment_method_id: pmId || "pm_dinheiro",
      payment_type: legacyType,
      payment_channel: channelName,
      payment_method: methodName,
      discount_amount: parseFloat(discount) || 0,
      items: items.map((i) => ({
        item_kind: i.item_kind,
        item_id: i.item_id,
        name: i.name,
        price: parseFloat(i.price) || 0,
        quantity: parseInt(i.quantity) || 1,
      })),
    };

    const handleSaveOffline = () => {
      const offlineItem = saveToOfflineQueue(payload, {
        payment_method_name: `${channelName} - ${methodName}`,
        commission_percent: barber?.commission_percent ?? 50,
      });

      // Fecha o modal imediatamente para resposta instantânea ao usuário
      onClose?.();

      toast.success(
        "Atendimento salvo localmente (Modo Offline)! Será sincronizado assim que a conexão retornar.",
        { duration: 5500, icon: "💾" }
      );

      // Notifica em tempo real a tela de trás com o item otimista
      window.dispatchEvent(
        new CustomEvent("barber-atendimento-created", { detail: offlineItem })
      );

      if (onSuccess) {
        onSuccess(offlineItem);
      }
    };

    // Se estiver sem conexão no momento do clique, salva offline diretamente
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    if (!isOnline) {
      handleSaveOffline();
      setSaving(false);
      return;
    }

    try {
      const res = await api.post("/barber/atendimento", payload);

      // Fecha o modal imediatamente para resposta instantânea ao usuário
      onClose?.();

      if (res.plan) {
        toast.success(
          res.plan.is_unlimited
            ? "Atendimento registrado! Plano: Assinatura Ativa · Cortes Ilimitados"
            : `Atendimento registrado! Restam ${res.plan.remaining_count ?? res.plan.remaining} de ${res.plan.total} cortes no mês`
        );
      } else {
        toast.success(
          `Atendimento registrado com sucesso! ${brl(res.total)} (comissão ${brl(
            res.commission
          )})`
        );
      }

      // Notifica em tempo real a tela de trás e outros ouvintes
      window.dispatchEvent(
        new CustomEvent("barber-atendimento-created", { detail: res })
      );

      if (onSuccess) {
        onSuccess(res);
      }
    } catch (e) {
      const isNetworkError =
        !e.response ||
        e.code === "ERR_NETWORK" ||
        e.message?.toLowerCase().includes("network") ||
        e.message?.toLowerCase().includes("failed to fetch");

      if (isNetworkError) {
        // Falha transitória de rede durante o envio: persiste no localStorage
        handleSaveOffline();
      } else {
        toast.error(e.response?.data?.detail || "Erro ao finalizar atendimento");
      }
    } finally {
      setSaving(false);
    }
  };

  const isLoadingData = !services || !products || !methods;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose?.()}>
      <DialogContent
        overlayClassName="!bg-black/75 !backdrop-blur-none"
        className="w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col bg-[#0F121C] border border-[#D4AF37]/40 p-0 text-white shadow-2xl rounded-[8px] overflow-hidden [&>button:last-child]:hidden duration-150 animate-in fade-in zoom-in-95"
        data-testid="lancar-atendimento-modal"
      >
        {/* Cabeçalho do Modal com Efeito Dourado & Botão de Fechar */}
        <div className="relative p-4 sm:p-5 bg-[#0A0D14] border-b border-[#D4AF37]/30 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-30 h-8 w-8 rounded-[4px] bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar modal"
            title="Fechar modal (ESC)"
            data-testid="lancar-modal-close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[4px] bg-[#D4AF37] flex items-center justify-center text-[#0B0F19] shrink-0 shadow">
                <Scissors className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40 text-[10px] uppercase font-extrabold tracking-wider rounded-[2px]">
                    Painel do Barbeiro
                  </Badge>
                  {typeof navigator !== "undefined" && !navigator.onLine && (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] uppercase font-bold tracking-wide rounded-[2px] flex items-center gap-1">
                      <WifiOff className="h-3 w-3" />
                      Modo Offline
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-base sm:text-lg font-display font-extrabold text-white mt-0.5">
                  Lançar Atendimento
                </DialogTitle>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={repeatLast}
              className="hidden sm:flex text-xs h-8 border-white/20 hover:bg-white/10 text-slate-200 hover:text-white rounded-[4px] gap-1.5 cursor-pointer font-semibold"
              data-testid="repeat-last-modal"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>Repetir Último</span>
            </Button>
          </div>
        </div>

        {/* Corpo do Formulário com Scroll Suave */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
          {isLoadingData ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-[#D4AF37]" />
              <p className="text-xs">Carregando catálogo e configurações...</p>
            </div>
          ) : (
            <>
              {/* Botão Repetir Último em Telas Pequenas */}
              <div className="sm:hidden flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={repeatLast}
                  className="w-full text-xs h-8 border-white/20 hover:bg-white/10 text-slate-200 hover:text-white rounded-[4px] gap-1.5 cursor-pointer font-semibold"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>Repetir Último Atendimento</span>
                </Button>
              </div>

              {/* 1. Seleção / Cadastro de Cliente com Autocomplete Inteligente */}
              <Card className="p-3.5 sm:p-4 rounded-[6px] bg-[#121522] border-white/10 space-y-3 shadow-none text-white">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-300 font-semibold block">
                        Cliente (Busca Inteligente / Novo)
                      </Label>
                      {clientSel !== WALKIN && selectedClient && (
                        <button
                          type="button"
                          onClick={() => {
                            setClientSel(WALKIN);
                            setWalkinName("");
                            setUsePlan(false);
                          }}
                          className="text-[11px] text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <X className="h-3 w-3" /> Limpar seleção
                        </button>
                      )}
                    </div>
                    
                    <ClientAutocomplete
                      value={clientSel !== WALKIN && selectedClient ? selectedClient.name : walkinName}
                      clients={clients || []}
                      placeholder="Digite o nome ou telefone do cliente..."
                      onChange={(typedName, client) => {
                        setWalkinName(typedName);
                        if (!client) {
                          // Se estiver editando livremente, desvincula do ID fixo a menos que seja selecionado
                          if (clientSel !== WALKIN) {
                            setClientSel(WALKIN);
                            setUsePlan(false);
                          }
                        }
                      }}
                      onSelectClient={(client) => {
                        setClientSel(client.id);
                        setWalkinName(client.name);
                        setUsePlan(false);
                      }}
                      testId="lancar-client-autocomplete"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setNcOpen(true)}
                    title="Cadastrar novo cliente"
                    className="h-10 w-10 shrink-0 border-white/20 hover:bg-white/10 text-white rounded-[4px] cursor-pointer"
                    data-testid="new-client-inline"
                  >
                    <UserPlus className="h-4 w-4 text-[#D4AF37]" />
                  </Button>
                </div>

                {/* Feedback sutil do cliente selecionado */}
                {clientSel !== WALKIN && selectedClient && (
                  <div className="flex items-center justify-between rounded bg-[#0A0D14] border border-[#D4AF37]/30 px-3 py-1.5 text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-[#D4AF37]" />
                      Cliente vinculado: <strong className="text-white">{selectedClient.name}</strong>
                    </span>
                    {selectedClient.phone && (
                      <span className="text-[11px] text-slate-400">
                        {selectedClient.phone}
                      </span>
                    )}
                  </div>
                )}

                {/* Banner de Plano Ativo */}
                {activePlan && (
                  <div
                    className="rounded-[4px] border border-[#D4AF37]/50 bg-[#D4AF37]/10 p-3 space-y-2"
                    data-testid="plan-banner"
                  >
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-[#D4AF37]">
                        <Ticket className="h-4 w-4" /> Cliente possui plano
                        ativo
                      </p>
                      <Badge className="bg-[#D4AF37]/30 text-[#D4AF37] border-[#D4AF37]/50 text-[10px] font-semibold">
                        {activePlan.is_unlimited
                          ? "Cortes Ilimitados"
                          : `Restam ${activePlan.remaining} de ${activePlan.total} cortes`}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Plano: <b>{activePlan.name}</b>
                    </p>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-white pt-1">
                      <Checkbox
                        checked={usePlan}
                        onCheckedChange={setUsePlan}
                        data-testid="use-plan-checkbox"
                        className="data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-[#0B0D14]"
                      />
                      <span>Utilizar plano neste atendimento (sem cobrança)</span>
                    </label>
                  </div>
                )}
              </Card>

              {/* 2. Adicionar Itens: Serviços e Produtos */}
              <Card className="p-3.5 sm:p-4 rounded-[6px] bg-[#121522] border-white/10 space-y-3 shadow-none text-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold mb-1.5">
                      <Scissors className="h-3.5 w-3.5 text-[#D4AF37]" />
                      Adicionar serviço
                    </Label>
                    <Select value="" onValueChange={(v) => addItem("servico", v)}>
                      <SelectTrigger
                        data-testid="add-servico"
                        className="h-10 bg-[#0A0D14] border-white/15 text-white text-xs"
                      >
                        <SelectValue placeholder="Selecionar serviço" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121522] border-white/15 text-white">
                        {authServices.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} · {brl(s.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold mb-1.5">
                      <Package className="h-3.5 w-3.5 text-emerald-400" />
                      Adicionar produto
                    </Label>
                    <Select value="" onValueChange={(v) => addItem("produto", v)}>
                      <SelectTrigger
                        data-testid="add-produto"
                        className="h-10 bg-[#0A0D14] border-white/15 text-white text-xs"
                      >
                        <SelectValue placeholder="Selecionar produto" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121522] border-white/15 text-white">
                        {authProducts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} · {brl(p.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Lista de Itens no Atendimento */}
                {items.length === 0 ? (
                  <div className="py-4 text-center rounded-[4px] bg-black/20 border border-dashed border-white/10">
                    <p className="text-xs text-slate-400">
                      Nenhum serviço ou produto adicionado ainda.
                    </p>
                    <span className="text-[10px] text-slate-500">
                      Selecione um serviço ou produto acima para compor a comanda.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    {items.map((i) => (
                      <div
                        key={i.key}
                        className="flex items-center gap-2 rounded-[4px] bg-[#0A0D14] border border-white/10 p-2 text-xs"
                        data-testid={`cart-item-${i.key}`}
                      >
                        <Badge
                          variant="secondary"
                          className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-[2px] font-bold ${
                            i.item_kind === "produto"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30"
                          }`}
                        >
                          {i.item_kind === "produto" ? "Prod" : "Serv"}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-200">
                          {i.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-slate-500">Qtd:</span>
                          <Input
                            type="number"
                            min="1"
                            className="h-8 w-12 bg-black/40 border-white/15 text-center text-xs p-1"
                            value={i.quantity}
                            onChange={(e) =>
                              updItem(i.key, "quantity", e.target.value)
                            }
                            title="Quantidade"
                          />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-slate-500">R$:</span>
                          <Input
                            type="number"
                            step="0.5"
                            className="h-8 w-20 bg-black/40 border-white/15 text-right text-xs p-1 font-mono"
                            value={i.price}
                            onChange={(e) =>
                              updItem(i.key, "price", e.target.value)
                            }
                            title="Preço"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-[2px]"
                          onClick={() => rmItem(i.key)}
                          data-testid={`rm-item-${i.key}`}
                          title="Remover item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* 3. Forma de Pagamento e Desconto */}
              <Card className="p-3.5 sm:p-4 rounded-[6px] bg-[#121522] border-white/10 space-y-3 shadow-none text-white">
                <PaymentChannelSelector
                  channel={paymentChannel}
                  method={paymentMethod}
                  paymentMethods={methods}
                  showQuickAdd={!isUserBarber}
                  isBarberView={isUserBarber}
                  onChannelChange={(ch, chObj) => {
                    setPaymentChannel(ch);
                    // Sincroniza pmId e ptype correspondentes para cálculo de taxas e settlement
                    const legType = toLegacyPaymentType(ch, paymentMethod);
                    setPtype(legType);
                    let targetPmId = chObj?.pmId;
                    if (!targetPmId && methods?.length) {
                      if (ch === "caixa_fisico") {
                        const m = methods.find((x) => x.kind === "dinheiro") || methods[0];
                        targetPmId = m.id;
                      } else if (ch === "pix_direto") {
                        const m = methods.find((x) => x.kind === "pix") || methods[0];
                        targetPmId = m.id;
                      } else {
                        const m = methods.find((x) => x.id === ch || x.kind === "maquininha" || x.kind === "cartao") || methods[0];
                        targetPmId = m.id;
                      }
                    }
                    if (targetPmId) setPmId(targetPmId);
                  }}
                  onMethodChange={(m) => {
                    setPaymentMethod(m);
                    const legType = toLegacyPaymentType(paymentChannel, m);
                    setPtype(legType);
                  }}
                />

                <div>
                  <Label className="text-xs text-slate-300 font-semibold mb-1.5 block">
                    Desconto (R$)
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0,00"
                    className="h-9 bg-[#0A0D14] border-white/15 text-white text-xs font-mono"
                    data-testid="lancar-discount"
                  />
                </div>
              </Card>

              {/* 4. Resumo de Faturamento */}
              <Card className="p-3.5 sm:p-4 rounded-[6px] bg-[#0A0D14] border border-[#D4AF37]/30 text-white space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Valor Original dos Itens:</span>
                  <span className="font-mono text-slate-200">
                    {brl(totals.gross)}
                  </span>
                </div>
                {totals.disc > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Desconto Aplicado:</span>
                    <span className="font-mono">- {brl(totals.disc)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline border-t border-white/10 pt-2 font-display text-sm sm:text-base font-extrabold">
                  <span className="text-white">Total a Receber:</span>
                  <span
                    className="text-lg sm:text-xl font-bold font-mono text-[#D4AF37]"
                    data-testid="lancar-total"
                  >
                    {brl(totals.paid)}
                  </span>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Rodapé Fixo com Botão de Finalizar */}
        <div className="p-4 bg-[#0A0D14] border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="text-xs h-11 px-4 border-white/20 hover:bg-white/10 text-slate-300 hover:text-white rounded-[4px] cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={finalize}
            disabled={saving || isLoadingData}
            className="flex-1 h-11 bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-display font-extrabold text-xs sm:text-sm tracking-wide rounded-[4px] gap-2 cursor-pointer shadow-none transition-colors border border-[#D4AF37]/50"
            data-testid="finalizar-atendimento"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>REGISTRANDO NO CAIXA...</span>
              </>
            ) : (
              <>
                <Check className="h-5 w-5 stroke-[2.5]" />
                <span>FINALIZAR ATENDIMENTO</span>
              </>
            )}
          </Button>
        </div>

        {/* Modal Embutido para Cadastrar Novo Cliente */}
        <Dialog open={ncOpen} onOpenChange={setNcOpen}>
          <DialogContent
            overlayClassName="!bg-black/80 !backdrop-blur-none"
            className="max-w-md bg-[#121522] border border-white/15 text-white p-5 rounded-[6px] duration-150 animate-in fade-in zoom-in-95"
            data-testid="inline-client-dialog"
          >
            <DialogHeader>
              <DialogTitle className="font-display text-base font-bold flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#D4AF37]" />
                Cadastrar Novo Cliente
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs text-slate-300 mb-1 block">
                  Nome do Cliente *
                </Label>
                <Input
                  value={nc.name}
                  onChange={(e) =>
                    setNc((n) => ({ ...n, name: e.target.value }))
                  }
                  placeholder="Nome completo"
                  className="h-9 bg-[#0A0D14] border-white/15 text-xs text-white"
                  data-testid="nc-name"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-300 mb-1 block">
                  Telefone / WhatsApp (opcional)
                </Label>
                <Input
                  value={nc.phone}
                  onChange={(e) =>
                    setNc((n) => ({ ...n, phone: e.target.value }))
                  }
                  placeholder="(11) 99999-9999"
                  className="h-9 bg-[#0A0D14] border-white/15 text-xs text-white font-mono"
                  data-testid="nc-phone"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-white"
                onClick={() => setNcOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={createClient}
                className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs"
                data-testid="nc-save"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Salvar Cliente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
