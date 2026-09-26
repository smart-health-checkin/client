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
