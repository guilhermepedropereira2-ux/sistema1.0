import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { Loading, EmptyState } from "@/components/Shared";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { brl, fmtDate } from "@/lib/format";
import { Search, User, ChevronRight, Ticket, CalendarDays, Phone, Scissors } from "lucide-react";

/**
 * Função segura para interpretar e validar o plano do cliente,
 * eliminando qualquer possibilidade de renderizar "undefined".
 */
export function parseClientPlan(client) {
  if (!client || !client.has_plan || !client.plan) return null;
  const p = client.plan;
  const isUnlimited = Boolean(p.is_unlimited);

  // Total contratado
  const total = Number(
    p.totalServices ?? p.total ?? p.total_credits ?? 4
  );

  // Quantidade utilizada
  const used = Number(p.used ?? 0);

  // Quantidade restante calculada com segurança
  let remainingCount = total - used;
  if (p.remaining != null && !isNaN(Number(p.remaining))) {
    remainingCount = Number(p.remaining);
  } else if (p.remainingServices != null && !isNaN(Number(p.remainingServices))) {
    remainingCount = Number(p.remainingServices);
  } else if (p.remaining_count != null && !isNaN(Number(p.remaining_count))) {
    remainingCount = Number(p.remaining_count);
  }
  remainingCount = Math.max(0, remainingCount);

  // Status seguro e validado
  let status = p.status;
  if (!status) {
    const today = new Date().toISOString().slice(0, 10);
    if (p.due && p.due < today) {
      status = "vencido";
    } else if (!isUnlimited && remainingCount <= 0) {
      status = "esgotado";
    } else {
      status = "ativo";
    }
  }

  const statusLabel =
    status === "ativo"
      ? "Ativo"
      : status === "vencido"
      ? "Vencido"
      : "Esgotado";

  const statusColorClass =
    status === "ativo"
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : status === "vencido"
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
      : "bg-rose-500/20 text-rose-400 border-rose-500/30";

  // Texto formatado estritamente conforme solicitado
  const displayText = isUnlimited
    ? "Assinatura Ativa · Cortes Ilimitados"
    : `Restam ${remainingCount} de ${total} cortes no mês`;

  const badgeText = isUnlimited
    ? "Cortes Ilimitados"
    : `${remainingCount}/${total} cortes`;

  return {
    name: p.name || "Plano de Assinatura",
    isUnlimited,
    total,
    used,
    remaining: isUnlimited ? "Ilimitado" : remainingCount,
    remainingCount,
    status,
    statusLabel,
    statusColorClass,
    displayText,
    badgeText,
    due: p.due || null,
  };
}

export default function MeusClientes() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const { data, loading, reload } = useFetch((api) => api.get("/barber/clientes"));
  const { data: hist, loading: loadingHist } = useFetch(
    (api) =>
      sel
        ? api.get(
            `/barber/cliente/historico?client_id=${sel.id}&name=${encodeURIComponent(
              sel.name
            )}`
          )
        : Promise.resolve(null),
    [sel?.id]
  );

  const filtered = useMemo(
    () =>
      (data || []).filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          (c.phone || "").includes(q)
      ),
    [data, q]
  );

  const openClient = (c) => {
    setSel(c);
    setNote(c.notes || "");
  };

  const saveNote = async () => {
    if (!sel) return;
    setSavingNote(true);
    try {
      await api.post("/barber/cliente/nota", { client_id: sel.id, note });
      toast.success("Observação salva com sucesso!");
      reload();
      setSel(null);
    } catch {
      toast.error("Erro ao salvar observação.");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4" data-testid="meus-clientes">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold text-white">
          Clientes da Barbearia
        </h2>
        <span className="text-xs text-slate-400">
          {filtered.length} cliente(s)
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 bg-[#121522] border-white/10 text-white rounded-[4px] text-xs placeholder:text-slate-500"
          placeholder="Buscar cliente por nome ou telefone..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="client-search"
        />
      </div>

      {!filtered.length ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          subtitle="Os clientes vinculados e atendidos aparecem automaticamente aqui."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const planInfo = parseClientPlan(c);
            return (
              <Card
                key={c.id}
                className="flex cursor-pointer items-center gap-3 p-3.5 sm:p-4 bg-[#12141F] border border-white/10 rounded-[6px] shadow-none hover:border-[#D4AF37]/50 transition-all select-none"
                onClick={() => openClient(c)}
                data-testid={`client-${c.id}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary border border-white/10 shrink-0">
                  <User className="h-5 w-5 text-[#D4AF37]" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-sm text-white">
                    {c.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.atendimentos || 0} atendimento(s){" "}
                    {c.last_date ? `· Último em ${fmtDate(c.last_date)}` : ""}
                  </p>

                  {/* Badge de Plano Seguro sem "undefined" */}
                  {planInfo && (
                    <div className="mt-1.5 flex items-center">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2 py-0.5 rounded-[3px]">
                        <Ticket className="h-3 w-3 shrink-0" />
                        <span>
                          {planInfo.isUnlimited
                            ? "Assinatura Ativa · Cortes Ilimitados"
                            : `${planInfo.name} · ${planInfo.displayText}`}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-white font-mono block">
                    {brl(c.total || 0)}
                  </span>
                  <span className="text-[10px] text-slate-400">Total gerado</span>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes do Cliente no Painel do Barbeiro */}
      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent
          className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto bg-[#12141F] border-white/10 text-white rounded-[6px] p-5 sm:p-6"
          data-testid="client-detail"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-display text-base sm:text-lg text-white flex items-center gap-2">
              <User className="h-5 w-5 text-[#D4AF37]" />
              <span>{sel?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {sel?.phone ? `Telefone: ${sel.phone}` : "Sem telefone cadastrado"} · Total acumulado: {brl(sel?.total || 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* 1. Status do Plano / Assinatura com Fallback Seguro */}
            {(() => {
              const planInfo = parseClientPlan(sel);
              if (!planInfo) {
                return (
                  <div className="rounded-[6px] border border-white/10 bg-[#0B0D14] p-3 text-xs text-slate-400">
                    <p className="font-semibold text-slate-300">Sem plano ativo</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Este cliente não possui nenhum plano ou assinatura ativa no momento.
                    </p>
                  </div>
                );
              }

              return (
                <div
                  className="rounded-[6px] border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-3.5 space-y-2 shadow-sm"
                  data-testid="client-plan"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                      <Ticket className="h-4 w-4 text-[#D4AF37] shrink-0" />
                      <span>{planInfo.name}</span>
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-[3px] border ${planInfo.statusColorClass}`}
                    >
                      {planInfo.statusLabel}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-emerald-400">
                    {planInfo.displayText}
                  </p>

                  {planInfo.due && (
                    <p className="text-[11px] text-slate-300 flex items-center gap-1 pt-1 border-t border-white/10">
                      <CalendarDays className="h-3.5 w-3.5 text-[#D4AF37]" />
                      <span>
                        Renovação do ciclo: <strong>{fmtDate(planInfo.due)}</strong>
                      </span>
                    </p>
                  )}
                </div>
              );
            })()}

            {/* 2. Campo de Observações do Barbeiro */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-300">
                Observações do Cliente
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                data-testid="client-note"
                placeholder="Ex.: Prefere degradê na navalha, corte baixo no topo, barba quadrada..."
                className="bg-[#0B0D14] border-white/10 text-white rounded-[4px] text-xs placeholder:text-slate-500"
              />
            </div>

            {/* 3. Histórico de Atendimentos */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-300">
                Meu histórico com o cliente
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {loadingHist ? (
                  <p className="text-xs text-slate-400">Carregando histórico...</p>
                ) : hist && hist.length > 0 ? (
                  hist.map((g, idx) => (
                    <div
                      key={
                        g.sale_group_id
                          ? `${g.sale_group_id}_${idx}`
                          : g.id
                          ? `${g.id}_${idx}`
                          : `hist_${idx}`
                      }
                      className="rounded-[4px] bg-[#0B0D14] border border-white/5 px-3 py-2 text-sm"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">
                          {fmtDate(g.date)} {g.time ? `às ${g.time}` : ""}
                        </span>
                        <span className="font-bold text-white font-mono">
                          {brl(g.paid)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {Array.isArray(g.items) && g.items.length
                          ? g.items
                              .map(
                                (i) =>
                                  `${i.name}${
                                    i.quantity > 1 ? ` x${i.quantity}` : ""
                                  }`
                              )
                              .join(", ")
                          : g.service_name || "Atendimento"}
                        {g.plan_used && (
                          <span className="text-[#D4AF37] font-semibold ml-1">
                            · (Plano de Assinatura)
                          </span>
                        )}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">
                    Nenhum atendimento registrado com este cliente ainda.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setSel(null)}
              className="rounded-[4px] text-xs"
            >
              Fechar
            </Button>
            <Button
              onClick={saveNote}
              disabled={savingNote}
              className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold rounded-[4px] text-xs shadow-none cursor-pointer"
              data-testid="save-note"
            >
              {savingNote ? "Salvando..." : "Salvar Observação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
