import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Calendar, Users, BarChart3, Settings, ArrowRight } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();

  const benefits = [
    {
      id: "agenda",
      icon: Calendar,
      title: "Agenda inteligente",
      desc: "Gestão da agenda e horários.",
    },
    {
      id: "clientes",
      icon: Users,
      title: "Gestão de clientes",
      desc: "Clientes, histórico e relacionamento.",
    },
    {
      id: "financeiro",
      icon: BarChart3,
      title: "Controle financeiro",
      desc: "Receitas, despesas e resultados.",
    },
    {
      id: "equipe",
      icon: Settings,
      title: "Equipe e muito mais",
      desc: "Controle completo da operação.",
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-6 overflow-x-hidden select-none bg-[#05070B]">
      {/* 
        IMAGEM 3 OFICIAL - FUNDO DA BARBEARIA LUXURY
        Preservando a cadeira de barbeiro, espelhos dourados, iluminação quente e ambiente premium.
      */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: "url('/hero-barbershop-v2.jpg')",
        }}
      />

      {/* Camada escura de overlay calculada (rgba(5, 7, 11, 0.45)) para legibilidade impecável */}
      <div className="absolute inset-0 bg-[#05070B]/50 sm:bg-[#05070B]/45 backdrop-brightness-[0.92] pointer-events-none" />

      {/* Vinheta sutil radial para foco no card central */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,7,11,0.6)_100%)] pointer-events-none" />

      {/* CARD CENTRAL PREMIUM (GABARITO OFICIAL DESKTOP & MOBILE) */}
      <main className="relative z-10 w-full max-w-[560px] mx-auto rounded-2xl sm:rounded-3xl bg-[#090C12]/90 sm:bg-[#080B10]/85 backdrop-blur-xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] p-5 sm:p-8 lg:p-9 text-center flex flex-col items-center">
        {/* LOGO OFICIAL KUPOLA COM COROA GEOMÉTRICA DOURADA */}
        <div className="flex flex-col items-center justify-center mb-5 sm:mb-6">
          {/* Coroa Geométrica Minimalista Dourada */}
          <div className="mb-2 text-[#E5C365]">
            <svg
              viewBox="0 0 48 32"
              fill="none"
              className="w-10 h-7 sm:w-12 sm:h-8 drop-shadow-[0_0_12px_rgba(229,195,101,0.4)]"
            >
              <path
                d="M4 26h40M4 26L9 7l15 13L39 7l5 19"
                stroke="url(#crownGoldGrad)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="crownGoldGrad" x1="4" y1="7" x2="44" y2="26" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFDF0" />
                  <stop offset="0.4" stopColor="#F3CE72" />
                  <stop offset="1" stopColor="#D4AF37" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Wordmark KUPOLA */}
          <span className="font-['Outfit',sans-serif] tracking-[0.28em] text-[20px] sm:text-[24px] font-black uppercase bg-gradient-to-r from-[#FFFDF0] via-[#F3CE72] to-[#D4AF37] bg-clip-text text-transparent leading-none">
            KUPOLA
          </span>

          {/* Subtítulo institucional */}
          <span className="text-[8.5px] sm:text-[9.5px] font-bold tracking-[0.22em] text-white/50 uppercase mt-1.5">
            GESTÃO COMPLETA PARA BARBEARIAS
          </span>
        </div>

        {/* TÍTULO PRINCIPAL */}
        <h1 className="text-[26px] sm:text-[34px] lg:text-[38px] font-extrabold text-white tracking-tight leading-[1.15] mb-3">
          Bem-vindo à sua <br />
          <span className="bg-gradient-to-r from-[#FFF0BE] via-[#F3CE72] to-[#D4AF37] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(212,175,55,0.2)]">
            nova gestão.
          </span>
        </h1>

        {/* SUBTEXTO */}
        <p className="text-xs sm:text-[13.5px] text-white/70 max-w-md mx-auto leading-relaxed mb-6 sm:mb-8 font-normal">
          Configure sua barbearia em poucos minutos e tenha controle completo da sua operação.
        </p>

        {/* 4 BENEFÍCIOS (GRID RESPONSIVO) */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                className="flex flex-col items-center justify-start p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-[#D4AF37]/30 transition-all text-center group"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-[#E5C365] mb-2 shadow-inner group-hover:scale-105 group-hover:border-[#E5C365]/40 transition-transform">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-[11px] sm:text-[11.5px] font-semibold text-white/90 leading-tight mb-1">
                  {b.title}
                </h2>
                <p className="text-[9px] sm:text-[9.5px] text-white/50 leading-tight line-clamp-2">
                  {b.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* STEPPER / INDICADOR DE PROGRESSO (1 de 4 etapas) */}
        <div className="flex flex-col items-center gap-1.5 mb-5 sm:mb-6">
          <div className="flex items-center gap-2">
            {/* Etapa 1 - Ativa (Dourada Preenchida) */}
            <div className="w-2.5 h-2.5 rounded-full bg-[#E5C365] shadow-[0_0_10px_rgba(229,195,101,0.8)] ring-2 ring-[#E5C365]/30" />
            <div className="w-4 sm:w-6 h-px bg-white/20" />
            {/* Etapa 2 */}
            <div className="w-2 h-2 rounded-full border border-white/30 bg-transparent" />
            <div className="w-4 sm:w-6 h-px bg-white/20" />
            {/* Etapa 3 */}
            <div className="w-2 h-2 rounded-full border border-white/30 bg-transparent" />
            <div className="w-4 sm:w-6 h-px bg-white/20" />
            {/* Etapa 4 */}
            <div className="w-2 h-2 rounded-full border border-white/30 bg-transparent" />
          </div>
          <span className="text-[11px] text-white/50 font-medium">1 de 4 etapas</span>
        </div>

        {/* BOTÃO PRINCIPAL DE AÇÃO */}
        <button
          onClick={() => navigate("/onboarding/barbearia")}
          data-testid="welcome-start-btn"
          className="w-full py-3.5 sm:py-4 px-6 rounded-xl font-extrabold text-[#080B10] bg-gradient-to-r from-[#F3CE72] via-[#E5C365] to-[#D4AF37] hover:brightness-110 active:scale-[0.99] shadow-[0_8px_25px_rgba(212,175,55,0.3)] transition-all cursor-pointer text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 group mb-5"
        >
          <span>COMEÇAR CONFIGURAÇÃO</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* JÁ TENHO UMA CONTA (DIVISOR COM LINK DE LOGIN) */}
        <div className="w-full flex items-center justify-center gap-3">
          <div className="h-px bg-white/10 flex-1" />
          <Link
            to="/login"
            data-testid="welcome-login-link"
            className="text-xs sm:text-[13px] font-medium text-white/60 hover:text-[#E5C365] transition-colors whitespace-nowrap cursor-pointer"
          >
            Já tenho uma conta
          </Link>
          <div className="h-px bg-white/10 flex-1" />
        </div>
      </main>
    </div>
  );
}
