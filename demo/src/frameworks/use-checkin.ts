/**
 * React binding over the vanilla core.
 *
 * There is no React (or Angular, or Vue) code inside the library. A binding
 * owns three things, and this one shows all three: the responder list the
 * page will render (resolved from a policy), the one call, and its state.
 */

import { useCallback, useEffect, useState } from "react";
import {
  CheckinFlowError,
  credentialGetterFor,
  requestCheckin,
  resolveResponders,
  type CheckinRequestInput,
  type Responder,
  type ResponderPolicy,
  type SmartCheckinResponse,
} from "../../../src/index.js";

export type CheckinState = {
  status: "idle" | "waiting" | "done" | "declined" | "error";
  response?: SmartCheckinResponse;
  error?: string;
};

export function useCheckin(request: CheckinRequestInput, policy: ResponderPolicy) {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [state, setState] = useState<CheckinState>({ status: "idle" });

  // Who may answer in this browser: availability and the default come back in the list.
  useEffect(() => {
    let live = true;
    void resolveResponders(policy).then((list) => { if (live) setResponders(list); });
    return () => { live = false; };
  }, [policy]);

  const start = useCallback(
    async (responder = responders.find((r) => r.isDefault)) => {
      if (!responder) return;
      setState({ status: "waiting" });
      try {
        const response = await requestCheckin(request, {
          getCredential: credentialGetterFor(responder, { origin: policy.origin }),
        });
        setState({ status: "done", response });
      } catch (e) {
        setState(
          e instanceof CheckinFlowError && e.outcome.status === "declined"
            ? { status: "declined" }
            : { status: "error", error: e instanceof Error ? e.message : String(e) },
        );
      }
    },
    [request, policy, responders],
  );

  return { ...state, responders, start };
}
