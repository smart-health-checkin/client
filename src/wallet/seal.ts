/**
 * The wallet side of the wire: read a request from the Digital Credentials
 * API argument, and sign and seal a response for the EHR's origin.
 */
import type {
  SmartCheckinRequest,
  SmartCheckinResponse,
} from "../model/index.js";
import {
  parseSmartCheckinRequest,
  validateResponseAgainstRequest,
  type UnsupportedItem,
  type ValidationIssue,
} from "../model/index.js";
import {
  CborTag,
  MDOC_DOC_TYPE,
  MDOC_NAMESPACE,
  PROTOCOL_ID,
  SMART_REQUEST_INFO_KEY,
  SMART_RESPONSE_ELEMENT_ID,
  arrayBufferCopy,
  base64UrlDecodeBytes,
  buildDcapiSessionTranscript,
  buildDeviceAuthenticationBytes,
  cborDecode,
  cborEncode,
  createEphemeralReaderIdentity,
  hpkeSealDirectMdoc,
  mapGet,
  publicJwkToCoseKey,
  sha256,
  WarningList,
  decodeBase64UrlLenient,
  type CheckinWarning,
} from "../wire/index.js";

export type ParsedWalletRequest = {
  smartRequest: SmartCheckinRequest;
  /** Request items this library can't process; answer each `unsupported` ([SEL-9], [SEL-10], [FORM-1]). */
  unsupportedItems: UnsupportedItem[];
  /** Problems a Wallet continues past and reports (spec §8.4, [RCV-1]). */
  warnings: CheckinWarning[];
  /** The DocRequest's `readerAuth`, if present, for Wallets that verify it ([WRQ-9]). */
  readerAuth?: unknown;
  deviceRequestBytes: Uint8Array;
  encryptionInfoBytes: Uint8Array;
};

/** Thrown by `parseWalletRequest` where spec §8.4 says to fail: the Wallet doesn't respond. */
export class WalletRequestError extends Error {
  constructor(
    message: string,
    /** The spec requirement, such as "WRQ-4". */
    readonly rule: string,
  ) {
    super(message);
    this.name = "WalletRequestError";
  }
}

/**
 * Wallet side: read a request from a navigator.credentials.get argument,
 * following spec §8.4 steps [WRQ-2]..[WRQ-7]. Throws `WalletRequestError`
 * only where the spec says to fail (it can't be decoded, there's no SMART
 * DocRequest or request text, the SMART request is invalid, or there's no
 * usable recipient key); everything else is returned in `warnings`.
 */
export function parseWalletRequest(navigatorArgument: unknown): ParsedWalletRequest {
  const w = new WarningList();
  const fail = (message: string, rule: string): never => {
    throw new WalletRequestError(message, rule);
  };
  const requests = (navigatorArgument as { digital?: { requests?: unknown } })?.digital?.requests;
  const entry = (Array.isArray(requests) ? requests : []).find(
    (r) => typeof (r as { data?: { deviceRequest?: unknown } })?.data?.deviceRequest === "string",
  ) as { protocol?: unknown; data: { deviceRequest: string; encryptionInfo?: unknown } } | undefined;
  if (!entry) return fail("the argument has no digital request with a deviceRequest", "WRQ-2");
  if (entry.protocol !== PROTOCOL_ID) w.add("protocol", "WRQ-2", `protocol is ${JSON.stringify(entry.protocol)}, not ${PROTOCOL_ID}`);

  // [WRQ-2]..[WRQ-4]
  let deviceRequestBytes: Uint8Array;
  let deviceRequest: unknown;
  try {
    deviceRequestBytes = decodeBase64UrlLenient(entry.data.deviceRequest, w, "WRQ-2", "deviceRequest");
    deviceRequest = cborDecode(deviceRequestBytes, w.duplicateKeys);
  } catch (e) {
    return fail(`deviceRequest can't be decoded: ${messageOf(e)}`, "WRQ-2");
  }
  const version = mapGet(deviceRequest, "version");
  if (version !== "1.0") w.add("device-request-version", "WRQ-3", `DeviceRequest version is ${JSON.stringify(version)}, not "1.0"`);
  const docRequests = mapGet(deviceRequest, "docRequests");
  const smart: Array<{ docRequest: unknown; itemsRequest: unknown }> = [];
  for (const docRequest of Array.isArray(docRequests) ? docRequests : []) {
    const tag = mapGet(docRequest, "itemsRequest");
    if (!(tag instanceof CborTag) || !(tag.value instanceof Uint8Array)) continue;
    let itemsRequest: unknown;
    try {
      itemsRequest = cborDecode(tag.value, w.duplicateKeys);
    } catch {
      continue;
    }
    if (mapGet(itemsRequest, "docType") === MDOC_DOC_TYPE) smart.push({ docRequest, itemsRequest });
  }
  if (smart.length === 0) return fail(`no DocRequest asks for docType ${MDOC_DOC_TYPE}`, "WRQ-4");
  if (smart.length > 1) w.add("doc-requests", "WRQ-4", `${smart.length} DocRequests ask for ${MDOC_DOC_TYPE}; using the first`);
  const { docRequest, itemsRequest } = smart[0]!;

  // [WRQ-5], [WRQ-6]
  const text = mapGet(mapGet(itemsRequest, "requestInfo"), SMART_REQUEST_INFO_KEY);
  if (typeof text !== "string") return fail(`requestInfo has no ${SMART_REQUEST_INFO_KEY} text`, "WRQ-5");
  const intent = mapGet(mapGet(mapGet(itemsRequest, "nameSpaces"), MDOC_NAMESPACE), SMART_RESPONSE_ELEMENT_ID);
  if (intent === undefined) w.add("items-request", "WRQ-5", `the ItemsRequest doesn't request ${SMART_RESPONSE_ELEMENT_ID} in ${MDOC_NAMESPACE}`);
  else if (typeof intent !== "boolean") w.add("intent-to-retain", "WRQ-5", `intentToRetain is ${JSON.stringify(intent)}, not a boolean`);
  const validated = parseSmartCheckinRequest(text);
  if (!validated.ok) return fail(`the SMART request is invalid: ${validated.error}`, validated.rule);

  // [WRQ-7]
  if (typeof entry.data.encryptionInfo !== "string") return fail("the request has no encryptionInfo", "WRQ-7");
  let encryptionInfoBytes: Uint8Array;
  let encryptionInfo: unknown;
  try {
    encryptionInfoBytes = decodeBase64UrlLenient(entry.data.encryptionInfo, w, "WRQ-2", "encryptionInfo");
    encryptionInfo = cborDecode(encryptionInfoBytes, w.duplicateKeys);
  } catch (e) {
    return fail(`encryptionInfo can't be decoded: ${messageOf(e)}`, "WRQ-7");
  }
  const fields = Array.isArray(encryptionInfo) ? encryptionInfo[1] : undefined;
  if (!Array.isArray(encryptionInfo) || encryptionInfo[0] !== "dcapi") w.add("encryption-info", "WRQ-7", 'encryptionInfo is not ["dcapi", {...}]');
  if (!(mapGet(fields, "nonce") instanceof Uint8Array)) w.add("encryption-info", "WRQ-7", "encryptionInfo has no nonce byte string");
  const key = mapGet(fields, "recipientPublicKey");
  const coord = (label: number) => { const v = mapGet(key, label); return v instanceof Uint8Array && v.length === 32; };
  if (!(key instanceof Map) || key.get(1) !== 2 || key.get(-1) !== 1 || !coord(-2) || !coord(-3)) {
    return fail("encryptionInfo has no usable P-256 recipientPublicKey", "WRQ-7");
  }

  const readerAuth = mapGet(docRequest, "readerAuth");
  return {
    smartRequest: validated.value,
    unsupportedItems: validated.unsupportedItems,
    warnings: w.items,
    ...(readerAuth !== undefined ? { readerAuth } : {}),
    deviceRequestBytes,
    encryptionInfoBytes,
  };
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * Wallet side: sign and HPKE-seal a SMART response for the verifier.
 * `verifierOrigin` is the requesting page's origin — the SessionTranscript
 * binds to it, so a response cannot be replayed to a different origin.
 */
export async function sealWalletResponse(input: {
  smartResponse: SmartCheckinResponse;
  encryptionInfoBytes: Uint8Array;
  verifierOrigin: string;
  /**
   * The request being answered. When given, the response is checked against
   * it first ([ACC-2], [RSP-2], [ART-1], …) and sealing throws on any
   * problem, so a Wallet never sends a response a Verifier would set aside.
   */
  request?: SmartCheckinRequest;
}): Promise<{ protocol: string; data: { response: string } }> {
  if (input.request) {
    const problems = checkWalletResponse(input.request, input.smartResponse);
    if (problems.length) throw new Error(`the response doesn't match the request: ${problems.map((p) => `${p.message} [${p.rule}]`).join("; ")}`);
  }
  const sessionTranscript = await buildDcapiSessionTranscript({
    origin: input.verifierOrigin,
    encryptionInfo: input.encryptionInfoBytes,
  });
  const recipientPublicJwk = recipientJwkFromEncryptionInfo(input.encryptionInfoBytes);
  const deviceResponseBytes = await buildSignedDeviceResponse({
    smartResponseJson: JSON.stringify(input.smartResponse),
    sessionTranscript,
  });
  const sealed = await hpkeSealDirectMdoc({
    plaintext: deviceResponseBytes,
    recipientPublicJwk,
    info: sessionTranscript,
  });
  return sealed.response;
}

/**
 * What a Verifier would object to in this response (spec §6.4), as a Wallet
 * checks before sending: an empty list means it's clean. A Wallet produces
 * exactly one status per item, only accepted media types, and so on.
 */
export function checkWalletResponse(request: SmartCheckinRequest, response: SmartCheckinResponse): ValidationIssue[] {
  const v = validateResponseAgainstRequest(request, response);
  if (!v.ok) return [{ rule: v.rule, message: v.error }];
  const problems: ValidationIssue[] = v.artifacts.flatMap((a) => a.problems.map((p) => ({ ...p, message: `Artifact ${a.id ?? `#${a.index}`}: ${p.message}` })));
  // [XV-12] (a fulfilled item with no Artifact) is only a SHOULD-level flag for Verifiers; not blocking here.
  for (const item of v.items) {
    problems.push(...item.problems.filter((p) => p.rule !== "XV-12").map((p) => ({ ...p, message: `item ${item.id}: ${p.message}` })));
  }
  const ids = new Set(request.items.map((i) => i.id));
  for (const row of response.requestStatus) {
    if (!ids.has(row.item)) problems.push({ rule: "RSP-2", message: `a status row names ${row.item}, which isn't in the request` });
  }
  return problems;
}

/**
 * The response for a Holder who reviewed the request and declined every
 * item ([HOLD-4]): every item `declined`, no Artifacts. (If the Holder
 * dismisses the Wallet without reviewing, the Wallet returns nothing.)
 */
export function declineAll(request: SmartCheckinRequest, message?: string): SmartCheckinResponse {
  return {
    type: "smart-health-checkin-response",
    version: "1",
    requestId: request.id,
    artifacts: [],
    requestStatus: request.items.map((item) => ({ item: item.id, status: "declined" as const, ...(message ? { message } : {}) })),
  };
}

export function recipientJwkFromEncryptionInfo(encryptionInfoBytes: Uint8Array): JsonWebKey {
  const decoded = cborDecode(encryptionInfoBytes);
  const key = mapGet(Array.isArray(decoded) ? decoded[1] : undefined, "recipientPublicKey");
  if (!(key instanceof Map)) throw new Error("no recipientPublicKey");
  const x = key.get(-2);
  const y = key.get(-3);
  if (!(x instanceof Uint8Array) || !(y instanceof Uint8Array)) {
    throw new Error("recipientPublicKey is not EC2");
  }
  const b64u = (bytes: Uint8Array): string =>
    btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return { kty: "EC", crv: "P-256", x: b64u(x), y: b64u(y) };
}

/**
 * Fabricate one plausible demo artifact per request item. Pass `include` to
 * honour per-item consent: excluded items come back with status "declined"
 * and no artifact, exactly as a real wallet would report them.
 */
/**
 * A structurally real SMART Health Card: a JWS whose payload is the raw-DEFLATEd
 * `{ iss, nbf, vc.credentialSubject.fhirBundle }` (one Patient, one Coverage),
 * so anything that decodes cards can show what is in it. The signature is
 * zeros — nothing verifies it, and nothing should.
 */
export async function buildSignedDeviceResponse(input: {
  smartResponseJson: string;
  sessionTranscript: Uint8Array;
  /** Signing time for the MSO's validityInfo; defaults to now. */
  now?: Date;
}): Promise<Uint8Array> {
  // Ephemeral issuer identity (self-signed cert) and device key.
  const issuer = await createEphemeralReaderIdentity("SMART Health Check-in Mock Wallet");
  const deviceKeyPair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const deviceJwk = await crypto.subtle.exportKey("jwk", deviceKeyPair.publicKey);

  const issuerSignedItem = new Map<string, unknown>([
    ["digestID", 0],
    ["random", crypto.getRandomValues(new Uint8Array(32))],
    ["elementIdentifier", SMART_RESPONSE_ELEMENT_ID],
    ["elementValue", input.smartResponseJson],
  ]);
  const itemTag24 = new CborTag(24, cborEncode(issuerSignedItem));
  const digest = await sha256(cborEncode(itemTag24));

  const mso = new Map<string, unknown>([
    ["version", "1.0"],
    ["digestAlgorithm", "SHA-256"],
    ["valueDigests", new Map([[MDOC_NAMESPACE, new Map([[0, digest]])]])],
    ["deviceKeyInfo", new Map([["deviceKey", publicJwkToCoseKey(deviceJwk)]])],
    ["docType", MDOC_DOC_TYPE],
    ["validityInfo", validityInfo(input.now ?? new Date())],
  ]);
  const msoTag24Bytes = cborEncode(new CborTag(24, cborEncode(mso)));

  const issuerAuth = await coseSign1({
    privateKey: issuer.keyPair.privateKey,
    certificateDer: issuer.certificateDer,
    payload: msoTag24Bytes,
  });

  const deviceNameSpaces = new CborTag(24, cborEncode(new Map()));
  const deviceAuthenticationBytes = buildDeviceAuthenticationBytes({
    sessionTranscript: input.sessionTranscript,
    docType: MDOC_DOC_TYPE,
    deviceNameSpaces,
  });
  const deviceSignature = await coseSign1({
    privateKey: deviceKeyPair.privateKey,
    detachedPayload: deviceAuthenticationBytes,
  });

  const deviceResponse = new Map<string, unknown>([
    ["version", "1.0"],
    [
      "documents",
      [
        new Map<string, unknown>([
          ["docType", MDOC_DOC_TYPE],
          [
            "issuerSigned",
            new Map<string, unknown>([
              ["nameSpaces", new Map([[MDOC_NAMESPACE, [itemTag24]]])],
              ["issuerAuth", issuerAuth],
            ]),
          ],
          [
            "deviceSigned",
            new Map<string, unknown>([
              ["nameSpaces", deviceNameSpaces],
              ["deviceAuth", new Map([["deviceSignature", deviceSignature]])],
            ]),
          ],
        ]),
      ],
    ],
    ["status", 0],
  ]);
  return cborEncode(deviceResponse);
}

/**
 * ISO 18013-5 validityInfo: tag-0 tdate strings in UTC with whole seconds
 * (no fractional part, which some verifiers reject), valid for one day from
 * signing, as the Android reference wallet does.
 */
function validityInfo(now: Date): Map<string, CborTag> {
  const tdate = (ms: number) => new CborTag(0, new Date(Math.floor(ms / 1000) * 1000).toISOString().replace(".000Z", "Z"));
  const signed = now.getTime();
  return new Map([
    ["signed", tdate(signed)],
    ["validFrom", tdate(signed)],
    ["validUntil", tdate(signed + 86_400_000)],
  ]);
}

async function coseSign1(input: {
  privateKey: CryptoKey;
  certificateDer?: Uint8Array;
  payload?: Uint8Array;
  detachedPayload?: Uint8Array;
}): Promise<unknown[]> {
  const protectedBytes = cborEncode(new Map([[1, -7]])); // alg: ES256
  const unprotected = input.certificateDer
    ? new Map<unknown, unknown>([[33, [input.certificateDer]]])
    : new Map<unknown, unknown>();
  const signedPayload = input.payload ?? input.detachedPayload;
  if (!signedPayload) throw new Error("coseSign1 needs a payload");
  const sigStructure = cborEncode(["Signature1", protectedBytes, new Uint8Array(), signedPayload]);
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      input.privateKey,
      arrayBufferCopy(sigStructure),
    ),
  );
  return [protectedBytes, unprotected, input.payload ?? null, signature];
}
