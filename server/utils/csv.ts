export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  const escape = (value: string | number | boolean | null | undefined) => {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  return rows.map(row => row.map(escape).join(',')).join('\n');
}

export function fromCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    currentRow.push(currentField);
    currentField = '';
  };

  const pushRow = () => {
    if (currentRow.length > 0 || currentField.length > 0) {
      pushField();
      rows.push(currentRow);
    }
    currentRow = [];
    currentField = '';
  };

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      pushField();
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i += 1;
      }
      pushRow();
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    pushField();
    rows.push(currentRow);
  }

  return rows.filter(row => row.length > 0);
}

