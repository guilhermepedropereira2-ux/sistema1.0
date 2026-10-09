import React, { useRef, useState } from "react";
import { Camera, Plus, Trash2, RefreshCw, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

// Fotos de alta resolução para demonstração instantânea do protótipo visual
const DEMO_AVATARS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80",
];

/**
 * ClientPhotoUpload - Componente de Foto de Perfil do Cliente KUPOLA 2.0
 * 
 * Atende com precisão absoluta aos requisitos visuais do Gabarito:
 * - Avatar circular premium (90–110px)
 * - Fundo escuro (#0A0E15 / #111722), borda dourada discreta (#D4AF37), brilho sutil
 * - Estado 1: Sem foto -> iniciais em dourado KUPOLA (ex: LF) + ícone de câmera/[+]
 * - Estado 2: Com foto -> prévia em 1:1 perfeitamente enquadrada (object-cover)
 * - Estado 3: Alterar foto -> opções discretas
 * - Estado 4: Remover foto -> retorno imediato às iniciais
 * - Microinterações elegantes no hover e ao clicar
 */
export default function ClientPhotoUpload({
  photo = "",
  name = "",
  onChange,
  onRemove,
  disabled = false,
}) {
  const fileInputRef = useRef(null);
  const [demoIndex, setDemoIndex] = useState(0);

  // Extrai as iniciais do nome ou utiliza "LF" (gabarito) se vazio
  const getInitials = (n) => {
    if (!n || !n.trim()) return "LF";
    const parts = n.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "LF";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);

  // Processa arquivo real quando o usuário seleciona pelo explorador ou câmera
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!acceptedTypes.includes(file.type.toLowerCase())) {
      toast.error("Formato inválido. Por favor, selecione uma foto em JPG, PNG ou WebP.");
      e.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("A imagem selecionada é muito pesada (limite de 8MB).");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const targetSize = Math.min(Math.max(img.width, img.height), 400);
          const canvas = document.createElement("canvas");
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext("2d");

          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          onChange?.(dataUrl);
          toast.success("Foto do cliente aplicada com sucesso!");
        } catch {
          onChange?.(event.target.result);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Alterna foto de demonstração para testar facilmente o protótipo visual
  const handleCycleDemoPhoto = (e) => {
    e?.stopPropagation();
    const nextIdx = (demoIndex + 1) % DEMO_AVATARS.length;
    setDemoIndex(nextIdx);
    onChange?.(DEMO_AVATARS[nextIdx]);
    toast.success("Foto de demonstração aplicada!");
  };

  const handleAvatarClick = () => {
    if (disabled) return;
    // Se ainda não tem foto, abre o seletor de arquivos (ou aplica a foto de demo com 1 clique se preferir)
    fileInputRef.current?.click();
  };

  const handleRemove = (e) => {
    e?.stopPropagation();
    onRemove?.();
    toast.success("Foto removida. O avatar exibirá as iniciais do cliente.");
  };

  return (
    <div className="flex flex-col items-center justify-center select-none">
      {/* Input nativo oculto para seleção de arquivos / câmera no mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Avatar circular grande (96px no mobile, 104px no desktop — exatamente 90-110px) */}
      <div className="relative group">
        <div
          onClick={handleAvatarClick}
          className={`relative w-[96px] h-[96px] sm:w-[104px] sm:h-[104px] rounded-full overflow-hidden transition-all duration-200 cursor-pointer flex items-center justify-center ${
            photo
              ? "border-2 border-[#D4AF37] ring-4 ring-[#D4AF37]/15 shadow-2xl hover:ring-[#D4AF37]/30"
              : "border-2 border-dashed border-[#D4AF37]/40 hover:border-[#D4AF37] bg-gradient-to-br from-[#111722] via-[#0E131C] to-[#0A0E15] shadow-xl hover:shadow-[#D4AF37]/10"
          }`}
          title={photo ? "Clique para alterar a foto" : "Clique para adicionar uma foto"}
        >
          {photo ? (
            // Foto real com corte 1:1 perfeito e object-cover
            <img
              src={photo}
              alt={name || "Cliente"}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            // Estado sem foto: Avatar neutro com iniciais em dourado KUPOLA
            <div className="flex flex-col items-center justify-center text-center p-2">
              <span className="text-3xl sm:text-[34px] font-black text-[#E5C365] tracking-wider drop-shadow-md transition-transform group-hover:scale-105">
                {initials}
              </span>
            </div>
          )}

          {/* Microinteração ao passar o mouse (camada escura sutil com texto) */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white text-center p-1 pointer-events-none">
            <Camera className="w-5 h-5 text-[#E5C365] mb-1 drop-shadow" />
            <span className="text-[10px] font-bold tracking-wide text-slate-100">
              {photo ? "Alterar foto" : "Escolher foto"}
            </span>
          </div>
        </div>

        {/* Botão de câmera sobreposto discretamente ao canto inferior direito */}
        <button
          type="button"
          onClick={handleAvatarClick}
          className={`absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer ${
            photo
              ? "bg-[#0A0E15] text-[#E5C365] border-2 border-[#D4AF37] ring-1 ring-black/40"
              : "bg-[#D4AF37] text-[#0A0D15] border-2 border-[#0A0E15] shadow-[#D4AF37]/20"
          }`}
          title={photo ? "Alterar foto" : "Adicionar foto"}
        >
          {photo ? (
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E5C365]" />
          ) : (
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0A0D15] stroke-[2.5]" />
          )}
        </button>
      </div>

      {/* Textos & Ações Abaixo do Avatar */}
      <div className="mt-2.5 text-center flex flex-col items-center">
        {photo ? (
          // Estado com foto
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="text-xs font-semibold text-[#E5C365] hover:text-[#f3d98b] hover:underline flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Alterar foto
            </button>
            <span className="text-slate-600 text-xs">•</span>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs font-semibold text-red-400 hover:text-red-300 hover:underline flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Remover
            </button>
          </div>
        ) : (
          // Estado sem foto
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="text-xs font-bold text-slate-200 hover:text-[#E5C365] transition-colors cursor-pointer"
            >
              Adicionar foto
            </button>
            <span className="text-[10px] text-slate-500 mt-0.5 font-medium">
              JPG, PNG ou WebP • Opcional
            </span>

            {/* Botão de escolha de foto real */}
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handleAvatarClick}
                className="text-[11px] font-medium text-slate-300 hover:text-[#E5C365] bg-white/5 hover:bg-[#D4AF37]/10 border border-white/10 hover:border-[#D4AF37]/35 px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#E5C365]" />
                Escolher arquivo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
