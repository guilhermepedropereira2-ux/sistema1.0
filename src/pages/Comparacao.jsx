import { Navigate } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { useAuth } from "@/context/AuthContext";
import { isDono } from "@/lib/roles";
import { Loading, EmptyState } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function Comparacao() {
  const { user, ready } = useAuth();
  const { month } = useMonth();
  const { data, loading } = useApi((api) => api.get("/dashboard/machine-comparison", { month }));

  if (ready && user && !isDono(user)) {
    return <Navigate to="/" replace />;
  }
  if (loading || !data) return <Loading />;
  if (!data.length) return <EmptyState title="Sem dados para comparar" subtitle="Registre receitas para comparar o desempenho das maquininhas." />;

  const chart = data.map((d) => ({ name: d.name, Vendido: d.sold, Taxas: d.fees, Líquido: d.net }));

  return (
    <div className="space-y-6" data-testid="comparacao-page">
      <Card className="p-6">
        <h3 className="mb-4 font-display text-base font-bold">Desempenho por Forma de Pagamento</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" vertical={false} />
            <XAxis dataKey="name" stroke="hsl(0 0% 64%)" fontSize={12} />
            <YAxis stroke="hsl(0 0% 64%)" fontSize={12} tickFormatter={(v) => `R$${v}`} />
            <Tooltip contentStyle={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8 }} formatter={(v) => brl(v)} />
            <Legend />
            <Bar dataKey="Vendido" fill="hsl(43 74% 60%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Taxas" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Líquido" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Transações</TableHead>
                <TableHead className="text-right">Total Vendido</TableHead>
                <TableHead className="text-right">Total Taxas</TableHead>
                <TableHead className="text-right">Total Líquido</TableHead>
                <TableHead className="text-right">A Receber</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.name} data-testid={`comp-row-${d.name}`}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.count}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(d.sold)}</TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">{brl(d.fees)}</TableCell>
                  <TableCell className="text-right tabular-nums text-success">{brl(d.net)}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(d.to_receive)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
