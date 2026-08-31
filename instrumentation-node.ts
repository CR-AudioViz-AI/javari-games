/**
 * instrumentation-node.ts
 *
 * The Node-only half of the instrumentation hook.
 *
 * TWO INDEPENDENT FAILURES WERE FOUND HERE AND BOTH ARE FIXED:
 *
 *   1. THE PROXY. installEnvShim used to replace process.env with a Proxy,
 *      putting our code on every env read the framework makes. Fatal under
 *      Next 15 — every request returned 500, including 404s. It now hydrates
 *      plain string values instead.
 *
 *   2. THE BLOCKING WARM. register() is awaited by Next and MUST COMPLETE
 *      BEFORE THE SERVER ACCEPTS ANY REQUEST. This awaited 40 vault fetches,
 *      each a network round trip plus AES-GCM decryption. Not the cause of the
 *      500 — isolation proved that — but a real outage waiting for a slow vault.
 *
 * So hydration is fired and NOT awaited. Secrets that have not landed yet simply
 * read as whatever Vercel already set, which is the behaviour the app had before
 * the vault existed. Degrading to the previous configuration is acceptable;
 * refusing to boot is not.
 *
 * CR AudioViz AI, LLC · EIN 39-3646201
 */

export async function registerNode(): Promise<void> {
  let installEnvShim: () => Promise<{ hydrated: number; skipped: number }>;

  try {
    ({ installEnvShim } = await import("@/lib/platform-secrets/env-shim"));
  } catch (e) {
    console.warn(
      JSON.stringify({
        level: "WARN",
        event: "ENV_SHIM_IMPORT_FAILED",
        message: e instanceof Error ? e.message : String(e),
      }),
    );
    return;
  }

  // NOT AWAITED. The server comes up now.
    // 2026-08-31: AWAITED, BOUNDED. The fire-and-forget version raced:
    //
    //   boot starts -> hydration begins -> server ACCEPTS REQUESTS IMMEDIATELY ->
    //   a request reads process.env.SOME_KEY -> undefined -> 401 from the provider
    //
    // With a Vercel copy present the value is there from the first millisecond and
    // the race is invisible. Remove the copy and every COLD START hits the window —
    // on serverless every cold start is a fresh process, so it recurs constantly.
    // Proven on core: deleting 54 verified-identical vars turned /api/health from
    // groq:ok to groq:error:401 until this was fixed.
    //
    // Bounded, because an unbounded await here is a refusal to boot. A vault that
    // will not answer costs HYDRATION_TIMEOUT_MS and the app then runs on whatever
    // Vercel still holds — degrading to the previous configuration is acceptable.
    const HYDRATION_TIMEOUT_MS = 4000;
    const hydrationStarted = Date.now();
    let outcome: { hydrated: number; skipped: number } | null = null;
    try {
      outcome = (await Promise.race([
        installEnvShim(),
        new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), HYDRATION_TIMEOUT_MS),
        ),
      ])) as { hydrated: number; skipped: number } | null;
    } catch (e) {
      console.warn(
        JSON.stringify({
          level: "WARN",
          event: "ENV_HYDRATION_FAILED",
          message: e instanceof Error ? e.message : String(e),
        }),
      );
    }
    console.log(
      JSON.stringify({
        level: outcome ? "INFO" : "WARN",
        event: outcome ? "ENV_HYDRATED" : "ENV_HYDRATION_TIMEOUT",
        hydrated: outcome?.hydrated ?? 0,
        ms: Date.now() - hydrationStarted,
      }),
    );
}
