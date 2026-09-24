import { useMemo, useState, useCallback, memo, useEffect } from "react";
import { useFetch } from "@/hooks/useFetch";
import { PeriodSelect } from "@/components/PeriodSelect";
import { Loading, EmptyState } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { brl, fmtDate, paymentTypeLabel, periodRange } from "@/lib/format";
import { ChevronRight, CloudOff, RefreshCw } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Button } from "@/components/ui/button";

// Item memoizado para listagem rápida sem recálculos desnecessários
const AtendimentoItemCard = memo(function AtendimentoItemCard({ atendimento, onSelect, testId }) {
  const isInactive = atendimento.status !== "ativo";
  const itemsText = (atendimento.items || []).map((i) => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ""}`).join(", ") || "Atendimento";

  return (
    <Card
      className={`flex cursor-pointer items-center gap-3 p-4 bg-[#12141F] border border-white/10 rounded-[4px] shadow-none hover:border-[#D4AF37]/40 ${isInactive ? "opacity-50" : ""}`}
      onClick={() => onSelect(atendimento)}
      data-testid={testId}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-white">{itemsText}</p>
          {atendimento.is_offline && (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] py-0 px-1.5 rounded-[2px] inline-flex items-center gap-1">
              <CloudOff className="h-2.5 w-2.5" /> Offline
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {fmtDate(atendimento.date)} {atendimento.time} · {atendimento.client_name || "Sem cliente"} · {atendimento.payment_method_name}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-white">{brl(atendimento.paid)}</p>
        <p className="text-xs text-[#10B981]">com. {brl(atendimento.commission)}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Card>
  );
});

export default function MeusAtendimentos() {
  const [period, setPeriod] = useState("mes");
  const [custom, setCustom] = useState({ start: "", end: "" });
  const [sel, setSel] = useState(null);
  const { start, end } = useMemo(() => periodRange(period, custom), [period, custom]);
  const { data, loading, reload } = useFetch((api) => api.get(`/barber/atendimentos?start=${start}&end=${end}`), [start, end]);
  const { isOnline, queue, pendingCount, isSyncing, syncNow } = useOfflineSync();

  useEffect(() => {
    const onCreated = () => reload();
    window.addEventListener("barber-atendimento-created", onCreated);
    return () => window.removeEventListener("barber-atendimento-created", onCreated);
  }, [reload]);

  const displayList = useMemo(() => {
    const serverList = Array.isArray(data) ? data : [];
    const offlineItems = (queue || [])
      .filter((q) => {
        if (start && q.date < start) return false;
        if (end && q.date > end) return false;
        return true;
      })
      .map((it) => ({
        id: it.id,
        sale_group_id: it.sale_group_id,
        date: it.date,
        time: it.time,
        client_name: it.client_name,
        payment_method_name: it.payment_method_name,
        paid: it.paid,
        commission: it.commission,
        items: it.items,
        is_offline: true,
      }));
    return [...offlineItems, ...serverList];
  }, [data, queue, start, end]);

  const handleSelect = useCallback((item) => {
    setSel(item);
  }, []);

  return (
    <div className="space-y-4" data-testid="meus-atendimentos">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold">Meus Atendimentos</h2>
        {isOnline && pendingCount > 0 && (
          <Button
            type="button"
            size="sm"
            onClick={syncNow}
            disabled={isSyncing}
            className="h-8 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-[3px] shadow-none gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Sincronizar ({pendingCount})</span>
          </Button>
        )}
      </div>
      <PeriodSelect period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} testId="atend-period" />

      {loading && !displayList.length ? <Loading /> : !displayList.length ? <EmptyState title="Nenhum atendimento no período" /> : (
        <div className="space-y-2">
          {displayList.map((g, idx) => (
            <AtendimentoItemCard
              key={g.sale_group_id ? `${g.sale_group_id}_${idx}` : g.id ? `${g.id}_${idx}` : `atend_${idx}`}
              atendimento={g}
              onSelect={handleSelect}
              data-testid={`atend-${g.sale_group_id || idx}`}
            />
          ))}
        </div>
      )}

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-w-md" data-testid="atend-detail">
          <DialogHeader><DialogTitle className="font-display">Detalhes do Atendimento</DialogTitle></DialogHeader>
          {sel && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">{fmtDate(sel.date)} {sel.time} · {sel.client_name || "Sem cliente"}</p>
              <div className="space-y-1">
                {(sel.items || []).map((i, idx) => (
                  <div key={idx} className="flex justify-between"><span>{i.name}{i.quantity > 1 ? ` x${i.quantity}` : ""} <span className="text-xs text-muted-foreground">({i.kind})</span></span><span>{brl(i.paid)}</span></div>
                ))}
              </div>
              <div className="space-y-1 border-t border-border pt-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Valor original</span><span>{brl(sel.gross)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Desconto</span><span className="text-destructive">- {brl(sel.discount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor pago</span><span className="font-semibold">{brl(sel.paid)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pagamento</span><span>{sel.payment_method_name} · {paymentTypeLabel(sel.payment_type)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Comissão</span><span className="text-success">{brl(sel.commission)}</span></div>
              </div>
              {sel.status !== "ativo" && <Badge variant="destructive">{sel.status}</Badge>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
