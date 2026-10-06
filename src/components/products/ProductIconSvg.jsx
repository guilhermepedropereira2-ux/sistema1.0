import React from "react";

/**
 * ProductIconSvg.jsx
 * Renderizador de Ícones Vetoriais SVG Oficiais KUPOLA 2.0
 * Traços finos em dourado nobre (#E5C365 / #D4AF37), outline minimalista de alta precisão
 */

export default function ProductIconSvg({ iconId, className = "w-full h-full" }) {
  const stroke = "currentColor";
  const strokeWidth = "1.8";
  const linecap = "round";
  const linejoin = "round";

  const props = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke,
    strokeWidth,
    strokeLinecap: linecap,
    strokeLinejoin: linejoin,
    className,
  };

  switch (iconId) {
    // ==========================================
    // CABELO
    // ==========================================
    case "pomada":
      return (
        <svg {...props}>
          {/* Tampa rosqueável */}
          <rect x="11" y="14" width="26" height="6" rx="2" />
          {/* Corpo do pote */}
          <path d="M13 20 L35 20 C36.5 20 37.5 21 37.5 23 L36.5 33 C36.5 35.5 34.5 36.5 32.5 36.5 L15.5 36.5 C13.5 36.5 11.5 35.5 11.5 33 L10.5 23 C10.5 21 11.5 20 13 20 Z" />
          {/* Rótulo central */}
          <rect x="15" y="24" width="18" height="7" rx="1.5" />
          <line x1="18" y1="27.5" x2="30" y2="27.5" strokeWidth="1.2" />
        </svg>
      );

    case "cera":
      return (
        <svg {...props}>
          {/* Base do pote */}
          <rect x="12" y="21" width="24" height="15" rx="3" />
          {/* Espiral de cera cremosa saindo suavemente */}
          <path d="M15 21 C15 16 19 14 24 17.5 C26 13.5 33 16 33 21" />
          {/* Rótulo */}
          <rect x="16" y="26" width="16" height="5" rx="1.5" />
          <line x1="19" y1="28.5" x2="29" y2="28.5" strokeWidth="1.2" />
        </svg>
      );

    case "gel":
      return (
        <svg {...props}>
          {/* Borda superior selada */}
          <line x1="17" y1="12" x2="31" y2="12" strokeWidth="2" />
          {/* Corpo da bisnaga */}
          <path d="M18 12 L30 12 L27.5 34 L20.5 34 Z" />
          {/* Tampa flip top */}
          <rect x="21" y="34" width="6" height="4" rx="1" />
          {/* Ondulações de gel */}
          <path d="M21 21 C23 19 25 23 27 21" />
          <path d="M21 26 C23 24 25 28 27 26" />
        </svg>
      );

    case "shampoo":
      return (
        <svg {...props}>
          {/* Frasco */}
          <rect x="16" y="17" width="16" height="22" rx="3" />
          {/* Gargalo */}
          <rect x="22" y="13" width="4" height="4" />
          {/* Válvula pump */}
          <path d="M20 11 L28 11 L28 13 L22 13" />
          <path d="M20 11 L17 12.5" />
          {/* Gota de shampoo */}
          <path d="M24 24 C24 24 21.5 27 21.5 29 C21.5 30.4 22.6 31.5 24 31.5 C25.4 31.5 26.5 30.4 26.5 29 C26.5 27 24 24 24 24 Z" />
        </svg>
      );

    case "condicionador":
      return (
        <svg {...props}>
          {/* Frasco elegante */}
          <rect x="16" y="17" width="16" height="22" rx="4" />
          <rect x="22" y="13" width="4" height="4" />
          <path d="M20 11 L28 11" />
          <path d="M20 11 L17 12.5" />
          {/* Duas gotas nutritivas */}
          <path d="M24 23 C24 23 21 26.5 21 28.5 C21 30.2 22.3 31.5 24 31.5 C25.7 31.5 27 30.2 27 28.5 C27 26.5 24 23 24 23 Z" />
          <circle cx="24" cy="28.5" r="1" fill="currentColor" />
        </svg>
      );

    case "spray":
      return (
        <svg {...props}>
          {/* Frasco aerosol */}
          <rect x="17" y="17" width="14" height="22" rx="3" />
          <path d="M20 17 L21 13 L27 13 L28 17" />
          <rect x="22" y="10" width="4" height="3" rx="0.5" />
          <path d="M26 11.5 L28 11.5" />
          {/* Névoa de spray */}
          <circle cx="31.5" cy="8.5" r="0.8" fill="currentColor" />
          <circle cx="34.5" cy="11" r="0.8" fill="currentColor" />
          <circle cx="32" cy="13.5" r="0.8" fill="currentColor" />
        </svg>
      );

    case "creme_capilar":
      return (
        <svg {...props}>
          <line x1="16" y1="12" x2="32" y2="12" strokeWidth="2" />
          <path d="M17 12 L31 12 L28 35 L20 35 Z" />
          <rect x="21" y="35" width="6" height="4" rx="1" />
          <line x1="21" y1="21" x2="27" y2="21" />
          <line x1="22" y1="25" x2="26" y2="25" />
        </svg>
      );

    case "mascara_capilar":
      return (
        <svg {...props}>
          <rect x="12" y="16" width="24" height="5" rx="1.5" />
          <rect x="13" y="21" width="22" height="15" rx="2.5" />
          <rect x="16" y="25" width="16" height="6" rx="1" />
          <line x1="19" y1="28" x2="29" y2="28" strokeWidth="1.2" />
        </svg>
      );

    case "tonico_capilar":
      return (
        <svg {...props}>
          <rect x="21" y="11" width="6" height="5" rx="1" />
          <path d="M21 16 L17 19 C16 20 16 21 16 22 L16 36 C16 37.5 17.5 39 19 39 L29 39 C30.5 39 32 37.5 32 36 L32 22 C32 21 32 20 31 19 L27 16 Z" />
          {/* Folha botânica */}
          <path d="M24 23 C20 26 20 31 24 33 C28 31 28 26 24 23 Z" />
          <path d="M24 25 L24 33" strokeWidth="1.2" />
          <path d="M24 28 L26 27" strokeWidth="1.2" />
        </svg>
      );

    case "leave_in":
      return (
        <svg {...props}>
          <rect x="17" y="18" width="14" height="21" rx="3" />
          <path d="M21 18 L21 14 L27 14 L27 18" />
          <path d="M27 12 L22 12 L22 14" />
          <path d="M27 12 L30 14 L30 16" />
          <line x1="21" y1="28" x2="27" y2="28" />
        </svg>
      );

    // ==========================================
    // BARBA
    // ==========================================
    case "oleo_barba":
      return (
        <svg {...props}>
          {/* Conta-gotas */}
          <path d="M22 11 C22 9.5 26 9.5 26 11 L26 15 L22 15 Z" />
          <rect x="21" y="15" width="6" height="3" rx="0.5" />
          {/* Vidro do óleo */}
          <rect x="16" y="18" width="16" height="21" rx="3" />
          {/* Emblema de barba no rótulo */}
          <path d="M20 26 C20 30 24 33 24 33 C24 33 28 30 28 26 C26.5 26 25.5 27 24 27 C22.5 27 21.5 26 20 26 Z" />
        </svg>
      );

    case "balm_barba":
      return (
        <svg {...props}>
          <rect x="12" y="16" width="24" height="5" rx="1.5" />
          <rect x="13" y="21" width="22" height="14" rx="2" />
          {/* Emblema de barba */}
          <path d="M21 26 C21 29 24 31.5 24 31.5 C24 31.5 27 29 27 26 C26 26 25 27 24 27 C23 27 22 26 21 26 Z" />
        </svg>
      );

    case "shampoo_barba":
      return (
        <svg {...props}>
          <rect x="16" y="17" width="16" height="22" rx="3" />
          <rect x="22" y="13" width="4" height="4" />
          <path d="M20 11 L28 11" />
          <path d="M20 11 L17 12.5" />
          {/* Emblema de barba no rótulo */}
          <path d="M21 26 C21 29 24 31.5 24 31.5 C24 31.5 27 29 27 26 C26 26 25 27 24 27 C23 27 22 26 21 26 Z" />
        </svg>
      );

    case "condicionador_barba":
      return (
        <svg {...props}>
          <rect x="16" y="17" width="16" height="22" rx="4" />
          <rect x="22" y="13" width="4" height="4" />
          <path d="M20 11 L28 11" />
          <path d="M20 11 L17 12.5" />
          {/* Emblema de barba */}
          <path d="M21 26 C21 29 24 31.5 24 31.5 C24 31.5 27 29 27 26 C26 26 25 27 24 27 C23 27 22 26 21 26 Z" />
        </svg>
      );

    case "creme_barba":
      return (
        <svg {...props}>
          <line x1="16" y1="12" x2="32" y2="12" strokeWidth="2" />
          <path d="M17 12 L31 12 L28 35 L20 35 Z" />
          <rect x="21" y="35" width="6" height="4" rx="1" />
          <path d="M21 24 C21 27 24 29 24 29 C24 29 27 27 27 24 C26 24 25 25 24 25 C23 25 22 24 21 24 Z" />
        </svg>
      );

    case "pente_barba":
      return (
        <svg {...props}>
          {/* Pente de madeira compacto */}
          <path d="M13 18 L35 18 C36.5 18 37 19 37 20 L37 23 C37 24 36.5 25 35 25 L13 25 C11.5 25 11 24 11 23 L11 20 C11 19 11.5 18 13 18 Z" />
          {/* Dentes retos de madeira */}
          <line x1="14" y1="25" x2="14" y2="33" />
          <line x1="17" y1="25" x2="17" y2="33" />
          <line x1="20" y1="25" x2="20" y2="33" />
          <line x1="23" y1="25" x2="23" y2="33" />
          <line x1="26" y1="25" x2="26" y2="33" />
          <line x1="29" y1="25" x2="29" y2="33" />
          <line x1="32" y1="25" x2="32" y2="33" />
          <line x1="35" y1="25" x2="35" y2="33" />
        </svg>
      );

    case "escova_barba":
      return (
        <svg {...props}>
          {/* Base oval de madeira com cabo ergonômico */}
          <ellipse cx="24" cy="20" rx="14" ry="7" />
          {/* Cerdas densas para alinhar os fios */}
          <line x1="14" y1="20" x2="14" y2="28" strokeWidth="1.2" />
          <line x1="17" y1="23" x2="17" y2="31" strokeWidth="1.2" />
          <line x1="20" y1="25" x2="20" y2="33" strokeWidth="1.2" />
          <line x1="24" y1="26" x2="24" y2="34" strokeWidth="1.2" />
          <line x1="28" y1="25" x2="28" y2="33" strokeWidth="1.2" />
          <line x1="31" y1="23" x2="31" y2="31" strokeWidth="1.2" />
          <line x1="34" y1="20" x2="34" y2="28" strokeWidth="1.2" />
        </svg>
      );

    case "cera_bigode":
      return (
        <svg {...props}>
          {/* Latinha circular */}
          <rect x="12" y="16" width="24" height="6" rx="2" />
          <rect x="13" y="22" width="22" height="13" rx="2.5" />
          {/* Bigode clássico curvado */}
          <path d="M19 28 C21 26 23 29 24 28 C25 29 27 26 29 28 C28 30.5 25.5 30.5 24 29.5 C22.5 30.5 20 30.5 19 28 Z" />
        </svg>
      );

    case "hidratante_facial":
      return (
        <svg {...props}>
          <rect x="17" y="18" width="14" height="21" rx="3.5" />
          <rect x="22" y="14" width="4" height="4" />
          <path d="M20 12 L27 12" />
          <path d="M20 12 L17 13.5" />
          <circle cx="24" cy="28.5" r="3" />
        </svg>
      );

    case "esfoliante_facial":
      return (
        <svg {...props}>
          <line x1="16" y1="12" x2="32" y2="12" strokeWidth="2" />
          <path d="M17 12 L31 12 L28 35 L20 35 Z" />
          <rect x="21" y="35" width="6" height="4" rx="1" />
          {/* Partículas esfoliantes */}
          <circle cx="24" cy="22" r="1.5" />
          <circle cx="21" cy="26" r="1" />
          <circle cx="27" cy="26" r="1" />
        </svg>
      );

    // ==========================================
    // FERRAMENTAS E ACESSÓRIOS
    // ==========================================
    case "maquina_corte":
      return (
        <svg {...props}>
          {/* Lâmina superior */}
          <path d="M20 10 L28 10 L28 14 L20 14 Z" />
          <line x1="21.5" y1="10" x2="21.5" y2="12" strokeWidth="1.2" />
          <line x1="24" y1="10" x2="24" y2="12" strokeWidth="1.2" />
          <line x1="26.5" y1="10" x2="26.5" y2="12" strokeWidth="1.2" />
          {/* Corpo da máquina */}
          <path d="M18 14 L30 14 L28 36 C28 38 26.5 39 24 39 C21.5 39 20 38 20 36 Z" />
          {/* Alavanca de regulagem e chave liga/desliga */}
          <line x1="17" y1="20" x2="18" y2="20" strokeWidth="2" />
          <rect x="22" y="24" width="4" height="7" rx="1" />
        </svg>
      );

    case "tesoura":
      return (
        <svg {...props}>
          {/* Lâminas afiadas cruzadas */}
          <line x1="15" y1="13" x2="29" y2="27" />
          <line x1="33" y1="13" x2="19" y2="27" />
          <circle cx="24" cy="22" r="1.5" fill="currentColor" />
          {/* Anéis de empunhadura */}
          <circle cx="17" cy="33" r="4.5" />
          <circle cx="31" cy="33" r="4.5" />
        </svg>
      );

    case "navalha":
      return (
        <svg {...props}>
          {/* Lâmina aberta */}
          <path d="M14 13 L26 25 L24 27 L12 15 Z" />
          {/* Pino central */}
          <circle cx="25" cy="26" r="1.5" fill="currentColor" />
          {/* Cabo de madeira dobrado */}
          <path d="M25 26 L36 37 C37 38 38 37 37 36 L27 24" />
        </svg>
      );

    case "pente":
      return (
        <svg {...props}>
          {/* Dorso do pente */}
          <rect x="10" y="20" width="28" height="5" rx="1.5" />
          {/* Dentes */}
          <line x1="12" y1="25" x2="12" y2="34" />
          <line x1="15" y1="25" x2="15" y2="34" />
          <line x1="18" y1="25" x2="18" y2="34" />
          <line x1="21" y1="25" x2="21" y2="34" />
          <line x1="24" y1="25" x2="24" y2="34" />
          <line x1="27" y1="25" x2="27" y2="34" />
          <line x1="30" y1="25" x2="30" y2="34" />
          <line x1="33" y1="25" x2="33" y2="34" />
          <line x1="36" y1="25" x2="36" y2="34" />
        </svg>
      );

    case "escova":
      return (
        <svg {...props}>
          {/* Cabo da escova */}
          <path d="M22 28 L17 38 C16 40 18 41 19 40 L26 31" />
          {/* Cabeça da escova com cerdas */}
          <ellipse cx="27" cy="20" rx="9" ry="12" transform="rotate(-30 27 20)" />
          <circle cx="27" cy="18" r="0.8" fill="currentColor" />
          <circle cx="24" cy="22" r="0.8" fill="currentColor" />
          <circle cx="29" cy="23" r="0.8" fill="currentColor" />
        </svg>
      );

    case "pincel_barba":
      return (
        <svg {...props}>
          {/* Cerdas volumosas */}
          <path d="M19 14 C16 20 18 25 21 26 L27 26 C30 25 32 20 29 14 C27 12 21 12 19 14 Z" />
          {/* Anel e cabo de madeira maciça */}
          <rect x="20" y="26" width="8" height="4" rx="1" />
          <path d="M21 30 L19 37 C19 38.5 21 39.5 24 39.5 C27 39.5 29 38.5 29 37 L27 30 Z" />
        </svg>
      );

    case "borrifador":
      return (
        <svg {...props}>
          {/* Bico e gatilho */}
          <rect x="22" y="14" width="4" height="4" />
          <path d="M21 11 L29 11 L29 14 L21 14 Z" />
          <path d="M19 14 L17 17 L19 18" />
          {/* Garrafa */}
          <path d="M21 18 L17 22 C16 23 16 24 16 25 L16 36 C16 38 17.5 39 19 39 L29 39 C30.5 39 32 38 32 36 L32 25 C32 24 32 23 31 22 L27 18 Z" />
        </svg>
      );

    case "toalha":
      return (
        <svg {...props}>
          {/* Toalha dobrada em camadas */}
          <path d="M13 18 L33 18 C35 18 36.5 19.5 36.5 21.5 C36.5 23.5 35 25 33 25 L14 25" />
          <path d="M14 25 C12 25 10.5 26.5 10.5 28.5 C10.5 30.5 12 32 14 32 L34 32" />
          <line x1="14" y1="18" x2="14" y2="25" />
          <line x1="34" y1="25" x2="34" y2="32" />
        </svg>
      );

    case "capa_corte":
      return (
        <svg {...props}>
          {/* Gola elástica com fecho */}
          <ellipse cx="24" cy="15" rx="5" ry="2.5" />
          {/* Drapeado da capa cobrindo os ombros */}
          <path d="M19 16 L12 35 C12 37 14 38 17 37 L24 35 L31 37 C34 38 36 37 36 35 L29 16" />
        </svg>
      );

    case "pente_maquina":
      return (
        <svg {...props}>
          {/* Base do pente de máquina com trava */}
          <rect x="13" y="27" width="22" height="8" rx="2" />
          {/* Guias verticais de altura */}
          <line x1="15" y1="13" x2="15" y2="27" />
          <line x1="19.5" y1="13" x2="19.5" y2="27" />
          <line x1="24" y1="13" x2="24" y2="27" />
          <line x1="28.5" y1="13" x2="28.5" y2="27" />
          <line x1="33" y1="13" x2="33" y2="27" />
        </svg>
      );

    // ==========================================
    // HIGIENE E CUIDADOS
    // ==========================================
    case "sabonete":
      return (
        <svg {...props}>
          <rect x="13" y="20" width="22" height="14" rx="7" />
          <ellipse cx="24" cy="27" rx="7" ry="3" strokeWidth="1.2" />
          {/* Bolhas */}
          <circle cx="16" cy="15" r="1.5" />
          <circle cx="21" cy="13" r="2" />
          <circle cx="31" cy="15" r="1.5" />
        </svg>
      );

    case "desodorante":
      return (
        <svg {...props}>
          {/* Tampa arredondada */}
          <path d="M18 20 C18 14 30 14 30 20 Z" />
          {/* Corpo do frasco roll-on */}
          <rect x="17" y="20" width="14" height="19" rx="3" />
        </svg>
      );

    case "perfume":
      return (
        <svg {...props}>
          {/* Borrifador nobre */}
          <rect x="22" y="12" width="4" height="4" rx="1" />
          <path d="M21 16 L27 16" />
          {/* Frasco de cristal clássico */}
          <rect x="14" y="16" width="20" height="22" rx="3.5" />
          <rect x="18" y="21" width="12" height="12" rx="1" strokeWidth="1.2" />
        </svg>
      );

    case "hidratante":
      return (
        <svg {...props}>
          <rect x="16" y="18" width="16" height="21" rx="4" />
          <rect x="22" y="14" width="4" height="4" />
          <path d="M20 12 L28 12" />
          <path d="M20 12 L17 13.5" />
          {/* Gota de loção */}
          <path d="M24 24 C24 24 22 26.5 22 28 C22 29.1 22.9 30 24 30 C25.1 30 26 29.1 26 28 C26 26.5 24 24 24 24 Z" />
        </svg>
      );

    case "protetor_solar":
      return (
        <svg {...props}>
          <line x1="16" y1="12" x2="32" y2="12" strokeWidth="2" />
          <path d="M17 12 L31 12 L28 35 L20 35 Z" />
          <rect x="21" y="35" width="6" height="4" rx="1" />
          {/* Sol radiante */}
          <circle cx="24" cy="24" r="2.5" />
          <line x1="24" y1="19.5" x2="24" y2="20.5" strokeWidth="1.2" />
          <line x1="24" y1="27.5" x2="24" y2="28.5" strokeWidth="1.2" />
          <line x1="19.5" y1="24" x2="20.5" y2="24" strokeWidth="1.2" />
          <line x1="27.5" y1="24" x2="28.5" y2="24" strokeWidth="1.2" />
        </svg>
      );

    case "alcool_gel":
      return (
        <svg {...props}>
          <rect x="16" y="18" width="16" height="21" rx="3.5" />
          <rect x="22" y="14" width="4" height="4" />
          <path d="M20 12 L28 12" />
          <path d="M20 12 L17 13.5" />
          {/* Cruz antisséptica hospitalar */}
          <path d="M22 28.5 H26 M24 26.5 V30.5" strokeWidth="2" />
        </svg>
      );

    case "lencos_umedecidos":
      return (
        <svg {...props}>
          <rect x="12" y="18" width="24" height="16" rx="3" />
          {/* Tampa central aberta puxando lenço */}
          <ellipse cx="24" cy="26" rx="6" ry="3" />
          <path d="M21 25 C21 20 26 21 25 16 C28 20 25 24 25 25" />
        </svg>
      );

    case "talco":
      return (
        <svg {...props}>
          {/* Frasco de talco para barbearia */}
          <rect x="17" y="17" width="14" height="23" rx="3" />
          <path d="M20 17 L21 13 L27 13 L28 17" />
          {/* Furinhos do dosador */}
          <circle cx="24" cy="26" r="1" fill="currentColor" />
          <circle cx="21" cy="29" r="0.8" fill="currentColor" />
          <circle cx="27" cy="29" r="0.8" fill="currentColor" />
          <circle cx="24" cy="32" r="1" fill="currentColor" />
        </svg>
      );

    case "pos_barba":
      return (
        <svg {...props}>
          <rect x="21" y="12" width="6" height="4" rx="1" />
          <path d="M21 16 L17 19 L17 37 C17 38.5 18.5 39.5 20 39.5 L28 39.5 C29.5 39.5 31 38.5 31 37 L31 19 L27 16 Z" />
          <rect x="20" y="24" width="8" height="9" rx="1" strokeWidth="1.2" />
        </svg>
      );

    case "agua_micelar":
      return (
        <svg {...props}>
          <rect x="21" y="12" width="6" height="5" rx="1" />
          <path d="M21 17 L17 20 C16 21 16 22 16 23 L16 36 C16 38 17.5 39 19 39 L29 39 C30.5 39 32 38 32 36 L32 23 C32 22 32 21 31 20 L27 17 Z" />
          <circle cx="24" cy="29" r="3" />
        </svg>
      );

    // ==========================================
    // DIVERSOS
    // ==========================================
    case "kit":
      return (
        <svg {...props}>
          {/* Caixa de presente com laço elegante */}
          <rect x="13" y="20" width="22" height="18" rx="2" />
          <rect x="11" y="17" width="26" height="5" rx="1.5" />
          <line x1="24" y1="17" x2="24" y2="38" />
          {/* Laço */}
          <path d="M24 17 C21 13 17 14 19 16 C21 18 24 17 24 17 Z" />
          <path d="M24 17 C27 13 31 14 29 16 C27 18 24 17 24 17 Z" />
        </svg>
      );

    case "caixa_embalagem":
      return (
        <svg {...props}>
          {/* Caixa de papelão com abas */}
          <path d="M14 18 L24 13 L34 18 L24 23 Z" />
          <path d="M14 18 L14 31 L24 36 L24 23" />
          <path d="M34 18 L34 31 L24 36" />
          <path d="M19 15.5 L29 20.5" strokeWidth="1.2" />
        </svg>
      );

    case "acessorio":
      return (
        <svg {...props}>
          {/* Gravata borboleta */}
          <path d="M22 24 L14 18 C13 17 12 18 12 20 L12 28 C12 30 13 31 14 30 L22 24 Z" />
          <path d="M26 24 L34 18 C35 17 36 18 36 20 L36 28 C36 30 35 31 34 30 L26 24 Z" />
          <circle cx="24" cy="24" r="2.5" />
        </svg>
      );

    case "algodao":
      return (
        <svg {...props}>
          {/* Nuvem de algodão macio */}
          <path d="M18 32 C15 32 13 29.5 13 27 C13 24.5 15 22.5 17.5 22.5 C18 18 22 15 26 16 C29 17 31 19 31.5 21 C34 21 36 23 36 26 C36 29 33.5 32 30 32 Z" />
        </svg>
      );

    case "hastes_flexiveis":
      return (
        <svg {...props}>
          {/* Hastes flexíveis / cotonetes cruzados */}
          <line x1="14" y1="14" x2="34" y2="34" />
          <line x1="34" y1="14" x2="14" y2="34" />
          <circle cx="14" cy="14" r="2" fill="currentColor" />
          <circle cx="34" cy="34" r="2" fill="currentColor" />
          <circle cx="34" cy="14" r="2" fill="currentColor" />
          <circle cx="14" cy="34" r="2" fill="currentColor" />
        </svg>
      );

    case "escova_limpeza":
      return (
        <svg {...props}>
          {/* Cabo para limpeza de fade */}
          <path d="M20 28 L17 38 C16.5 39.5 18 40.5 19.5 40 L26 31" />
          <rect x="22" y="16" width="16" height="6" rx="1.5" transform="rotate(-35 22 16)" />
          {/* Cerdas densas retas */}
          <line x1="28" y1="13" x2="35" y2="18" strokeWidth="2" />
        </svg>
      );

    case "cadeado":
      return (
        <svg {...props}>
          <rect x="15" y="21" width="18" height="15" rx="3" />
          <path d="M19 21 V16 C19 13.2 21.2 11 24 11 C26.8 11 29 13.2 29 16 V21" />
          <circle cx="24" cy="27.5" r="1.5" fill="currentColor" />
          <line x1="24" y1="29" x2="24" y2="31.5" strokeWidth="1.5" />
        </svg>
      );

    case "suporte":
      return (
        <svg {...props}>
          {/* Base e haste vertical */}
          <ellipse cx="24" cy="36" rx="13" ry="3.5" />
          <line x1="24" y1="16" x2="24" y2="36" strokeWidth="2.5" />
          <path d="M19 16 C19 13 29 13 29 16" strokeWidth="2" />
        </svg>
      );

    case "sacola":
      return (
        <svg {...props}>
          <rect x="14" y="19" width="20" height="18" rx="3" />
          <path d="M19 19 V15 C19 12.5 21.2 11 24 11 C26.8 11 29 12.5 29 15 V19" />
        </svg>
      );

    case "outros":
      return (
        <svg {...props}>
          <circle cx="16" cy="24" r="2" fill="currentColor" />
          <circle cx="24" cy="24" r="2" fill="currentColor" />
          <circle cx="32" cy="24" r="2" fill="currentColor" />
        </svg>
      );

    case "produto":
    default:
      return (
        <svg {...props}>
          {/* Produto padrão elegante KUPOLA */}
          <rect x="14" y="16" width="20" height="22" rx="3.5" />
          <rect x="20" y="11" width="8" height="5" rx="1" />
          {/* Estrela de qualidade no rótulo */}
          <path d="M24 22 L25.2 25 L28.5 25.2 L26 27.2 L26.8 30.5 L24 28.7 L21.2 30.5 L22 27.2 L19.5 25.2 L22.8 25 Z" strokeWidth="1.2" />
        </svg>
      );
  }
}
