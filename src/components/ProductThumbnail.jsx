import React from "react";
import ProductIcon from "@/components/products/ProductIcon";

/**
 * ProductThumbnail.jsx
 * Componente unificado que delega para a biblioteca oficial ProductIcon KUPOLA 2.0.
 */
export default function ProductThumbnail({ type = "pomada", product, size = 44, className = "" }) {
  const iconKey = product?.icon || product?.iconKey || type;
  return (
    <ProductIcon
      iconKey={iconKey}
      product={product}
      size={size}
      className={className}
    />
  );
}
