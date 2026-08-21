/**
 * React binding — 25 lines over the vanilla core.
 *
 * There is no React (or Angular, or Vue) code inside the kit. The kit is a
 * plain async function; every framework binding is a thin wrapper that owns
 * only its own loading/error state.
 */

import { useCallback, useState } from "react";
import {
  CheckinFlowError,
  requestCheckin,
  type CheckinOptions,
  type CheckinRequestInput,
  type SmartCheckinResponse,
} from "../../../src/index.js";

export type CheckinState = {
  status: "idle" | "waiting" | "done" | "declined" | "error";
  response?: SmartCheckinResponse;
  error?: string;
};

export function useCheckin(request: CheckinRequestInput, options?: CheckinOptions) {
  const [state, setState] = useState<CheckinState>({ status: "idle" });

  const start = useCallback(async () => {
    setState({ status: "waiting" });
    try {
      const response = await requestCheckin(request, options);
      setState({ status: "done", response });
      return response;
    } catch (e) {
      if (e instanceof CheckinFlowError && e.outcome.status === "declined") {
        setState({ status: "declined" });
      } else {
        setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
      }
      return undefined;
    }
  }, [request, options]);

  return { ...state, start };
}
