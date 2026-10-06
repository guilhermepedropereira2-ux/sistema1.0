import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { PeriodSelect } from "@/components/PeriodSelect";
import { Loading, StatCard, EmptyState } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, fmtDate, periodRange, paymentTypeLabel } from "@/lib/format";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  PiggyBank, ListChecks, HandCoins, Percent, TrendingUp, TrendingDown, Target, Trophy,
  Scissors, Plus, Wallet, CheckCircle2, Clock, CalendarDays,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "comissao" ? "comissao" : "graficos";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [period, setPeriod] = useState("mes");
  const [custom, setCustom] = useState({ start: "", end: "" });
  const { start, end } = useMemo(() => periodRange(period, custom), [period, custom]);

  // Busca dados de Desempenho e Comissões sincronizados com o mesmo período
  const {
    data,
    loading: loadingDesemp,
    reload: reloadDesemp,
  } = useFetch((api) => api.get(`/barber/desempenho?start=${start}&end=${end}`), [start, end]);

  const {
    data: comissaoData,
    loading: loadingComissao,
    reload: reloadComissao,
  } = useFetch((api) => api.get(`/barber/comissao?start=${start}&end=${end}`), [start, end]);

  useEffect(() => {
    const onCreated = () => {
      reloadDesemp();
      reloadComissao();
    };
    window.addEventListener("barber-atendimento-created", onCreated);
    return () => window.removeEventListener("barber-atendimento-created", onCreated);
  }, [reloadDesemp, reloadComissao]);

  // Sincroniza query parameter quando mudar de aba
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams(tabKey === "comissao" ? { tab: "comissao" } : {});
  };

  if ((loadingDesemp && !data) || (loadingComissao && !comissaoData)) {
    return <Loading />;
  }

  // 1. Extração segura de dados de Desempenho
  const r = data?.report || {};
  const evolutionList = Array.isArray(data?.evolution) ? data.evolution : [];
  const chart = (evolutionList || []).map((e) => ({
    date: fmtDate(e?.date || "").slice(0, 5),
    Faturamento: Number(e?.faturamento || 0),
    Comissão: Number(e?.comissao || 0),
  }));

  const servicesList = Array.isArray(r?.services_breakdown) ? r.services_breakdown : [];
  const productsList = Array.isArray(r?.products_breakdown) ? r.products_breakdown : [];

  const totalAtendimentos = Number(data?.atendimentos ?? data?.total_atendimentos ?? 0);
  const totalFaturamento = Number(r?.faturamento_total ?? data?.total_faturamento ?? 0);
  const ticketMedio = Number(data?.ticket_medio ?? (totalAtendimentos > 0 ? totalFaturamento / totalAtendimentos : 0));
  const comissaoGerada = Number(r?.comissao_gerada ?? data?.total_comissao ?? comissaoData?.gerada ?? 0);

  const discountStats = data?.discount_stats || {
    total: 0,
    atendimentos_com_desconto: 0,
    desconto_medio: 0,
    percentual_vendas_com_desconto: 0,
    valor_original: 0,
    valor_final: 0,
  };

  const hasAtendimentos = totalAtendimentos > 0;

  // 2. Extração segura de dados de Comissão
  const comGerada = Number(comissaoData?.gerada ?? comissaoData?.total ?? comissaoGerada ?? 0);
  const comPaga = Number(comissaoData?.paga ?? comissaoData?.paid ?? 0);
  const comPendente = Number(comissaoData?.pendente ?? comissaoData?.pending ?? Math.max(0, comGerada - comPaga));
  const comDetalhamento = Array.isArray(comissaoData?.detalhamento) ? comissaoData.detalhamento : [];
  const comHistorico = Array.isArray(comissaoData?.historico_pagamentos) ? comissaoData.historico_pagamentos : [];

  return (
    <div className="space-y-5" data-testid="meu-desempenho">
      {/* Header com Título e Filtro de Período */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-extrabold text-white">Meu Desempenho & Comissões</h2>
          <p className="text-xs text-muted-foreground">Métricas, gráficos e extrato de comissões acumuladas</p>
        </div>
        <PeriodSelect period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} testId="desemp-period" />
      </div>

      {/* Seletor Unificado de Abas: Gráficos vs Comissões */}
      <div className="flex items-center gap-1 p-1 bg-[#12141F] border border-white/10 rounded-[6px] w-full">
        <button
          type="button"
          onClick={() => handleTabChange("graficos")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-[4px] transition-all cursor-pointer ${
            activeTab === "graficos"
              ? "bg-[#D4AF37] text-[#0A0D14] shadow-sm font-bold"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          data-testid="tab-desempenho-graficos"
        >
          <TrendingUp className="h-4 w-4 shrink-0" />
          <span>Evolução & Gráficos</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("comissao")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-[4px] transition-all cursor-pointer ${
            activeTab === "comissao"
              ? "bg-[#D4AF37] text-[#0A0D14] shadow-sm font-bold"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
          data-testid="tab-desempenho-comissao"
        >
          <Wallet className="h-4 w-4 shrink-0" />
          <span>Comissões Acumuladas</span>
        </button>
      </div>

      {/* ABA 1: EVOLUÇÃO & GRÁFICOS */}
      {activeTab === "graficos" && (
        <div className="space-y-5">
          {/* Estado Vazio se sem atendimentos no período */}
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
            <Card className="p-4 bg-[#12141F] border-white/10" data-testid="comparison">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Comparação com período anterior</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Atendimentos</p>
                  <p className="font-display text-xl font-extrabold text-white">
                    {Number(data.comparison?.atendimentos_atual || 0)} <Delta value={data.comparison?.delta_atendimentos} />
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento</p>
                  <p className="font-display text-xl font-extrabold text-white">
                    {brl(Number(data.comparison?.faturamento_atual || 0))} <Delta value={data.comparison?.delta_faturamento} />
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Cards Principais */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Faturamento" value={totalFaturamento} icon={PiggyBank} tone="primary" testId="d-fat" />
            <StatCard label="Atendimentos" value={String(totalAtendimentos)} icon={ListChecks} testId="d-atend" />
            <StatCard label="Ticket médio" value={ticketMedio} icon={TrendingUp} testId="d-ticket" />
            <StatCard label="Comissão gerada" value={comissaoGerada} icon={HandCoins} tone="success" testId="d-com" />
          </div>

          {/* Gráfico de Evolução Diária */}
          <Card className="p-5 bg-[#12141F] border-white/10" data-testid="evolution-chart">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-sm font-bold text-white">Evolução Diária</h3>
                <p className="text-xs text-muted-foreground">Faturamento bruto versus comissão acumulada</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D4AF37]" /> Faturamento
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Comissão
                </span>
              </div>
            </div>

            {chart.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip contentStyle={{ background: "#0A0D14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4 }} formatter={(v) => brl(Number(v || 0))} />
                  <Line type="monotone" dataKey="Faturamento" stroke="hsl(43 74% 60%)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Comissão" stroke="hsl(142 71% 45%)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período selecionado.</p>
            )}
          </Card>

          {/* Serviços e Produtos */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="overflow-hidden bg-[#12141F] border-white/10" data-testid="top-services">
              <div className="border-b border-white/10 p-4"><h3 className="font-display font-bold text-sm text-white">Serviços mais realizados</h3></div>
              {servicesList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-slate-400">Serviço</TableHead>
                      <TableHead className="text-right text-slate-400">Qtd</TableHead>
                      <TableHead className="text-right text-slate-400">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(servicesList || []).map((s, i) => (
                      <TableRow key={`${s?.name || 'serv'}_${i}`} className="border-white/5">
                        <TableCell className="text-white">
                          {i === 0 ? <Trophy className="mr-1 inline h-3.5 w-3.5 text-[#D4AF37]" /> : `${i + 1}. `}
                          {s?.name || "Serviço"}
                        </TableCell>
                        <TableCell className="text-right text-slate-300">{Number(s?.quantity || 0)}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-400">{brl(Number(s?.total || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-6 text-sm text-muted-foreground">Nenhum serviço registrado neste período.</p>
              )}
            </Card>

            <Card className="overflow-hidden bg-[#12141F] border-white/10" data-testid="top-products">
              <div className="border-b border-white/10 p-4"><h3 className="font-display font-bold text-sm text-white">Produtos vendidos</h3></div>
              {productsList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-slate-400">Produto</TableHead>
                      <TableHead className="text-right text-slate-400">Qtd</TableHead>
                      <TableHead className="text-right text-slate-400">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(productsList || []).map((s, i) => (
                      <TableRow key={`${s?.name || 'prod'}_${i}`} className="border-white/5">
                        <TableCell className="text-white">{s?.name || "Produto"}</TableCell>
                        <TableCell className="text-right text-slate-300">{Number(s?.quantity || 0)}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-400">{brl(Number(s?.total || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-6 text-sm text-muted-foreground">Nenhum produto vendido neste período.</p>
              )}
            </Card>
          </div>

          {/* Descontos Concedidos */}
          <Card className="p-5 bg-[#12141F] border-white/10" data-testid="discount-stats">
            <div className="mb-3 flex items-center gap-2"><Percent className="h-4 w-4 text-[#D4AF37]" /><h3 className="font-display text-sm font-bold text-white">Descontos concedidos</h3></div>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div><p className="text-muted-foreground text-xs">Total descontado</p><p className="font-semibold text-white">{brl(discountStats.total || 0)}</p></div>
              <div><p className="text-muted-foreground text-xs">Atend. c/ desconto</p><p className="font-semibold text-white">{Number(discountStats.atendimentos_com_desconto || 0)}</p></div>
              <div><p className="text-muted-foreground text-xs">Desconto médio</p><p className="font-semibold text-white">{brl(discountStats.desconto_medio || 0)}</p></div>
              <div><p className="text-muted-foreground text-xs">% vendas c/ desconto</p><p className="font-semibold text-white">{Number(discountStats.percentual_vendas_com_desconto || 0)}%</p></div>
              <div><p className="text-muted-foreground text-xs">Valor bruto original</p><p className="font-semibold text-white">{brl(discountStats.valor_original || 0)}</p></div>
              <div><p className="text-muted-foreground text-xs">Valor líquido recebido</p><p className="font-semibold text-emerald-400">{brl(discountStats.valor_final || 0)}</p></div>
            </div>
          </Card>

          {/* Recordes Pessoais */}
          {data?.records && (
            <Card className="p-5 bg-[#12141F] border-white/10" data-testid="records">
              <div className="mb-3 flex items-center gap-2"><Trophy className="h-4 w-4 text-[#D4AF37]" /><h3 className="font-display text-sm font-bold text-white">Recordes pessoais</h3></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="p-3 bg-[#0A0D14] rounded-[4px] border border-white/5">
                  <span className="text-xs text-muted-foreground block">Maior faturamento/dia</span>
                  <span className="font-bold text-base text-white">{brl(Number(data.records.maior_faturamento_dia || 0))}</span>
                </div>
                <div className="p-3 bg-[#0A0D14] rounded-[4px] border border-white/5">
                  <span className="text-xs text-muted-foreground block">Mais atend./dia</span>
                  <span className="font-bold text-base text-white">{Number(data.records.maior_atendimentos_dia || 0)}</span>
                </div>
                <div className="p-3 bg-[#0A0D14] rounded-[4px] border border-white/5">
                  <span className="text-xs text-muted-foreground block">Maior ticket</span>
                  <span className="font-bold text-base text-white">{brl(Number(data.records.maior_ticket || 0))}</span>
                </div>
                <div className="p-3 bg-[#0A0D14] rounded-[4px] border border-white/5">
                  <span className="text-xs text-muted-foreground block">Maior comissão/dia</span>
                  <span className="font-bold text-base text-emerald-400">{brl(Number(data.records.maior_comissao_dia || 0))}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ABA 2: COMISSÕES ACUMULADAS & EXTRATO */}
      {activeTab === "comissao" && (
        <div className="space-y-5" data-testid="comissao-section">
          {/* Cards de Saldo de Comissão */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Comissão Gerada (Total)"
              value={comGerada}
              icon={HandCoins}
              tone="primary"
              testId="c-gerada"
            />
            <StatCard
              label="Comissão Paga (Recebida)"
              value={comPaga}
              icon={CheckCircle2}
              tone="success"
              testId="c-paga"
            />
            <StatCard
              label="Comissão a Receber (Pendente)"
              value={comPendente}
              icon={Clock}
              tone={comPendente > 0 ? "danger" : "muted"}
              testId="c-pendente"
            />
          </div>

          {/* Histórico de Repasses / Pagamentos Efetuados */}
          {comHistorico.length > 0 && (
            <Card className="p-5 bg-[#12141F] border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-4 w-4 text-[#D4AF37]" />
                <h3 className="font-display text-sm font-bold text-white">Histórico de Pagamentos de Comissão</h3>
              </div>
              <div className="space-y-2">
                {comHistorico.map((p, idx) => (
                  <div
                    key={`${p.date || "pay"}_${idx}`}
                    className="flex justify-between items-center rounded-[4px] bg-[#0A0D14] border border-white/5 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground text-xs">{fmtDate(p.date)}</span>
                    <span className="font-semibold text-emerald-400">{brl(p.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Extrato Detalhado de Comissões por Atendimento */}
          <Card className="p-5 bg-[#12141F] border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-sm font-bold text-white">Detalhamento por Atendimento</h3>
                <p className="text-xs text-muted-foreground">Comissões discriminadas por serviço e produto</p>
              </div>
              <Badge variant="outline" className="text-xs border-[#D4AF37]/30 text-[#D4AF37]">
                {comDetalhamento.length} lançamentos
              </Badge>
            </div>

            {comDetalhamento.length === 0 ? (
              <EmptyState title="Sem comissões registradas neste período" subtitle="Ao finalizar atendimentos ou vendas, sua comissão será calculada automaticamente." />
            ) : (
              <div className="space-y-2.5">
                {comDetalhamento.map((g, idx) => {
                  const isPaid = Boolean(g.commission_paid);
                  return (
                    <div
                      key={g.sale_group_id ? `${g.sale_group_id}_${idx}` : g.id ? `${g.id}_${idx}` : `com_${idx}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-[4px] bg-[#0A0D14] border border-white/10 p-3 text-sm hover:border-[#D4AF37]/30 transition-colors"
                      data-testid={`com-detail-${g.sale_group_id || idx}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white truncate">
                            {(g.items || []).map((i) => i.name).join(", ") || "Atendimento"}
                          </p>
                          <Badge
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-[2px] ${
                              isPaid
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {isPaid ? "Comissão Paga" : "A Receber"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {fmtDate(g.date)} {g.time ? `às ${g.time}` : ""} · Cliente: {g.client_name || "Cliente avulso"} · Pago pelo cliente: {brl(g.paid)}
                        </p>
                      </div>

                      <div className="text-right shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/5 flex items-center justify-between sm:block">
                        <span className="text-xs text-muted-foreground sm:hidden">Comissão:</span>
                        <div>
                          <p className="font-extrabold text-sm text-emerald-400">{brl(g.commission)}</p>
                          <p className="text-[10px] text-slate-400">{g.payment_method_name || "Dinheiro / Cartão"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
