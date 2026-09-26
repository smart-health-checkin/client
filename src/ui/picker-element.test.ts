import { expect, test } from "bun:test";

// Stand-in for a browser upgrade: when a custom element is defined after the
// page already created it, the constructor runs on the existing element. A
// base class whose constructor returns that element reproduces this without
// a DOM, so class fields and the upgrade code run on an object that already
// carries properties the page set.
let existing: object | undefined;
(globalThis as { HTMLElement?: unknown }).HTMLElement = class {
  constructor() {
    if (existing) return Object.setPrototypeOf(existing, new.target.prototype);
  }
};
const { SmartCheckinPicker } = await import("./picker-element.js");

function upgrade(props: Record<string, unknown>) {
  existing = { ...props };
  try {
    return new SmartCheckinPicker() as unknown as Record<string, unknown>;
  } finally {
    existing = undefined;
  }
}

test("properties set before the element is defined survive the upgrade", () => {
  const request = { purpose: "Visit", items: [] };
  const checkinOptions = { healthCards: { accept: "any-valid" } };
  const wallets = [{ id: "w" }];
  const el = upgrade({ request, checkinOptions, wallets, strings: { heading: "Pick one" } });

  expect(el.request).toBe(request);
  expect(el.checkinOptions).toBe(checkinOptions);
  expect(el.wallets).toBe(wallets);
  expect((el.strings as { heading: string }).heading).toBe("Pick one");
  // The values went through the accessors, not left as own properties.
  for (const name of ["request", "checkinOptions", "wallets", "strings"]) {
    expect(Object.prototype.hasOwnProperty.call(el, name)).toBe(false);
  }
});

test("an element created after definition starts empty", () => {
  const el = new SmartCheckinPicker() as unknown as Record<string, unknown>;
  expect(el.request).toBeUndefined();
  expect(el.checkinOptions).toEqual({});
  expect(el.wallets).toBeUndefined();
});

// ---- motion

const { PICKER_CSS } = await import("./styles.js");

function withAttributes(el: Record<string, unknown>) {
  const attrs = new Map<string, string>();
  el.getAttribute = (n: string) => attrs.get(n) ?? null;
  el.setAttribute = (n: string, v: string) => void attrs.set(n, String(v));
  el.hasAttribute = (n: string) => attrs.has(n);
  return attrs;
}

// Render one view into a stand-in container and return its HTML.
function renderView(view: unknown, attrs: Record<string, string> = {}): string {
  const el = new SmartCheckinPicker() as unknown as Record<string, unknown>;
  const a = withAttributes(el);
  for (const [k, v] of Object.entries(attrs)) a.set(k, v);
  const main = { innerHTML: "", querySelectorAll: () => [] };
  el.main = main;
  el.view = view;
  (el.render as () => void).call(el);
  return main.innerHTML;
}

const wallet = { id: "w", name: "Demo wallet", kind: "web" };

test("motion reflects the attribute and defaults to subtle", () => {
  const el = new SmartCheckinPicker() as unknown as Record<string, unknown>;
  const attrs = withAttributes(el);
  expect(el.motion).toBe("subtle");
  el.motion = "none";
  expect(attrs.get("motion")).toBe("none");
  expect(el.motion).toBe("none");
  attrs.set("motion", "anything-else");
  expect(el.motion).toBe("subtle");
});

test("motion set before the element is defined becomes the attribute", () => {
  const el = upgradeWithAttributes({ motion: "none" });
  expect(el.motion).toBe("none");
  expect(Object.prototype.hasOwnProperty.call(el, "motion")).toBe(false);
});

function upgradeWithAttributes(props: Record<string, unknown>) {
  const attrs = new Map<string, string>();
  existing = {
    ...props,
    getAttribute: (n: string) => attrs.get(n) ?? null,
    setAttribute: (n: string, v: string) => void attrs.set(n, v),
  };
  try {
    return new SmartCheckinPicker() as unknown as Record<string, unknown>;
  } finally {
    existing = undefined;
  }
}

test("each view marks its state, and the status carries the mark", () => {
  const waiting = renderView({ kind: "waiting", wallet });
  expect(waiting).toContain('data-state="waiting"');
  expect(waiting).toContain('part="mark"');
  expect(waiting).toContain('class="veil"');
  expect(waiting).not.toContain('part="check"');

  const done = renderView({ kind: "done", wallet });
  expect(done).toContain('data-state="done"');
  expect(done).toContain('part="check"');
  expect(done).not.toContain('class="veil"');

  const declined = renderView({ kind: "declined", wallet });
  expect(declined).toContain('data-state="declined"');
  expect(declined).toContain('part="mark"');
  expect(declined).not.toContain('class="veil"');
});

test("motion none and reduced motion stop every animation and hide the sweep", () => {
  expect(PICKER_CSS).toContain(':host([motion="none"]) *, :host([motion="none"]) *::before, :host([motion="none"]) *::after { animation: none !important; transition: none !important; }');
  expect(PICKER_CSS).toContain(':host([motion="none"]) .sweep { display: none; }');
  const reduced = PICKER_CSS.slice(PICKER_CSS.indexOf("@media (prefers-reduced-motion: reduce)"));
  expect(reduced).toContain("animation: none !important; transition: none !important;");
  expect(reduced).toContain(".sweep { display: none; }");
});

test("the sweep is a rotating veil in the surface color, scaled by the speed property", () => {
  expect(PICKER_CSS).toContain("--_m: var(--smart-checkin-motion-speed, 1)");
  expect(PICKER_CSS).toContain("color-mix(in srgb, var(--_surface) 58%, transparent)");
  expect(PICKER_CSS).toContain("animation: smart-checkin-sweep calc(2.6s * var(--_m)) linear infinite");
  expect(PICKER_CSS).toMatch(/@keyframes smart-checkin-sweep \{ to \{ transform: rotate\(360deg\); \} \}/);
});
