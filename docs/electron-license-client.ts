/**
 * Auto Manager — Electron License Client
 *
 * Drop this file into your Electron project and import it to handle
 * license verification, device binding, and heartbeat tracking.
 *
 * Usage:
 *   import { LicenseClient } from './license-client';
 *   const client = new LicenseClient({ serverUrl: 'https://your-dashboard.com', licenseKey: 'XXXX-XXXX-XXXX-XXXX' });
 *   const result = await client.verify();
 */

import { createHash } from "crypto";
import * as os from "os";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LicenseClientOptions {
  /** Base URL of your Next.js dashboard, e.g. https://dashboard.yourdomain.com */
  serverUrl: string;
  /** The license key to verify */
  licenseKey: string;
  /** How often to send heartbeats in milliseconds. Default: 30 minutes */
  heartbeatIntervalMs?: number;
  /** App name sent to the server for identification */
  appName?: string;
  /** App version */
  appVersion?: string;
}

export type LicenseStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "SUSPENDED" | "INVALID";

export interface VerifyResult {
  valid: boolean;
  status: LicenseStatus;
  message: string;
  expiresAt: string | null;
  plan: string | null;
  userId: string | null;
}

// ─── Machine ID ───────────────────────────────────────────────────────────────

/**
 * Generates a stable machine identifier based on hardware info.
 * This is hashed before sending to the server.
 */
function getMachineId(): string {
  const components = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model ?? "",
    os.totalmem().toString()
  ].join("|");

  return createHash("sha256").update(components).digest("hex");
}

// ─── LicenseClient class ─────────────────────────────────────────────────────

export class LicenseClient {
  private readonly serverUrl: string;
  private readonly licenseKey: string;
  private readonly heartbeatIntervalMs: number;
  private readonly machineId: string;
  private readonly appName: string;
  private readonly appVersion: string;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastResult: VerifyResult | null = null;

  constructor(options: LicenseClientOptions) {
    this.serverUrl = options.serverUrl.replace(/\/$/, "");
    this.licenseKey = options.licenseKey;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30 * 60 * 1000; // 30 min default
    this.machineId = getMachineId();
    this.appName = options.appName ?? "ElectronApp";
    this.appVersion = options.appVersion ?? "1.0.0";
  }

  /**
   * Verifies the license on startup.
   * Call this when the Electron app starts.
   *
   * @returns VerifyResult — check result.valid to gate access
   */
  async verify(): Promise<VerifyResult> {
    try {
      const res = await fetch(`${this.serverUrl}/api/license/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Name": this.appName,
          "X-Client-Version": this.appVersion
        },
        body: JSON.stringify({
          key: this.licenseKey,
          machineId: this.machineId,
          action: "verify",
          metadata: {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            appVersion: this.appVersion
          }
        }),
        signal: AbortSignal.timeout(10_000) // 10s timeout
      });

      const data = (await res.json()) as VerifyResult & { error?: string };

      if (!res.ok) {
        const result: VerifyResult = {
          valid: false,
          status: "INVALID",
          message: data.error ?? "License verification failed.",
          expiresAt: null,
          plan: null,
          userId: null
        };
        this.lastResult = result;
        return result;
      }

      this.lastResult = data;
      return data;
    } catch (err) {
      const isNetworkError = err instanceof TypeError;
      const result: VerifyResult = {
        valid: false,
        status: "INVALID",
        message: isNetworkError
          ? "Cannot reach license server. Check your internet connection."
          : "Unexpected error during license verification.",
        expiresAt: null,
        plan: null,
        userId: null
      };
      this.lastResult = result;
      return result;
    }
  }

  /**
   * Starts automatic heartbeat pings to keep the device session alive.
   * Call this after a successful verify().
   */
  startHeartbeat(): void {
    this.stopHeartbeat(); // prevent duplicate intervals

    this.heartbeatTimer = setInterval(async () => {
      try {
        await fetch(`${this.serverUrl}/api/license/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: this.licenseKey,
            machineId: this.machineId,
            action: "heartbeat"
          }),
          signal: AbortSignal.timeout(15_000)
        });
      } catch {
        // Heartbeat failures are non-fatal — app continues running.
        // The server will mark the session inactive if heartbeats
        // stop for an extended period.
      }
    }, this.heartbeatIntervalMs);

    // Allow Node.js to exit even if heartbeat is pending
    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }

  /** Stops the heartbeat timer. Call on app exit. */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** Returns the last verification result without making a network request */
  getLastResult(): VerifyResult | null {
    return this.lastResult;
  }

  /** The stable machine ID for this device */
  getMachineId(): string {
    return this.machineId;
  }
}

// ─── Convenience: full startup flow ──────────────────────────────────────────

/**
 * One-shot helper: verify license and start heartbeat if valid.
 *
 * @example
 * import { initLicense } from './license-client';
 *
 * const result = await initLicense({
 *   serverUrl: 'https://your-dashboard.com',
 *   licenseKey: storedKey,
 * });
 *
 * if (!result.valid) {
 *   showLicenseExpiredDialog(result.message);
 *   app.quit();
 * }
 */
export async function initLicense(options: LicenseClientOptions): Promise<{
  result: VerifyResult;
  client: LicenseClient;
}> {
  const client = new LicenseClient(options);
  const result = await client.verify();

  if (result.valid) {
    client.startHeartbeat();
  }

  return { result, client };
}
