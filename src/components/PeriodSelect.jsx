import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PERIOD_OPTIONS } from "@/lib/format";

export function PeriodSelect({ period, setPeriod, custom, setCustom, testId = "period" }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger className="w-44" data-testid={`${testId}-select`}><SelectValue /></SelectTrigger>
        <SelectContent>{PERIOD_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
      </Select>
      {period === "personalizado" && (
        <>
          <Input type="date" className="w-40" value={custom.start} onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))} data-testid={`${testId}-start`} />
          <Input type="date" className="w-40" value={custom.end} onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))} data-testid={`${testId}-end`} />
        </>
      )}
    </div>
  );
}
