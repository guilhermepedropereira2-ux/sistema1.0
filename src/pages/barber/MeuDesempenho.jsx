import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { PeriodSelect } from "@/components/PeriodSelect";
import { Loading, StatCard } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, fmtDate, periodRange } from "@/lib/format";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  PiggyBank, ListChecks, HandCoins, Percent, TrendingUp, TrendingDown, Target, Trophy, Star,
  Scissors, Plus, CalendarX,
} from "lucide-react";

function Delta({ value }) {
  if (value == null) return <span className="text-xs text-muted-foreground">sem base</span>;
  const up = Number(value || 0) >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? "text-success" : "text-destructive"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{up ? "+" : ""}{value}%
    </span>
  );
}

export default function MeuDesempenho() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("mes");
  const [custom, setCustom] = useState({ start: "", end: "" });
  const { start, end } = useMemo(() => periodRange(period, custom), [period, custom]);
  const { data, loading, reload } = useFetch((api) => api.get(`/barber/desempenho?start=${start}&end=${end}`), [start, end]);

  useEffect(() => {
    const onCreated = () => reload();
    window.addEventListener("barber-atendimento-created", onCreated);
    return () => window.removeEventListener("barber-atendimento-created", onCreated);
  }, [reload]);

  if (loading || !data) return <Loading />;

  // 1. Safe extraction with fallback objects & numeric defaults
  const r = data?.report || {};
  const evolutionList = Array.isArray(data?.evolution) ? data.evolution : [];
  const chart = (evolutionList || []).map((e) => ({
    date: fmtDate(e?.date || "").slice(0, 5),
    Faturamento: Number(e?.faturamento || 0),
    Comissão: Number(e?.comissao || 0),
  }));

  const servicesList = Array.isArray(r?.services_breakdown) ? r.services_breakdown : [];
  const productsList = Array.isArray(r?.products_breakdown) ? r.products_breakdown : [];

  // 3. Filtragem Segura de Dados (Valores Padrão Numéricos)
  const totalAtendimentos = Number(data?.atendimentos ?? data?.total_atendimentos ?? 0);
  const totalFaturamento = Number(r?.faturamento_total ?? data?.total_faturamento ?? 0);
  const ticketMedio = Number(data?.ticket_medio ?? (totalAtendimentos > 0 ? totalFaturamento / totalAtendimentos : 0));
  const comissaoGerada = Number(r?.comissao_gerada ?? data?.total_comissao ?? 0);

  const discountStats = data?.discount_stats || {
    total: 0,
    atendimentos_com_desconto: 0,
    desconto_medio: 0,
    percentual_vendas_com_desconto: 0,
    valor_original: 0,
    valor_final: 0,
  };

  const hasAtendimentos = totalAtendimentos > 0;

  return (
    <div className="space-y-5" data-testid="meu-desempenho">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-extrabold">Meu Desempenho</h2>
          <p className="text-xs text-muted-foreground">Métricas, evolução e análise de produtividade</p>
        </div>
        <PeriodSelect period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} testId="desemp-period" />
      </div>

      {/* 2. Estado Vazio Elegante (Empty State Dark Mode) quando sem atendimentos no período */}
      {!hasAtendimentos && (
        <Card className="p-6 sm:p-8 bg-[#12141F] border border-white/10 text-center rounded-[4px] shadow-none relative overflow-hidden" data-testid="empty-state-desempenho">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[2px] bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 mb-4">
            <Scissors className="h-7 w-7" />
          </div>
          <h3 className="font-display text-base font-bold text-white mb-1">
            Nenhum atendimento registrado neste período.
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-5">
            Lance seus cortes, barbas ou vendas de produtos para visualizar seus gráficos de evolução, ticket médio e recordes pessoais.
          </p>
          <Button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-barber-lancar-modal"))}
            className="bg-[#D4AF37] hover:bg-[#C59F2E] text-slate-950 font-bold text-xs h-10 px-5 rounded-[4px] shadow-none inline-flex items-center gap-2 cursor-pointer"
            data-testid="btn-lancar-primeiro-atendimento"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>+ Lançar Primeiro Atendimento</span>
          </Button>
        </Card>
      )}

      {data?.comparison && (
        <Card className="p-4" data-testid="comparison">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Comparação com período anterior</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Atendimentos</p>
              <p className="font-display text-xl font-extrabold">
                {Number(data.comparison?.atendimentos_atual || 0)} <Delta value={data.comparison?.delta_atendimentos} />
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faturamento</p>
              <p className="font-display text-xl font-extrabold">
                {brl(Number(data.comparison?.faturamento_atual || 0))} <Delta value={data.comparison?.delta_faturamento} />
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Faturamento" value={totalFaturamento} icon={PiggyBank} tone="primary" testId="d-fat" />
        <StatCard label="Atendimentos" value={String(totalAtendimentos)} icon={ListChecks} testId="d-atend" />
        <StatCard label="Ticket médio" value={ticketMedio} icon={TrendingUp} testId="d-ticket" />
        <StatCard label="Comissão gerada" value={comissaoGerada} icon={HandCoins} tone="success" testId="d-com" />
      </div>

      <Card className="p-5" data-testid="metas-placeholder">
        <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><h3 className="font-display text-sm font-bold">Metas</h3></div>
        <p className="mt-1 text-sm text-muted-foreground">Este recurso será disponibilizado futuramente.</p>
      </Card>

      <Card className="p-5" data-testid="evolution-chart">
        <h3 className="mb-4 font-display text-sm font-bold">Evolução Diária</h3>
        {chart.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(0 0% 64%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 64%)" fontSize={11} tickFormatter={(v) => `R$${v}`} />
              <Tooltip contentStyle={{ background: "#0A0D14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4 }} formatter={(v) => brl(Number(v || 0))} />
              <Line type="monotone" dataKey="Faturamento" stroke="hsl(43 74% 60%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Comissão" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período selecionado.</p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden" data-testid="top-services">
          <div className="border-b border-border p-4"><h3 className="font-display font-bold">Serviços mais vendidos</h3></div>
          {servicesList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(servicesList || []).map((s, i) => (
                  <TableRow key={`${s?.name || 'serv'}_${i}`}>
                    <TableCell>
                      {i === 0 ? <Star className="mr-1 inline h-3.5 w-3.5 text-primary" /> : `${i + 1}. `}
                      {s?.name || "Serviço"}
                    </TableCell>
                    <TableCell className="text-right">{Number(s?.quantity || 0)}</TableCell>
                    <TableCell className="text-right">{brl(Number(s?.total || 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Nenhum serviço registrado neste período.</p>
          )}
        </Card>

        <Card className="overflow-hidden" data-testid="top-products">
          <div className="border-b border-border p-4"><h3 className="font-display font-bold">Produtos vendidos</h3></div>
          {productsList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(productsList || []).map((s, i) => (
                  <TableRow key={`${s?.name || 'prod'}_${i}`}>
                    <TableCell>{s?.name || "Produto"}</TableCell>
                    <TableCell className="text-right">{Number(s?.quantity || 0)}</TableCell>
                    <TableCell className="text-right">{brl(Number(s?.total || 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Nenhum produto vendido neste período.</p>
          )}
        </Card>
      </div>

      {/* Discounts */}
      <Card className="p-5" data-testid="discount-stats">
        <div className="mb-3 flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /><h3 className="font-display text-sm font-bold">Descontos concedidos</h3></div>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div><p className="text-muted-foreground">Total</p><p className="font-semibold">{brl(discountStats.total || 0)}</p></div>
          <div><p className="text-muted-foreground">Atend. com desconto</p><p className="font-semibold">{Number(discountStats.atendimentos_com_desconto || 0)}</p></div>
          <div><p className="text-muted-foreground">Desconto médio</p><p className="font-semibold">{brl(discountStats.desconto_medio || 0)}</p></div>
          <div><p className="text-muted-foreground">% vendas c/ desconto</p><p className="font-semibold">{Number(discountStats.percentual_vendas_com_desconto || 0)}%</p></div>
          <div><p className="text-muted-foreground">Valor original</p><p className="font-semibold">{brl(discountStats.valor_original || 0)}</p></div>
          <div><p className="text-muted-foreground">Valor final</p><p className="font-semibold">{brl(discountStats.valor_final || 0)}</p></div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {data?.best_days && (
          <Card className="p-5" data-testid="best-days">
            <h3 className="mb-3 font-display text-sm font-bold">Melhores dias</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Melhor faturamento</span>
                <span className="font-semibold">
                  {data.best_days.melhor_faturamento?.date ? fmtDate(data.best_days.melhor_faturamento.date) : "—"} · {brl(Number(data.best_days.melhor_faturamento?.value || 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mais atendimentos</span>
                <span className="font-semibold">
                  {data.best_days.melhor_atendimentos?.date ? fmtDate(data.best_days.melhor_atendimentos.date) : "—"} · {Number(data.best_days.melhor_atendimentos?.value || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Média diária atend.</span>
                <span className="font-semibold">{Number(data.best_days.media_diaria_atendimentos || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Média diária fat.</span>
                <span className="font-semibold">{brl(Number(data.best_days.media_diaria_faturamento || 0))}</span>
              </div>
            </div>
          </Card>
        )}

        {data?.records && (
          <Card className="p-5" data-testid="records">
            <div className="mb-3 flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /><h3 className="font-display text-sm font-bold">Recordes pessoais</h3></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maior faturamento/dia</span>
                <span className="font-semibold">{brl(Number(data.records.maior_faturamento_dia || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mais atend./dia</span>
                <span className="font-semibold">{Number(data.records.maior_atendimentos_dia || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maior ticket</span>
                <span className="font-semibold">{brl(Number(data.records.maior_ticket || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maior comissão/dia</span>
                <span className="font-semibold">{brl(Number(data.records.maior_comissao_dia || 0))}</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
