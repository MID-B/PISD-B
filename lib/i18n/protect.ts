// Keep identifiers and explicitly supplied names unchanged in translated prose.
export function protectTranslation(text: string, protectedTerms: string[] = []) {
  const terms = [...new Set(protectedTerms.filter(term => term.trim().length > 1))].sort((a, b) => b.length - a.length);
  const escaped = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const identifiers = String.raw`\b[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}\b|https?:\/\/[^\s]+|\b(?:\d{1,3}\.){3}\d{1,3}\b|\b[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\b|\b[A-Z][A-Z0-9_-]*\/\d[^\s,;]*|\b(?:EMP|IT|CCR|CRM|HRMS|FNC|COM|HCC)[A-Z0-9-]*-\d+\b`;
  const pattern = new RegExp([...escaped, identifiers].join('|'), 'g');
  const values: string[] = [];
  const masked = text.replace(pattern, value => {
    const token = `ZXQKEEP${values.length}QXZ`;
    values.push(value);
    return token;
  });
  return { masked, values };
}

export function restoreTranslation(translated: string, values: string[]): string | null {
  let result = translated;
  for (let index = 0; index < values.length; index++) {
    const token = `ZXQKEEP${index}QXZ`;
    if (result.split(token).length !== 2) return null;
    result = result.replace(token, values[index]);
  }
  return /ZXQKEEP\d+QXZ/.test(result) ? null : result;
}
