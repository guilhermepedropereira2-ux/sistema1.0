import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Scissors, MapPin, Clock, Phone, Calendar as CalendarIcon,
  CheckCircle2, ChevronRight, ChevronLeft, User,
  MessageCircle, ShieldCheck, AlertCircle, Share2, Check,
  ExternalLink,
} from "lucide-react";

export default function AgendamentoPublico() {
  const { barbeariaSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Slug fallback
  const slug = barbeariaSlug || "barbearia-vintage";
  const preselectedBarberId = searchParams.get("barber") || "";

  // Data states
  const [loadingShop, setLoadingShop] = useState(true);
  const [shopData, setShopData] = useState(null);
  const [errorShop, setErrorShop] = useState(null);

  // Stepper: 1: Serviços, 2: Profissional, 3: Data & Hora, 4: Confirmação
  const [currentStep, setCurrentStep] = useState(1);

  // Selections
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedBarberId, setSelectedBarberId] = useState(preselectedBarberId || "any");
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  // Availability states
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Fetch shop public info
  useEffect(() => {
    async function loadShop() {
      setLoadingShop(true);
      setErrorShop(null);
      try {
        const res = await fetch(`/api/public/shop/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Barbearia não encontrada.");
        }
        const data = await res.json();
        setShopData(data);

        // Pre-select first service if exists
        if (data.services && data.services.length > 0 && selectedServiceIds.length === 0) {
          setSelectedServiceIds([data.services[0].id]);
        }

        // Validate preselected barber
        if (preselectedBarberId) {
          const found = data.barbers?.find((b) => b.id === preselectedBarberId);
          if (found) {
            setSelectedBarberId(found.id);
          }
        }
      } catch (err) {
        setErrorShop(err.message || "Erro ao carregar dados da barbearia");
      } finally {
        setLoadingShop(false);
      }
    }
    loadShop();
  }, [slug, preselectedBarberId]);

  // Fetch availability when date or barber changes
  useEffect(() => {
    if (!shopData || !selectedDate) return;

    async function loadAvailability() {
      setLoadingSlots(true);
      try {
        const barberParam = selectedBarberId ? `&barber_id=${encodeURIComponent(selectedBarberId)}` : "";
        const res = await fetch(`/api/public/shop/${encodeURIComponent(slug)}/availability?date=${selectedDate}${barberParam}`);
        if (!res.ok) throw new Error("Erro ao carregar horários");
        const data = await res.json();
        setAvailableSlots(data.slots || []);
        // Reset selected time if it's no longer available
        setSelectedTime((prev) => {
          const stillAvail = data.slots?.find((s) => s.time === prev && s.available);
          return stillAvail ? prev : "";
        });
      } catch (err) {
        console.error("Availability error:", err);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadAvailability();
  }, [slug, shopData, selectedDate, selectedBarberId]);

  // Selected services objects
  const selectedServices = useMemo(() => {
    if (!shopData?.services) return [];
    return shopData.services.filter((s) => selectedServiceIds.includes(s.id));
  }, [shopData, selectedServiceIds]);

  const totalPrice = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + (s.price || 0), 0);
  }, [selectedServices]);

  const totalDuration = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + (s.duration_min || 30), 0) || 30;
  }, [selectedServices]);

  const selectedBarber = useMemo(() => {
    if (selectedBarberId === "any" || !selectedBarberId) return null;
    return shopData?.barbers?.find((b) => b.id === selectedBarberId) || null;
  }, [shopData, selectedBarberId]);

  // Next 14 days array for easy date picking
  const daysList = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      const dayNum = d.getDate();
      const monthShort = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      list.push({
        iso,
        dayNum,
        weekday: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : weekday,
        monthShort,
      });
    }
    return list;
  }, []);

  // Format phone number as typing
  const handlePhoneChange = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 6) {
      v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    } else if (v.length > 2) {
      v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
      v = `(${v}`;
    }
    setClientPhone(v);
  };

  const toggleService = (id) => {
    setSelectedServiceIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) {
          toast.info("Selecione pelo menos um serviço");
          return prev;
        }
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleConfirmBooking = async () => {
    if (!clientName.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }
    if (!clientPhone.trim() || clientPhone.replace(/\D/g, "").length < 10) {
      toast.error("Informe um WhatsApp válido com DDD.");
      return;
    }
    if (!selectedTime) {
      toast.error("Por favor, selecione um horário disponível.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/shop/${encodeURIComponent(slug)}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          client_phone: clientPhone,
          service_ids: selectedServiceIds,
          barber_id: selectedBarberId === "any" ? undefined : selectedBarberId,
          date: selectedDate,
          time: selectedTime,
          notes: clientNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Erro ao confirmar agendamento");
      }

      setBookingSuccess(data);
      toast.success("Agendamento confirmado com sucesso!");
    } catch (err) {
      toast.error(err.message || "Não foi possível concluir o agendamento");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingShop) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Carregando informações da barbearia...
        </p>
      </div>
    );
  }

  if (errorShop || !shopData) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="h-14 w-14 rounded-[2px] bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold font-display text-white mb-2">Barbearia Não Encontrada</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {errorShop || "O link acessado não corresponde a nenhuma barbearia ativa em nossa plataforma."}
        </p>
        <Button
          onClick={() => navigate("/login")}
          className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold rounded-[4px] shadow-none cursor-pointer"
        >
          Acessar Sistema
        </Button>
      </div>
    );
  }

  const { shop, services, barbers } = shopData;

  // View: Success Screen
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-[#12141F] border border-white/10 rounded-[4px] p-6 sm:p-8 shadow-none space-y-6 text-center animate-in fade-in duration-200">
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
          </div>

          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1 rounded-[2px] border border-[#D4AF37]/20">
              Agendamento Confirmado
            </span>
            <h1 className="font-display text-2xl font-black text-white mt-3">
              Tudo pronto, {clientName}!
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Seu horário foi reservado diretamente na agenda da {shop.name}.
            </p>
          </div>

          {/* Ticket de resumo */}
          <div className="bg-[#0A0D14] border border-white/10 rounded-[3px] p-5 text-left space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Data & Horário</span>
                <span className="text-base font-bold text-[#D4AF37]">
                  {selectedDate.split("-").reverse().join("/")} às {selectedTime}
                </span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs rounded-[2px]">
                Confirmado
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-[10px] text-muted-foreground block">Profissional</span>
                <span className="font-semibold text-white">
                  {bookingSuccess.appointment?.barber_name || selectedBarber?.name || "Qualquer disponível"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Duração Estimada</span>
                <span className="font-semibold text-white">{totalDuration} minutos</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs">
              <span className="text-muted-foreground">
                {selectedServices.map((s) => s.name).join(" + ")}
              </span>
              <span className="text-sm font-bold text-white">{brl(totalPrice)}</span>
            </div>
          </div>

          {/* Botões de Ação Final */}
          <div className="space-y-3 pt-2">
            {bookingSuccess.whatsapp_url && (
              <a
                href={bookingSuccess.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-none transition-colors cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Abrir WhatsApp da Barbearia</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </a>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setBookingSuccess(null);
                setCurrentStep(1);
                setSelectedTime("");
              }}
              className="w-full h-11 border-white/10 text-muted-foreground hover:text-white hover:bg-white/5 text-xs font-semibold rounded-[4px] shadow-none cursor-pointer"
            >
              Fazer Novo Agendamento
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-start p-3 sm:p-6 selection:bg-[#D4AF37] selection:text-black">
      {/* Container Principal Mobile-First */}
      <div className="w-full max-w-xl space-y-5 pb-16">
        {/* Cabeçalho da Barbearia (Dark Elegant) */}
        <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-5 sm:p-6 shadow-none relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <div className="h-14 w-14 rounded-[3px] bg-[#0A0D14] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-none">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" />
              ) : (
                <Scissors className="h-7 w-7 text-[#D4AF37]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-lg sm:text-xl font-black text-white tracking-tight truncate">
                  {shop.name}
                </h1>
                <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30 text-[10px] font-bold rounded-[2px]">
                  Agendamento Online
                </Badge>
              </div>

              {shop.address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 truncate">
                  <MapPin className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                  <span className="truncate">{shop.address}</span>
                </p>
              )}

              {shop.opening_hours && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{shop.opening_hours}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stepper Progressivo */}
        <div className="grid grid-cols-4 gap-1.5 px-1">
          {[
            { step: 1, label: "Serviço" },
            { step: 2, label: "Barbeiro" },
            { step: 3, label: "Horário" },
            { step: 4, label: "Confirmar" },
          ].map((item) => {
            const isDone = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <button
                key={item.step}
                type="button"
                disabled={item.step > currentStep}
                onClick={() => setCurrentStep(item.step)}
                className={`py-2 px-1 text-center rounded-[3px] transition-colors border cursor-pointer ${
                  isCurrent
                    ? "bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-none"
                    : isDone
                    ? "bg-[#12141F] border-emerald-500/40 text-emerald-400"
                    : "bg-[#0A0D14] border-white/10 text-muted-foreground opacity-60"
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  {isDone ? (
                    <Check className="h-3 w-3 text-emerald-400 stroke-[3]" />
                  ) : (
                    <span className={`text-[10px] font-black ${isCurrent ? "text-[#D4AF37]" : ""}`}>
                      {item.step}.
                    </span>
                  )}
                  <span className="text-[11px] font-bold truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* =============================================================== */}
        {/* PASSO 1: ESCOLHA DOS SERVIÇOS                                    */}
        {/* =============================================================== */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white font-display uppercase tracking-wider">
                  Selecione o(s) Serviço(s)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Você pode selecionar mais de um serviço se desejar combo
                </p>
              </div>
              <span className="text-xs font-bold text-[#D4AF37]">
                {selectedServiceIds.length} selecionado(s)
              </span>
            </div>

            <div className="space-y-2.5">
              {services.map((svc) => {
                const isSelected = selectedServiceIds.includes(svc.id);
                return (
                  <div
                    key={svc.id}
                    onClick={() => toggleService(svc.id)}
                    role="button"
                    tabIndex={0}
                    className={`p-4 rounded-[4px] border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-[#12141F] border-[#D4AF37] shadow-none"
                        : "bg-[#0A0D14] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-5 w-5 rounded-[2px] flex items-center justify-center border transition-colors ${
                          isSelected
                            ? "bg-[#D4AF37] border-[#D4AF37] text-slate-950 font-bold"
                            : "border-white/20 bg-[#0A0D14]"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{svc.name}</h3>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{svc.duration_min} minutos</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-white">{brl(svc.price)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Barra de Avanço Passo 1 */}
            <div className="pt-2">
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={selectedServiceIds.length === 0}
                className="w-full h-11 bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs uppercase tracking-wider rounded-[4px] shadow-none cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Avançar para Escolha do Barbeiro</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* PASSO 2: SELEÇÃO DO BARBEIRO                                     */}
        {/* =============================================================== */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white font-display uppercase tracking-wider">
                  Escolha o Profissional
                </h2>
                <p className="text-xs text-muted-foreground">
                  Selecione quem você prefere para realizar seu atendimento
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Opção Qualquer Disponível */}
              <div
                onClick={() => setSelectedBarberId("any")}
                role="button"
                tabIndex={0}
                className={`p-4 rounded-[4px] border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                  selectedBarberId === "any"
                    ? "bg-[#12141F] border-[#D4AF37] shadow-none"
                    : "bg-[#0A0D14] border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[2px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-bold text-sm">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">Qualquer Barbeiro Disponível</h3>
                      <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] text-[9px] font-bold border-[#D4AF37]/30 rounded-[2px]">
                        Mais Rápido
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Encaixe com o primeiro profissional livre na data
                    </p>
                  </div>
                </div>

                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    selectedBarberId === "any" ? "border-[#D4AF37] bg-[#D4AF37] text-[#0B0D14]" : "border-white/20"
                  }`}
                >
                  {selectedBarberId === "any" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </div>
              </div>

              {/* Lista dos Barbeiros Individuais */}
              {barbers.map((barber) => {
                const isSelected = selectedBarberId === barber.id;
                return (
                  <div
                    key={barber.id}
                    onClick={() => setSelectedBarberId(barber.id)}
                    role="button"
                    tabIndex={0}
                    className={`p-4 rounded-[4px] border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-[#12141F] border-[#D4AF37] shadow-none"
                        : "bg-[#0A0D14] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#0A0D14] border border-white/10 flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                        {barber.photo_url ? (
                          <img src={barber.photo_url} alt={barber.name} className="h-full w-full object-cover" />
                        ) : (
                          <span>{barber.name.substring(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{barber.name}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Especialista em Cortes & Barbas
                        </p>
                      </div>
                    </div>

                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-[#D4AF37] bg-[#D4AF37] text-[#0B0D14]" : "border-white/20"
                      }`}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="h-11 border-white/10 text-muted-foreground hover:text-white rounded-[4px] px-4 cursor-pointer shadow-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                className="flex-1 h-11 bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs uppercase tracking-wider rounded-[4px] shadow-none cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Avançar para Data & Horário</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* PASSO 3: DIA E HORÁRIOS DISPONÍVEIS                              */}
        {/* =============================================================== */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-sm font-bold text-white font-display uppercase tracking-wider">
                Escolha a Data & Horário
              </h2>
              <p className="text-xs text-muted-foreground">
                Horários calculados em tempo real com base na disponibilidade
              </p>
            </div>

            {/* Carrossel de Dias */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {daysList.map((d) => {
                const isSelected = selectedDate === d.iso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d.iso);
                      setSelectedTime("");
                    }}
                    className={`flex flex-col items-center justify-center min-w-[65px] py-2.5 px-2 rounded-[3px] border transition-colors shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-[#D4AF37] text-[#0B0D14] border-[#D4AF37] shadow-none font-bold"
                        : "bg-[#0A0D14] border-white/10 text-white hover:border-white/20"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-tight opacity-80">
                      {d.weekday}
                    </span>
                    <span className="text-base font-extrabold mt-0.5">{d.dayNum}</span>
                    <span className="text-[9px] uppercase font-semibold opacity-70">
                      {d.monthShort}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Grade de Horários */}
            <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 space-y-3 shadow-none">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Horários Disponíveis</span>
                {loadingSlots ? (
                  <span className="text-[#D4AF37] flex items-center gap-1.5 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                    Verificando agenda...
                  </span>
                ) : (
                  <span>{availableSlots.filter((s) => s.available).length} opções livres</span>
                )}
              </div>

              {loadingSlots ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Consultando agenda em tempo real...
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhum horário disponível para esta data.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`h-10 rounded-[3px] text-xs font-semibold transition-colors border flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? "bg-[#D4AF37] text-[#0B0D14] border-[#D4AF37] shadow-none font-bold"
                            : slot.available
                            ? "bg-[#0A0D14] text-white border-white/10 hover:border-[#D4AF37]/60"
                            : "bg-[#0A0D14]/40 text-muted-foreground/30 border-white/5 cursor-not-allowed line-through"
                        }`}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="h-11 border-white/10 text-muted-foreground hover:text-white rounded-[4px] px-4 cursor-pointer shadow-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setCurrentStep(4)}
                disabled={!selectedTime}
                className="flex-1 h-11 bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs uppercase tracking-wider rounded-[4px] shadow-none cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Avançar para Seus Dados</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* PASSO 4: IDENTIFICAÇÃO E CONFIRMAÇÃO FINAL                       */}
        {/* =============================================================== */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-sm font-bold text-white font-display uppercase tracking-wider">
                Seus Dados para Confirmação
              </h2>
              <p className="text-xs text-muted-foreground">
                Informe seu nome e WhatsApp para receber o lembrete e confirmação
              </p>
            </div>

            {/* Resumo do Agendamento */}
            <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 space-y-3 shadow-none">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-[#D4AF37]" />
                  <span className="text-xs font-bold text-white">
                    {selectedDate.split("-").reverse().join("/")} às {selectedTime}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#D4AF37]">
                  {selectedBarber ? selectedBarber.name : "Qualquer profissional"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                {selectedServices.map((s) => (
                  <div key={s.id} className="flex justify-between items-center text-muted-foreground">
                    <span>{s.name} ({s.duration_min} min)</span>
                    <span className="text-white font-medium">{brl(s.price)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/10 flex justify-between items-center font-bold text-sm">
                  <span className="text-white">Valor Total</span>
                  <span className="text-[#D4AF37]">{brl(totalPrice)}</span>
                </div>
              </div>
            </div>

            {/* Formulário do Cliente */}
            <div className="rounded-[4px] bg-[#12141F] border border-white/10 p-4 space-y-4 shadow-none">
              <div>
                <Label className="text-xs font-bold text-white mb-1.5 block">
                  Seu Nome Completo *
                </Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  className="h-10 bg-[#0A0D14] border-white/10 text-white text-xs rounded-[4px] focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-white mb-1.5 block">
                  WhatsApp com DDD *
                </Label>
                <Input
                  value={clientPhone}
                  onChange={handlePhoneChange}
                  placeholder="(11) 98765-4321"
                  className="h-10 bg-[#0A0D14] border-white/10 text-white text-xs rounded-[4px] focus:border-[#D4AF37]"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Enviaremos o link de confirmação para o seu WhatsApp
                </p>
              </div>

              <div>
                <Label className="text-xs font-bold text-white mb-1.5 block">
                  Observações (Opcional)
                </Label>
                <Textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Alguma preferência especial? Ex: Degradê navalhado, toalha quente..."
                  rows={2}
                  className="bg-[#0A0D14] border-white/10 text-white text-xs rounded-[4px] focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(3)}
                className="h-11 border-white/10 text-muted-foreground hover:text-white rounded-[4px] px-4 cursor-pointer shadow-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleConfirmBooking}
                disabled={submitting}
                className="flex-1 h-11 bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs uppercase tracking-wider rounded-[4px] shadow-none cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>Gravando Agendamento...</span>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
                    <span>Confirmar Agendamento</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Rodapé Seguro e Discreto */}
        <div className="text-center pt-4">
          <p className="text-[11px] text-muted-foreground/60 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#D4AF37]/60" />
            <span>Agendamento protegido com isolamento direto da barbearia</span>
          </p>
        </div>
      </div>
    </div>
  );
}
