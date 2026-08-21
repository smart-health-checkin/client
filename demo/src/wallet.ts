/**
 * Demo Health Wallet — a wallet **web app** that answers SMART Health
 * Check-in requests over the web-wallet postMessage protocol.
 *
 * It runs the real responder side: it parses the DeviceRequest, shows a
 * consent screen with per-item choice, then signs (COSE) and HPKE-seals a
 * DeviceResponse bound to the verifier's origin. The data it holds is
 * fabricated demo content — this is a stand-in for a platform wallet, not a
 * real record store.
 */

import {
  WEB_WALLET_READY_MESSAGE_TYPE,
  WEB_WALLET_REQUEST_MESSAGE_TYPE,
  WEB_WALLET_RESPONSE_MESSAGE_TYPE,
  fabricateResponse,
  parseWalletRequest,
  sealWalletResponse,
  type SmartCheckinRequest,
} from "../../src/index.ts";

const el = (id: string): HTMLElement => document.getElementById(id)!;

type Pending = {
  requestId?: string;
  smartRequest: SmartCheckinRequest;
  encryptionInfoBytes: Uint8Array;
  verifierOrigin: string;
  replyTo: MessageEventSource;
  replyOrigin: string;
};

let pending: Pending | undefined;

function reply(message: Record<string, unknown>): void {
  if (!pending) return;
  (pending.replyTo as Window).postMessage(
    { type: WEB_WALLET_RESPONSE_MESSAGE_TYPE, requestId: pending.requestId, ...message },
    pending.replyOrigin,
  );
}

function showError(message: string): void {
  const error = el("error");
  error.hidden = false;
  error.textContent = message;
}

window.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as { type?: string } | null;
  if (!data || typeof data !== "object" || data.type !== WEB_WALLET_REQUEST_MESSAGE_TYPE) return;
  if (!event.source) return;

  const message = data as {
    credentialRequestOptions?: unknown;
    requestId?: string;
    verifierOrigin?: string;
  };
  try {
    const parsed = parseWalletRequest(message.credentialRequestOptions);
    pending = {
      requestId: message.requestId,
      smartRequest: parsed.smartRequest,
      encryptionInfoBytes: parsed.encryptionInfoBytes,
      // The verifier tells us its origin; a platform wallet gets this from
      // the browser instead. Both sides must agree or the response won't open.
      verifierOrigin: message.verifierOrigin ?? event.origin,
      replyTo: event.source,
      replyOrigin: event.origin,
    };
    renderConsent(pending);
  } catch (e) {
    showError(`Could not read the request: ${e instanceof Error ? e.message : String(e)}`);
    pending = {
      requestId: message.requestId,
      smartRequest: {} as SmartCheckinRequest,
      encryptionInfoBytes: new Uint8Array(),
      verifierOrigin: event.origin,
      replyTo: event.source,
      replyOrigin: event.origin,
    };
    reply({ outcome: "error", message: e instanceof Error ? e.message : String(e) });
  }
});

function renderConsent(request: Pending): void {
  el("waiting").hidden = true;
  el("consent").hidden = false;
  el("requester-origin").textContent = request.verifierOrigin;
  el("purpose").textContent =
    request.smartRequest.purpose ?? "This site is asking for health information.";

  // Preview what this wallet would actually return, per item.
  const preview = fabricateResponse(request.smartRequest);
  const previewByItem = new Map<string, string>();
  for (const artifact of preview.artifacts) {
    for (const itemId of artifact.fulfills) {
      previewByItem.set(itemId, describeArtifact(artifact));
    }
  }

  const list = el("items");
  list.innerHTML = "";
  for (const item of request.smartRequest.items) {
    const li = document.createElement("li");

    const top = document.createElement("div");
    top.className = "item-top";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.dataset.itemId = item.id;
    checkbox.id = `item-${item.id}`;
    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = item.title;
    label.append(title);
    if (item.summary) {
      const summary = document.createElement("div");
      summary.className = "item-summary";
      summary.textContent = item.summary;
      label.append(summary);
    }
    const previewText = previewByItem.get(item.id);
    if (previewText) {
      const previewEl = document.createElement("div");
      previewEl.className = "item-preview";
      previewEl.textContent = previewText;
      label.append(previewEl);
    }
    top.append(checkbox, label);
    li.append(top);
    list.append(li);
  }

  (el("share") as HTMLButtonElement).onclick = () => void share(request);
  (el("decline") as HTMLButtonElement).onclick = () => {
    reply({ outcome: "declined" });
    window.close();
  };
}

function describeArtifact(artifact: {
  mediaType: string;
  value?: unknown;
}): string {
  if (artifact.mediaType === "application/smart-health-card") {
    return "will share: a verifiable health card";
  }
  const value = artifact.value as { resourceType?: string; entry?: unknown[] } | undefined;
  if (value?.resourceType === "Bundle" && Array.isArray(value.entry)) {
    const types = value.entry
      .map((entry) => (entry as { resource?: { resourceType?: string } }).resource?.resourceType)
      .filter((t): t is string => !!t);
    const counts = new Map<string, number>();
    for (const type of types) counts.set(type, (counts.get(type) ?? 0) + 1);
    const summary = [...counts.entries()].map(([type, n]) => `${n}× ${type}`).join(", ");
    return `will share: ${summary || "no records"}`;
  }
  if (value?.resourceType) return `will share: 1× ${value.resourceType}`;
  return "will share: health data";
}

async function share(request: Pending): Promise<void> {
  const shareButton = el("share") as HTMLButtonElement;
  shareButton.disabled = true;
  shareButton.textContent = "Sharing…";
  try {
    const selected = new Set(
      [...document.querySelectorAll<HTMLInputElement>('#items input[type="checkbox"]')]
        .filter((input) => input.checked)
        .map((input) => input.dataset.itemId!),
    );
    const smartResponse = fabricateResponse(request.smartRequest, (id) => selected.has(id));
    const credential = await sealWalletResponse({
      smartResponse,
      encryptionInfoBytes: request.encryptionInfoBytes,
      verifierOrigin: request.verifierOrigin,
    });
    reply({ outcome: "approved", credential });
    window.close();
  } catch (e) {
    showError(`Could not build the response: ${e instanceof Error ? e.message : String(e)}`);
    reply({ outcome: "error", message: e instanceof Error ? e.message : String(e) });
    shareButton.disabled = false;
    shareButton.textContent = "Share selected";
  }
}

// Tell the opener we're ready for a request.
if (window.opener) {
  (window.opener as Window).postMessage({ type: WEB_WALLET_READY_MESSAGE_TYPE }, "*");
} else {
  el("waiting").textContent =
    "Open this wallet from a check-in page — it answers requests sent to it.";
}
