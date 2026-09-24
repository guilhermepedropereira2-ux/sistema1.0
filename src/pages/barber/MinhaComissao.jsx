import { useMemo, useState, useEffect } from "react";
import { useFetch } from "@/hooks/useFetch";
import { PeriodSelect } from "@/components/PeriodSelect";
import { Loading, StatCard, EmptyState } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brl, fmtDate, periodRange } from "@/lib/format";
import { HandCoins, CheckCircle2, Clock } from "lucide-react";

export default function MinhaComissao() {
  const [period, setPeriod] = useState("mes");
  const [custom, setCustom] = useState({ start: "", end: "" });
  const { start, end } = useMemo(() => periodRange(period, custom), [period, custom]);
  const { data, loading, reload } = useFetch((api) => api.get(`/barber/comissao?start=${start}&end=${end}`), [start, end]);

  useEffect(() => {
    const onCreated = () => reload();
    window.addEventListener("barber-atendimento-created", onCreated);
    return () => window.removeEventListener("barber-atendimento-created", onCreated);
  }, [reload]);
  if (loading || !data) return <Loading />;

  return (
    <div className="space-y-5" data-testid="minha-comissao">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold">Minha Comissão</h2>
        <PeriodSelect period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} testId="com-period" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Comissão gerada" value={data.gerada} icon={HandCoins} tone="primary" testId="c-gerada" />
        <StatCard label="Comissão paga" value={data.paga} icon={CheckCircle2} tone="success" testId="c-paga" />
        <StatCard label="Comissão pendente" value={data.pendente} icon={Clock} tone={data.pendente > 0 ? "danger" : "muted"} testId="c-pendente" />
      </div>

      {((data.historico_pagamentos || []).length > 0) && (
        <Card className="p-5">
          <h3 className="mb-3 font-display text-sm font-bold">Histórico de pagamentos</h3>
          <div className="space-y-2">
            {(data.historico_pagamentos || []).map((p, idx) => (
              <div key={`${p.date || 'pay'}_${idx}`} className="flex justify-between rounded-md bg-secondary px-3 py-2 text-sm">
                <span className="text-muted-foreground">{fmtDate(p.date)}</span><span className="font-semibold text-success">{brl(p.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="mb-3 font-display text-sm font-bold">Detalhamento por atendimento</h3>
        {!(data.detalhamento || []).length ? <EmptyState title="Sem atendimentos no período" /> : (
          <div className="space-y-2">
            {(data.detalhamento || []).map((g, idx) => (
              <div key={g.sale_group_id ? `${g.sale_group_id}_${idx}` : g.id ? `${g.id}_${idx}` : `com_${idx}`} className="flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-sm" data-testid={`com-detail-${g.sale_group_id || idx}`}>
                <div className="min-w-0">
                  <p className="truncate">{(g.items || []).map((i) => i.name).join(", ") || "Atendimento"}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(g.date)} · pago {brl(g.paid)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-success">{brl(g.commission)}</p>
                  {g.items && <Badge variant="secondary" className="text-[10px]">{g.status}</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
