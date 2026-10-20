/**
 * Utilitas ekspor data CSV dengan sanitasi formula injection.
 * Mencegah eksekusi rumus berbahaya seperti =CMD(), +SUM(), @ atau -
 * ketika berkas spreadsheet dibuka di Microsoft Excel atau Google Sheets.
 */

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  // Netralkan karakter pemulai formula spreadsheet dengan kutip tunggal
  const unsafe = /^[=+@-]/.test(str.trimStart()) || (str.length > 0 && str.charCodeAt(0) < 32);
  const safeStr = unsafe ? "'" + str : str;
  // Escape kutip ganda internal dengan melipatgandakannya
  return `"${safeStr.replace(/"/g, '""')}"`;
}

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => unknown;
}

export function exportToCsv<T>(
  data: T[],
  columns: CsvColumn<T>[],
  filename: string
): void {
  const headers = columns.map((col) => sanitizeCsvCell(col.header)).join(",");
  const rows = data.map((row) =>
    columns.map((col) => sanitizeCsvCell(col.accessor(row))).join(",")
  );

  const csvContent = [headers, ...rows].join("\r\n");
  // Gunakan UTF-8 BOM (\uFEFF) agar aplikasi seperti Microsoft Excel mengenali karakter UTF-8 dengan tepat
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
