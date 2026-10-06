import React from "react";
import ProductIconSvg from "./ProductIconSvg";
import { getProductIconMeta } from "@/data/productIconsData";

/**
 * ProductIcon.jsx - Componente Oficial de Ícone do Produto KUPOLA 2.0
 * Representação visual de identificação do produto, similar a uma foto de perfil,
 * utilizando a biblioteca de traços finos dourados sobre fundo escuro.
 */

export default function ProductIcon({
  iconKey,
  product,
  name,
  size = "md", // "xs" | "sm" | "md" | "lg" | "xl" | number
  variant = "card", // "card" | "raw" | "preview"
  showLabel = false,
  selected = false,
  className = "",
  onClick,
}) {
  // Extrai o ID do ícone com inteligência
  const keyToUse =
    iconKey ||
    product?.icon ||
    product?.iconKey ||
    product?.imageType ||
    name ||
    product?.name;

  const iconMeta = getProductIconMeta(keyToUse);

  // Mapeamento de dimensões
  let sizeStyle = {};
  let sizeClass = "";

  if (typeof size === "number") {
    sizeStyle = { width: `${size}px`, height: `${size}px` };
  } else {
    switch (size) {
      case "xs":
        sizeClass = "w-6 h-6 p-1 rounded-md text-[10px]";
        break;
      case "sm":
        sizeClass = "w-8 h-8 sm:w-9 sm:h-9 p-1.5 rounded-lg text-xs";
        break;
      case "lg":
        sizeClass = "w-14 h-14 sm:w-16 sm:h-16 p-2.5 rounded-2xl text-base";
        break;
      case "xl":
        sizeClass = "w-20 h-20 p-3.5 rounded-2xl text-lg";
        break;
      case "md":
      default:
        sizeClass = "w-11 h-11 sm:w-12 sm:h-12 p-2 rounded-xl text-sm";
        break;
    }
  }

  if (variant === "raw") {
    return (
      <div
        style={sizeStyle}
        className={`inline-flex items-center justify-center text-[#E5C365] ${sizeClass} ${className}`}
        onClick={onClick}
        title={iconMeta.name}
      >
        <ProductIconSvg iconId={iconMeta.id} />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-1.5 ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div
        style={sizeStyle}
        className={`relative flex items-center justify-center shrink-0 transition-all select-none ${
          selected
            ? "bg-[#D4AF37]/15 border-2 border-[#D4AF37] text-[#E5C365] shadow-[0_0_15px_rgba(212,175,55,0.25)] scale-[1.02]"
            : "bg-[#0D121B] border border-[#161E2C] text-[#E5C365] hover:border-[#D4AF37]/50 hover:bg-[#121824]"
        } ${sizeClass} ${className}`}
        title={iconMeta.name}
      >
        <ProductIconSvg iconId={iconMeta.id} />

        {/* Indicador de Seleção Ativo */}
        {selected && (
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E5C365] text-[#05070B] flex items-center justify-center text-[9px] font-black shadow-md">
            ✓
          </div>
        )}
      </div>

      {showLabel && (
        <span
          className={`text-[11px] font-medium truncate max-w-[84px] text-center transition-colors ${
            selected ? "text-[#E5C365] font-bold" : "text-slate-300"
          }`}
        >
          {iconMeta.name}
        </span>
      )}
    </div>
  );
}
