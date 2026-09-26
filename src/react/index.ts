/**
 * `@smart-health-checkin/client/react`: React bindings.
 *
 * - `<CheckinPicker>` renders the `<smart-checkin-picker>` web component and
 *   maps its events to callbacks. It is the same UI as the element; there is
 *   one implementation.
 * - `useCheckin` is for pages drawing their own buttons: it resolves the
 *   responders and runs the flow, opening web wallets inside the click.
 *
 * React is a peer dependency, needed only if you import this module.
 */

import { createElement, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { CheckinFlowError, requestCheckin, type CheckinOptions, type CheckinRequestInput } from "../kit/index.js";
import { resolveResponders, type Responder, type ResponderPolicy } from "../kit/responders.js";
import type { SmartCheckinResponse } from "../model/index.js";
import { startResponder } from "../picker/index.js";
import { defineCheckinPicker, type PickerOutcome, type SmartCheckinPicker } from "../ui/picker-element.js";
import type { PickerStrings } from "../ui/strings.js";

export type CheckinPickerProps = {
  /** What to ask for. Required unless `mode="pick"`. */
  request?: CheckinRequestInput;
  /** Wallet registry URL, or "demo". Omit for no web wallets. */
  wallets?: string;
  /** Offer the device's own wallet (default true). */
  platform?: boolean;
  /** Remember the last app used on this site (default false). */
  remember?: boolean;
  /** Offer the simulated responder. Development only. */
  mock?: boolean;
  /** "checkin" (default) runs the flow; "pick" only chooses. */
  mode?: "checkin" | "pick";
  theme?: "light" | "dark" | "auto";
  appearance?: "card" | "flat";
  /** Show the SMART Health Check-in mark (default true). */
  footer?: boolean;
  heading?: string;
  description?: string;
  strings?: Partial<PickerStrings>;
  /** A pre-resolved responder list, instead of `wallets` / `platform` / `mock`. */
  responders?: Responder[];
  checkinOptions?: Omit<CheckinOptions, "getCredential">;
  className?: string;
  style?: CSSProperties;
  onChoose?: (detail: { responder: Responder; getCredential?: (arg: unknown) => Promise<unknown>; cancel: () => void }) => void;
  onResponse?: (detail: { responder: Responder; response: SmartCheckinResponse }) => void;
  onDeclined?: (detail: { responder: Responder }) => void;
  onError?: (detail: { responder?: Responder; message: string }) => void;
  /** Receives the element, e.g. to call `setOutcome` in pick mode. */
  elementRef?: (element: (SmartCheckinPicker & HTMLElement) | null) => void;
};

/** The `<smart-checkin-picker>` element as a React component. */
export function CheckinPicker(props: CheckinPickerProps) {
  defineCheckinPicker();
  const ref = useRef<(SmartCheckinPicker & HTMLElement) | null>(null);
  const handlers = useRef(props);
  handlers.current = props;

  // Properties (not attributes) for the non-string inputs.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (props.request !== undefined) el.request = props.request;
    if (props.strings) el.strings = props.strings;
    if (props.checkinOptions) el.checkinOptions = props.checkinOptions;
    if (props.responders) el.responders = props.responders;
  }, [props.request, props.strings, props.checkinOptions, props.responders]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = (type: string, fn: (detail: never) => void) => {
      const listener = (e: Event) => fn((e as CustomEvent).detail as never);
      el.addEventListener(type, listener);
      return () => el.removeEventListener(type, listener);
    };
    const offs = [
      on("smart-checkin-choose", (d) => handlers.current.onChoose?.(d)),
      on("smart-checkin-response", (d) => handlers.current.onResponse?.(d)),
      on("smart-checkin-declined", (d) => handlers.current.onDeclined?.(d)),
      on("smart-checkin-error", (d) => handlers.current.onError?.(d)),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  const setRef = useCallback((el: (SmartCheckinPicker & HTMLElement) | null) => {
    ref.current = el;
    handlers.current.elementRef?.(el);
  }, []);

  return createElement("smart-checkin-picker", {
    ref: setRef,
    ...(props.wallets ? { wallets: props.wallets } : {}),
    ...(props.platform === false ? { platform: "off" } : {}),
    ...(props.remember ? { remember: "" } : {}),
    ...(props.mock ? { mock: "" } : {}),
    ...(props.mode ? { mode: props.mode } : {}),
    ...(props.theme ? { theme: props.theme } : {}),
    ...(props.appearance === "flat" ? { appearance: "flat" } : {}),
    ...(props.footer === false ? { footer: "off" } : {}),
    ...(props.heading ? { heading: props.heading } : {}),
    ...(props.description ? { description: props.description } : {}),
    ...(props.className ? { class: props.className } : {}),
    ...(props.style ? { style: props.style } : {}),
  });
}

export type CheckinState = {
  status: "idle" | "waiting" | "done" | "declined" | "error";
  response?: SmartCheckinResponse;
  error?: string;
};

/**
 * Resolve responders and run the flow, for pages that draw their own UI.
 * Call `start(responder)` directly from a click handler.
 */
export function useCheckin(request: CheckinRequestInput, policy: ResponderPolicy, options: Omit<CheckinOptions, "getCredential"> = {}) {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [state, setState] = useState<CheckinState>({ status: "idle" });

  useEffect(() => {
    let live = true;
    void resolveResponders(policy).then((list) => {
      if (live) setResponders(list);
    });
    return () => {
      live = false;
    };
  }, [policy]);

  const start = useCallback(
    (responder = responders.find((r) => r.isDefault)) => {
      if (!responder) return Promise.resolve();
      // Synchronous: opens a web wallet's tab while the click still allows it.
      const started = startResponder(responder, policy.origin ? { origin: policy.origin } : {});
      setState({ status: "waiting" });
      return requestCheckin(request, { ...options, ...(started.getCredential ? { getCredential: started.getCredential } : {}) }).then(
        (response) => setState({ status: "done", response }),
        (e: unknown) =>
          setState(
            e instanceof CheckinFlowError && e.outcome.status === "declined"
              ? { status: "declined" }
              : { status: "error", error: e instanceof Error ? e.message : String(e) },
          ),
      );
    },
    [request, policy, options, responders],
  );

  return { ...state, responders, start };
}

export type { PickerOutcome };
