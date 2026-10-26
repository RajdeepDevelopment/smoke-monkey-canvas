/**
 * 🐒 Smoke Monkey Fuzzy Search Utility
 * Fast, typo-tolerant, multi-token fuzzy matching and ranking
 * across names, descriptions, categories, and tags.
 */

export interface FuzzyFields {
  primary?: string; // name, label, id, key
  secondary?: string; // category, role, subcategory
  tertiary?: string; // description, whenToUse, tags, duties, content
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function isSubsequence(needle: string, haystack: string): boolean {
  if (needle.length > haystack.length) return false;
  let nIdx = 0;
  for (let hIdx = 0; hIdx < haystack.length; hIdx++) {
    if (needle[nIdx] === haystack[hIdx]) nIdx++;
    if (nIdx === needle.length) return true;
  }
  return nIdx === needle.length;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Computes a fuzzy relevance score (> 0 if match, 0 if no match).
 */
export function fuzzyScore(query: string, fields: FuzzyFields): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;

  const primary = (fields.primary || '').trim().toLowerCase();
  const secondary = (fields.secondary || '').trim().toLowerCase();
  const tertiary = (fields.tertiary || '').trim().toLowerCase();
  const haystack = `${primary} ${secondary} ${tertiary}`.toLowerCase();

  // 1. Exact match on primary
  if (primary === q) return 1000;

  // 2. Slug match on primary
  const qSlug = q.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const pSlug = primary.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (pSlug === qSlug && qSlug.length > 0) return 900;

  // 3. Primary starts with query
  if (primary.startsWith(q)) return 700;

  // 4. Primary contains full query
  if (primary.includes(q)) return 500;

  // 5. Haystack contains full query
  if (haystack.includes(q)) return 350;

  // Tokenize query
  const qTokens = q.split(/[\s\-_,.]+/).filter(Boolean);
  if (qTokens.length === 0) return 0;

  const primaryWords = primary.split(/[\s\-_,.]+/).filter(Boolean);
  const secondaryWords = secondary.split(/[\s\-_,.]+/).filter(Boolean);
  const tertiaryWords = tertiary.split(/[\s\-_,.]+/).filter(Boolean);

  let totalScore = 0;
  let matchedTokens = 0;

  for (const token of qTokens) {
    let bestTokenScore = 0;

    // Check primary field
    if (primary.includes(token)) {
      bestTokenScore = Math.max(bestTokenScore, 150);
      try {
        if (new RegExp(`\\b${escapeRegex(token)}`, 'i').test(primary)) {
          bestTokenScore = Math.max(bestTokenScore, 200);
        }
      } catch {}
    } else if (isSubsequence(token, primary)) {
      bestTokenScore = Math.max(bestTokenScore, 90);
    } else {
      // Check typo match in primary words
      for (const w of primaryWords) {
        if (token.length >= 3 && (w.startsWith(token) || token.startsWith(w))) {
          bestTokenScore = Math.max(bestTokenScore, 100);
          break;
        }
        if (token.length >= 4 && Math.abs(w.length - token.length) <= 2) {
          const dist = levenshtein(token, w);
          if (dist <= (token.length > 6 ? 2 : 1)) {
            bestTokenScore = Math.max(bestTokenScore, 75);
            break;
          }
        }
      }
    }

    // Check secondary field
    if (secondary.includes(token)) {
      bestTokenScore = Math.max(bestTokenScore, 60);
      try {
        if (new RegExp(`\\b${escapeRegex(token)}`, 'i').test(secondary)) {
          bestTokenScore = Math.max(bestTokenScore, 80);
        }
      } catch {}
    } else {
      for (const w of secondaryWords) {
        if (token.length >= 4 && Math.abs(w.length - token.length) <= 1) {
          if (levenshtein(token, w) <= 1) {
            bestTokenScore = Math.max(bestTokenScore, 40);
            break;
          }
        }
      }
    }

    // Check tertiary field
    if (tertiary.includes(token)) {
      bestTokenScore = Math.max(bestTokenScore, 40);
      try {
        if (new RegExp(`\\b${escapeRegex(token)}`, 'i').test(tertiary)) {
          bestTokenScore = Math.max(bestTokenScore, 55);
        }
      } catch {}
    } else {
      for (const w of tertiaryWords) {
        if (token.length >= 4 && Math.abs(w.length - token.length) <= 1) {
          if (levenshtein(token, w) <= 1) {
            bestTokenScore = Math.max(bestTokenScore, 30);
            break;
          }
        }
      }
    }

    if (bestTokenScore > 0) {
      matchedTokens++;
      totalScore += bestTokenScore;
    }
  }

  // Threshold: at least half the tokens must match
  if (matchedTokens === 0 || matchedTokens < Math.ceil(qTokens.length / 2)) {
    return 0;
  }

  if (matchedTokens === qTokens.length) {
    totalScore += 150; // Bonus for full token match
  }

  return totalScore;
}

/**
 * Returns true if the fields match the query according to fuzzy search.
 */
export function fuzzyMatch(fields: string[] | FuzzyFields, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (Array.isArray(fields)) {
    return (
      fuzzyScore(query, {
        primary: fields[0] || '',
        secondary: fields[1] || '',
        tertiary: fields.slice(2).join(' '),
      }) > 0
    );
  }
  return fuzzyScore(query, fields) > 0;
}

/**
 * Filters and sorts items by fuzzy relevance score.
 */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getFields: (item: T) => FuzzyFields | string[],
): T[] {
  if (!query || !query.trim()) return items;

  const scored: Array<{ item: T; score: number }> = [];

  for (const item of items) {
    const raw = getFields(item);
    const fields: FuzzyFields = Array.isArray(raw)
      ? {
          primary: raw[0] || '',
          secondary: raw[1] || '',
          tertiary: raw.slice(2).join(' '),
        }
      : raw;

    const score = fuzzyScore(query, fields);
    if (score > 0) {
      scored.push({ item, score });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}
