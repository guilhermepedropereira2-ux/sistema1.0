import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, X, Check } from "lucide-react";
import ServiceIcon from "./ServiceIcon";
import ServiceIconSvg from "./ServiceIconSvg";
import {
  SERVICE_ICONS,
  SERVICE_ICON_CATEGORIES,
  getServiceIconMeta,
} from "@/data/serviceIconsData";

/**
 * ServiceIconPicker.jsx - Modal Seletor Oficial de Ícones de Serviços KUPOLA 2.0
 * Padrão vetorial SaaS comercial profissional.
 * Layout estritamente contido (700-800px no desktop, 90-94% no celular),
 * rolagem interna apenas na grade, sem overflow horizontal,
 * ícones de 36px, cards limpos com estados cinza/dourado e check simples ✓.
 */

export default function ServiceIconPicker({
  open,
  onOpenChange,
  selected: initialSelected = "scissors-comb",
  onSelect,
}) {
  const [selected, setSelected] = useState(initialSelected || "scissors-comb");
  const [activeCategory, setActiveCategory] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      setSelected(initialSelected || "scissors-comb");
      setSearchQuery("");
      setActiveCategory("todos");
    }
  }, [open, initialSelected]);

  // Filtragem inteligente de ícones
  const filteredIcons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return SERVICE_ICONS.filter((item) => {
      // 1. Filtro por Categoria
      const matchesCategory =
        activeCategory === "todos" ||
        item.category === activeCategory ||
        (Array.isArray(item.categories) && item.categories.includes(activeCategory));

      if (!matchesCategory) return false;

      // 2. Filtro por Busca textual
      if (!query) return true;

      const matchesName = item.name.toLowerCase().includes(query);
      const matchesId = item.id.toLowerCase().includes(query);
      const matchesAlias = item.aliasId?.toLowerCase().includes(query);
      const matchesKeywords = item.keywords?.some((k) =>
        k.toLowerCase().includes(query)
      );

      return matchesName || matchesId || matchesAlias || matchesKeywords;
    });
  }, [activeCategory, searchQuery]);

  const handleConfirm = () => {
    if (onSelect) {
      onSelect(selected);
    }
    onOpenChange?.(false);
  };

  const handleCancel = () => {
    onOpenChange?.(false);
  };

  const selectedMeta = getServiceIconMeta(selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[92vw] sm:w-[750px] max-w-[800px] max-h-[82vh] h-[82vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-[#1A2230] bg-[#0A0E15] text-[#F5F5F5] shadow-2xl"
        data-testid="service-icon-picker-modal"
      >
        {/* =========================================================================
            1. HEADER FIXO
           ========================================================================= */}
        <div className="p-4 sm:p-5 border-b border-[#1A2230] bg-[#0A0E15] shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0D121B] border border-[#1A2230] flex items-center justify-center text-[#D4AF37]">
                <ServiceIconSvg iconId="scissors-comb" className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="font-display text-base sm:text-lg font-bold text-[#F5F5F5] tracking-tight">
                  Escolha o ícone do serviço
                </DialogTitle>
                <DialogDescription className="text-xs text-[#94A3B8] mt-0.5">
                  Selecione um ícone oficial da biblioteca KUPOLA.
                </DialogDescription>
              </div>
            </div>

            {/* Botão fechar X */}
            <button
              type="button"
              onClick={handleCancel}
              className="text-[#94A3B8] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* =========================================================================
              2. BUSCA FIXA
             ========================================================================= */}
          <div className="relative mt-3.5">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Buscar ícone... (ex: degradê, fade, barba)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-[#0D121B] border border-[#1A2230] focus:border-[#D4AF37] rounded-xl text-xs sm:text-sm text-[#F5F5F5] placeholder-[#94A3B8]/60 outline-none transition-colors"
              data-testid="search-service-icon-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* =========================================================================
              3. CATEGORIAS COM SCROLL HORIZONTAL INTERNO (sem overflow na página)
             ========================================================================= */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-0.5 scrollbar-none">
            {SERVICE_ICON_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#D4AF37] text-[#05070B] font-bold shadow-sm"
                      : "bg-[#0D121B] text-[#94A3B8] hover:text-white border border-[#1A2230] hover:border-slate-700"
                  }`}
                  data-testid={`service-category-chip-${cat.id}`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            4. ÁREA DE ÍCONES COM SCROLL VERTICAL INTERNO
               Grid: Celular 2 colunas, Tablet 3 colunas, Desktop 4-5 colunas
           ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 scrollbar-thin scrollbar-thumb-slate-800">
          {filteredIcons.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {filteredIcons.map((item) => {
                const isSelected = selected === item.id || selected === item.aliasId;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    className={`relative p-3 sm:p-3.5 rounded-xl flex flex-col items-center justify-between min-h-[96px] sm:min-h-[108px] cursor-pointer transition-all border text-center select-none group ${
                      isSelected
                        ? "bg-[rgba(212,175,55,0.08)] border-[#D4AF37] shadow-[0_0_14px_rgba(212,175,55,0.18)]"
                        : "bg-[#0D121B] border-[#1A2230] hover:border-[#D4AF37] hover:bg-[#111724]"
                    }`}
                    data-testid={`service-icon-item-${item.id}`}
                  >
                    {/* Indicador de Seleção com check simples ✓ */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#D4AF37] text-[#05070B] flex items-center justify-center font-bold">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Ícone Vetorial de 36px (faixa de 32-42px) */}
                    <div className="flex items-center justify-center py-1">
                      <div
                        className={`w-9 h-9 transition-colors ${
                          isSelected
                            ? "text-[#E5C365]"
                            : "text-[#94A3B8] group-hover:text-slate-200"
                        }`}
                      >
                        <ServiceIconSvg iconId={item.iconType || item.id} className="w-full h-full" />
                      </div>
                    </div>

                    {/* Nome do Serviço */}
                    <div className="w-full pt-1">
                      <span
                        className={`text-xs font-semibold block leading-tight truncate ${
                          isSelected ? "text-[#E5C365] font-bold" : "text-[#F5F5F5]"
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-[#94A3B8]">
              <div className="w-8 h-8 mx-auto mb-2 opacity-50">
                <ServiceIconSvg iconId="scissors-comb" className="w-full h-full" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                Nenhum serviço encontrado
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tente buscar por termos como "degradê", "fade", "barba" ou "navalha".
              </p>
            </div>
          )}
        </div>

        {/* =========================================================================
            5. ÁREA INFERIOR FIXA: SELECIONADO & AÇÕES
           ========================================================================= */}
        <div className="p-3.5 sm:p-4 border-t border-[#1A2230] bg-[#0A0E15] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Seção "SELECIONADO" */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block shrink-0">
              Selecionado
            </span>
            <div className="flex items-center gap-2.5 bg-[#0D121B] border border-[#1A2230] px-3 py-1.5 rounded-xl min-w-0">
              <div className="w-6 h-6 text-[#E5C365] shrink-0">
                <ServiceIconSvg
                  iconId={selectedMeta.iconType || selectedMeta.id}
                  className="w-full h-full"
                />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white block truncate">
                  {selectedMeta.name}
                </span>
                <span className="text-[10px] text-[#94A3B8] block truncate">
                  Biblioteca Oficial KUPOLA
                </span>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#94A3B8] hover:text-white hover:bg-white/5 border border-transparent transition-colors cursor-pointer"
              data-testid="cancel-service-icon-btn"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E5C365] text-[#05070B] text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              data-testid="confirm-service-icon-btn"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Confirmar</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
