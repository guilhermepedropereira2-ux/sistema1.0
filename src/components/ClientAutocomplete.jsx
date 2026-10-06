import { useState, useRef, useEffect, useMemo } from "react";
import { User, Phone, Check, Search } from "lucide-react";
import ClientAvatar from "@/components/ClientAvatar";

/**
 * ClientAutocomplete
 * Input com sugestão inteligente/autocomplete de clientes.
 * 
 * Props:
 * - value: string (nome digitado no input)
 * - onChange: (name: string, client?: any) => void
 * - onSelectClient: (client: any) => void
 * - clients: Array de clientes ({ id, name, phone, ... })
 * - placeholder?: string
 * - autoFocus?: boolean
 * - required?: boolean
 * - className?: string
 * - inputClassName?: string
 * - testId?: string
 */
export default function ClientAutocomplete({
  value = "",
  onChange,
  onSelectClient,
  clients = [],
  placeholder = "Ex: Guilherme Pedro (ou digite um novo)",
  autoFocus = false,
  required = false,
  className = "",
  inputClassName = "",
  testId = "client-autocomplete-input",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filtra clientes pelo termo digitado (mínimo 1 caractere)
  const suggestions = useMemo(() => {
    const query = (value || "").trim().toLowerCase();
    if (!query) return [];
    return (clients || []).filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(query);
      const phoneDigits = (c.phone || "").replace(/\D/g, "");
      const queryDigits = query.replace(/\D/g, "");
      const phoneMatch = queryDigits.length >= 2 && phoneDigits.includes(queryDigits);
      return nameMatch || phoneMatch;
    }).slice(0, 7); // Limita a 7 sugestões para manter visual limpo
  }, [value, clients]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Seleciona um cliente sugerido
  const handleSelect = (client) => {
    if (!client) return;
    onChange?.(client.name, client);
    onSelectClient?.(client);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Teclado: Navegação com setas cima/baixo, Enter para escolher, Esc para fechar
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            onChange?.(val, null);
            setIsOpen(val.trim().length > 0);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (value && value.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          required={required}
          data-testid={testId}
          autoComplete="off"
          className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#0A0D14] border border-white/15 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-white placeholder:text-slate-500 rounded-[4px] outline-none transition-all ${inputClassName}`}
        />
      </div>

      {/* Dropdown flutuante de sugestões */}
      {isOpen && suggestions.length > 0 && (
        <div
          data-testid="client-autocomplete-dropdown"
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-[#0F121C] border border-[#D4AF37]/50 rounded-[4px] shadow-2xl shadow-black/80 divide-y divide-white/5 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="p-1.5 bg-[#080A10] border-b border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-semibold px-2.5">
            <span className="flex items-center gap-1 text-[#D4AF37]">
              <User className="h-3 w-3" /> Clientes Encontrados
            </span>
            <span>{suggestions.length} sugestõ{suggestions.length > 1 ? "es" : "e"}</span>
          </div>

          <ul className="py-1">
            {suggestions.map((client, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <li
                  key={client.id || idx}
                  onMouseDown={(e) => {
                    // Impede o blur do input antes de selecionar
                    e.preventDefault();
                    handleSelect(client);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isHighlighted
                      ? "bg-[#D4AF37]/20 text-[#D4AF37] font-semibold"
                      : "text-slate-200 hover:bg-white/5"
                  }`}
                  data-testid={`client-option-${client.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ClientAvatar
                      name={client.name}
                      photo={client.photo || client.avatar}
                      size="xs"
                    />
                    <div className="truncate">
                      <p className="truncate text-xs font-medium text-white">
                        {client.name}
                      </p>
                      {client.has_plan && client.plan && (() => {
                        const isUnl = Boolean(client.plan.is_unlimited);
                        const tot = Number(client.plan.totalServices ?? client.plan.total ?? 4);
                        const usd = Number(client.plan.used ?? 0);
                        const rem = isUnl ? "Ilimitado" : (client.plan.remaining != null && !isNaN(Number(client.plan.remaining)) ? Number(client.plan.remaining) : Math.max(0, tot - usd));
                        return (
                          <span className="text-[10px] text-[#D4AF37] block font-medium">
                            {isUnl
                              ? "Assinatura Ativa · Cortes Ilimitados"
                              : `Plano Ativo (Restam ${rem} de ${tot} cortes)`}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {client.phone && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0 ml-2">
                      <Phone className="h-3 w-3 text-slate-500" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="p-1.5 bg-[#080A10]/90 text-[10px] text-slate-400 text-center border-t border-white/5">
            Use <kbd className="px-1 py-0.5 rounded bg-white/10 text-[9px] text-slate-300">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-white/10 text-[9px] text-slate-300">↓</kbd> para navegar e <kbd className="px-1 py-0.5 rounded bg-white/10 text-[9px] text-slate-300">Enter</kbd> para selecionar
          </div>
        </div>
      )}
    </div>
  );
}
