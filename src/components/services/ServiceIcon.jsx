import React from "react";
import ServiceIconSvg from "./ServiceIconSvg";
import { getServiceIconMeta } from "@/data/serviceIconsData";

/**
 * ServiceIcon.jsx - Componente Oficial de Ícone de Serviço KUPOLA 2.0
 * Padrão vetorial SaaS comercial profissional (stroke 2px, 32-42px de base).
 */

export default function ServiceIcon({
  iconKey,
  service,
  name,
  size = "md", // "xs" | "sm" | "md" | "lg" | "xl" | number
  variant = "card", // "card" | "raw" | "preview"
  showLabel = false,
  selected = false,
  className = "",
  onClick,
}) {
  const keyToUse =
    iconKey ||
    service?.icon ||
    service?.iconKey ||
    service?.serviceIcon ||
    service?.imageType ||
    name ||
    service?.name;

  const iconMeta = getServiceIconMeta(keyToUse);

  let sizeStyle = {};
  let sizeClass = "";

  if (typeof size === "number") {
    sizeStyle = { width: `${size}px`, height: `${size}px` };
  } else {
    switch (size) {
      case "xs":
        sizeClass = "w-5 h-5";
        break;
      case "sm":
        sizeClass = "w-6 h-6";
        break;
      case "lg":
        sizeClass = "w-11 h-11";
        break;
      case "xl":
        sizeClass = "w-14 h-14";
        break;
      case "md":
      default:
        // Padrão 36px (faixa ideal de 32-42px exigida pelo cliente)
        sizeClass = "w-9 h-9";
        break;
    }
  }

  // Cor do ícone: cinza claro/frio (#94A3B8) no estado normal, dourado KUPOLA (#E5C365) quando selecionado
  const colorClass = selected
    ? "text-[#E5C365]"
    : "text-[#94A3B8] group-hover:text-slate-200";

  if (variant === "raw") {
    return (
      <div
        style={sizeStyle}
        className={`inline-flex items-center justify-center shrink-0 ${sizeClass} ${colorClass} ${className}`}
        onClick={onClick}
        title={iconMeta.name}
      >
        <ServiceIconSvg iconId={iconMeta.iconType || iconMeta.id} className="w-full h-full" />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-2 ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div
        style={sizeStyle}
        className={`relative flex items-center justify-center p-2 shrink-0 transition-all select-none rounded-xl ${
          selected
            ? "bg-[rgba(212,175,55,0.08)] border border-[#D4AF37] text-[#E5C365] shadow-[0_0_12px_rgba(212,175,55,0.15)]"
            : "bg-[#0D121B] border border-[#1A2230] hover:border-[#D4AF37] text-[#94A3B8] hover:text-slate-200"
        } ${sizeClass} ${className}`}
        title={iconMeta.name}
      >
        <ServiceIconSvg iconId={iconMeta.iconType || iconMeta.id} className="w-full h-full" />
      </div>

      {showLabel && (
        <span
          className={`text-xs font-semibold text-center leading-tight max-w-[110px] truncate ${
            selected ? "text-[#E5C365] font-bold" : "text-slate-300"
          }`}
        >
          {iconMeta.name}
        </span>
      )}
    </div>
  );
}
