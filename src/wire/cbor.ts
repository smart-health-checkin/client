/**
 * Minimal CBOR encoder/decoder for the mdoc binding: definite lengths only,
 * canonical map-key ordering on encode, tags preserved as CborTag.
 * Ported from smart-health-checkin-mdoc rp-web/src/protocol/index.ts.
 */

import { base64UrlEncodeBytes, compareBytes, concatBytes, hex, utf8 } from "./bytes.ts";

export class CborTag {
  constructor(
    readonly tag: number,
    readonly value: unknown,
  ) {}
}

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export function cborEncode(value: unknown): Uint8Array {
  if (value === null) return new Uint8Array([0xf6]);
  if (value === false) return new Uint8Array([0xf4]);
  if (value === true) return new Uint8Array([0xf5]);
  if (typeof value === "number") {
    if (!Number.isInteger(value)) throw new Error("CBOR number must be an integer");
    if (value >= 0) return cborHead(0, value);
    return cborHead(1, -1 - value);
  }
  if (typeof value === "string") return concatBytes([cborHead(3, utf8(value).length), utf8(value)]);
  if (value instanceof Uint8Array) return concatBytes([cborHead(2, value.length), value]);
  if (value instanceof CborTag) {
    return concatBytes([cborHead(6, value.tag), cborEncode(value.value)]);
  }
  if (Array.isArray(value)) {
    return concatBytes([cborHead(4, value.length), ...value.map(cborEncode)]);
  }
  if (value instanceof Map) {
    return encodeMap([...value.entries()]);
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined,
    );
    return encodeMap(entries);
  }
  throw new Error(`unsupported CBOR value: ${String(value)}`);
}

function encodeMap(entries: ReadonlyArray<readonly [unknown, unknown]>): Uint8Array {
  const encoded = entries.map(([key, value]) => ({
    key: cborEncode(key),
    value: cborEncode(value),
  }));
  encoded.sort((a, b) => compareBytes(a.key, b.key));
  const parts: Uint8Array[] = [cborHead(5, encoded.length)];
  for (const entry of encoded) {
    parts.push(entry.key, entry.value);
  }
  return concatBytes(parts);
}

function cborHead(majorType: number, value: number): Uint8Array {
  const mt = majorType << 5;
  if (value < 24) return new Uint8Array([mt | value]);
  if (value <= 0xff) return new Uint8Array([mt | 24, value]);
  if (value <= 0xffff) return new Uint8Array([mt | 25, (value >> 8) & 0xff, value & 0xff]);
  if (value <= 0xffffffff) {
    return new Uint8Array([
      mt | 26,
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    ]);
  }
  throw new Error("CBOR value too large");
}

export function cborDecode(bytes: Uint8Array): unknown {
  const decoder = new CborDecoder(bytes);
  const value = decoder.read();
  decoder.assertDone();
  return value;
}

class CborDecoder {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  read(): unknown {
    const initial = this.readByte();
    const majorType = initial >> 5;
    const additional = initial & 0x1f;
    switch (majorType) {
      case 0:
        return this.readArgument(additional);
      case 1:
        return -1 - this.readArgument(additional);
      case 2: {
        const length = this.readArgument(additional);
        return this.readBytes(length);
      }
      case 3: {
        const length = this.readArgument(additional);
        return new TextDecoder().decode(this.readBytes(length));
      }
      case 4: {
        const length = this.readArgument(additional);
        const out: unknown[] = [];
        for (let i = 0; i < length; i++) out.push(this.read());
        return out;
      }
      case 5: {
        const length = this.readArgument(additional);
        const out = new Map<unknown, unknown>();
        for (let i = 0; i < length; i++) out.set(this.read(), this.read());
        return out;
      }
      case 6:
        return new CborTag(this.readArgument(additional), this.read());
      case 7:
        return this.readSimple(additional);
      default:
        throw new Error(`unsupported CBOR major type ${majorType}`);
    }
  }

  assertDone(): void {
    if (this.offset !== this.bytes.length) {
      throw new Error(
        `CBOR decoder stopped at ${this.offset}, ${this.bytes.length - this.offset} trailing bytes`,
      );
    }
  }

  private readSimple(additional: number): unknown {
    if (additional === 20) return false;
    if (additional === 21) return true;
    if (additional === 22) return null;
    if (additional === 23) return undefined;
    throw new Error(`unsupported CBOR simple/float additional info ${additional}`);
  }

  private readArgument(additional: number): number {
    if (additional < 24) return additional;
    if (additional === 24) return this.readByte();
    if (additional === 25) return this.readUint(2);
    if (additional === 26) return this.readUint(4);
    if (additional === 27) {
      const hi = this.readUint(4);
      const lo = this.readUint(4);
      const value = hi * 0x100000000 + lo;
      if (!Number.isSafeInteger(value)) throw new Error("CBOR integer exceeds Number safe range");
      return value;
    }
    if (additional === 31) throw new Error("indefinite-length CBOR is not supported");
    throw new Error(`invalid CBOR additional info ${additional}`);
  }

  private readUint(length: number): number {
    let out = 0;
    for (let i = 0; i < length; i++) out = out * 256 + this.readByte();
    return out;
  }

  private readBytes(length: number): Uint8Array {
    if (this.offset + length > this.bytes.length) {
      throw new Error(`CBOR byte string exceeds input at offset ${this.offset}`);
    }
    const out = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return out;
  }

  private readByte(): number {
    if (this.offset >= this.bytes.length) throw new Error("unexpected end of CBOR input");
    return this.bytes[this.offset++]!;
  }
}

/** CBOR diagnostic notation (subset), for debug UIs and fixtures. */
export function cborDiagnostic(value: unknown): string {
  if (value === null) return "null";
  if (value === false) return "false";
  if (value === true) return "true";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (value instanceof Uint8Array) return `h'${hex(value)}'`;
  if (value instanceof CborTag) {
    return `${value.tag}(${cborDiagnostic(value.value)})`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(cborDiagnostic).join(", ")}]`;
  }
  if (value instanceof Map) {
    return `{${[...value.entries()]
      .map(([k, v]) => `${cborDiagnostic(k)}: ${cborDiagnostic(v)}`)
      .join(", ")}}`;
  }
  throw new Error(`unsupported diagnostic CBOR value: ${String(value)}`);
}

/** Lossy JSON projection of decoded CBOR (bytes → {$bytes, hex}, tags → {$tag, value}). */
export function cborToJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return {
      $bytes: base64UrlEncodeBytes(value),
      hex: hex(value),
    };
  }
  if (value instanceof CborTag) {
    return {
      $tag: value.tag,
      value: cborToJsonValue(value.value),
    };
  }
  if (Array.isArray(value)) {
    return value.map(cborToJsonValue);
  }
  if (value instanceof Map) {
    if ([...value.keys()].every((k) => typeof k === "string" || typeof k === "number")) {
      const out: Record<string, JsonValue> = {};
      for (const [k, v] of value.entries()) out[String(k)] = cborToJsonValue(v);
      return out;
    }
    return {
      $map: [...value.entries()].map(([key, val]) => ({
        key: cborToJsonValue(key),
        value: cborToJsonValue(val),
      })),
    };
  }
  throw new Error(`unsupported JSON conversion value: ${String(value)}`);
}

export function mapGet(value: unknown, key: string | number): unknown {
  if (!(value instanceof Map)) return undefined;
  return value.get(key);
}
