const MAX_ABSTRACT_CHARS = 2000;

/**
 * Reconstruct plaintext from an OpenAlex abstract_inverted_index.
 * Never throws on malformed input; returns "" when reconstruction is impossible.
 */
export function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null | undefined,
  maxLength = MAX_ABSTRACT_CHARS,
): string {
  if (!invertedIndex || typeof invertedIndex !== "object") {
    return "";
  }

  try {
    const entries = Object.entries(invertedIndex);
    if (entries.length === 0) {
      return "";
    }

    let maxPos = -1;
    const positions: Array<{ word: string; pos: number }> = [];

    for (const [word, idxs] of entries) {
      if (typeof word !== "string" || word.length === 0) {
        continue;
      }
      if (!Array.isArray(idxs)) {
        continue;
      }
      for (const idx of idxs) {
        if (typeof idx !== "number" || !Number.isFinite(idx) || idx < 0) {
          continue;
        }
        const pos = Math.floor(idx);
        positions.push({ word, pos });
        if (pos > maxPos) {
          maxPos = pos;
        }
      }
    }

    if (positions.length === 0 || maxPos < 0) {
      return "";
    }

    // Guard against absurdly large sparse indexes
    if (maxPos > 50_000) {
      positions.sort((a, b) => a.pos - b.pos || a.word.localeCompare(b.word));
      const joined = positions.map((p) => p.word).join(" ");
      return truncate(joined, maxLength);
    }

    const slots: string[] = new Array(maxPos + 1).fill("");
    for (const { word, pos } of positions) {
      if (!slots[pos]) {
        slots[pos] = word;
      }
    }

    const text = slots.filter((w) => w.length > 0).join(" ");
    return truncate(text, maxLength);
  } catch {
    return "";
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  const body = text.slice(0, Math.max(0, max - 1)).trimEnd();
  return `${body}…`.slice(0, max);
}
