/**
 * instrumentation.ts
 *
 * 2026-08-30. Next's documented runtime-split pattern.
 *
 * register() is called in EVERY runtime and instrumentation is compiled for both,
 * so the Node-only work lives in ./instrumentation-node and is imported inside the
 * guard. A dedicated file is a chunk boundary the edge build can skip; a shared lib
 * module reachable from other code is not — that distinction is what made three
 * webpack workarounds fail before the documentation was read.
 *
 * CR AudioViz AI, LLC · EIN 39-3646201
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }
}
