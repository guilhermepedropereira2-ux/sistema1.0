import React from "react";
import { Calendar, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DailySummary({
  total = 12,
  confirmed = 10,
  pending = 1,
  cancelled = 1,
}) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl bg-[#0A0E15] border border-[#161E2C] p-4 sm:p-5 shadow-xl select-none">
      {/* Cabeçalho com link */}
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-sm font-bold text-white tracking-tight">
          Resumo do dia
        </h3>
        <button
          type="button"
          onClick={() => navigate("/fluxo-de-caixa")}
          className="text-xs font-semibold text-[#E5C365] hover:text-white flex items-center gap-1 transition-colors cursor-pointer group"
        >
          <span>Ver relatório</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Grade 2x2 Fiel ao Gabarito */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Agendamentos */}
        <div className="p-3 rounded-xl bg-[#0D121B] border border-[#161E2C] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center shrink-0 text-slate-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-base sm:text-lg font-black text-white leading-none">
              {total}
            </span>
            <span className="block text-[11px] font-medium text-slate-400 mt-1">
              Agendamentos
            </span>
          </div>
        </div>

        {/* Confirmados */}
        <div className="p-3 rounded-xl bg-[#0D121B] border border-[#161E2C] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#20C997]/15 border border-[#20C997]/30 flex items-center justify-center shrink-0 text-[#20C997]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-base sm:text-lg font-black text-white leading-none">
              {confirmed}
            </span>
            <span className="block text-[11px] font-medium text-slate-400 mt-1">
              Confirmados
            </span>
          </div>
        </div>

        {/* Pendentes */}
        <div className="p-3 rounded-xl bg-[#0D121B] border border-[#161E2C] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0 text-[#E5C365]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-base sm:text-lg font-black text-white leading-none">
              {pending}
            </span>
            <span className="block text-[11px] font-medium text-slate-400 mt-1">
              Pendentes
            </span>
          </div>
        </div>

        {/* Cancelados */}
        <div className="p-3 rounded-xl bg-[#0D121B] border border-[#161E2C] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center shrink-0 text-[#EF4444]">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-base sm:text-lg font-black text-white leading-none">
              {cancelled}
            </span>
            <span className="block text-[11px] font-medium text-slate-400 mt-1">
              Cancelados
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
