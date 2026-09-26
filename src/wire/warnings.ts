/**
 * Receiver warnings (spec §2, [RCV-1]). A receiver continues past a warning
 * and reports it; it fails only where spec §8 marks a step as a failure.
 * The codes are the ones the spec's conformance cases use.
 */
export type CheckinWarningCode =
  | "protocol"
  | "base64url-padding"
  | "cbor-duplicate-key"
  | "dcapi-response"
  | "device-response-version"
  | "device-response-status"
  | "documents"
  | "issuer-signature"
  | "alg"
  | "mso-fields"
  | "mso-doc-type"
  | "mso-validity-info"
  | "mso-validity"
  | "digest-algorithm"
  | "digest"
  | "device-signature"
  | "device-request-version"
  | "doc-requests"
  | "items-request"
  | "intent-to-retain"
  | "encryption-info"
  | "reader-auth";

export type CheckinWarning = {
  code: CheckinWarningCode;
  message: string;
  /** The spec requirement behind the check, such as "VRS-7". */
  rule: string;
};

/** Collects warnings, keeping the first of each code and message. */
export class WarningList {
  readonly items: CheckinWarning[] = [];
  add(code: CheckinWarningCode, rule: string, message: string): void {
    if (!this.items.some((w) => w.code === code && w.message === message)) this.items.push({ code, message, rule });
  }
  /** A CBOR decode option that reports repeated map keys ([ENC-5]). */
  get duplicateKeys(): { onDuplicateKey: (key: unknown) => void } {
    return { onDuplicateKey: (key) => this.add("cbor-duplicate-key", "ENC-5", `a CBOR map repeats the key ${JSON.stringify(String(key))}`) };
  }
}

/**
 * Decode base64url, tolerating padding and the standard alphabet with a
 * warning ([WRQ-2], [VRS-2]). Throws on anything else.
 */
export function decodeBase64UrlLenient(value: string, warnings: WarningList, rule: string, what: string): Uint8Array {
  if (/[=+/]/.test(value)) warnings.add("base64url-padding", rule, `${what} is not unpadded base64url`);
  const normalized = value.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (!/^[A-Za-z0-9_-]*$/.test(normalized)) throw new Error(`${what} is not base64url`);
  const b64 = normalized.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((normalized.length + 3) % 4);
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
