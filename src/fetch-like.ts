/**
 * The minimal fetch signature the library accepts, so callers can inject their
 * own client — auth headers, retries, tracing — without the library
 * depending on any particular one.
 *
 * Lives on its own because both the check-in path and the optional FHIR
 * helper need it, and the check-in path must never import the FHIR module.
 */
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
