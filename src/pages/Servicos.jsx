import { useState, useMemo } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { Loading, EmptyState } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Scissors, Clock, Search } from "lucide-react";
import { brl } from "@/lib/format";
import ServiceIcon from "@/components/services/ServiceIcon";
import ServiceIconPicker from "@/components/services/ServiceIconPicker";
import { getServiceIconMeta } from "@/data/serviceIconsData";

export function ServiceDialog({ existing, onDone }) {
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const init = existing
    ? {
        name: existing.name || "",
        price: existing.price ?? "",
        duration_min: existing.duration_min ?? 30,
        icon: existing.icon || "corte_tradicional",
        active: existing.active !== false,
      }
    : {
        name: "",
        price: "",
        duration_min: 30,
        icon: "corte_tradicional",
        active: true,
      };

  const [form, setForm] = useState(init);

  const iconMeta = getServiceIconMeta(form.icon || form.name || "corte_tradicional");

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Informe o nome do serviço");
    const payload = {
      name: form.name.trim(),
      price: parseFloat(form.price) || 0,
      duration_min: parseInt(form.duration_min) || 30,
      icon: form.icon || "corte_tradicional",
      active: true,
    };

    try {
      if (existing) {
        await api.put(`/services/${existing.id}`, payload);
        toast.success("Serviço atualizado com sucesso!");
      } else {
        await api.post("/services", payload);
        toast.success("Serviço cadastrado com sucesso!");
      }
      setOpen(false);
      onDone();
    } catch {
      toast.error("Erro ao salvar serviço");
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setForm(init);
        }}
      >
        <DialogTrigger asChild>
          {existing ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5"
              data-testid={`edit-service-${existing.id}`}
              title="Editar serviço"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="bg-[#D4AF37] hover:bg-[#E5C365] text-[#05070B] font-bold text-xs sm:text-sm gap-2 rounded-xl shadow-lg shadow-[#D4AF37]/20"
              data-testid="add-service-button"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Novo Serviço</span>
            </Button>
          )}
        </DialogTrigger>

        <DialogContent
          className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto bg-[#0A0E15] border border-[#161E2C] text-white rounded-2xl p-5 sm:p-6 shadow-2xl"
          data-testid="service-dialog-modal"
        >
          <DialogHeader className="pb-3 border-b border-[#161E2C]">
            <DialogTitle className="font-display text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Scissors className="w-5 h-5 text-[#E5C365]" />
              <span>{existing ? "Editar" : "Novo"} Serviço</span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            {/* Seletor Oficial de Ícone do Serviço (Gabarito KUPOLA) */}
            <div className="sm:col-span-2 p-3 sm:p-3.5 rounded-xl bg-[#0D121B] border border-[#161E2C] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ServiceIcon
                  iconKey={form.icon || "corte_tradicional"}
                  size="lg"
                  className="shadow-md"
                />
                <div className="min-w-0">
                  <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider block">
                    Ícone do serviço
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white truncate block mt-0.5">
                    {iconMeta?.name || "Corte Tradicional"}
                  </span>
                  <span className="text-[11px] text-[#E5C365] block truncate font-medium">
                    Biblioteca Oficial KUPOLA
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {form.icon && form.icon !== "corte_tradicional" && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, icon: "corte_tradicional" }))}
                    className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    title="Voltar ao ícone padrão"
                  >
                    Padrão
                  </button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  className="rounded-xl border-[#D4AF37]/40 bg-[#0A0E15] text-[#E5C365] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] font-bold text-xs gap-1.5 h-9 px-3 transition-all cursor-pointer"
                  data-testid="choose-service-icon-btn"
                >
                  <span>
                    {form.icon && form.icon !== "corte_tradicional"
                      ? "Alterar ícone"
                      : "Escolher ícone"}
                  </span>
                </Button>
              </div>
            </div>

            {/* Nome do Serviço */}
            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-300">Serviço *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Corte Degradê"
                className="mt-1 bg-[#0D121B] border-[#161E2C] text-white rounded-xl"
                data-testid="service-name"
              />
            </div>

            {/* Preço */}
            <div>
              <Label className="text-xs text-slate-300">Preço (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="45.00"
                className="mt-1 bg-[#0D121B] border-[#161E2C] text-white rounded-xl"
                data-testid="service-price"
              />
            </div>

            {/* Duração */}
            <div>
              <Label className="text-xs text-slate-300">Duração (minutos) *</Label>
              <Input
                type="number"
                value={form.duration_min}
                onChange={(e) => setForm((f) => ({ ...f, duration_min: e.target.value }))}
                placeholder="30"
                className="mt-1 bg-[#0D121B] border-[#161E2C] text-white rounded-xl"
                data-testid="service-duration"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-[#161E2C] mt-2 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={submit}
              className="bg-[#D4AF37] hover:bg-[#E5C365] text-[#05070B] font-bold rounded-xl px-5"
              data-testid="service-submit"
            >
              Salvar Serviço
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Seletor de Ícones Oficial KUPOLA */}
      <ServiceIconPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selected={form.icon || "corte_tradicional"}
        onSelect={(iconId) => setForm((f) => ({ ...f, icon: iconId }))}
      />
    </>
  );
}

export default function Servicos() {
  const { refresh } = useMonth();
  const { data, loading } = useApi((api) => api.get("/services"));
  const [search, setSearch] = useState("");

  const remove = async (id) => {
    try {
      await api.del(`/services/${id}`);
      toast.success("Serviço removido com sucesso!");
      refresh();
    } catch {
      toast.error("Erro ao remover serviço");
    }
  };

  const filteredServices = useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter((s) => s.name?.toLowerCase().includes(q));
  }, [data, search]);

  if (loading) return <Loading />;

  return (
    <div
      className="space-y-6 max-w-full 2xl:max-w-[1920px] mx-auto"
      data-testid="servicos-page"
    >
      {/* Top Header com Título e Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
            Serviços & Cortes
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Gerencie o catálogo oficial de cortes e serviços com ícones exclusivos KUPOLA.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <ServiceDialog onDone={refresh} />
        </div>
      </div>

      {/* Campo de Busca Rápida */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Buscar serviço cadastrado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#0D121B] border-[#161E2C] text-white rounded-xl placeholder:text-slate-500"
        />
      </div>

      {!filteredServices?.length ? (
        <EmptyState
          title="Nenhum serviço cadastrado"
          subtitle="Cadastre os serviços oferecidos pela barbearia e escolha seus ícones oficiais."
        />
      ) : (
        <Card className="overflow-hidden border border-[#161E2C] bg-[#0A0E15] rounded-2xl shadow-xl">
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="border-b border-[#161E2C] bg-[#070A0F]/60">
                  <TableHead className="text-slate-400 py-3.5 px-4 font-semibold text-xs">
                    Serviço
                  </TableHead>
                  <TableHead className="text-right text-slate-400 py-3.5 px-4 font-semibold text-xs">
                    Preço
                  </TableHead>
                  <TableHead className="text-right text-slate-400 py-3.5 px-4 font-semibold text-xs">
                    Duração
                  </TableHead>
                  <TableHead className="text-right text-slate-400 py-3.5 px-4 font-semibold text-xs">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((s) => (
                  <TableRow
                    key={s.id}
                    data-testid={`service-row-${s.id}`}
                    className="border-b border-[#161E2C]/70 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Serviço com Ícone Oficial KUPOLA */}
                    <TableCell className="py-3 px-4 font-medium">
                      <div className="flex items-center gap-3">
                        <ServiceIcon iconKey={s.icon || s.name} size="sm" />
                        <div>
                          <span className="font-semibold text-white block text-xs sm:text-sm">
                            {s.name}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            Código: {s.id}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-right tabular-nums font-bold text-white py-3 px-4 text-xs sm:text-sm">
                      {brl(s.price)}
                    </TableCell>

                    <TableCell className="text-right text-slate-300 py-3 px-4 text-xs sm:text-sm">
                      <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#E5C365]" />
                        <span>{s.duration_min} min</span>
                      </span>
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <ServiceDialog existing={s} onDone={refresh} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => remove(s.id)}
                          data-testid={`delete-service-${s.id}`}
                          title="Excluir serviço"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
