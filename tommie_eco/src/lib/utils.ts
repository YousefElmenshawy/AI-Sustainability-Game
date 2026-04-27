// Normalize text for fuzzy matching (lowercase + remove non-alphanumeric)
export function normalized(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Parse CSV data from string
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split("\n");
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

// Load text file as array of lines
export function parseTextFile(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// Try to parse float safely
export function safeParseFloat(value: string): number | null {
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}
