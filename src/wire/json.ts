/**
 * A strict JSON parser for SMART requests and responses: RFC 8259, and a
 * member name repeated in one object is an error (spec [JSON-1], [JSON-2]).
 * `JSON.parse` silently keeps the last duplicate, so it can't enforce this.
 */

export class JsonSyntaxError extends Error {}

export function parseJsonStrict(text: string): unknown {
  let i = 0;
  const fail = (message: string): never => {
    throw new JsonSyntaxError(`${message} at position ${i}`);
  };
  const ws = () => {
    while (i < text.length && (text[i] === " " || text[i] === "\t" || text[i] === "\n" || text[i] === "\r")) i++;
  };
  const value = (): unknown => {
    ws();
    const c = text[i];
    if (c === "{") return object();
    if (c === "[") return array();
    if (c === '"') return string();
    if (c === "t") return literal("true", true);
    if (c === "f") return literal("false", false);
    if (c === "n") return literal("null", null);
    if (c === "-" || (c !== undefined && c >= "0" && c <= "9")) return number();
    return fail("unexpected character");
  };
  const literal = (word: string, v: unknown) => {
    if (text.startsWith(word, i)) {
      i += word.length;
      return v;
    }
    return fail(`expected ${word}`);
  };
  const number = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i));
    if (!m) return fail("invalid number");
    i += m[0].length;
    return Number(m[0]);
  };
  const string = () => {
    // Let the built-in parser handle escapes once the extent is known.
    const start = i;
    i++;
    while (i < text.length && text[i] !== '"') {
      if (text[i] === "\\") i++;
      else if (text.charCodeAt(i) < 0x20) fail("control character in string");
      i++;
    }
    if (text[i] !== '"') fail("unterminated string");
    i++;
    return JSON.parse(text.slice(start, i)) as string;
  };
  const array = () => {
    i++;
    const out: unknown[] = [];
    ws();
    if (text[i] === "]") {
      i++;
      return out;
    }
    for (;;) {
      out.push(value());
      ws();
      if (text[i] === ",") {
        i++;
        continue;
      }
      if (text[i] === "]") {
        i++;
        return out;
      }
      fail("expected , or ]");
    }
  };
  const object = () => {
    i++;
    const out: Record<string, unknown> = {};
    const seen = new Set<string>();
    ws();
    if (text[i] === "}") {
      i++;
      return out;
    }
    for (;;) {
      ws();
      if (text[i] !== '"') fail("expected a member name");
      const key = string();
      if (seen.has(key)) throw new JsonSyntaxError(`duplicate member name ${JSON.stringify(key)}`);
      seen.add(key);
      ws();
      if (text[i] !== ":") fail("expected :");
      i++;
      Object.defineProperty(out, key, { value: value(), enumerable: true, writable: true, configurable: true });
      ws();
      if (text[i] === ",") {
        i++;
        continue;
      }
      if (text[i] === "}") {
        i++;
        return out;
      }
      fail("expected , or }");
    }
  };
  const result = value();
  ws();
  if (i !== text.length) fail("unexpected text after JSON value");
  return result;
}
