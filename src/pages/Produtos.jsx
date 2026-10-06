import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useMonth } from "@/context/MonthContext";
import { Loading, EmptyState } from "@/components/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Package, Scissors, Clock, Search } from "lucide-react";
import { brl } from "@/lib/format";
import ProductIcon from "@/components/products/ProductIcon";
import ProductIconPicker from "@/components/products/ProductIconPicker";
import { getProductIconMeta } from "@/data/productIconsData";
import ServiceIcon from "@/components/services/ServiceIcon";
import ServiceIconPicker from "@/components/services/ServiceIconPicker";
import { getServiceIconMeta } from "@/data/serviceIconsData";
import { ServiceDialog } from "@/pages/Servicos";

function ProductDialog({ existing, onDone }) {
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const init = existing
    ? {
        name: existing.name || "",
        price: existing.price ?? "",
        cost: existing.cost ?? "",
        stock: existing.stock ?? 0,
        icon: existing.icon || "produto",
        active: existing.active !== false,
      }
    : {
        name: "",
        price: "",
        cost: "",
        stock: 0,
        icon: "produto",
        active: true,
      };

  const [form, setForm] = useState(init);

  const iconMeta = getProductIconMeta(form.icon || form.name || "produto");

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Informe o nome do produto");
    const payload = {
      name: form.name.trim(),
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      stock: parseInt(form.stock) || 0,
      icon: form.icon || "produto",
      active: form.active,
    };

    try {
      if (existing) {
        await api.put(`/products/${existing.id}`, payload);
        toast.success("Produto atualizado com sucesso!");
      } else {
        await api.post("/products", payload);
        toast.success("Produto cadastrado com sucesso!");
      }
      setOpen(false);
      onDone();
    } catch {
      toast.error("Erro ao salvar produto");
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
              data-testid={`edit-product-${existing.id}`}
              title="Editar produto"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="bg-[#D4AF37] hover:bg-[#E5C365] text-[#05070B] font-bold text-xs sm:text-sm gap-2 rounded-xl shadow-lg shadow-[#D4AF37]/20"
              data-testid="add-product-button"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Novo Produto</span>
            </Button>
          )}
        </DialogTrigger>

        <DialogContent
          className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto bg-[#0A0E15] border border-[#161E2C] text-white rounded-2xl p-5 sm:p-6 shadow-2xl"
          data-testid="product-dialog-modal"
        >
          <DialogHeader className="pb-3 border-b border-[#161E2C]">
            <DialogTitle className="font-display text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-[#E5C365]" />
              <span>{existing ? "Editar" : "Novo"} Produto</span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            {/* Seletor Oficial de Ícone do Produto (Gabarito KUPOLA) */}
            <div className="sm:col-span-2 p-3 sm:p-3.5 rounded-xl bg-[#0D121B] border border-[#161E2C] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ProductIcon
                  iconKey={form.icon || "produto"}
                  size="lg"
                  className="shadow-md"
                />
                <div className="min-w-0">
                  <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider block">
                    Ícone do produto
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white truncate block mt-0.5">
                    {iconMeta?.name || "Produto"}
                  </span>
                  <span className="text-[11px] text-[#E5C365] block truncate font-medium">
                    Biblioteca Oficial KUPOLA
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {form.icon && form.icon !== "produto" && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, icon: "produto" }))}
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
                  data-testid="choose-product-icon-btn"
                >
                  <span>
                    {form.icon && form.icon !== "produto"
                      ? "Alterar ícone"
                      : "Escolher ícone"}
                  </span>
                </Button>
              </div>
            </div>

            {/* Nome do Produto */}
            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-300">Nome do produto *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Pomada Matte 100g"
                className="mt-1 bg-[#0D121B] border-[#161E2C] text-white rounded-xl"
                data-testid="product-name"
              />
            </div>

            {/* Preço de Venda */}
            <div>
              <Label className="text-xs text-slate-300">Preço de Venda (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="45.00"
                className="mt-1 bg-[#0D121B] border-[#161E2C] text-white rounded-xl"
                data-testid="product-price"
              />
            </div>

            {/* Custo */}
            <div>
              <Label className="text-xs text-slate-300">Preço de Custo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                placeholder="20.00"
                className="mt-1 bg-[#0D121B] border-[#161E2C] text-white rounded-xl"
                data-testid="product-cost"
              />
            </div>

            {/* Estoque */}
            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-300">Quantidade em Estoque</Label>
              <Input
                type="number"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                placeholder="10"
                className="mt-1 bg-[#0D121B] border-[#161E2C] text-white rounded-xl"
                data-testid="product-stock"
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
              data-testid="product-submit"
            >
              Salvar Produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seletor Oficial de Ícones */}
      <ProductIconPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selected={form.icon || "produto"}
        onSelect={(newIcon) => setForm((f) => ({ ...f, icon: newIcon }))}
      />
    </>
  );
}

export default function Produtos() {
  const { refresh } = useMonth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "servicos" ? "servicos" : "produtos";

  const { data: productsData, loading: loadingProducts } = useApi((api) => api.get("/products"));
  const { data: servicesData, loading: loadingServices } = useApi((api) => api.get("/services"));

  const [search, setSearch] = useState("");

  const removeProduct = async (id) => {
    try {
      await api.del(`/products/${id}`);
      toast.success("Produto removido com sucesso!");
      refresh();
    } catch {
      toast.error("Erro ao remover produto");
    }
  };

  const removeService = async (id) => {
    try {
      await api.del(`/services/${id}`);
      toast.success("Serviço removido com sucesso!");
      refresh();
    } catch {
      toast.error("Erro ao remover serviço");
    }
  };

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(productsData)) return [];
    if (!search.trim()) return productsData;
    const q = search.trim().toLowerCase();
    return productsData.filter((p) => p.name?.toLowerCase().includes(q));
  }, [productsData, search]);

  const filteredServices = useMemo(() => {
    if (!Array.isArray(servicesData)) return [];
    if (!search.trim()) return servicesData;
    const q = search.trim().toLowerCase();
    return servicesData.filter((s) => s.name?.toLowerCase().includes(q));
  }, [servicesData, search]);

  const loading = activeTab === "produtos" ? loadingProducts : loadingServices;

  if (loading) return <Loading />;

  return (
    <div
      className="space-y-6 max-w-full 2xl:max-w-[1920px] mx-auto"
      data-testid="produtos-page"
    >
      {/* Top Header com Título e Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black text-white tracking-tight">
            {activeTab === "produtos" ? "Produtos & Estoque" : "Serviços & Cortes"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeTab === "produtos"
              ? "Gerenciamento de produtos para venda e controle de estoque com ícones oficiais."
              : "Catálogo oficial de cortes e serviços com ícones da Biblioteca Oficial KUPOLA."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === "produtos" ? (
            <ProductDialog onDone={refresh} />
          ) : (
            <ServiceDialog onDone={refresh} />
          )}
        </div>
      </div>

      {/* Abas Superiores: Produtos / Serviços & Cortes */}
      <div className="flex items-center gap-2 border-b border-[#161E2C] pb-2">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: "produtos" })}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "produtos"
              ? "bg-[#D4AF37] text-[#05070B] shadow-md shadow-[#D4AF37]/20"
              : "bg-[#0D121B] text-slate-400 hover:text-white border border-[#161E2C]"
          }`}
          data-testid="tab-produtos-toggle"
        >
          <Package className="w-4 h-4" />
          <span>Produtos</span>
          {Array.isArray(productsData) && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === "produtos"
                  ? "bg-[#05070B]/20 text-[#05070B]"
                  : "bg-white/10 text-slate-400"
              }`}
            >
              {productsData.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: "servicos" })}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "servicos"
              ? "bg-[#D4AF37] text-[#05070B] shadow-md shadow-[#D4AF37]/20"
              : "bg-[#0D121B] text-slate-400 hover:text-white border border-[#161E2C]"
          }`}
          data-testid="tab-servicos-toggle"
        >
          <Scissors className="w-4 h-4" />
          <span>Serviços & Cortes</span>
          {Array.isArray(servicesData) && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === "servicos"
                  ? "bg-[#05070B]/20 text-[#05070B]"
                  : "bg-white/10 text-slate-400"
              }`}
            >
              {servicesData.length}
            </span>
          )}
        </button>
      </div>

      {/* Busca Rápida */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder={
            activeTab === "produtos"
              ? "Buscar produto cadastrado..."
              : "Buscar serviço cadastrado..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#0D121B] border-[#161E2C] text-white rounded-xl placeholder:text-slate-500"
        />
      </div>

      {/* CONTEÚDO DA ABA PRODUTOS */}
      {activeTab === "produtos" && (
        <>
          {!filteredProducts?.length ? (
            <EmptyState
              title="Nenhum produto cadastrado"
              subtitle="Cadastre os produtos vendidos pela barbearia com seus ícones oficiais."
            />
          ) : (
            <Card className="overflow-hidden bg-[#0A0E15] border-[#161E2C] rounded-2xl shadow-lg">
              <div className="overflow-x-auto">
                <Table className="min-w-[550px]">
                  <TableHeader>
                    <TableRow className="border-b border-[#161E2C] bg-[#070A0F]/60 text-slate-400 text-xs">
                      <TableHead className="py-3 px-4 font-semibold text-slate-400">Produto</TableHead>
                      <TableHead className="text-right py-3 px-4 font-semibold text-slate-400">Preço</TableHead>
                      <TableHead className="text-right py-3 px-4 font-semibold text-slate-400">Custo</TableHead>
                      <TableHead className="text-right py-3 px-4 font-semibold text-slate-400">Estoque</TableHead>
                      <TableHead className="text-right py-3 px-4 font-semibold text-slate-400">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p) => (
                      <TableRow
                        key={p.id}
                        data-testid={`product-row-${p.id}`}
                        className="border-b border-[#161E2C]/70 hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Produto com Ícone Oficial */}
                        <TableCell className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-3">
                            <ProductIcon iconKey={p.icon || p.name} size="sm" />
                            <div>
                              <span className="font-semibold text-white block text-xs sm:text-sm">
                                {p.name}
                              </span>
                              <span className="text-[11px] text-slate-400 block">
                                Código: {p.id}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-right tabular-nums font-bold text-white py-3 px-4 text-xs sm:text-sm">
                          {brl(p.price)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-400 py-3 px-4 text-xs sm:text-sm">
                          {brl(p.cost)}
                        </TableCell>
                        <TableCell className="text-right text-slate-300 py-3 px-4 text-xs sm:text-sm font-medium">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              p.stock <= 5
                                ? "bg-red-500/15 text-red-400 border border-red-500/30"
                                : "bg-[#20C997]/15 text-[#20C997] border border-[#20C997]/30"
                            }`}
                          >
                            {p.stock} un.
                          </span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <ProductDialog existing={p} onDone={refresh} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => removeProduct(p.id)}
                              data-testid={`delete-product-${p.id}`}
                              title="Excluir produto"
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
        </>
      )}

      {/* CONTEÚDO DA ABA SERVIÇOS */}
      {activeTab === "servicos" && (
        <>
          {!filteredServices?.length ? (
            <EmptyState
              title="Nenhum serviço cadastrado"
              subtitle="Cadastre os serviços e cortes oferecidos pela barbearia com seus ícones oficiais."
            />
          ) : (
            <Card className="overflow-hidden bg-[#0A0E15] border-[#161E2C] rounded-2xl shadow-lg">
              <div className="overflow-x-auto">
                <Table className="min-w-[550px]">
                  <TableHeader>
                    <TableRow className="border-b border-[#161E2C] bg-[#070A0F]/60 text-slate-400 text-xs">
                      <TableHead className="py-3 px-4 font-semibold text-slate-400">Serviço / Corte</TableHead>
                      <TableHead className="text-right py-3 px-4 font-semibold text-slate-400">Preço</TableHead>
                      <TableHead className="text-right py-3 px-4 font-semibold text-slate-400">Duração</TableHead>
                      <TableHead className="text-right py-3 px-4 font-semibold text-slate-400">Ações</TableHead>
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
                              onClick={() => removeService(s.id)}
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
        </>
      )}
    </div>
  );
}
