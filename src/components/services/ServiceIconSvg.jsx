import React from "react";

/**
 * ServiceIconSvg.jsx
 * Biblioteca Oficial de Ícones de Serviços KUPOLA 2.0
 * Padrão vetorial SaaS comercial profissional.
 *
 * ViewBox 24x24, traço de 2px, strokeLinecap="round", strokeLinejoin="round",
 * sem rostos, sem cabeças, 100% objetivo e semanticamente consistente.
 */

export default function ServiceIconSvg({ iconId, className = "w-full h-full" }) {
  const stroke = "currentColor";
  const strokeWidth = "2";
  const linecap = "round";
  const linejoin = "round";

  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth,
    strokeLinecap: linecap,
    strokeLinejoin: linejoin,
    className,
  };

  const key = String(iconId || "").toLowerCase();

  // 1. TESOURA + PENTE (Corte Tradicional)
  if (
    key === "scissors-comb" ||
    key === "corte_tradicional" ||
    key.includes("tradicional")
  ) {
    return (
      <svg {...props}>
        {/* Pente horizontal no topo */}
        <path d="M4 6h16" />
        <path d="M5 6v3" />
        <path d="M8 6v3" />
        <path d="M11 6v3" />
        <path d="M14 6v3" />
        <path d="M17 6v3" />
        <path d="M19 6v3" />
        {/* Tesoura profissional */}
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="14" cy="19" r="2.5" />
        <path d="M8 16.5L18 10" />
        <path d="M12.5 17L15 13.5" />
        <path d="M11.5 11.5L9.5 9" />
        <circle cx="12" cy="14" r="0.8" fill="currentColor" />
      </svg>
    );
  }

  // 2. PENTE + MÁQUINA (Corte Social)
  if (
    key === "comb-clipper" ||
    key === "corte_social" ||
    key.includes("social")
  ) {
    return (
      <svg {...props}>
        {/* Pente vertical à esquerda */}
        <path d="M4 4v16" />
        <path d="M4 6h3" />
        <path d="M4 9h3" />
        <path d="M4 12h3" />
        <path d="M4 15h3" />
        <path d="M4 18h3" />
        {/* Máquina de corte à direita */}
        <rect x="11" y="8" width="7" height="12" rx="2" />
        <path d="M11 8l1-4h5l1 4" />
        <path d="M13 4v2" />
        <path d="M15 4v2" />
        <path d="M17 4v2" />
        <line x1="14.5" y1="13" x2="14.5" y2="16" />
      </svg>
    );
  }

  // 3. MÁQUINA DE CORTE (Degradê, Low Fade, Mid Fade, High Fade)
  if (
    key === "clipper" ||
    key === "clipper-degrade" ||
    key === "clipper-low-fade" ||
    key === "clipper-mid-fade" ||
    key === "clipper-high-fade" ||
    key === "degrade" ||
    key === "low_fade" ||
    key === "mid_fade" ||
    key === "high_fade" ||
    key.includes("fade") && !key.includes("skin") && !key.includes("taper")
  ) {
    return (
      <svg {...props}>
        {/* Dentes da lâmina superior */}
        <path d="M7 6h10" />
        <path d="M8 3v3" />
        <path d="M10 3v3" />
        <path d="M12 3v3" />
        <path d="M14 3v3" />
        <path d="M16 3v3" />
        {/* Cabeça da lâmina chanfrada */}
        <path d="M7 6l1.5 3h7L17 6" />
        {/* Corpo ergonômico da máquina */}
        <path d="M8.5 9c-.5 3-1 6-1 9a3 3 0 0 0 3 3h3a3 3 0 0 0 3-3c0-3-.5-6-1-9z" />
        {/* Botão liga/desliga e ranhura de pegada */}
        <line x1="12" y1="13" x2="12" y2="16" />
        <circle cx="12" cy="18" r="0.75" fill="currentColor" />
      </svg>
    );
  }

  // 4. MÁQUINA DE ACABAMENTO / PEZINHO (Taper Fade, Acabamento, Pezinho)
  if (
    key === "trimmer" ||
    key === "trimmer-taper" ||
    key === "trimmer-acabamento" ||
    key === "trimmer-pezinho" ||
    key === "taper_fade" ||
    key === "acabamento" ||
    key === "pezinho" ||
    key.includes("acabamento") ||
    key.includes("pezinho") ||
    key.includes("taper")
  ) {
    return (
      <svg {...props}>
        {/* Lâmina T-Blade proeminente de acabamento */}
        <path d="M5 4h14" />
        <path d="M6 2v2" />
        <path d="M9 2v2" />
        <path d="M12 2v2" />
        <path d="M15 2v2" />
        <path d="M18 2v2" />
        {/* Base da lâmina em T */}
        <path d="M5 4l3 3h8l3-3" />
        {/* Corpo fino e cilíndrico de trimmer profissional */}
        <rect x="9" y="7" width="6" height="14" rx="2" />
        <line x1="12" y1="11" x2="12" y2="14" />
        <circle cx="12" cy="17" r="0.8" fill="currentColor" />
      </svg>
    );
  }

  // 5. NAVALHA CLÁSSICA (Skin Fade, Barba, Navalha)
  if (
    key === "razor" ||
    key === "razor-skin-fade" ||
    key === "razor-barba" ||
    key === "razor-single" ||
    key === "skin_fade" ||
    key === "barba" ||
    key === "navalha" ||
    key === "corte_na_navalha"
  ) {
    return (
      <svg {...props}>
        {/* Cabo da navalha aberto em ângulo */}
        <path d="M4 20l7-7a2 2 0 0 1 2.8 0l1.4 1.4a2 2 0 0 1 0 2.8l-7 7a2 2 0 0 1-2.8 0l-1.4-1.4a2 2 0 0 1 0-2.8z" />
        {/* Pino de articulação */}
        <circle cx="13" cy="13" r="1" fill="currentColor" />
        {/* Lâmina estendida de aço de navalhete */}
        <path d="M13 13L20 6l-2-2-7 7" />
        <path d="M20 6c1-1 2-2 3-1l-2 3-8 5" />
      </svg>
    );
  }

  // 6. NAVALHA + PENTE (Barba Modelada)
  if (
    key === "razor-comb" ||
    key === "razor-comb-modelada" ||
    key === "barba_modelada" ||
    key.includes("modelada")
  ) {
    return (
      <svg {...props}>
        {/* Pente na vertical */}
        <path d="M4 4v16" />
        <path d="M4 6h3" />
        <path d="M4 9h3" />
        <path d="M4 12h3" />
        <path d="M4 15h3" />
        <path d="M4 18h3" />
        {/* Navalha ao lado */}
        <path d="M10 19l4-4" />
        <circle cx="14" cy="15" r="1" fill="currentColor" />
        <path d="M14 15l6-6-2-2-6 6" />
        <path d="M20 9l2-2-1-1-2 1" />
        <path d="M11 20l-1 2" />
      </svg>
    );
  }

  // 7. PENTE + NAVALHA (Barba Completa)
  if (
    key === "comb-razor" ||
    key === "comb-razor-completa" ||
    key === "barba_completa" ||
    key.includes("completa")
  ) {
    return (
      <svg {...props}>
        {/* Pente horizontal de barba */}
        <path d="M4 6h16" />
        <path d="M6 6v3" />
        <path d="M9 6v3" />
        <path d="M12 6v3" />
        <path d="M15 6v3" />
        <path d="M18 6v3" />
        {/* Navalha clássica posicionada abaixo */}
        <path d="M5 20l5-5" />
        <circle cx="10" cy="15" r="1" fill="currentColor" />
        <path d="M10 15l9-4-1-2-9 4" />
        <path d="M5 20l-2 1" />
      </svg>
    );
  }

  // 8. TESOURA + NAVALHA (Corte + Barba)
  if (
    key === "scissors-razor" ||
    key === "scissors-razor-combo" ||
    key === "corte_barba" ||
    key === "barba_corte" ||
    (key.includes("corte") && key.includes("barba"))
  ) {
    return (
      <svg {...props}>
        {/* Olhal e haste da tesoura */}
        <circle cx="5" cy="19" r="2.5" />
        <path d="M7 17.5L16 8" />
        {/* Lâmina da navalha cruzada */}
        <path d="M19 19l-4-4" />
        <circle cx="15" cy="15" r="1" fill="currentColor" />
        <path d="M15 15l-7-7 2-2 7 7" />
        <circle cx="11.5" cy="12.5" r="0.8" fill="currentColor" />
      </svg>
    );
  }

  // 9. TESOURA + SOBRANCELHA (Corte + Sobrancelha)
  if (
    key === "scissors-eyebrow" ||
    key === "scissors-eyebrow-combo" ||
    key === "corte_sobrancelha" ||
    (key.includes("corte") && key.includes("sobrancelha"))
  ) {
    return (
      <svg {...props}>
        {/* Arco da sobrancelha no topo */}
        <path d="M12 4c3-1.5 7-1.5 10 1" strokeWidth="2.4" />
        {/* Tesoura abaixo */}
        <circle cx="6" cy="19" r="2.5" />
        <circle cx="14" cy="19" r="2.5" />
        <path d="M8 17.5L17 9" />
        <path d="M12.5 17.5L10 14" />
        <path d="M13.5 11.5L15 9" />
        <circle cx="12" cy="13.5" r="0.8" fill="currentColor" />
      </svg>
    );
  }

  // 10. TRIO COMBO: CORTE + BARBA + SOBRANCELHA (Combo Trio)
  if (
    key === "combo-trio" ||
    key === "corte_barba_sobrancelha" ||
    (key.includes("barba") && key.includes("sobrancelha"))
  ) {
    return (
      <svg {...props}>
        {/* Sobrancelha no topo */}
        <path d="M12 4c3-1.5 7-1.5 10 1" strokeWidth="2.4" />
        {/* Tesoura à esquerda */}
        <circle cx="5" cy="19" r="2.2" />
        <path d="M7 17.5L13 11" />
        {/* Navalha à direita */}
        <path d="M19 19l-3-3" />
        <circle cx="16" cy="16" r="0.8" fill="currentColor" />
        <path d="M16 16l-4-4 1.5-1.5 4 4" />
      </svg>
    );
  }

  // 11. SOBRANCELHA (Sobrancelha simples)
  if (
    key === "eyebrow" ||
    key === "eyebrow-single" ||
    key === "sobrancelha"
  ) {
    return (
      <svg {...props}>
        {/* Arco de sobrancelha alinhada e desenhada */}
        <path d="M3 11c5-5 13-5 18 1" strokeWidth="2.8" />
        {/* Guia sutil de contorno/alinhamento de navalha */}
        <path d="M6 16c4-3 10-3 14 0" strokeDasharray="2 2" strokeWidth="1.5" />
        <circle cx="12" cy="7.5" r="0.8" fill="currentColor" />
      </svg>
    );
  }

  // 12. LAVAGEM (Lavagem / Shampoo / Frasco + Água)
  if (
    key === "wash" ||
    key === "wash-service" ||
    key === "lavagem" ||
    key.includes("lavagem") ||
    key.includes("shampoo")
  ) {
    return (
      <svg {...props}>
        {/* Frasco com bico dosador pump */}
        <rect x="5" y="9" width="8" height="12" rx="2" />
        <path d="M9 9V5h4" />
        <path d="M13 5h2" />
        {/* Gotas d'água de lavagem ao lado */}
        <path d="M17 12c1.5 2 2 3 2 4.5a2.5 2.5 0 0 1-5 0c0-1.5 1-2.5 3-4.5z" />
        <path d="M18 7c.7 1 1 1.5 1 2.2a1.2 1.2 0 0 1-2.4 0c0-.7.4-1.2 1.4-2.2z" strokeWidth="1.5" />
      </svg>
    );
  }

  // 13. HIDRATAÇÃO (Frasco de Produto Cosmético / Tratamento)
  if (
    key === "treatment" ||
    key === "treatment-service" ||
    key === "hidratacao" ||
    key.includes("hidratacao") ||
    key.includes("tratamento")
  ) {
    return (
      <svg {...props}>
        {/* Pote/frasco de tratamento cosmético com tampa */}
        <rect x="4" y="11" width="16" height="10" rx="3" />
        <rect x="6" y="7" width="12" height="4" rx="1.5" />
        <line x1="8" y1="16" x2="16" y2="16" strokeWidth="1.5" />
        {/* Pipeta/gota de sérum nutritivo */}
        <circle cx="12" cy="3.5" r="1.5" />
      </svg>
    );
  }

  // 14. PIGMENTAÇÃO (Frasco aplicador de tintura com bico)
  if (
    key === "pigment" ||
    key === "pigment-service" ||
    key === "pigmentacao" ||
    key.includes("pigmenta")
  ) {
    return (
      <svg {...props}>
        {/* Bisnaga / frasco aplicador de micropigmentação */}
        <path d="M6 19l4-9 4-4 4 4-4 4-9 4z" />
        <line x1="14" y1="6" x2="18" y2="10" />
        {/* Ponta aplicadora fina de precisão */}
        <path d="M4 21l2-2" strokeWidth="2.5" />
        <circle cx="19" cy="5" r="1" fill="currentColor" />
      </svg>
    );
  }

  // FALLBACK PADRÃO (Tesoura + Pente elegante)
  return (
    <svg {...props}>
      <path d="M4 6h16" />
      <path d="M5 6v3" />
      <path d="M8 6v3" />
      <path d="M11 6v3" />
      <path d="M14 6v3" />
      <path d="M17 6v3" />
      <path d="M19 6v3" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="14" cy="19" r="2.5" />
      <path d="M8 16.5L18 10" />
      <path d="M12.5 17L15 13.5" />
      <path d="M11.5 11.5L9.5 9" />
      <circle cx="12" cy="14" r="0.8" fill="currentColor" />
    </svg>
  );
}
