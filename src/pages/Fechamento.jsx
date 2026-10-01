import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { Loading } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, fmtDate, todayISO } from "@/lib/format";
import { ArrowRightLeft } from "lucide-react";

export default function Fechamento() {
  const { refresh } = useMonth();
  const [day, setDay] = useState(todayISO());
  const [expected, setExpected] = useState({});
  const [counted, setCounted] = useState({});
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: closings } = useApi((api) => api.get("/cash-closings"));

  const loadExpected = async (d) => {
    setLoading(true);
    try {
      const res = await api.get("/cash-closings/expected", { day: d });
      setExpected(res.expected || {});
      setCounted({});
    } finally { setLoading(false); }
  };

  useEffect(() => { loadExpected(day); /* eslint-disable-next-line */ }, [day]);

  const totalExpected = Object.values(expected).reduce((a, b) => a + b, 0);
  const totalCounted = Object.values(counted).reduce((a, b) => a + (parseFloat(b) || 0), 0);
  const diff = totalCounted - totalExpected;

  const save = async () => {
    const c = {};
    Object.keys(expected).forEach((k) => { c[k] = parseFloat(counted[k]) || 0; });
    try {
      await api.post("/cash-closings", { date: day, counted: c, note });
      toast.success("Fechamento registrado");
      setNote(""); refresh(); loadExpected(day);
    } catch { toast.error("Erro ao salvar"); }
  };

  return (
    <div className="space-y-6 max-w-full 2xl:max-w-[1920px] mx-auto" data-testid="fechamento-page">
      <Card className="p-6">
        <div className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-primary" /><h3 className="font-display text-base font-bold">Conferência de Caixa</h3></div>
        <div className="mt-4 max-w-xs">
          <Label>Data do fechamento</Label>
          <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} data-testid="closing-date" />
        </div>

        {loading ? <Loading /> : (
          <div className="mt-5 space-y-3">
            {Object.keys(expected).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma venda registrada nesta data.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-right">Esperado</TableHead>
                      <TableHead className="text-right">Contado</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(expected).map(([k, v]) => {
                      const c = parseFloat(counted[k]) || 0;
                      const d = c - v;
                      return (
                        <TableRow key={k} data-testid={`closing-row-${k}`}>
                          <TableCell className="font-medium">{k}</TableCell>
                          <TableCell className="text-right tabular-nums">{brl(v)}</TableCell>
                          <TableCell className="text-right">
                            <Input type="number" className="ml-auto w-28 text-right" value={counted[k] ?? ""} onChange={(e) => setCounted((s) => ({ ...s, [k]: e.target.value }))} data-testid={`counted-${k}`} placeholder="0,00" />
                          </TableCell>
                          <TableCell className={`text-right tabular-nums ${d === 0 ? "" : d > 0 ? "text-success" : "text-destructive"}`}>{brl(d)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {Object.keys(expected).length > 0 && (
              <>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 pt-2">
                  <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Esperado</p><p className="font-display text-lg font-extrabold">{brl(totalExpected)}</p></Card>
                  <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Contado</p><p className="font-display text-lg font-extrabold">{brl(totalCounted)}</p></Card>
                  <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Diferença</p><p className={`font-display text-lg font-extrabold ${diff === 0 ? "" : diff > 0 ? "text-success" : "text-destructive"}`}>{brl(diff)}</p></Card>
                </div>
                <div><Label>Observação</Label><Input value={note} onChange={(e) => setNote(e.target.value)} data-testid="closing-note" /></div>
                <Button onClick={save} data-testid="closing-save">Registrar Fechamento</Button>
              </>
            )}
          </div>
        )}
      </Card>

      {closings?.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 font-display text-base font-bold">Fechamentos Anteriores</h3>
          <div className="space-y-2">
            {closings.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md bg-secondary px-4 py-3" data-testid={`closing-hist-${c.id}`}>
                <span className="text-sm font-medium">{fmtDate(c.date)}</span>
                <span className={`text-sm font-semibold ${c.difference === 0 ? "" : c.difference > 0 ? "text-success" : "text-destructive"}`}>Diferença: {brl(c.difference)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
