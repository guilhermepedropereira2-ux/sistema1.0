import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { Loading, EmptyState } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brl, monthLabel } from "@/lib/format";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const STATUS = {
  pago: { cls: "bg-success", label: "Pago" },
  pendente: { cls: "bg-muted-foreground", label: "Pendente" },
  vencido: { cls: "bg-destructive", label: "Vencido" },
};

export default function Calendario() {
  const { month } = useMonth();
  const { data, loading } = useApi((api) => api.get("/calendar", { month }));
  if (loading || !data) return <Loading />;

  const expensesList = Array.isArray(data) ? data : (data.expenses || []);

  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startPad = first.getDay();

  const byDay = {};
  expensesList.forEach((e) => {
    if (!e?.due_date) return;
    const d = parseInt(e.due_date.slice(8, 10), 10);
    (byDay[d] = byDay[d] || []).push(e);
  });

  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-5 max-w-full 2xl:max-w-[1920px] mx-auto" data-testid="calendario-page">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {Object.entries(STATUS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${v.cls}`} /> {v.label}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Próximo do vencimento</span>
      </div>

      {!expensesList.length ? (
        <EmptyState title="Nenhuma conta neste mês" subtitle="As despesas cadastradas aparecerão no calendário." />
      ) : (
        <Card className="p-3 sm:p-5 overflow-x-auto">
          <div className="min-w-[500px] grid grid-cols-7 gap-1 sm:gap-2">
            {WEEKDAYS.map((w) => <div key={w} className="py-2 text-center text-xs font-semibold text-muted-foreground">{w}</div>)}
            {cells.map((d, i) => (
              <div key={i} className={`min-h-[76px] rounded-md border p-1.5 ${d ? "border-border" : "border-transparent"}`} data-testid={d ? `cal-day-${d}` : undefined}>
                {d && <span className="text-xs text-muted-foreground">{d}</span>}
                <div className="mt-1 space-y-1">
                  {(byDay[d] || []).map((e) => {
                    const st = e.near_due && e.status === "pendente" ? { cls: "bg-primary/15 text-primary", dot: "bg-primary" } :
                      e.status === "pago" ? { cls: "bg-success/15 text-success", dot: "bg-success" } :
                      e.status === "vencido" ? { cls: "bg-destructive/15 text-destructive", dot: "bg-destructive" } :
                      { cls: "bg-secondary text-foreground", dot: "bg-muted-foreground" };
                    return (
                      <div key={e.id} className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${st.cls}`} title={`${e.name} · ${brl(e.value)}`}>
                        {e.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
