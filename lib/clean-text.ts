/**
 * Post-extraction text cleanup for PDF/DOCX resume content.
 *
 * Root cause of corruption (confirmed by probe): PDFs can encode text in three
 * ways that all produce character-spaced output from pdfjs:
 *   A) Explicit space Tj calls between every glyph  → "O w n C I / C D"
 *   B) TJ arrays with large negative kerning offsets → "O w n C I / C D"
 *   C) Tc (character spacing) set to a large value   → "O", " ", "w", " ", "n" items
 *
 * In every case, pdfjs faithfully reproduces the spacing — it is in the PDF.
 * The fix is heuristic post-processing: detect runs of 4+ consecutive single-character
 * tokens separated by spaces, and collapse them. A run of ≥4 consecutive single chars
 * essentially never appears in normal English text but always appears in corrupted text.
 */

// ---------------------------------------------------------------------------
// Character-spacing fix
// ---------------------------------------------------------------------------

/**
 * Fix a single line: collapse runs of ≥4 consecutive single-character space-separated
 * tokens into one contiguous string. Each token must be a single printable character
 * (letter, digit, or common punctuation) — pure-whitespace tokens are skipped.
 *
 * Threshold of 4:
 *   • Avoids false positives on common 1-char English words ("a", "I") that appear
 *     next to longer words (run stops at the first multi-char token).
 *   • Catches the real corruption: "O w n C I / C D p i p e l i n e" → 16 single-char
 *     tokens in a row, all collapsed correctly.
 */
function fixLineCharacterSpacing(line: string): string {
  // Skip lines that clearly don't need fixing (fast path).
  if (line.length < 7) return line;

  const tokens = line.split(" ");
  if (tokens.length < 4) return line;

  const result: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    // Is this token a single printable non-space character?
    if (tok.length === 1 && tok.trim().length === 1) {
      // Count the run of consecutive single-char tokens.
      let j = i + 1;
      while (j < tokens.length && tokens[j].length === 1 && tokens[j].trim().length === 1) {
        j++;
      }
      const runLength = j - i;

      if (runLength >= 4) {
        // Collapse: join all tokens in this run without separators.
        result.push(tokens.slice(i, j).join(""));
        i = j;
        continue;
      }
    }

    result.push(tok);
    i++;
  }

  return result.join(" ");
}

// ---------------------------------------------------------------------------
// Unicode normalisation
// ---------------------------------------------------------------------------

function normalizeUnicode(text: string): string {
  return (
    text
      // Smart / curly quotes → ASCII
      .replace(/[\u2018\u2019\u02BC\u0060]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      // Dashes: figure dash, en-dash → hyphen; keep em-dash
      .replace(/[\u2012\u2013]/g, "-")
      // Ellipsis
      .replace(/\u2026/g, "...")
      // Bullet variants → standard bullet
      .replace(/[\u2022\u25CF\u25E6\u2023\u204C\u204D\u2219]/g, "•")
      // Arrows → ASCII arrow (OpenAI handles these well)
      .replace(/[\u2192\u21D2\u27A1\u279C\u27F6\u2794\u2B95]/g, "->")
      .replace(/[\u2190\u21D0]/g, "<-")
      // Non-breaking and zero-width spaces
      .replace(/[\u00A0\u202F\u2009\u200A\u3000]/g, " ")
      .replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, "")
      // Ligatures: fi, fl, ff, ffi, ffl (common in PDF font substitution)
      .replace(/\uFB00/g, "ff")
      .replace(/\uFB01/g, "fi")
      .replace(/\uFB02/g, "fl")
      .replace(/\uFB03/g, "ffi")
      .replace(/\uFB04/g, "ffl")
      // Control characters (except \n, \t)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
  );
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export interface CleanTextResult {
  raw: string;
  cleaned: string;
  wasCorrupted: boolean;
  charSpacingFixed: boolean;
}

/**
 * Clean extracted PDF/DOCX text before sending to OpenAI.
 *
 * Steps:
 *   1. Normalise line endings.
 *   2. Unicode normalisation (smart quotes, ligatures, arrows, etc.).
 *   3. Per-line character-spacing fix (main corruption repair).
 *   4. Collapse excess horizontal whitespace (preserves newlines).
 *   5. Collapse excess blank lines (keeps section separation).
 *   6. Final trim.
 */
export function cleanExtractedText(raw: string): CleanTextResult {
  let text = raw;

  // Step 1 – normalise line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Step 2 – unicode
  text = normalizeUnicode(text);

  // Step 3 – per-line character spacing fix
  const beforeSpacingFix = text;
  text = text
    .split("\n")
    .map(fixLineCharacterSpacing)
    .join("\n");
  const charSpacingFixed = text !== beforeSpacingFix;

  // Step 4 – collapse multiple spaces on the same line (not newlines)
  text = text.replace(/[^\S\n]{2,}/g, " ");

  // Step 5 – collapse 3+ blank lines → 2 (preserves section separation)
  text = text.replace(/\n{3,}/g, "\n\n");

  // Step 6 – trim
  text = text.trim();

  const wasCorrupted = charSpacingFixed;

  return { raw, cleaned: text, wasCorrupted, charSpacingFixed };
}

/**
 * Convenience wrapper — returns only the cleaned string.
 * Use when you don't need the diagnostics.
 */
export function cleanText(raw: string): string {
  return cleanExtractedText(raw).cleaned;
}

/**
 * Quick heuristic: does this text look character-spaced?
 * Useful for logging / debug panels.
 */
export function looksCharacterSpaced(text: string): boolean {
  // Take the first 500 chars, split into space-separated tokens,
  // check if >40% of them are single characters.
  const sample = text.slice(0, 500);
  const tokens = sample.split(/\s+/).filter(Boolean);
  if (tokens.length < 10) return false;
  const singleCount = tokens.filter((t) => t.length === 1).length;
  return singleCount / tokens.length > 0.4;
}
