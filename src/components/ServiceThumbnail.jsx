import React from "react";
import ServiceIcon from "@/components/services/ServiceIcon";

/**
 * ServiceThumbnail.jsx
 * Componente oficial que delega para a Biblioteca de Cortes & Serviços KUPOLA 2.0.
 */
export default function ServiceThumbnail({
  type = "corte_tradicional",
  service,
  size = 44,
  className = "",
}) {
  const iconKey = service?.icon || service?.iconKey || type;

  return (
    <ServiceIcon
      iconKey={iconKey}
      service={service}
      size={size}
      className={className}
    />
  );
}
