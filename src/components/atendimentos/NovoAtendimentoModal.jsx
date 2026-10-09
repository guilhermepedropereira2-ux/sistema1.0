import React, { useState, useMemo, useEffect } from "react";
import ClientAvatar from "@/components/ClientAvatar";
import ProductIcon from "@/components/products/ProductIcon";
import {
  X,
  Plus,
  Minus,
  Scissors,
  Package,
  CircleDollarSign,
  User,
  Phone,
  Percent,
  Check,
  Tag,
  CreditCard,
  QrCode,
  Banknote,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function NovoAtendimentoModal({ isOpen, onClose, onSave }) {
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [clients, setClients] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Cliente
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientCustomName, setClientCustomName] = useState("");
  const [clientCustomPhone, setClientCustomPhone] = useState("");
  const [isNewClient, setIsNewClient] = useState(false);

  // Barbeiro Responsável
  const [selectedBarberId, setSelectedBarberId] = useState("");

  // Serviços selecionados (array de { id, name, price })
  const [selectedServices, setSelectedServices] = useState([]);

  // Produtos selecionados (array de { id, name, price, quantity })
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Desconto
  const [discountType, setDiscountType] = useState("brl"); // "brl" | "percent"
  const [discountValue, setDiscountValue] = useState(0);

  // Forma de pagamento
  const [paymentMethodId, setPaymentMethodId] = useState("");
  // Tipo de cartão: "credito" | "debito"
  const [cardType, setCardType] = useState("credito");

  // Observações
  const [notes, setNotes] = useState("");

  // Carregar dados reais ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;

    setLoadingInitial(true);
    Promise.all([
      api.get("/barbers"),
      api.get("/services"),
      api.get("/products"),
      api.get("/payment-methods"),
      api.get("/clients"),
    ])
      .then(([bRes, sRes, pRes, pmRes, cRes]) => {
        const activeBarbers = (Array.isArray(bRes) ? bRes : []).filter((b) => b.active !== false);
        const activeServices = (Array.isArray(sRes) ? sRes : []).filter((s) => s.active !== false);
        const activeProducts = (Array.isArray(pRes) ? pRes : []).filter((p) => p.active !== false);
        const activeMethods = (Array.isArray(pmRes) ? pmRes : []).filter((pm) => pm.active !== false);
        const activeClients = Array.isArray(cRes) ? cRes : [];

        setBarbers(activeBarbers);
        setServices(activeServices);
        setProducts(activeProducts);
        setPaymentMethods(activeMethods);
        setClients(activeClients);

        if (activeBarbers.length > 0) {
          const ownerOrFirst = activeBarbers.find((b) => b.role === "Dono" || b.commission_percent === 100) || activeBarbers[0];
          setSelectedBarberId(ownerOrFirst.id);
        }
        if (activeServices.length > 0) {
          setSelectedServices([activeServices[0]]);
        }
        if (activeMethods.length > 0) {
          const pixOrCash = activeMethods.find((m) => m.kind === "pix" || m.kind === "dinheiro") || activeMethods[0];
          setPaymentMethodId(pixOrCash.id);
        }
        if (activeClients.length > 0) {
          setSelectedClientId(activeClients[0].id);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar catálogo para novo atendimento:", err);
        toast.error("Erro ao carregar dados da barbearia.");
      })
      .finally(() => {
        setLoadingInitial(false);
      });
  }, [isOpen]);

  const selectedPm = useMemo(() => {
    return paymentMethods.find((pm) => pm.id === paymentMethodId) || paymentMethods[0];
  }, [paymentMethods, paymentMethodId]);

  const isCardPayment = useMemo(() => {
    if (!selectedPm) return false;
    const kind = selectedPm.kind?.toLowerCase() || "";
    const name = selectedPm.name?.toLowerCase() || "";
    return kind.includes("maquininha") || kind.includes("cartao") || kind.includes("card") || name.includes("cartão") || name.includes("ton") || name.includes("stone") || name.includes("infinitepay");
  }, [selectedPm]);

  // Subtotal de serviços
  const subtotalServices = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
  }, [selectedServices]);

  // Subtotal de produtos
  const subtotalProducts = useMemo(() => {
    return selectedProducts.reduce((sum, p) => sum + Number(p.price || 0) * (Number(p.quantity) || 1), 0);
  }, [selectedProducts]);

  // Subtotal bruto
  const grossTotal = subtotalServices + subtotalProducts;

  // Desconto calculado
  const discountTotal = useMemo(() => {
    const val = Number(discountValue) || 0;
    if (discountType === "percent") {
      return Math.min(grossTotal, (grossTotal * val) / 100);
    }
    return Math.min(grossTotal, val);
  }, [grossTotal, discountType, discountValue]);

  // Total Líquido a Pagar
  const finalTotal = Math.max(0, grossTotal - discountTotal);

  // Toggle serviço
  const toggleService = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === service.id);
      if (exists) {
        if (prev.length === 1 && selectedProducts.length === 0) {
          toast.error("O atendimento deve conter pelo menos um serviço ou produto.");
          return prev;
        }
        return prev.filter((s) => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  // Add produto
  const handleAddProduct = (product) => {
    setSelectedProducts((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  // Remove / diminuir produto
  const handleRemoveProduct = (productId) => {
    setSelectedProducts((prev) => {
      const existing = prev.find((p) => p.id === productId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((p) => p.id !== productId);
      }
      return prev.map((p) =>
        p.id === productId ? { ...p, quantity: p.quantity - 1 } : p
      );
    });
  };

  // Finalizar e salvar no Backend Real
  const handleSubmit = async (e) => {
    e.preventDefault();

    let clientName = "";
    let clientPhone = "";
    let resolvedClientId = undefined;

    if (isNewClient) {
      if (!clientCustomName.trim()) {
        toast.error("Por favor, informe o nome do cliente.");
        return;
      }
      clientName = clientCustomName.trim();
      clientPhone = clientCustomPhone.trim();
    } else {
      const c = clients.find((cl) => cl.id === selectedClientId);
      if (!c && clients.length > 0) {
        toast.error("Selecione um cliente ou opte por cadastrar novo.");
        return;
      }
      clientName = c?.name || "Cliente Avulso";
      clientPhone = c?.phone || "";
      resolvedClientId = c?.id;
    }

    if (selectedServices.length === 0 && selectedProducts.length === 0) {
      toast.error("Selecione ao menos um serviço ou produto realizado.");
      return;
    }

    const barber = barbers.find((b) => b.id === selectedBarberId) || barbers[0];
    const payment = selectedPm || paymentMethods[0];

    let paymentType = "dinheiro";
    if (payment?.kind === "pix") {
      paymentType = "pix";
    } else if (payment?.kind === "dinheiro") {
      paymentType = "dinheiro";
    } else if (isCardPayment) {
      paymentType = cardType === "credito" ? "credito_vista" : "debito";
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const todayDate = now.toISOString().split("T")[0];

    setSubmitting(true);
    try {
      const allItems = [
        ...selectedServices.map((s) => ({
          item_kind: "servico",
          item_id: s.id,
          name: s.name,
          price: Number(s.price || 0),
          quantity: 1,
        })),
        ...selectedProducts.map((p) => ({
          item_kind: "produto",
          item_id: p.id,
          name: p.name,
          price: Number(p.price || 0),
          quantity: Number(p.quantity || 1),
        })),
      ];

      // Salva no backend central via /api/barber/atendimento
      const response = await api.post("/barber/atendimento", {
        barber_id: barber?.id,
        client_name: clientName,
        client_id: resolvedClientId,
        payment_method_id: payment?.id,
        payment_type: paymentType,
        payment_channel: isCardPayment ? "Maquininha" : "Caixa Físico",
        payment_method: payment?.name,
        discount_amount: discountTotal,
        date: todayDate,
        time: currentTime,
        items: allItems,
      });

      // Dispara evento de sincronização para todos os painéis e relatórios
      window.dispatchEvent(new CustomEvent("barber-atendimento-created", { detail: response }));
      window.dispatchEvent(new CustomEvent("data-sync-needed"));

      toast.success(`Atendimento de ${clientName} registrado com sucesso!`);
      onSave?.(response);
      onClose?.();
    } catch (err) {
      console.error("Erro ao salvar atendimento:", err);
      toast.error(err?.response?.data?.detail || "Erro ao registrar atendimento no servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto antialiased animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0A0E15] border border-[#161E2C] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-[#161E2C] bg-[#0D121B] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#E5C365]">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
                Novo Atendimento
              </h2>
              <p className="text-xs text-slate-400">
                Registre os serviços e produtos realizados na barbearia
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Scroll Interno */}
        {loadingInitial ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#E5C365]" />
            <span className="text-xs">Carregando catálogo da barbearia...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* ======================================================== */}
            {/* SEÇÃO 1: BARBEIRO RESPONSÁVEL                            */}
            {/* ======================================================== */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
                Barbeiro Responsável
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {barbers.map((barber) => {
                  const isSelected = selectedBarberId === barber.id;
                  const isDono = barber.role === "Dono" || barber.commission_percent === 100;
                  return (
                    <button
                      key={barber.id}
                      type="button"
                      onClick={() => setSelectedBarberId(barber.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#D4AF37]/15 border-[#D4AF37] ring-1 ring-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/5"
                          : "bg-[#0D121B] border-[#161E2C] hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      {barber.avatar ? (
                        <img
                          src={barber.avatar}
                          alt={barber.name}
                          className="w-9 h-9 rounded-lg object-cover shrink-0 border border-black/40"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 text-[#E5C365] font-black text-xs flex items-center justify-center shrink-0">
                          {barber.name?.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-bold truncate ${isSelected ? "text-[#E5C365]" : "text-white"}`}>
                            {barber.name?.split(" ")[0] || barber.name}
                          </span>
                          {isDono && (
                            <span className="text-[9px] px-1 py-0.2 rounded font-black uppercase bg-[#D4AF37]/25 text-[#E5C365] shrink-0">
                              Dono
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {barber.role || "Barbeiro"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ======================================================== */}
            {/* SEÇÃO 2: CLIENTE                                         */}
            {/* ======================================================== */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Cliente
                </label>
                <button
                  type="button"
                  onClick={() => setIsNewClient(!isNewClient)}
                  className="text-xs font-semibold text-[#E5C365] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {isNewClient ? "Selecionar cliente cadastrado" : "+ Novo cliente / Sem cadastro"}
                </button>
              </div>

              {isNewClient ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-[#0D121B] border border-[#161E2C]">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nome do Cliente *</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={clientCustomName}
                        onChange={(e) => setClientCustomName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#070A0F] border border-[#161E2C] text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">WhatsApp / Telefone</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={clientCustomPhone}
                        onChange={(e) => setClientCustomPhone(e.target.value)}
                        placeholder="(67) 99999-9999"
                        className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#070A0F] border border-[#161E2C] text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1.5 rounded-xl bg-[#0D121B] border border-[#161E2C]">
                  {clients.map((client) => {
                    const isSelected = selectedClientId === client.id;
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setSelectedClientId(client.id)}
                        className={`p-2 rounded-lg text-left flex items-center gap-2 border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#D4AF37]/15 border-[#D4AF37] text-white"
                            : "bg-transparent border-transparent hover:bg-white/5 text-slate-300"
                        }`}
                      >
                        <ClientAvatar
                          name={client.name}
                          photo={client.avatar || client.photo}
                          size="xs"
                        />
                        <div className="min-w-0 flex-1">
                          <span className={`text-xs block font-semibold truncate ${isSelected ? "text-[#E5C365]" : "text-white"}`}>
                            {client.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {client.phone || "Sem fone"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {clients.length === 0 && (
                    <div className="col-span-full py-3 text-center text-xs text-slate-500">
                      Nenhum cliente cadastrado. Use a opção "+ Novo cliente".
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* SEÇÃO 3: SERVIÇOS REALIZADOS                             */}
            {/* ======================================================== */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-[#E5C365]" />
                  Serviços Realizados
                </label>
                <span className="text-xs font-semibold text-[#E5C365]">
                  Subtotal: R$ {subtotalServices.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {services.map((srv) => {
                  const isSelected = selectedServices.some((s) => s.id === srv.id);
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => toggleService(srv)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-sm"
                          : "bg-[#0D121B] border-[#161E2C] hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className={`text-xs font-semibold block truncate ${isSelected ? "text-[#E5C365]" : "text-white"}`}>
                          {srv.name}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          R$ {Number(srv.price || 0).toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-[#E5C365] border-[#E5C365] text-[#0A0E15]"
                            : "border-slate-700 bg-transparent"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ======================================================== */}
            {/* SEÇÃO 4: PRODUTOS VENDIDOS                               */}
            {/* ======================================================== */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#E5C365]" />
                  Produtos Adicionais (Opcional)
                </label>
                {subtotalProducts > 0 && (
                  <span className="text-xs font-semibold text-[#E5C365]">
                    Subtotal: R$ {subtotalProducts.toFixed(2).replace(".", ",")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {products.map((prod) => {
                  const current = selectedProducts.find((p) => p.id === prod.id);
                  const qty = current?.quantity || 0;
                  return (
                    <div
                      key={prod.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-1.5 ${
                        qty > 0
                          ? "bg-[#D4AF37]/15 border-[#D4AF37]"
                          : "bg-[#0D121B] border-[#161E2C]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <ProductIcon iconKey={prod.icon || prod.name} size="xs" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium text-white block truncate">
                            {prod.name}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            R$ {Number(prod.price || 0).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {qty > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(prod.id)}
                              className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black text-[#E5C365] w-4 text-center">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddProduct(prod)}
                              className="w-6 h-6 rounded-md bg-[#E5C365] text-[#0A0E15] flex items-center justify-center font-bold cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddProduct(prod)}
                            className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ======================================================== */}
            {/* SEÇÃO 5: DESCONTO & FORMA DE PAGAMENTO                    */}
            {/* ======================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Desconto */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Desconto
                </label>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg bg-[#070A0F] border border-[#161E2C] p-1">
                    <button
                      type="button"
                      onClick={() => setDiscountType("brl")}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        discountType === "brl"
                          ? "bg-[#D4AF37] text-[#0A0E15]"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("percent")}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        discountType === "percent"
                          ? "bg-[#D4AF37] text-[#0A0E15]"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      %
                    </button>
                  </div>
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={discountValue || ""}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      placeholder="0,00"
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0D121B] border border-[#161E2C] text-xs text-white focus:border-[#D4AF37] focus:outline-none font-bold"
                    />
                  </div>
                </div>
                {discountTotal > 0 && (
                  <span className="text-[11px] text-[#EF4444] font-medium mt-1 block">
                    - R$ {discountTotal.toFixed(2).replace(".", ",")} de desconto aplicado
                  </span>
                )}
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {paymentMethods.map((pm) => {
                    const isSelected = paymentMethodId === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethodId(pm.id)}
                        className={`h-9 px-2.5 rounded-lg border text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#E5C365]"
                            : "bg-[#0D121B] border-[#161E2C] hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <span className="truncate">{pm.name}</span>
                        {pm.kind === "pix" && (
                          <span className="w-2 h-2 rounded-full bg-[#20C997] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* TIPO DE CARTÃO */}
                {isCardPayment && (
                  <div className="mt-3 p-3 rounded-xl bg-[#070A0F] border border-[#161E2C] animate-in fade-in duration-200">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                      Tipo de Cartão
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCardType("credito")}
                        className={`h-9 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          cardType === "credito"
                            ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#E5C365] ring-1 ring-[#D4AF37]/40 shadow-sm"
                            : "bg-[#0D121B] border-[#161E2C] hover:border-slate-700 text-slate-400 hover:text-white"
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Crédito
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardType("debito")}
                        className={`h-9 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          cardType === "debito"
                            ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#E5C365] ring-1 ring-[#D4AF37]/40 shadow-sm"
                            : "bg-[#0D121B] border-[#161E2C] hover:border-slate-700 text-slate-400 hover:text-white"
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Débito
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Observações (Opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Pagamento no PIX pelo celular, cliente pediu corte navalhado..."
                className="w-full h-9 px-3 rounded-lg bg-[#0D121B] border border-[#161E2C] text-xs text-white focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </form>
        )}

        {/* Rodapé: Resumo e Finalizar */}
        <div className="px-5 sm:px-7 py-4 border-t border-[#161E2C] bg-[#0D121B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Total a Receber</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-[#E5C365] leading-none">
                  R$ {finalTotal.toFixed(2).replace(".", ",")}
                </span>
                {discountTotal > 0 && (
                  <span className="text-xs text-slate-400 line-through">
                    R$ {grossTotal.toFixed(2).replace(".", ",")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-[#161E2C] hover:bg-white/5 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || loadingInitial}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5C365] hover:brightness-110 text-[#070A0F] text-xs font-black tracking-wide shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Finalizar Atendimento</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
