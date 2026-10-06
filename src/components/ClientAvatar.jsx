import React, { useState, useEffect } from "react";
import { User } from "lucide-react";

/**
 * ClientAvatar - Componente Oficial de Avatar do Cliente KUPOLA 2.0
 * Exibe foto de perfil circular em proporção 1:1 ou iniciais elegantes com acabamento dourado KUPOLA.
 */
export default function ClientAvatar({
  name = "",
  photo = "",
  avatar = "",
  size = "md",
  className = "",
  showBorder = true,
}) {
  const [imageError, setImageError] = useState(false);
  const finalPhoto = photo || avatar;

  // Reseta o estado de erro caso a foto seja atualizada/alterada
  useEffect(() => {
    setImageError(false);
  }, [finalPhoto]);

  // Extrai as iniciais do nome (ex.: "Lucas Fernandes" -> "LF", "Rafael" -> "R")
  const getInitials = (n) => {
    if (!n || typeof n !== "string") return "C";
    const parts = n.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "C";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);

  // Mapeamento de dimensões e tipografia
  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-xs sm:text-sm",
    lg: "w-14 h-14 text-base font-bold",
    xl: "w-16 h-16 sm:w-20 sm:h-20 text-xl font-black",
    "2xl": "w-24 h-24 text-2xl font-black",
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  const borderClass = showBorder ? "border border-[#D4AF37]/30 ring-1 ring-black/40" : "";

  // Se houver foto válida e não deu erro de carregamento
  if (finalPhoto && !imageError) {
    return (
      <div
        className={`relative shrink-0 rounded-full overflow-hidden select-none bg-[#0D121B] shadow-md ${currentSizeClass} ${borderClass} ${className}`}
      >
        <img
          src={finalPhoto}
          alt={name || "Cliente"}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center transition-all duration-300"
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback elegante com iniciais e identidade dourada KUPOLA 2.0
  return (
    <div
      className={`relative shrink-0 rounded-full flex items-center justify-center select-none bg-gradient-to-br from-[#111722] via-[#0E131C] to-[#0A0E15] text-[#E5C365] font-black border border-[#D4AF37]/35 shadow-inner ${currentSizeClass} ${className}`}
      title={name}
    >
      {initials ? (
        <span className="tracking-wider leading-none drop-shadow-sm">{initials}</span>
      ) : (
        <User className="w-1/2 h-1/2 text-[#D4AF37]" />
      )}
    </div>
  );
}
