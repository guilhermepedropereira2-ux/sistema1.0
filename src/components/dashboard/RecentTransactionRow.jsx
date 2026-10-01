import { memo } from "react";
import { brl } from "@/lib/format";

export const RecentTransactionRow = memo(function RecentTransactionRow({ tx }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[3px] bg-[#0A0D14] border border-white/10 p-3 hover:border-[#D4AF37]/50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-[2px] bg-[#12141F] border border-white/10 text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0">
          {tx.client_name ? tx.client_name.substring(0, 2).toUpperCase() : "AT"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">
            {tx.client_name || "Cliente sem cadastro"}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            {tx.service_name} • <span className="text-slate-300">{tx.barber_name || "Barbeiro"}</span>
          </p>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs font-bold text-[#10B981] font-display">
          +{brl(tx.paid_amount || tx.gross_amount)}
        </p>
        <span className="inline-block text-[10px] text-slate-400 uppercase mt-0.5">
          {tx.payment_type || "PIX"}
        </span>
      </div>
    </div>
  );
});

export default RecentTransactionRow;
