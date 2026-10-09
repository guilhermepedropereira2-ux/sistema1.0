import React from "react";
import ClientAvatar from "@/components/ClientAvatar";
import {
  X,
  Scissors,
  CheckCircle2,
  Calendar,
  Clock,
  Printer,
  Share2,
  Tag,
  CircleDollarSign,
  User,
  ShieldCheck,
  CreditCard,
  QrCode,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";

export default function AtendimentoDetailsModal({ attendance, isOpen, onClose }) {
  if (!isOpen || !attendance) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*KUPOLA BARBEARIA* — Comprovante de Atendimento\n\n` +
      `Cliente: ${attendance.clientName}\n` +
      `Barbeiro: ${attendance.barberName}${attendance.isBarberDono ? " (Dono)" : ""}\n` +
      `Serviços: ${attendance.services?.join(", ") || attendance.serviceLabel}\n` +
      `Valor Total: R$ ${Number(attendance.value || 0).toFixed(2).replace(".", ",")}\n` +
      `Pagamento: ${attendance.paymentMethod}\n` +
      `Data/Hora: ${attendance.date} às ${attendance.time}\n\n` +
      `Obrigado pela preferência!`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto antialiased animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0A0E15] border border-[#161E2C] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header do Comprovante */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#161E2C] bg-[#0D121B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#20C997]/15 border border-[#20C997]/30 flex items-center justify-center text-[#20C997]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Comprovante de Atendimento
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                ID #{attendance.id}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo do Comprovante */}
        <div className="p-5 sm:p-6 space-y-5 text-xs text-slate-300">
          {/* Status + Data/Hora */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D121B] border border-[#161E2C]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#20C997]/15 text-[#20C997] border border-[#20C997]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20C997] animate-pulse" />
                Finalizado
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {attendance.date}
              </span>
              <span className="flex items-center gap-1 font-mono font-bold text-white">
                <Clock className="w-3.5 h-3.5 text-[#E5C365]" />
                {attendance.time}
              </span>
            </div>
          </div>

          {/* Dados do Cliente e Barbeiro */}
          <div className="grid grid-cols-2 gap-3">
            {/* Cliente */}
            <div className="p-3 rounded-xl bg-[#0D121B] border border-[#161E2C]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                Cliente
              </span>
              <div className="flex items-center gap-2">
                <ClientAvatar
                  name={attendance.clientName}
                  photo={attendance.clientAvatar || attendance.clientPhoto}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-white block truncate">
                    {attendance.clientName}
                  </span>
                  <span className="text-[10.5px] text-slate-400 block truncate">
                    {attendance.clientPhone || "Sem telefone"}
                  </span>
                </div>
              </div>
            </div>

            {/* Barbeiro */}
            <div className="p-3 rounded-xl bg-[#0D121B] border border-[#161E2C]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                Profissional
              </span>
              <div className="flex items-center gap-2">
                <img
                  src={attendance.barberAvatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"}
                  alt={attendance.barberName}
                  className="w-8 h-8 rounded-lg object-cover shrink-0 border border-[#D4AF37]/30"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-white truncate">
                      {attendance.barberName}
                    </span>
                    {attendance.isBarberDono && (
                      <span className="text-[8.5px] px-1 py-0.2 rounded font-black uppercase bg-[#D4AF37]/25 text-[#E5C365] shrink-0">
                        Dono
                      </span>
                    )}
                  </div>
                  <span className="text-[10.5px] text-slate-400 block truncate">
                    {attendance.isBarberDono ? "Proprietário" : "Barbeiro"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Discriminação de Serviços e Produtos */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
              Itens Realizados
            </span>
            <div className="divide-y divide-[#161E2C] rounded-xl bg-[#0D121B] border border-[#161E2C] overflow-hidden">
              {attendance.items?.length > 0 ? (
                attendance.items.map((item, idx) => {
                  const isProd = item.kind === "produto" || item.item_kind === "produto";
                  const itemPaid = item.paid_amount ?? item.gross_amount ?? item.paid ?? 0;
                  return (
                    <div
                      key={idx}
                      className={`p-3 flex items-center justify-between ${isProd ? "bg-white/[0.02]" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        {isProd ? (
                          <Tag className="w-3.5 h-3.5 text-[#38BDF8]" />
                        ) : (
                          <Scissors className="w-3.5 h-3.5 text-[#E5C365]" />
                        )}
                        <span className="font-medium text-white">
                          • {item.name}{item.quantity > 1 ? ` (${item.quantity}x)` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-white text-xs">
                          R$ {Number(itemPaid).toFixed(2).replace(".", ",")}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${isProd ? "text-[#38BDF8] bg-[#38BDF8]/10" : "text-[#E5C365] bg-[#D4AF37]/10"}`}>
                          {isProd ? "Produto" : "Serviço"}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  {attendance.services?.map((srv, idx) => (
                    <div key={`srv-${idx}`} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-[#E5C365]" />
                        <span className="font-medium text-white">• {srv}</span>
                      </div>
                      <span className="text-[#E5C365] text-[10px] font-semibold uppercase bg-[#D4AF37]/10 px-1.5 py-0.5 rounded">Serviço</span>
                    </div>
                  ))}
                  {attendance.products?.map((prod, idx) => (
                    <div key={`prd-${idx}`} className="p-3 flex items-center justify-between bg-white/[0.02]">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span className="font-medium text-white">• {prod}</span>
                      </div>
                      <span className="text-[#38BDF8] text-[10px] font-semibold uppercase bg-[#38BDF8]/10 px-1.5 py-0.5 rounded">Produto</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Resumo de Valores e Comissão */}
          <div className="p-3.5 rounded-xl bg-[#0D121B] border border-[#161E2C] space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Subtotal Bruto</span>
              <span>R$ {Number(attendance.subtotal || attendance.value).toFixed(2).replace(".", ",")}</span>
            </div>
            {attendance.discount > 0 && (
              <div className="flex items-center justify-between text-[#EF4444]">
                <span>Desconto Concedido</span>
                <span>- R$ {Number(attendance.discount).toFixed(2).replace(".", ",")}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-400">
              <span>Forma de Pagamento</span>
              <span className="font-bold text-white flex items-center gap-1.5">
                {attendance.paymentMethod === "PIX" && (
                  <span className="w-2 h-2 rounded-full bg-[#20C997]" />
                )}
                {attendance.paymentMethod}
              </span>
            </div>
            <div className="pt-2 border-t border-[#161E2C] flex items-center justify-between">
              <span className="text-sm font-bold text-white">Total Pago</span>
              <span className="text-xl font-black text-[#E5C365]">
                R$ {Number(attendance.value).toFixed(2).replace(".", ",")}
              </span>
            </div>

            {/* Comissão e Status */}
            <div className="pt-2 border-t border-[#161E2C] flex items-center justify-between">
              <span className="text-slate-400">Comissão do Profissional</span>
              <span className="font-bold text-[#10B981] text-sm">
                R$ {Number(attendance.commissionAmount ?? (attendance.value * 0.4)).toFixed(2).replace(".", ",")}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Status da Comissão</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                Paga
              </span>
            </div>
          </div>

          {/* Observações se houver */}
          {attendance.notes && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-[#161E2C]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Observações
              </span>
              <p className="text-xs text-slate-300 italic">
                "{attendance.notes}"
              </p>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="px-5 sm:px-6 py-4 border-t border-[#161E2C] bg-[#0D121B] flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2 rounded-xl bg-[#20C997]/15 hover:bg-[#20C997]/25 border border-[#20C997]/30 text-[#20C997] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-[#161E2C] text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#E5C365] hover:brightness-110 text-[#070A0F] text-xs font-black transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
