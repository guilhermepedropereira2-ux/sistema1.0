import React from "react";
import { CreditCard, Banknote, QrCode, Wallet } from "lucide-react";

export default function PaymentBreakdown({ methods = [] }) {
  const getIcon = (type = "") => {
    const t = String(type).toLowerCase();
    if (t.includes("pix")) {
      return (
        <div className="w-6 h-6 rounded-md bg-[#20C997]/15 text-[#20C997] flex items-center justify-center shrink-0">
          <QrCode className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (t.includes("crédito") || t.includes("credito") || t === "credit") {
      return (
        <div className="w-6 h-6 rounded-md bg-[#D4AF37]/15 text-[#E5C365] flex items-center justify-center shrink-0">
          <CreditCard className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (t.includes("débito") || t.includes("debito") || t === "debit") {
      return (
        <div className="w-6 h-6 rounded-md bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
          <CreditCard className="w-3.5 h-3.5" />
        </div>
      );
    }
    return (
      <div className="w-6 h-6 rounded-md bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
        <Banknote className="w-3.5 h-3.5" />
      </div>
    );
  };

  const getBarColor = (type = "") => {
    const t = String(type).toLowerCase();
    if (t.includes("pix")) return "#20C997";
    if (t.includes("crédito") || t.includes("credito") || t === "credit") return "#E5C365";
    if (t.includes("débito") || t.includes("debito") || t === "debit") return "#38bdf8";
    return "#a855f7";
  };

  return (
    <div className="rounded-2xl bg-[#0D121B] border border-[#161e2c] p-4 sm:p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[#161e2c]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#E5C365]">
            <Wallet className="w-4 h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Formas de Pagamento
          </h3>
        </div>
      </div>

      {/* Methods breakdown list */}
      <div className="space-y-3">
        {methods.map((method) => {
          const barColor = getBarColor(method.iconType || method.name);
          const amount = Number(method.amount || method.value || 0);
          const percentage = Number(method.percentage || 0);

          return (
            <div
              key={method.name}
              className="flex items-center justify-between gap-3 text-xs"
            >
              {/* Method Icon & Name */}
              <div className="flex items-center gap-2.5 min-w-[125px] sm:min-w-[140px]">
                {getIcon(method.iconType || method.name)}
                <span className="font-medium text-slate-200 truncate">
                  {method.name}
                </span>
              </div>

              {/* Progress Bar & Percentage */}
              <div className="flex-1 flex items-center gap-2 max-w-[130px] sm:max-w-[160px]">
                <div className="flex-1 h-2 rounded-full bg-[#161e2b] overflow-hidden">
                  <div
                    style={{
                      width: `${Math.max(percentage, amount > 0 ? 4 : 0)}%`,
                      backgroundColor: barColor,
                    }}
                    className="h-full rounded-full transition-all duration-500"
                  />
                </div>
                <span className="text-[11px] font-mono text-slate-400 w-8 text-right tabular-nums">
                  {percentage}%
                </span>
              </div>

              {/* Formatted Currency */}
              <div className="w-20 text-right font-mono font-bold text-slate-100 tabular-nums">
                R$ {amount.toFixed(2).replace(".", ",")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
