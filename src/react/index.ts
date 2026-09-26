/**
 * `@smart-health-checkin/client/react`: React bindings.
 *
 * - `<CheckinPicker>` renders the `<smart-checkin-picker>` web component and
 *   maps its events to callbacks. It is the same UI as the element; there is
 *   one implementation.
 * - `useCheckin` is for pages drawing their own buttons: it lists the
 *   wallets and runs the flow, opening web wallets inside the click.
 * - Importing this module also types `<smart-checkin-picker>` for JSX, for
 *   pages that use the element directly.
 *
 * React is a peer dependency, needed only if you import this module.
 */

import { createElement, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { CheckinOptions, CheckinResult } from "../core/run.js";
import type { CheckinRequestInput } from "../core/request.js";
import type { CheckinResponse } from "../core/response.js";
import type { CheckinErrorCode } from "../core/errors.js";
import { wallets as listWallets, type Wallet, type WalletSession, type WalletsOptions } from "../core/wallets.js";
import { defineCheckinPicker, type PickerOutcome, type SmartCheckinPicker } from "../ui/picker-element.js";
import type { PickerStrings } from "../ui/strings.js";

export type CheckinPickerProps = {
  /** What to ask for. Required unless `mode="pick"`. */
  request?: CheckinRequestInput;
  /** Wallet registry URL. Omit for no web wallets. */
  registry?: string;
  /** Offer the device's own wallet (default true). */
  platform?: boolean;
  /** Remember the last app used on this site (default false). */
  remember?: boolean;
  /** Offer the simulated wallet. Development only. */
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
  /** The wallets to offer (from `wallets()`), instead of `registry` / `platform` / `mock`. */
  wallets?: Wallet[];
  checkinOptions?: Omit<CheckinOptions, "wallet" | "signal" | "session">;
  className?: string;
  style?: CSSProperties;
  onChoose?: (detail: { wallet: Wallet; session?: WalletSession }) => void;
  /** `response` is absent when a server holding the keys kept the data (`result.status` is "kept-on-server"). */
  onResponse?: (detail: { wallet: Wallet; response?: CheckinResponse; result: CheckinResult }) => void;
  onDeclined?: (detail: { wallet: Wallet; result?: CheckinResult }) => void;
  onError?: (detail: { wallet?: Wallet; code?: CheckinErrorCode; message: string }) => void;
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
    if (props.wallets) el.wallets = props.wallets;
  }, [props.request, props.strings, props.checkinOptions, props.wallets]);

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
    ...(props.registry ? { registry: props.registry } : {}),
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

/**
 * For pages drawing their own buttons: the wallets to offer, and `start`,
 * which runs a check-in with one of them. Call `start(wallet)` from a click
 * handler; it opens a web wallet's tab inside the click.
 */
export function useCheckin(
  request: CheckinRequestInput,
  options: WalletsOptions & Omit<CheckinOptions, "wallet" | "signal" | "session"> = {},
) {
  const [list, setList] = useState<Wallet[]>([]);
  const [status, setStatus] = useState<"idle" | "waiting" | CheckinResult["status"]>("idle");
  const [result, setResult] = useState<CheckinResult | undefined>();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let live = true;
    void listWallets(optionsRef.current).then((l) => {
      if (live) setList(l);
    });
    return () => {
      live = false;
    };
  }, [options.registry, options.platform]);

  const start = useCallback(
    (wallet: Wallet | undefined = list[0]) => {
      if (!wallet) return Promise.resolve(undefined);
      const { keys, healthCards, fetch } = optionsRef.current;
      const running = wallet.start(request, { ...(keys ? { keys } : {}), ...(healthCards ? { healthCards } : {}), ...(fetch ? { fetch } : {}) });
      setStatus("waiting");
      return running.then((r) => {
        setResult(r);
        setStatus(r.status);
        return r;
      });
    },
    [request, list],
  );

  return { wallets: list, start, status, result, response: result?.status === "completed" ? result.response : undefined };
}

export type { PickerOutcome };

/** Attributes of `<smart-checkin-picker>` when written directly in JSX. Set `request` and the other properties through a ref. */
export type SmartCheckinPickerAttributes = {
  registry?: string;
  platform?: "off";
  remember?: boolean | "";
  mock?: boolean | "";
  mode?: "checkin" | "pick";
  theme?: "light" | "dark" | "auto";
  appearance?: "flat";
  footer?: "off";
  heading?: string;
  description?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "smart-checkin-picker": React.DetailedHTMLProps<React.HTMLAttributes<SmartCheckinPicker>, SmartCheckinPicker> &
        SmartCheckinPickerAttributes & { class?: string };
    }
  }
}
