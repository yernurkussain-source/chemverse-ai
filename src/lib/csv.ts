/**
 * Excel-ге ашылатын CSV: «;» бөлгіші (қазақ/орыс Excel-інде үтір — ондық белгі), UTF-8 BOM (қазақ әріптері бұзылмауы үшін).
 * Формула инъекциясы: = + - @ таңбасынан басталатын мәтін (мысалы оқушының аты) «'» белгісімен қорғалады.
 */
export function toCsv(rows: (string | number | null)[][]): string {
  const cell = (value: string | number | null) => {
    if (value === null) return "";
    if (typeof value === "number") return String(value);
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[;"\n\r]/.test(safe) || safe !== value ? `"${safe.replaceAll('"', '""')}"` : safe;
  };
  return "﻿" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
}
