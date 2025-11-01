/** Skip whitespace characters and return new position */
function skipWhitespace(text: string, start: number): number {
  let i = start;
  while (i < text.length && /\s/.test(text[i])) {
    i++;
  }
  return i;
}

/** Skip a type hint (simple or with balanced parentheses) and return new position */
function skipTypeHint(text: string, start: number): number {
  let i = start;

  if (i < text.length && text[i] === '(') {
    // Handle balanced parentheses
    let parenCount = 0;
    while (i < text.length) {
      if (text[i] === '(') parenCount++;
      if (text[i] === ')') parenCount--;
      i++;
      if (parenCount === 0) break;
    }
  } else {
    // Handle simple type hints (no parentheses)
    while (i < text.length && !/\s/.test(text[i])) {
      i++;
    }
  }

  return i;
}

function _removeTypeHints(text: string): string {
  let result = '';
  let i = 0;

  while (i < text.length) {
    if (text.substring(i, i + 3) === ':- ') {
      i = skipWhitespace(text, i + 3);
      i = skipTypeHint(text, i);
      i = skipWhitespace(text, i);

      // Add a single space for parameter separation if we're not at the end
      if (i < text.length && result.length > 0 && !result.endsWith(' ')) {
        result += ' ';
      }
    } else {
      result += text[i];
      i++;
    }
  }

  return result.replace(/\s+/g, ' ').trim();
}

/** Find the closing bracket for a given opening bracket position */
function findMatchingBracket(text: string, startIndex: number): number {
  let bracketCount = 0;
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === '[') bracketCount++;
    if (text[i] === ']') bracketCount--;
    if (bracketCount === 0) return i;
  }
  return -1;
}

/** Normalize whitespace in code */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\[\s*/, '[').replace(/\s*\]/, ']').trim();
}

/**
 * HACK: Clean every plumatic schema type-hint from code
 * ```clojure
 * (s/defn my-fn :- s/Int [x :- s/Str y :- DateTime] x) => (defn my-fn [x y] x)
 * ```
 */
export function cleanPlumaticSchemaHints(code: string): string {
  let result = code.replace(/\w+\/(defn|defmethod|defmulti)/, '$1');

  const paramStartIndex = result.indexOf('[');
  if (paramStartIndex === -1) {
    return normalizeWhitespace(result);
  }

  // Remove return type hint before parameter vector
  const beforeParams = result.substring(0, paramStartIndex);
  let cleanedBeforeParams = beforeParams;

  // Find and remove :- type hint
  const typeHintMatch = beforeParams.match(/:-\s+/);
  if (typeHintMatch && typeHintMatch.index !== undefined) {
    const typeHintStart = typeHintMatch.index;
    const typeStart = typeHintStart + typeHintMatch[0].length;
    const typeEnd = skipTypeHint(beforeParams, typeStart);
    cleanedBeforeParams =
      beforeParams.substring(0, typeHintStart) + beforeParams.substring(typeEnd);
  }

  result = cleanedBeforeParams.trimEnd() + ' ' + result.substring(paramStartIndex);

  // Extract and clean parameter vector
  const newParamStartIndex = result.indexOf('[');
  const paramEndIndex = findMatchingBracket(result, newParamStartIndex);
  const params = result.substring(newParamStartIndex + 1, paramEndIndex);
  const cleanedParams = _removeTypeHints(params);

  result =
    result.substring(0, newParamStartIndex) +
    `[${cleanedParams}]` +
    result.substring(paramEndIndex + 1);

  return normalizeWhitespace(result);
}
