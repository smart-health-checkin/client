/**
 * Mock wallet: answers a prepared org-iso-mdoc check-in request with a fully
 * signed, HPKE-sealed DeviceResponse fabricated from demo data — real CBOR,
 * real COSE signatures (ephemeral self-signed issuer), real MSO digests, real
 * HPKE. Lets the whole verifier pipeline run with no phone present.
 *
 * DEMO/TEST ONLY: the "issuer" is an ephemeral self-signed key created per
 * response. Never treat mock artifacts as clinically meaningful.
 */

import type {
  SmartCheckinItemStatus,
  SmartCheckinRequest,
  SmartCheckinRequestItem,
  SmartCheckinResponse,
} from "../model/index.js";
import { validateSmartCheckinRequest } from "../model/index.js";
import {
  CborTag,
  MDOC_DOC_TYPE,
  MDOC_NAMESPACE,
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
} from "../wire/index.js";

/**
 * What the mock wallet should return for one requested item.
 *
 * Tests usually want to pin exact data ("this allergy list, missing its
 * reaction") or exercise a non-happy status, so both are first-class.
 */
export type MockItemSpec =
  /**
   * Return this FHIR resource or Bundle for the item. `alsoFulfills` names
   * other request items this same artifact satisfies — one bundle answering
   * a "clinical summary" item and an "allergies" item at once, say — and
   * those items are then reported fulfilled without an artifact of their own.
   */
  | { fhir: unknown; fhirVersion?: string; alsoFulfills?: readonly string[] }
  /** Return a SMART Health Card artifact carrying these JWS strings. */
  | { healthCard: readonly string[]; alsoFulfills?: readonly string[] }
  /** Report a status with no artifact — declined, unavailable, error, … */
  | { status: SmartCheckinItemStatus["status"]; message?: string };

/** One item can be answered by several artifacts: give it a list. */
export type MockItemSpecs = MockItemSpec | readonly MockItemSpec[];

export type MockWalletOptions = {
  origin: string;
  /**
   * Exactly what to return, per request item id. Anything not named here
   * follows `fallback`.
   *
   * ```ts
   * createMockWalletCredentialGetter({
   *   origin: location.origin,
   *   items: {
   *     allergies: { fhir: myAllergyBundle },
   *     coverage: { status: "declined" },
   *   },
   *   fallback: { status: "unavailable" },
   * });
   * ```
   */
  items?: Record<string, MockItemSpecs>;
  /**
   * What to do with items `items` doesn't mention: "fabricate" (default)
   * invents plausible demo data; a spec applies that spec to all of them.
   */
  fallback?: "fabricate" | MockItemSpec;
  /** Full manual control: build the entire response yourself. */
  respond?: (request: SmartCheckinRequest) => SmartCheckinResponse;
};

/**
 * Build a response from a per-item specification. Exported so tests can
 * assert on the response without going through the wire layer at all.
 */
export function buildMockResponse(
  request: SmartCheckinRequest,
  options: Pick<MockWalletOptions, "items" | "fallback"> = {},
): SmartCheckinResponse {
  const artifacts: Record<string, unknown>[] = [];
  const requestStatus: Record<string, unknown>[] = [];
  const fallback = options.fallback ?? "fabricate";
  // Items another artifact already answered (via alsoFulfills).
  const covered = new Set<string>();

  // Items left to the fabricator are fabricated together, not one at a time,
  // so it can answer several with one bundle the way a wallet would.
  const unspecified = request.items.filter((item) => options.items?.[item.id] === undefined);
  const fabricated = fallback === "fabricate" && unspecified.length
    ? fabricateResponse({ ...request, items: unspecified })
    : undefined;
  const fabricatedStatus = new Map((fabricated?.requestStatus ?? []).map((s) => [s.item, s]));

  for (const item of request.items) {
    if (covered.has(item.id)) {
      requestStatus.push({ item: item.id, status: "fulfilled" });
      continue;
    }
    const configured = options.items?.[item.id];
    const specs: readonly MockItemSpec[] | undefined =
      configured === undefined
        ? fallback === "fabricate" ? undefined : [fallback]
        : Array.isArray(configured) ? configured : [configured as MockItemSpec];

    if (specs === undefined) {
      // An artifact is emitted with the first item it fulfils; the rest are covered.
      for (const artifact of fabricated?.artifacts ?? []) {
        if (artifact.fulfills[0] !== item.id) continue;
        artifacts.push(artifact as unknown as Record<string, unknown>);
        for (const id of artifact.fulfills.slice(1)) covered.add(id);
      }
      const status = fabricatedStatus.get(item.id);
      if (status) requestStatus.push(status as unknown as Record<string, unknown>);
      continue;
    }

    let fulfilled = false;
    specs.forEach((spec, n) => {
      if ("status" in spec) {
        requestStatus.push({
          item: item.id,
          status: spec.status,
          ...(spec.message ? { message: spec.message } : {}),
        });
        return;
      }
      const also = (spec.alsoFulfills ?? []).filter((id) => id !== item.id);
      for (const id of also) covered.add(id);
      const id = specs.length > 1 ? `mock-${item.id}-${n + 1}` : `mock-${item.id}`;
      if ("healthCard" in spec) {
        artifacts.push({
          id,
          mediaType: "application/smart-health-card",
          fulfills: [item.id, ...also],
          value: { verifiableCredential: [...spec.healthCard] },
        });
      } else {
        artifacts.push({
          id,
          mediaType: "application/fhir+json",
          fhirVersion: spec.fhirVersion ?? request.fhirVersions?.[0] ?? "4.0.1",
          fulfills: [item.id, ...also],
          value: spec.fhir,
        });
      }
      fulfilled = true;
    });
    if (fulfilled) requestStatus.push({ item: item.id, status: "fulfilled" });
  }

  return {
    type: "smart-health-checkin-response",
    version: "1",
    requestId: request.id,
    artifacts,
    requestStatus,
  } as unknown as SmartCheckinResponse;
}

/**
 * A drop-in `getCredential` hook for runCheckin: parses the navigator
 * argument the same way a platform wallet would and returns a credential-like
 * object carrying the sealed response.
 */
export function createMockWalletCredentialGetter(options: MockWalletOptions) {
  return async (navigatorArgument: unknown): Promise<unknown> => {
    const parsed = parseWalletRequest(navigatorArgument);
    const smartResponse =
      options.respond?.(parsed.smartRequest) ??
      buildMockResponse(parsed.smartRequest, {
        items: options.items,
        fallback: options.fallback,
      });
    return sealWalletResponse({
      smartResponse,
      encryptionInfoBytes: parsed.encryptionInfoBytes,
      verifierOrigin: options.origin,
    });
  };
}

export type ParsedWalletRequest = {
  smartRequest: SmartCheckinRequest;
  deviceRequestBytes: Uint8Array;
  encryptionInfoBytes: Uint8Array;
};

/** Wallet side: recover the SMART request from a navigator.credentials.get argument. */
export function parseWalletRequest(navigatorArgument: unknown): ParsedWalletRequest {
  const data = extractRequestData(navigatorArgument);
  const deviceRequestBytes = base64UrlDecodeBytes(data.deviceRequest);
  const encryptionInfoBytes = base64UrlDecodeBytes(data.encryptionInfo);
  return {
    smartRequest: extractSmartRequest(deviceRequestBytes),
    deviceRequestBytes,
    encryptionInfoBytes,
  };
}

/**
 * Wallet side: sign and HPKE-seal a SMART response for the verifier.
 * `verifierOrigin` is the requesting page's origin — the SessionTranscript
 * binds to it, so a response cannot be replayed to a different origin.
 */
export async function sealWalletResponse(input: {
  smartResponse: SmartCheckinResponse;
  encryptionInfoBytes: Uint8Array;
  verifierOrigin: string;
}): Promise<{ protocol: string; data: { response: string } }> {
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

function extractRequestData(arg: unknown): { deviceRequest: string; encryptionInfo: string } {
  const requests = (arg as { digital?: { requests?: unknown } })?.digital?.requests;
  if (!Array.isArray(requests) || requests.length === 0) {
    throw new Error("mock wallet: navigator argument has no digital.requests");
  }
  const data = (requests[0] as { data?: { deviceRequest?: unknown; encryptionInfo?: unknown } }).data;
  if (typeof data?.deviceRequest !== "string" || typeof data?.encryptionInfo !== "string") {
    throw new Error("mock wallet: request data missing deviceRequest/encryptionInfo");
  }
  return { deviceRequest: data.deviceRequest, encryptionInfo: data.encryptionInfo };
}

function extractSmartRequest(deviceRequestBytes: Uint8Array): SmartCheckinRequest {
  const docRequests = mapGet(cborDecode(deviceRequestBytes), "docRequests");
  if (!Array.isArray(docRequests) || docRequests.length === 0) {
    throw new Error("mock wallet: DeviceRequest has no docRequests");
  }
  const itemsRequestTag = mapGet(docRequests[0], "itemsRequest");
  if (!(itemsRequestTag instanceof CborTag) || !(itemsRequestTag.value instanceof Uint8Array)) {
    throw new Error("mock wallet: itemsRequest is not tag24");
  }
  const requestJson = mapGet(
    mapGet(cborDecode(itemsRequestTag.value), "requestInfo"),
    SMART_REQUEST_INFO_KEY,
  );
  if (typeof requestJson !== "string") {
    throw new Error("mock wallet: requestInfo carrier missing");
  }
  const validated = validateSmartCheckinRequest(JSON.parse(requestJson));
  if (!validated.ok) throw new Error(`mock wallet: invalid request: ${validated.error}`);
  return validated.value;
}

function recipientJwkFromEncryptionInfo(encryptionInfoBytes: Uint8Array): JsonWebKey {
  const decoded = cborDecode(encryptionInfoBytes);
  const key = mapGet(Array.isArray(decoded) ? decoded[1] : undefined, "recipientPublicKey");
  if (!(key instanceof Map)) throw new Error("mock wallet: no recipientPublicKey");
  const x = key.get(-2);
  const y = key.get(-3);
  if (!(x instanceof Uint8Array) || !(y instanceof Uint8Array)) {
    throw new Error("mock wallet: recipientPublicKey is not EC2");
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
export const DEMO_HEALTH_CARD_JWS =
  "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiIsImtpZCI6Im1vY2sta2V5In0.fZHNjtQwEIRfZVVcnZkkGmbAR1gkQFqB-Lus5tBxOhsjx4nszrBR5HdHDquBw4pj293V9VWvsDFCoxeZot7vf5FzLDt-pGFyvG95GKHgmw66Oh1Pdf3yWJYKFwO9QpaJoe-vw3GgID2Tk35nKLTxxZ-iyAXOCiZwy14sua9z85ONZJWut-EHh2hHD43DrtxVUNvrm9m3jnNP4DjOwfC3bSOePtSTA5jROTaSFRTYS1ig71d0s3Pfg4O-zusS6lo8I_yZxLKXjExDZlvR0WDdAo0vvHCEwoO9sM_YH8fQksc5nRUaG6S_Jcki1etXh6I8FmWNlNSzNjLhf2y8HS8c6CETRiGZ84XIiL38ZV4h_CjQuOVhvHm_5XwzOfJICnFuogm24fChzS3v7j4Vh0N1gkLDnjtrLOWM8uKOA_vs4t-QksJEyxi2BFobJ0c5gm3X3SwzOWTqiYMd26wThUJ2U5f1sSiroqyQUjqnlNJv.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export function fabricateResponse(
  request: SmartCheckinRequest,
  include?: (itemId: string) => boolean,
): SmartCheckinResponse {
  const artifacts: Record<string, unknown>[] = [];
  const requestStatus: Record<string, unknown>[] = [];
  const wanted = request.items.filter((item) => !include || include(item.id));
  // A summary item whose profiles include another item's profiles answers
  // both with one bundle — the way a real wallet would, rather than sending
  // the same allergy list twice.
  const coveredBy = new Map<string, string>();
  for (const summary of wanted) {
    const profiles = summary.content.kind === "selection.fhir" ? summary.content.profiles ?? [] : [];
    if (summary.content.kind !== "selection.fhir" || !summary.content.profilesFrom?.length || profiles.length < 2) continue;
    for (const other of wanted) {
      if (other === summary || other.content.kind !== "selection.fhir" || !other.content.profiles?.length) continue;
      if (other.accept.includes("application/fhir+json") && other.content.profiles.every((p) => profiles.includes(p))) {
        coveredBy.set(other.id, summary.id);
      }
    }
  }
  for (const item of request.items) {
    if (include && !include(item.id)) {
      requestStatus.push({ item: item.id, status: "declined" });
      continue;
    }
    if (coveredBy.has(item.id)) {
      requestStatus.push({ item: item.id, status: "fulfilled" });
      continue;
    }
    const also = [...coveredBy].filter(([, by]) => by === item.id).map(([id]) => id);
    const wantsCard = item.accept.includes("application/smart-health-card");
    const wantsFhir = item.accept.includes("application/fhir+json") || !wantsCard;
    // Both accepted → both returned: the signed card, and the same facts as plain FHIR.
    if (wantsCard) {
      artifacts.push({
        id: wantsFhir ? `mock-${item.id}-card` : `mock-${item.id}`,
        mediaType: "application/smart-health-card",
        fulfills: [item.id, ...also],
        value: { verifiableCredential: [DEMO_HEALTH_CARD_JWS] },
      });
    }
    if (wantsFhir) {
      artifacts.push({
        id: wantsCard ? `mock-${item.id}-fhir` : `mock-${item.id}`,
        mediaType: "application/fhir+json",
        fhirVersion: request.fhirVersions?.[0] ?? "4.0.1",
        fulfills: [item.id, ...also],
        value: fabricateFhirValue(item),
      });
    }
    requestStatus.push({ item: item.id, status: "fulfilled" });
  }
  return {
    type: "smart-health-checkin-response",
    version: "1",
    requestId: request.id,
    artifacts,
    requestStatus,
  } as unknown as SmartCheckinResponse;
}

function fabricateFhirValue(item: SmartCheckinRequestItem): unknown {
  // Unique per run: real check-ins are distinct, and duplicate-detecting
  // servers (e.g. public HAPI) reject content-identical re-creates.
  const runId = crypto.randomUUID();
  const mockIdentifier = { system: "urn:smart-health-checkin:mock-run", value: runId };
  const demoPatient = { display: "Demo patient (mock wallet)" };
  if (item.content.kind === "form.fhir") {
    return {
      resourceType: "QuestionnaireResponse",
      identifier: mockIdentifier,
      status: "completed",
      ...(item.content.questionnaireCanonical
        ? { questionnaire: item.content.questionnaireCanonical }
        : {}),
      item: [
        {
          linkId: "mock-1",
          text: `Mock answer for ${item.title}`,
          answer: [{ valueString: `Mock wallet demo answer (run ${runId.slice(0, 8)})` }],
        },
      ],
    };
  }

  // Keyword-match the selector so demos get plausible USCDI content.
  const hints = `${item.title} ${item.summary ?? ""} ${JSON.stringify(item.content)}`.toLowerCase();
  const bundle = (resources: Record<string, unknown>[]): unknown => ({
    resourceType: "Bundle",
    type: "collection",
    entry: resources.map((resource) => ({ resource })),
  });

  if (hints.includes("coverage") || hints.includes("insur") || hints.includes("carin")) {
    return bundle([
      {
        resourceType: "Coverage",
        identifier: [mockIdentifier],
        status: "active",
        type: { text: "Demo Health plan" },
        subscriberId: "DEMO-4417",
        beneficiary: demoPatient,
        payor: [{ display: "Demo Mutual" }],
        period: { start: "2026-01-01" },
      },
    ]);
  }

  if (hints.includes("allerg")) {
    return bundle([
      {
        resourceType: "AllergyIntolerance",
        identifier: [mockIdentifier],
        clinicalStatus: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
              code: "active",
            },
          ],
        },
        code: { text: "Penicillin" },
        criticality: "high",
        patient: demoPatient,
        reaction: [{ manifestation: [{ text: "Hives" }] }],
      },
      {
        resourceType: "AllergyIntolerance",
        identifier: [{ ...mockIdentifier, value: `${runId}-2` }],
        clinicalStatus: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
              code: "active",
            },
          ],
        },
        code: { text: "Peanut" },
        criticality: "low",
        patient: demoPatient,
        reaction: [{ manifestation: [{ text: "Oral itching" }] }],
      },
      // Deliberately sparse — a very common real-world shape. US Core only
      // requires the substance and clinical status, so plenty of records
      // carry no reaction and no criticality. This is exactly the gap a
      // check-in form should elicit rather than re-asking what's known.
      {
        resourceType: "AllergyIntolerance",
        identifier: [{ ...mockIdentifier, value: `${runId}-3` }],
        clinicalStatus: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
              code: "active",
            },
          ],
        },
        code: { text: "Sulfa drugs (sulfonamides)" },
        patient: demoPatient,
      },
      {
        resourceType: "AllergyIntolerance",
        identifier: [{ ...mockIdentifier, value: `${runId}-4` }],
        clinicalStatus: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
              code: "active",
            },
          ],
        },
        code: { text: "Latex" },
        criticality: "unable-to-assess",
        patient: demoPatient,
      },
    ]);
  }

  if (hints.includes("medication")) {
    return bundle([
      {
        resourceType: "MedicationRequest",
        identifier: [mockIdentifier],
        status: "active",
        intent: "order",
        medicationCodeableConcept: { text: "Lisinopril 10 mg — once daily" },
        subject: demoPatient,
      },
      {
        resourceType: "MedicationRequest",
        identifier: [{ ...mockIdentifier, value: `${runId}-2` }],
        status: "active",
        intent: "order",
        medicationCodeableConcept: { text: "Metformin 500 mg — twice daily" },
        subject: demoPatient,
      },
    ]);
  }

  return bundle([
    {
      resourceType: "Condition",
      identifier: [mockIdentifier],
      clinicalStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: "active",
          },
        ],
      },
      code: { text: `Mock condition for "${item.title}"` },
      subject: demoPatient,
    },
  ]);
}

/** Build a signed DeviceResponse carrying the SMART response element. */
export async function buildSignedDeviceResponse(input: {
  smartResponseJson: string;
  sessionTranscript: Uint8Array;
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
