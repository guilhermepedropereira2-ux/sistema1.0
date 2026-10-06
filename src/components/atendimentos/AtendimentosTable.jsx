import React from "react";
import ClientAvatar from "@/components/ClientAvatar";
import ProductIcon from "@/components/products/ProductIcon";
import {
  Scissors,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  Tag,
  CreditCard,
  QrCode,
  Banknote,
  MoreVertical,
  Calendar,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function AtendimentosTable({
  attendances = [],
  onSelectAttendance,
  onDeleteAttendance,
  viewMode = "table", // "table" | "cards"
}) {
  if (attendances.length === 0) {
    return (
      <div className="rounded-2xl sm:rounded-3xl bg-[#0A0E15] border border-[#161E2C] p-8 sm:p-12 text-center select-none">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center mx-auto text-[#E5C365] mb-4">
          <Scissors className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-white mb-1">
          Nenhum atendimento encontrado
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Não há atendimentos registrados com os filtros selecionados. Tente alterar o período ou clique em "+ Novo Atendimento" para registrar um corte.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 select-none">
      {/* ======================================================== */}
      {/* 1. VISUALIZAÇÃO EM TABELA (DESKTOP & TABLET GRANDE)      */}
      {/* ======================================================== */}
      <div className="hidden md:block rounded-2xl sm:rounded-3xl bg-[#0A0E15] border border-[#161E2C] shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#161E2C] bg-[#0D121B]/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 pl-5">Horário</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Barbeiro</th>
                <th className="py-3.5 px-4">Serviços / Produtos</th>
                <th className="py-3.5 px-4">Pagamento</th>
                <th className="py-3.5 px-4">Valor Total</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 pr-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#161E2C]/70 text-xs">
              {attendances.map((att) => {
                const isDono = att.isBarberDono;
                const isPix = att.paymentType === "pix" || att.paymentMethod?.toLowerCase().includes("pix");
                const isCard = att.paymentType === "ton" || att.paymentType === "stone" || att.paymentType === "card" || att.paymentType === "infinitepay" || att.paymentMethod?.toLowerCase().includes("cartão");

                return (
                  <tr
                    key={att.id}
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => onSelectAttendance?.(att)}
                  >
                    {/* Horário */}
                    <td className="py-3 px-4 pl-5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-white">
                          {att.time}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {att.date || "Hoje"}
                      </span>
                    </td>

                    {/* Cliente */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <ClientAvatar
                          name={att.clientName}
                          photo={att.clientAvatar || att.clientPhoto}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate group-hover:text-[#E5C365] transition-colors">
                            {att.clientName}
                          </span>
                          <span className="text-[10.5px] text-slate-400 block truncate">
                            {att.clientPhone || "Sem telefone"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Barbeiro */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <img
                          src={att.barberAvatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"}
                          alt={att.barberName}
                          className="w-7 h-7 rounded-lg object-cover shrink-0 border border-slate-700/60"
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-200">
                            {att.barberName}
                          </span>
                          {isDono && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase bg-[#D4AF37]/20 text-[#E5C365] border border-[#D4AF37]/30 tracking-wider">
                              Dono
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Serviços / Produtos */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1 items-center">
                        {att.services?.length > 0 ? (
                          att.services.map((srv, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0D121B] border border-[#161E2C] text-[11px] text-slate-300 font-medium"
                            >
                              <Scissors className="w-2.5 h-2.5 text-[#E5C365]" />
                              {srv}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-300 font-medium">
                            {att.serviceLabel}
                          </span>
                        )}
                        {att.products?.length > 0 &&
                          att.products.map((p, idx) => (
                            <span
                              key={`p-${idx}`}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-[10.5px] text-[#38BDF8] font-semibold"
                            >
                              <ProductIcon iconKey={p} size="xs" variant="raw" className="w-3.5 h-3.5 text-[#38BDF8]" />
                              {p}
                            </span>
                          ))}
                      </div>
                    </td>

                    {/* Pagamento */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          isPix
                            ? "bg-[#20C997]/15 text-[#20C997] border border-[#20C997]/25"
                            : isCard
                            ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/25"
                            : "bg-white/5 text-slate-300 border border-white/10"
                        }`}
                      >
                        {isPix ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#20C997]" />
                        ) : isCard ? (
                          <CreditCard className="w-3 h-3" />
                        ) : (
                          <Banknote className="w-3 h-3 text-[#20C997]" />
                        )}
                        {att.paymentMethod}
                      </span>
                    </td>

                    {/* Valor Total */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-black text-sm text-white">
                        R$ {Number(att.value).toFixed(2).replace(".", ",")}
                      </div>
                      {att.discount > 0 && (
                        <span className="text-[10px] text-[#EF4444] font-medium block">
                          Desc: - R$ {Number(att.discount).toFixed(2).replace(".", ",")}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {att.status === "cancelado" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-[11px] font-bold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                          Cancelado
                        </span>
                      ) : att.status === "em_andamento" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-[11px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                          Em andamento
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-[11px] font-bold bg-[#20C997]/15 text-[#20C997] border border-[#20C997]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#20C997]" />
                          Finalizado
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 pr-5 whitespace-nowrap text-right">
                      <div
                        className="inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectAttendance?.(att)}
                          title="Ver Comprovante"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44 bg-[#0D121B] border border-[#161E2C] text-white p-1 rounded-xl shadow-xl z-50"
                          >
                            <DropdownMenuItem
                              onClick={() => onSelectAttendance?.(att)}
                              className="text-xs px-3 py-2 rounded-lg cursor-pointer text-slate-200 hover:bg-white/5 flex items-center gap-2"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#E5C365]" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDeleteAttendance?.(att.id)}
                              className="text-xs px-3 py-2 rounded-lg cursor-pointer text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir Registro
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. VISUALIZAÇÃO EM CARDS (MOBILE & TABLET COMPACTO)      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {attendances.map((att) => {
          const isDono = att.isBarberDono;
          const isPix = att.paymentType === "pix" || att.paymentMethod?.toLowerCase().includes("pix");
          const isCard = att.paymentType === "ton" || att.paymentType === "stone" || att.paymentType === "card" || att.paymentType === "infinitepay" || att.paymentMethod?.toLowerCase().includes("cartão");

          return (
            <div
              key={att.id}
              onClick={() => onSelectAttendance?.(att)}
              className="p-4 rounded-2xl bg-[#0A0E15] border border-[#161E2C] shadow-lg active:scale-[0.99] transition-all cursor-pointer space-y-3"
            >
              {/* Topo do Card: Horário + Status + Ações */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#161E2C]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-white">
                    {att.time}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {att.date || "Hoje"}
                  </span>
                </div>
                {att.status === "cancelado" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                    Cancelado
                  </span>
                ) : att.status === "em_andamento" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                    Em andamento
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#20C997]/15 text-[#20C997] border border-[#20C997]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#20C997]" />
                    Finalizado
                  </span>
                )}
              </div>

              {/* Informações: Cliente e Barbeiro */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <ClientAvatar
                    name={att.clientName}
                    photo={att.clientAvatar || att.clientPhoto}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-white text-xs block truncate">
                      {att.clientName}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {att.clientPhone || "Sem telefone"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 bg-[#0D121B] px-2.5 py-1.5 rounded-xl border border-[#161E2C]">
                  <img
                    src={att.barberAvatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"}
                    alt={att.barberName}
                    className="w-6 h-6 rounded-md object-cover"
                  />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-xs font-semibold text-slate-200">
                      {att.barberName}
                    </span>
                    {isDono && (
                      <span className="text-[8.5px] text-[#E5C365] font-black uppercase">
                        Dono
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags dos Serviços e Produtos */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {att.services?.map((srv, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D121B] border border-[#161E2C] text-[11px] text-slate-300 font-medium"
                  >
                    <Scissors className="w-2.5 h-2.5 text-[#E5C365]" />
                    {srv}
                  </span>
                ))}
                {att.products?.map((prod, idx) => (
                  <span
                    key={`p-mob-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-[10.5px] text-[#38BDF8] font-semibold"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {prod}
                  </span>
                ))}
              </div>

              {/* Rodapé do Card: Pagamento + Valor */}
              <div className="flex items-center justify-between pt-2.5 border-t border-[#161E2C]">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    isPix
                      ? "bg-[#20C997]/15 text-[#20C997] border border-[#20C997]/25"
                      : isCard
                      ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/25"
                      : "bg-white/5 text-slate-300 border border-white/10"
                  }`}
                >
                  {isPix ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#20C997]" />
                  ) : isCard ? (
                    <CreditCard className="w-3 h-3" />
                  ) : (
                    <Banknote className="w-3 h-3 text-[#20C997]" />
                  )}
                  {att.paymentMethod}
                </span>

                <div className="flex items-baseline gap-1.5">
                  {att.discount > 0 && (
                    <span className="text-[11px] text-slate-400 line-through">
                      R$ {Number(att.subtotal).toFixed(2).replace(".", ",")}
                    </span>
                  )}
                  <span className="font-mono font-black text-base text-[#E5C365]">
                    R$ {Number(att.value).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
