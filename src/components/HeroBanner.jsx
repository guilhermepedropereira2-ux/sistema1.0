import React from "react";
import { MapPin, ArrowRight, Store } from "lucide-react";

export default function HeroBanner({
  userName = "Administrador",
  shopName = "Barbearia",
  unitName = "Matriz",
  onOpenStoreProfile,
}) {
  const currentHour = new Date().getHours();
  const greeting =
    currentHour >= 5 && currentHour < 12
      ? "BOM DIA,"
      : currentHour >= 12 && currentHour < 18
      ? "BOA TARDE,"
      : "BOA NOITE,";

  const todayFormatted = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="relative rounded-3xl border border-[#222e44]/80 p-5 sm:p-9 lg:p-11 overflow-hidden shadow-2xl min-h-[235px] sm:min-h-[265px] lg:min-h-[295px] flex items-center bg-[#070A0F]">
      {/* 
        1. FOTOGRAFIA CINEMATOGRÁFICA REALÍSTICA DA BARBEARIA (KUPOLA 2.0)
        - Preenche 100% do background do Hero
        - Posição calibrada e tons quentes/dourados preservados
      */}
      <img
        src="/hero-barbershop-v2.jpg"
        alt="Barbearia Premium"
        className="absolute inset-0 w-full h-full object-cover object-[78%_center] sm:object-right select-none pointer-events-none transition-transform duration-700"
      />

      {/* 
        2. CAMADAS DE VINHETA SUAVE E TRANSLÚCIDA
        - Escurecimento direcionado para garantir legibilidade dos textos à esquerda
        - Permite ver os detalhes e a atmosfera da barbearia à direita
      */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#05070B]/90 via-[#05070B]/50 to-[#05070B]/15 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05070B]/60 via-transparent to-[#05070B]/20 pointer-events-none" />

      {/* Iluminação âmbar quente alinhada às luzes da barbearia */}
      <div className="absolute right-[8%] top-[10%] w-[320px] h-[220px] bg-[#D4AF37]/15 blur-[80px] rounded-full pointer-events-none" />

      {/* 3. CONTEÚDO EDITORIAL EM PRIMEIRO PLANO */}
      <div className="relative z-10 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        {/* Lado Esquerdo: Saudação e Resumo */}
        <div className="max-w-xl">
          <span className="inline-block text-xs sm:text-[13px] font-bold tracking-[0.24em] text-[#F3CE72] uppercase mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] font-sans">
            {greeting}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-[48px] font-black text-white tracking-tight leading-none mb-3.5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            {userName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed max-w-lg drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
            <span className="hidden sm:inline">
              Aqui está o resumo da sua barbearia hoje,{" "}
            </span>
            <span className="sm:hidden">
              Veja o resumo da sua barbearia hoje,{" "}
            </span>
            {todayFormatted}.
          </p>
        </div>

        {/* Lado Direito: Identificação da Loja e Unidade */}
        <div className="shrink-0 self-start sm:self-auto">
          {/* Card Desktop */}
          <div className="hidden sm:flex flex-col items-end">
            <div className="text-xs font-bold tracking-wider text-slate-100 uppercase mb-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              {shopName}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-200 mb-3.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
              <MapPin className="w-3.5 h-3.5 text-[#E5C365]" />
              <span>{unitName}</span>
            </div>
            <button
              type="button"
              onClick={onOpenStoreProfile}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#E5C365] hover:text-white border border-[#D4AF37]/60 hover:border-[#E5C365] rounded-xl bg-[#070A0F]/85 hover:bg-[#D4AF37]/25 backdrop-blur-md transition-all shadow-xl group cursor-pointer"
            >
              <span>Ver perfil da barbearia</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Pill Mobile */}
          <button
            type="button"
            onClick={onOpenStoreProfile}
            className="sm:hidden flex items-center justify-between w-full p-3 bg-[#070A0F]/85 backdrop-blur-md border border-[#D4AF37]/30 rounded-xl hover:border-[#D4AF37]/60 transition-colors shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-[#F3CE72]" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">
                  {shopName}
                </div>
                <div className="text-[10px] text-slate-300">{unitName}</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 ml-2" />
          </button>
        </div>
      </div>
    </section>
  );
}
