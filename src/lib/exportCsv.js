/**
 * exportCsv.js
 * Utilitário profissional para exportação de dados em CSV compatível com Excel (.csv com separador ; e BOM UTF-8).
 */

export function downloadCsv({ filename, headers, rows }) {
  // \uFEFF é o Byte Order Mark (BOM) UTF-8 para o Excel abrir caracteres acentuados corretamente no Windows/Mac
  const BOM = "\uFEFF";
  
  // Função para sanitizar e escapar células
  const escapeCell = (cell) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell);
    // Se contiver ponto e vírgula, aspas, quebra de linha ou vírgula, encapsula entre aspas duplas
    if (/[;"\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const headerLine = headers.map((h) => escapeCell(h)).join(";");
  const dataLines = rows.map((row) => row.map((val) => escapeCell(val)).join(";"));
  
  const csvContent = BOM + [headerLine, ...dataLines].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formata número em decimal com vírgula para moeda brasileira no Excel
 */
export function formatBrlNumber(val) {
  const n = Number(val) || 0;
  return n.toFixed(2).replace(".", ",");
}
