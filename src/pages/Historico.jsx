import { useApi } from "@/hooks/useApi";
import { Loading, EmptyState } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { fmtDateTime } from "@/lib/format";
import { History as HistoryIcon } from "lucide-react";

export default function Historico() {
  const { data, loading } = useApi((api) => api.get("/history", { limit: 200 }));
  if (loading) return <Loading />;
  if (!data?.length) return <EmptyState title="Sem registros" subtitle="Alterações importantes serão registradas aqui." />;

  return (
    <div className="space-y-3" data-testid="historico-page">
      {data.map((h) => (
        <Card key={h.id} className="flex items-start gap-3 p-4" data-testid={`history-${h.id}`}>
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground"><HistoryIcon className="h-4 w-4" /></div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{h.action}</p>
            <p className="text-xs text-muted-foreground">{h.user} · {fmtDateTime(h.timestamp)}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
