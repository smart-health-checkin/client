# Security notes

- **Browser-local keys are demo-grade.** The default verifier authority
  generates the HPKE recipient keypair in page memory. That is appropriate
  for demos and low-stakes flows; production deployments should use a
  server-owned authority (keys never reach the page; the server opens and
  logs responses) via the two-call HTTP contract in `src/browser`.
- **What the kit verifies.** Every response is HPKE-opened with the
  SessionTranscript (origin-bound) as the `info`, so a response replayed to
  a different origin or session fails to open. The kit then verifies MSO
  value digests, the issuerAuth COSE signature against the x5chain
  certificate, and the deviceSignature over DeviceAuthentication, and
  cross-validates the clinical payload against the request before any
  submission. **Trust anchoring is deployment policy**: the kit tells you
  the signature is internally consistent and hands you the chain; you decide
  which chains you accept (the demo accepts self-attested wallets).
- **Fragment parameters, not query strings.** The demo carries patient
  references and request payloads in the URL fragment so they never appear
  in server logs. Keep that property in your own deployments.
- **Demo backend policy.** The demo defaults to the public HAPI test server
  and shows a host-naming caution plus an explicit acknowledgment for any
  other `fhir=` target, so a crafted link cannot silently exfiltrate a real
  wallet share. Never point the demo at a server holding real patient data.
- **Mock wallet.** `mock=1` fabricates demo data under an ephemeral
  self-signed issuer. It exists so the pipeline can be exercised without a
  phone; never treat mock artifacts as clinically meaningful.
- **Fixtures contain no PHI** and any checked-in private keys are
  intentionally public one-run test material (see `fixtures/PROVENANCE.md`).
