import type { Env } from "../types";

const VATSIM_BOOKINGS_BASE = "https://atc-bookings.vatsim.net/api/booking";

export type VatsimBookingType = "booking" | "event" | "exam" | "training";

export type VatsimBookingRecord = {
  id: number;
  callsign: string;
  cid: number;
  type: VatsimBookingType;
  start: string;
  end: string;
  division?: string | null;
  subdivision?: string | null;
};

export type VatsimBookingCreateInput = {
  callsign: string;
  cid: number;
  start: string;
  end: string;
  type?: VatsimBookingType;
  division?: string | null;
  subdivision?: string | null;
};

export type VatsimBookingUpdateInput = Partial<VatsimBookingCreateInput>;

export type VatsimBookingListParams = {
  key_only?: boolean;
  callsign?: string;
  cid?: number;
  date?: string;
  type?: VatsimBookingType;
  division?: string;
  subdivision?: string;
  sort?: "start" | "end" | "callsign";
  sort_dir?: "asc" | "desc";
};

function formatVatsimBookingTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

export function formatBookingTimesForVatsim(start: Date, end: Date): {
  start: string;
  end: string;
} {
  return {
    start: formatVatsimBookingTime(start),
    end: formatVatsimBookingTime(end),
  };
}

async function readVatsimBookingsBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text.slice(0, 500) };
  }
}

function vatsimBookingsErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

export class VatsimBookingsApi {
  private token: string;

  constructor(token: string) {
    if (!token.trim()) {
      throw new Error("VATSIM_BOOKINGS_API_TOKEN is not configured");
    }
    this.token = token;
  }

  static fromEnv(env: Pick<Env, "VATSIM_BOOKINGS_API_TOKEN">): VatsimBookingsApi {
    return new VatsimBookingsApi(env.VATSIM_BOOKINGS_API_TOKEN);
  }

  private headers(json = true): HeadersInit {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
    };
    if (json) {
      headers["Content-Type"] = "application/json";
      headers.Accept = "application/json";
    }
    return headers;
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    fallback: string,
  ): Promise<T> {
    const response = await fetch(`${VATSIM_BOOKINGS_BASE}${path}`, init);
    const body = await readVatsimBookingsBody(response);

    if (!response.ok) {
      throw new Error(
        vatsimBookingsErrorMessage(
          body,
          `${fallback}: ${response.status} ${response.statusText}`,
        ),
      );
    }

    return body as T;
  }

  async list(params: VatsimBookingListParams = {}): Promise<VatsimBookingRecord[]> {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      search.set(key, String(value));
    }
    const query = search.toString();
    return this.request<VatsimBookingRecord[]>(
      query ? `?${query}` : "",
      { method: "GET", headers: this.headers(false) },
      "Failed to list VATSIM bookings",
    );
  }

  async get(id: number): Promise<VatsimBookingRecord> {
    return this.request<VatsimBookingRecord>(
      `/${id}`,
      { method: "GET", headers: this.headers(false) },
      `Failed to fetch VATSIM booking ${id}`,
    );
  }

  async create(input: VatsimBookingCreateInput): Promise<VatsimBookingRecord> {
    return this.request<VatsimBookingRecord>(
      "",
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(input),
      },
      "Failed to create VATSIM booking",
    );
  }

  async update(
    id: number,
    input: VatsimBookingUpdateInput,
  ): Promise<VatsimBookingRecord> {
    return this.request<VatsimBookingRecord>(
      `/${id}`,
      {
        method: "PUT",
        headers: this.headers(),
        body: JSON.stringify(input),
      },
      `Failed to update VATSIM booking ${id}`,
    );
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${VATSIM_BOOKINGS_BASE}/${id}`, {
      method: "DELETE",
      headers: this.headers(false),
    });

    // Already gone on VATSIM — treat as success so local cancel/forfeit can proceed.
    if (response.status === 204 || response.status === 404) {
      return;
    }

    const body = await readVatsimBookingsBody(response);
    if (!response.ok) {
      throw new Error(
        vatsimBookingsErrorMessage(
          body,
          `Failed to delete VATSIM booking ${id}: ${response.status} ${response.statusText}`,
        ),
      );
    }
  }
}
