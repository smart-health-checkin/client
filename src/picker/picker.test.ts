import { describe, expect, test } from "bun:test";
import type { Responder } from "../kit/responders.js";
import { arrangeResponders, monogram } from "./index.js";

const platform = (available: boolean): Responder => ({ id: "platform", kind: "platform", name: "Your own health app", available, isDefault: false });
const web = (id: string): Responder => ({ id, kind: "web", name: id, available: true, isDefault: false, wallet: { id, name: id, walletUrl: `https://${id}.example/` } });
const ids = (list: Responder[]) => list.map((r) => r.id);

describe("arrangeResponders", () => {
  test("the platform wallet leads when available; web wallets follow in order", () => {
    const a = arrangeResponders([platform(true), web("a"), web("b")]);
    expect(a.primary?.id).toBe("platform");
    expect(ids(a.inline)).toEqual(["a", "b"]);
    expect(a.more).toEqual([]);
  });

  test("an unavailable platform wallet is hidden, not shown disabled", () => {
    const a = arrangeResponders([platform(false), web("a"), web("b")]);
    expect(a.primary).toBeUndefined();
    expect(ids(a.all)).toEqual(["a", "b"]);
  });

  test("a single option becomes the primary action", () => {
    const a = arrangeResponders([platform(false), web("only")]);
    expect(a.primary?.id).toBe("only");
    expect(a.inline).toEqual([]);
  });

  test("up to five web wallets show inline; past that, four and the rest under more", () => {
    const five = arrangeResponders([platform(true), ...["a", "b", "c", "d", "e"].map(web)]);
    expect(ids(five.inline)).toEqual(["a", "b", "c", "d", "e"]);
    const nine = arrangeResponders([platform(true), ...["a", "b", "c", "d", "e", "f", "g", "h", "i"].map(web)]);
    expect(ids(nine.inline)).toEqual(["a", "b", "c", "d"]);
    expect(ids(nine.more)).toEqual(["e", "f", "g", "h", "i"]);
    expect(nine.all).toHaveLength(10);
  });

  test("a remembered choice leads, and the rest (platform included) stay reachable", () => {
    const a = arrangeResponders([platform(true), web("a"), web("b")], { preferred: "b" });
    expect(a.primary?.id).toBe("b");
    expect(a.remembered?.id).toBe("b");
    expect(ids(a.inline)).toEqual(["platform", "a"]);
  });

  test("a remembered choice that is no longer available is ignored", () => {
    const a = arrangeResponders([platform(true), web("a")], { preferred: "gone" });
    expect(a.primary?.id).toBe("platform");
    expect(a.remembered).toBeUndefined();
  });

  test("nothing available", () => {
    const a = arrangeResponders([platform(false)]);
    expect(a.primary).toBeUndefined();
    expect(a.all).toEqual([]);
  });
});

test("monogram is stable and uses the first letter", () => {
  expect(monogram("flexpa").letter).toBe("F");
  expect(monogram("Flexpa Health Wallet")).toEqual(monogram("Flexpa Health Wallet"));
});
