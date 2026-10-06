import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Package, X, Check } from "lucide-react";
import ProductIcon from "./ProductIcon";
import {
  PRODUCT_ICONS,
  PRODUCT_ICON_CATEGORIES,
  getProductIconMeta,
} from "@/data/productIconsData";

/**
 * ProductIconPicker.jsx - Modal Seletor Oficial de Ícones de Produtos KUPOLA 2.0
 * Permite ao usuário buscar, filtrar por categoria e selecionar um ícone visual para o produto.
 */

export default function ProductIconPicker({
  open,
  onOpenChange,
  currentIcon = "produto",
  onSelectIcon,
}) {
  const [selected, setSelected] = useState(currentIcon || "produto");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("todos");

  // Sincroniza o ícone selecionado ao abrir
  useEffect(() => {
    if (open) {
      setSelected(currentIcon || "produto");
      setSearchQuery("");
      setActiveCategory("todos");
    }
  }, [open, currentIcon]);

  // Filtra os ícones com base na categoria e busca
  const filteredIcons = useMemo(() => {
    return PRODUCT_ICONS.filter((item) => {
      // Filtro de categoria
      if (activeCategory !== "todos" && item.category !== activeCategory) {
        return false;
      }

      // Filtro de busca textual
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        const matchKeyword = item.keywords.some((k) => k.toLowerCase().includes(q));
        if (!matchName && !matchId && !matchKeyword) return false;
      }

      return true;
    });
  }, [activeCategory, searchQuery]);

  const handleConfirm = () => {
    onSelectIcon?.(selected);
    onOpenChange?.(false);
  };

  const selectedMeta = getProductIconMeta(selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-[#161E2C] bg-[#0A0E15] text-white shadow-2xl"
        data-testid="product-icon-picker-modal"
      >
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-[#161E2C] bg-[#0A0E15] shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#E5C365]">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="font-display text-base sm:text-lg font-bold text-white tracking-tight">
                  Escolha o ícone do produto
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Selecione um ícone oficial da biblioteca KUPOLA para identificar o produto.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Campo de Busca */}
          <div className="relative mt-3.5">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar ícone... (ex: pomada, óleo, tesoura, shampoo)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-[#0D121B] border border-[#161E2C] focus:border-[#D4AF37]/60 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-colors"
              data-testid="search-icon-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Chips de Categorias */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-0.5 scrollbar-none">
            {PRODUCT_ICON_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#E5C365] text-[#05070B] shadow-sm font-bold"
                      : "bg-[#0D121B] text-slate-300 hover:text-white border border-[#161E2C] hover:border-slate-700"
                  }`}
                  data-testid={`category-chip-${cat.id}`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade de Ícones Rolável */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin scrollbar-thumb-slate-800">
          {filteredIcons.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredIcons.map((item) => {
                const isSelected = selected === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all border text-center ${
                      isSelected
                        ? "bg-[#D4AF37]/15 border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.2)] scale-[1.02]"
                        : "bg-[#0D121B] border-[#161E2C] hover:border-[#D4AF37]/40 hover:bg-[#121824]"
                    }`}
                    data-testid={`icon-item-${item.id}`}
                  >
                    <div className="relative">
                      <ProductIcon
                        iconKey={item.id}
                        size="md"
                        variant="raw"
                        className="w-10 h-10 p-1"
                      />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E5C365] text-[#05070B] flex items-center justify-center text-[10px] font-black shadow-md">
                          ✓
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-semibold leading-tight line-clamp-2 ${
                        isSelected ? "text-[#E5C365]" : "text-slate-300"
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <p>Nenhum ícone encontrado com &quot;{searchQuery}&quot;.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("todos");
                }}
                className="mt-2 text-xs font-semibold text-[#E5C365] hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* Rodapé com Pré-visualização do Ícone Selecionado e Botões */}
        <div className="p-3.5 sm:p-4 border-t border-[#161E2C] bg-[#070A0F] shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ProductIcon iconKey={selected} size="sm" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Selecionado
              </span>
              <span className="text-xs font-bold text-white truncate block">
                {selectedMeta?.name || "Produto"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenChange?.(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 rounded-xl bg-[#E5C365] hover:bg-[#D4AF37] text-[#05070B] text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              data-testid="confirm-icon-selection-btn"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
