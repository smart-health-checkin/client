/**
 * SMART Health Cards in a response: decode, verify the signature, and decide
 * trust, before the page sees the response.
 *
 * Trust is configured once (or per call):
 *
 *   configureHealthCardTrust({ directory: "vci" });
 *   configureHealthCardTrust({ issuers: ["https://issuer.example"] });
 *   configureHealthCardTrust({ keys: { "https://issuer.example": jwks } });
 *   configureHealthCardTrust({ accept: "any-valid" });    // connectathon
 *   configureHealthCardTrust({ accept: "everything" });   // debugging
 */

/** The public list of SMART Health Card issuers maintained by the VCI coalition. */
export const VCI_DIRECTORY_URL =
  "https://raw.githubusercontent.com/the-commons-project/vci-directory/main/vci-issuers.json";

export type HealthCardTrust = {
  /** An issuer directory: "vci", or the URL of a file shaped like the VCI directory. */
  directory?: "vci" | string;
  /** Issuer URLs to trust, in addition to any directory. */
  issuers?: ReadonlyArray<string>;
  /** Keys to trust without fetching, by issuer URL. */
  keys?: Readonly<Record<string, { keys: ReadonlyArray<JsonWebKey & { kid?: string }> }>>;
  /**
   * Which cards `resources()` includes: "trusted" (default) only cards from a
   * trusted issuer with a valid signature; "any-valid" any card whose
   * signature verifies against its own issuer's published keys; "everything"
   * invalid cards too. Every card is always listed by `healthCards()`.
   */
  accept?: "trusted" | "any-valid" | "everything";
};

export type HealthCard = {
  /** The item ids the card's artifact fulfills. */
  fulfills: ReadonlyArray<string>;
  /** The compact JWS as received. */
  jws: string;
  /** The issuer URL from the payload, when it could be decoded. */
  issuer?: string;
  /** The card's FHIR Bundle (`vc.credentialSubject.fhirBundle`), when it could be decoded. */
  bundle?: { resourceType: "Bundle"; entry?: Array<{ fullUrl?: string; resource?: Record<string, unknown> }> };
  /** The signature verified against the issuer's key. */
  valid: boolean;
  /** The issuer is trusted by the configuration. */
  trusted: boolean;
  /** Included by `resources()` under the configured `accept`. */
  accepted: boolean;
  /** Why it isn't valid or trusted, when it isn't. */
  reason?: string;
};

let defaultTrust: HealthCardTrust = {};

/** Set the trust used for every check-in that doesn't pass its own. */
export function configureHealthCardTrust(trust: HealthCardTrust): void {
  defaultTrust = { ...trust };
}

/** The trust currently configured. */
export function healthCardTrust(): HealthCardTrust {
  return defaultTrust;
}

const b64urlDecode = (s: string): Uint8Array =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

async function inflateRaw(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

const jwksCache = new Map<string, Promise<{ keys: Array<JsonWebKey & { kid?: string }> }>>();
function fetchJwks(issuer: string, fetchImpl: typeof fetch): Promise<{ keys: Array<JsonWebKey & { kid?: string }> }> {
  let cached = jwksCache.get(issuer);
  if (!cached) {
    cached = fetchImpl(`${issuer}/.well-known/jwks.json`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${issuer}/.well-known/jwks.json`);
      return r.json() as Promise<{ keys: Array<JsonWebKey & { kid?: string }> }>;
    });
    cached.catch(() => jwksCache.delete(issuer));
    jwksCache.set(issuer, cached);
  }
  return cached;
}

const directoryCache = new Map<string, Promise<Set<string>>>();
function fetchDirectory(url: string, fetchImpl: typeof fetch): Promise<Set<string>> {
  let cached = directoryCache.get(url);
  if (!cached) {
    cached = fetchImpl(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} fetching the issuer directory ${url}`);
        return r.json() as Promise<{ participating_issuers?: Array<{ iss: string }> }>;
      })
      .then((d) => new Set((d.participating_issuers ?? []).map((i) => i.iss)));
    cached.catch(() => directoryCache.delete(url));
    directoryCache.set(url, cached);
  }
  return cached;
}

async function isTrusted(issuer: string, trust: HealthCardTrust, fetchImpl: typeof fetch): Promise<boolean> {
  if (trust.keys?.[issuer]) return true;
  if (trust.issuers?.includes(issuer)) return true;
  if (trust.directory) {
    const url = trust.directory === "vci" ? VCI_DIRECTORY_URL : trust.directory;
    return (await fetchDirectory(url, fetchImpl)).has(issuer);
  }
  return false;
}

/** Decode and verify one card against the given trust. Never throws. */
export async function checkHealthCard(
  jws: string,
  fulfills: ReadonlyArray<string>,
  trust: HealthCardTrust = defaultTrust,
  fetchImpl: typeof fetch = fetch,
): Promise<HealthCard> {
  const accept = trust.accept ?? "trusted";
  const card: HealthCard = { fulfills, jws, valid: false, trusted: false, accepted: false };
  const finish = (reason?: string): HealthCard => {
    if (reason) card.reason = reason;
    card.accepted = accept === "everything" || (card.valid && (card.trusted || accept === "any-valid"));
    return card;
  };
  try {
    const [h, p, sig] = jws.split(".");
    if (!h || !p || !sig) return finish("not a compact JWS");
    const header = JSON.parse(new TextDecoder().decode(b64urlDecode(h))) as { alg?: string; zip?: string; kid?: string };
    const payload = JSON.parse(await inflateRaw(b64urlDecode(p))) as {
      iss?: string;
      vc?: { credentialSubject?: { fhirBundle?: HealthCard["bundle"] } };
    };
    if (payload.iss) card.issuer = payload.iss;
    const bundle = payload.vc?.credentialSubject?.fhirBundle;
    if (bundle) card.bundle = bundle;
    if (header.alg !== "ES256" || header.zip !== "DEF") return finish(`header must have alg ES256 and zip DEF`);
    if (!payload.iss) return finish("the payload has no issuer (iss)");
    card.trusted = await isTrusted(payload.iss, trust, fetchImpl);
    const jwks = trust.keys?.[payload.iss] ?? (await fetchJwks(payload.iss, fetchImpl));
    const jwk = jwks.keys.find((k) => k.kid === header.kid);
    if (!jwk) return finish(`no key with kid ${header.kid} for ${payload.iss}`);
    const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y }, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    card.valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, b64urlDecode(sig) as Uint8Array<ArrayBuffer>, new TextEncoder().encode(`${h}.${p}`));
    if (!card.valid) return finish("the signature does not verify");
    return finish(card.trusted ? undefined : `${payload.iss} is not a trusted issuer`);
  } catch (e) {
    return finish(e instanceof Error ? e.message : String(e));
  }
}
