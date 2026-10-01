import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

// Dropdown de Filtro de Barbeiro com suporte estrito a Toggle e Click-Outside
export default function BarberFilterDropdown({ barbers, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  const selectedBarber = barbers.find((b) => b.id === selected);
  const label =
    selected === "todos"
      ? "Todos os Barbeiros"
      : selectedBarber?.name || "Todos os Barbeiros";

  return (
    <div ref={containerRef} className="relative inline-block w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-9 w-full sm:w-[195px] items-center justify-between gap-2 whitespace-nowrap rounded-[4px] border px-3 py-1.5 text-xs font-semibold shadow-none transition-colors cursor-pointer focus:outline-none ${
          open
            ? "border-[#D4AF37]/80 bg-[#151928] text-white"
            : "border-white/10 bg-[#0A0D14] hover:bg-[#121522] text-slate-200"
        }`}
        data-testid="barber-filter-trigger"
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            open ? "rotate-180 text-[#D4AF37]" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 sm:left-auto z-50 mt-1 w-full sm:w-[220px] rounded-[4px] border border-white/10 bg-[#121522] py-1 text-slate-200 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-100"
          data-testid="barber-filter-menu"
        >
          <button
            type="button"
            onClick={() => {
              onChange("todos");
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
              selected === "todos"
                ? "bg-[#D4AF37]/15 text-[#D4AF37] font-semibold"
                : "hover:bg-white/5 text-slate-300 hover:text-white"
            }`}
          >
            <span>Todos os Barbeiros</span>
            {selected === "todos" && <Check className="h-3.5 w-3.5 text-[#D4AF37]" />}
          </button>
          {barbers.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                onChange(b.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                selected === b.id
                  ? "bg-[#D4AF37]/15 text-[#D4AF37] font-semibold"
                  : "hover:bg-white/5 text-slate-300 hover:text-white"
              }`}
            >
              <span className="truncate">{b.name}</span>
              {selected === b.id && <Check className="h-3.5 w-3.5 text-[#D4AF37]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
