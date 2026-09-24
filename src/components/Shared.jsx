import { memo } from "react";
import { Card } from "@/components/ui/card";
import { brl } from "@/lib/format";
import { Loader2 } from "lucide-react";

const tones = {
  default: "text-white",
  primary: "text-[#D4AF37]",
  success: "text-[#10B981]",
  danger: "text-[#EF4444]",
  muted: "text-muted-foreground",
};

export const StatCard = memo(function StatCard({ label, value, icon: Icon, tone = "default", hint, testId, big }) {
  return (
    <Card className="p-5 bg-[#12141F] border border-white/10 rounded-[4px] shadow-none hover:border-[#D4AF37]/40" data-testid={testId}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && <Icon className={`h-4 w-4 ${tones[tone] || tones.default}`} />}
      </div>
      <p className={`mt-2 font-display font-extrabold tracking-tight ${big ? "text-2xl xl:text-3xl" : "text-xl sm:text-2xl"} ${tones[tone] || tones.default}`}>
        {typeof value === "number" ? brl(value) : value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
});

export function Loading() {
  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export const EmptyState = memo(function EmptyState({ title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[4px] border border-dashed border-white/10 py-16 text-center bg-[#12141F]/40">
      <p className="font-display text-base font-bold">{title}</p>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
});
