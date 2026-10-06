import React from "react";
import { Scissors, Package, ChevronRight, ArrowRight } from "lucide-react";
import ServiceThumbnail from "./ServiceThumbnail";
import ProductThumbnail from "./ProductThumbnail";

export default function TopLists({
  services = [],
  products = [],
  onViewAllServices,
  onViewAllProducts,
  onSelectService,
  onSelectProduct,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 lg:gap-5">
      {/* Serviços mais vendidos */}
      <div className="rounded-2xl bg-[#0D121B] border border-[#161e2c] p-4 sm:p-5 shadow-xl flex flex-col justify-between">
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#161e2c]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#E5C365]">
                <Scissors className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Serviços mais vendidos
              </h3>
            </div>
            {onViewAllServices && (
              <button
                type="button"
                onClick={onViewAllServices}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#E5C365] transition-colors cursor-pointer"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List items */}
          <div className="space-y-1">
            {services.map((item, idx) => (
              <div
                key={item.id || item.name}
                onClick={() => onSelectService?.(item)}
                className="group flex items-center justify-between p-2 rounded-xl hover:bg-[#111722] transition-all cursor-pointer"
              >
                {/* Left: Rank Badge, Image & Info */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[11px] font-bold text-[#E5C365] shrink-0 font-mono">
                    {item.rank || idx + 1}
                  </div>
                  <ServiceThumbnail
                    type={item.icon || item.imageType || item.name}
                    service={item}
                    size={38}
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-[#E5C365] transition-colors truncate">
                      {item.name}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {item.salesCount ?? item.count ?? 0} {item.salesCount === 1 ? "venda" : "vendas"}
                    </span>
                  </div>
                </div>

                {/* Right: Revenue and Chevron */}
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-200 tabular-nums font-mono">
                    R$ {Number(item.revenue || 0).toFixed(2).replace(".", ",")}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                </div>
              </div>
            ))}

            {services.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                Nenhum serviço registrado no período
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Produtos mais vendidos */}
      <div className="rounded-2xl bg-[#0D121B] border border-[#161e2c] p-4 sm:p-5 shadow-xl flex flex-col justify-between">
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#161e2c]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-[#f59e0b]">
                <Package className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Produtos mais vendidos
              </h3>
            </div>
            {onViewAllProducts && (
              <button
                type="button"
                onClick={onViewAllProducts}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#E5C365] transition-colors cursor-pointer"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List items */}
          <div className="space-y-1">
            {products.map((item, idx) => (
              <div
                key={item.id || item.name}
                onClick={() => onSelectProduct?.(item)}
                className="group flex items-center justify-between p-2 rounded-xl hover:bg-[#111722] transition-all cursor-pointer"
              >
                {/* Left: Rank Badge, Image & Info */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[11px] font-bold text-[#E5C365] shrink-0 font-mono">
                    {item.rank || idx + 1}
                  </div>
                  <ProductThumbnail product={item} type={item.icon || item.imageType || item.name} size={38} />
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-[#E5C365] transition-colors truncate">
                      {item.name}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {item.salesCount ?? item.count ?? 0} {item.salesCount === 1 ? "venda" : "vendas"}
                      {item.stock !== undefined && ` • ${item.stock} em estoque`}
                    </span>
                  </div>
                </div>

                {/* Right: Revenue and Chevron */}
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-200 tabular-nums font-mono">
                    R$ {Number(item.revenue || 0).toFixed(2).replace(".", ",")}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                </div>
              </div>
            ))}

            {products.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                Nenhum produto registrado no período
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
