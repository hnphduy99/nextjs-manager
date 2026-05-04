/**
 * Auto Manager — Electron Purchase Client
 *
 * Handles user auth, plan browsing, order placement, and status polling
 * for the in-app purchase flow.
 *
 * Usage:
 *   import { PurchaseClient } from './purchase-client';
 *   const client = new PurchaseClient({ serverUrl: 'https://your-dashboard.com' });
 *   await client.login('user@example.com', 'password');
 *   const plans = await client.getPlans();
 *   const order = await client.createOrder(plans[1].id);
 *   // Show bankTransfer info to user, then poll:
 *   const key = await client.pollForLicenseKey(order.orderId);
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationDays: number | null; // null = Lifetime
}

export interface BankTransferInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferContent: string; // MUST include this in transfer description
  amount: number;
  currency: string;
}

export interface CreateOrderResult {
  orderId: string;
  status: "PENDING";
  plan: { id: string; name: string; durationDays: number | null };
  amount: number;
  currency: string;
  bankTransfer: BankTransferInfo;
  message: string;
}

export interface OrderStatus {
  orderId: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED";
  amount: number;
  currency: string;
  paidAt: string | null;
  licenseKey: string | null; // only set when status === "COMPLETED"
  license: {
    key: string;
    status: string;
    activatedAt: string | null;
    expiresAt: string | null;
  } | null;
}

export interface UserLicense {
  hasLicense: boolean;
  license: {
    key: string;
    status: string;
    plan: { name: string; durationDays: number | null; price: number; currency: string };
    activatedAt: string | null;
    expiresAt: string | null;
    isLifetime: boolean;
    activeDevice: { machineName: string | null; platform: string | null; lastHeartbeatAt: string } | null;
  } | null;
}

// ─── Purchase Client ──────────────────────────────────────────────────────────

export class PurchaseClient {
  private readonly serverUrl: string;
  private token: string | null = null;
  private userId: string | null = null;

  constructor({ serverUrl }: { serverUrl: string }) {
    this.serverUrl = serverUrl.replace(/\/$/, "");
  }

  private get authHeader(): Record<string, string> {
    if (!this.token) throw new Error("Not authenticated. Call login() first.");
    return { Authorization: `Bearer ${this.token}` };
  }

  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.serverUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      },
      signal: AbortSignal.timeout(10_000)
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({ error: res.statusText }))) as { error: string };
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  /**
   * Login and obtain a JWT token. Call this first.
   * Token is stored in memory; persist it yourself (e.g., electron-store).
   */
  async login(email: string, password: string): Promise<{ userId: string; name: string | null }> {
    const data = await this.fetch<{ token: string; userId: string; name: string | null }>("/api/auth/token", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    this.token = data.token;
    this.userId = data.userId;
    return { userId: data.userId, name: data.name };
  }

  /** Restore a previously saved token (e.g., from electron-store). */
  setToken(token: string, userId: string): void {
    this.token = token;
    this.userId = userId;
  }

  // ── Plans ───────────────────────────────────────────────────────────────────

  /** Fetch available plans. No auth required. */
  async getPlans(): Promise<Plan[]> {
    const data = await this.fetch<{ plans: Plan[] }>("/api/plans");
    return data.plans;
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  /** Place a purchase order. Returns bank transfer info to show to user. */
  async createOrder(planId: string): Promise<CreateOrderResult> {
    return this.fetch<CreateOrderResult>("/api/orders", {
      method: "POST",
      headers: this.authHeader,
      body: JSON.stringify({ planId })
    });
  }

  /** Check status of a specific order. */
  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    return this.fetch<OrderStatus>(`/api/orders/${orderId}/status`, {
      headers: this.authHeader
    });
  }

  /**
   * Poll until admin confirms the order or timeout is reached.
   * Returns the license key when COMPLETED, or null if timed out / cancelled.
   *
   * @param orderId The order to poll
   * @param intervalMs How often to poll (default: 15 seconds)
   * @param timeoutMs Total wait time (default: 30 minutes)
   */
  async pollForLicenseKey(orderId: string, intervalMs = 15_000, timeoutMs = 30 * 60 * 1000): Promise<string | null> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const status = await this.getOrderStatus(orderId);

      if (status.status === "COMPLETED" && status.licenseKey) {
        return status.licenseKey;
      }

      if (status.status === "CANCELLED") {
        return null;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return null; // timeout
  }

  // ── License Status ──────────────────────────────────────────────────────────

  /** Get current user's license info. Useful for profile/settings screen. */
  async getMyLicense(): Promise<UserLicense> {
    return this.fetch<UserLicense>("/api/me/license", {
      headers: this.authHeader
    });
  }
}

// ─── Full Purchase Flow Example ───────────────────────────────────────────────

/**
 * Complete purchase flow from login to license activation.
 *
 * @example
 * import { runPurchaseFlow } from './purchase-client';
 * import { LicenseClient } from './license-client';
 *
 * // Step 1: Purchase
 * const { licenseKey } = await runPurchaseFlow({
 *   serverUrl: 'https://your-dashboard.com',
 *   email: 'user@example.com',
 *   password: 'secretpassword',
 *   planId: '<plan-uuid>',
 *   onBankInfo: (info) => showTransferDialog(info),
 *   onPolling: () => showWaitingIndicator(),
 * });
 *
 * // Step 2: Activate license
 * const licenseClient = new LicenseClient({ serverUrl, licenseKey });
 * const result = await licenseClient.verify();
 */
export async function runPurchaseFlow({
  serverUrl,
  email,
  password,
  planId,
  onBankInfo,
  onPolling
}: {
  serverUrl: string;
  email: string;
  password: string;
  planId: string;
  onBankInfo?: (info: BankTransferInfo) => void;
  onPolling?: () => void;
}): Promise<{ licenseKey: string | null; orderId: string }> {
  const client = new PurchaseClient({ serverUrl });

  await client.login(email, password);
  const order = await client.createOrder(planId);

  onBankInfo?.(order.bankTransfer);
  onPolling?.();

  const licenseKey = await client.pollForLicenseKey(order.orderId);
  return { licenseKey, orderId: order.orderId };
}
