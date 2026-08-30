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
  void installEnvShim()
    .then((r) => {
      console.log(
        JSON.stringify({
          level: "INFO",
          event: "ENV_HYDRATED",
          hydrated: r.hydrated,
          skipped: r.skipped,
        }),
      );
    })
    .catch((e: unknown) => {
      // Logged, never thrown. An unhandled rejection at boot is the same outage
      // by a different route.
      console.warn(
        JSON.stringify({
          level: "WARN",
          event: "ENV_HYDRATION_FAILED",
          message: e instanceof Error ? e.message : String(e),
        }),
      );
    });
}
