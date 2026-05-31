import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Load-bearing cross-peer assertion for the ADVERTISED core action:
 *
 *   "Tap one of five face emojis; the aggregate updates instantly. The room
 *    sees aggregate mood, never who said what."
 *
 * Concretely: each phone writes its vote into a shared
 * `Y.Map<peerId, { mood: 0..4, date }>("moods")` (last-write-wins per peer),
 * and every phone renders today's aggregate (stacked bar + per-mood count
 * pills + "N moods today" total) by counting all peers' same-date entries.
 *
 * This test casts DISTINCT moods on the two peers and asserts the OPPOSITE
 * peer's aggregate reflects BOTH votes — proving the vote propagated peer to
 * peer over the Yjs doc, not just into local React state.
 */

const FACES = ["😞", "😕", "😐", "🙂", "😄"] as const;

test("a mood cast on peer A appears in peer B's live aggregate (and vice versa)", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Connect both peers (arms the Yjs room + observer).
    await a.getByRole("button", { name: /connect/i }).click();
    await b.getByRole("button", { name: /connect/i }).click();

    // Both reach the live stage (mood cells visible).
    await expect(a.locator(".mood-cells")).toBeVisible();
    await expect(b.locator(".mood-cells")).toBeVisible();

    // Before anyone votes, the stacked bar shows the empty state.
    await expect(a.locator(".mood-stacked-empty")).toBeVisible();

    // Peer A taps "great" (mood index 4); peer B taps "low" (mood index 1).
    await a.getByRole("button", { name: "great" }).click();
    await b.getByRole("button", { name: "low" }).click();

    // THE LOAD-BEARING ASSERTION: peer B's aggregate must show BOTH votes.
    // The HUD total is "2 moods today" only if A's vote crossed the mesh —
    // B alone would read "1 mood today".
    await expect(b.locator(".mood-hud")).toContainText(/2 moods today/, { timeout: 15_000 });

    // And the per-mood pills on B must reflect one "great" (A) + one "low" (B).
    const bGreatPill = b.locator(".mood-count-pill", { hasText: FACES[4] });
    const bLowPill = b.locator(".mood-count-pill", { hasText: FACES[1] });
    await expect(bGreatPill.locator(".mood-count-num")).toHaveText("1");
    await expect(bLowPill.locator(".mood-count-num")).toHaveText("1");

    // Symmetric: peer A also sees the full aggregate (B's vote reached A).
    await expect(a.locator(".mood-hud")).toContainText(/2 moods today/, { timeout: 15_000 });
    const aLowPill = a.locator(".mood-count-pill", { hasText: FACES[1] });
    await expect(aLowPill.locator(".mood-count-num")).toHaveText("1");

    // The empty-state placeholder is gone now that votes exist.
    await expect(b.locator(".mood-stacked-empty")).toHaveCount(0);
    await expect(b.locator(".mood-stacked")).toBeVisible();
  } finally {
    await cleanup();
  }
});
