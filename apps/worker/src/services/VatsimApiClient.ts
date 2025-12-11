/**
 * VATSIM API Client
 * Following SRP: Only handles VATSIM API communication
 * Following DIP: Returns raw data, doesn't depend on database
 */

export interface VatsimController {
  cid: number;
  callsign: string;
  start: string;
  rating: number;
}

interface VatsimDataResponse {
  controllers: Array<{
    cid: number;
    callsign: string;
    logon_time: string;
    rating: number;
  }>;
}

export class VatsimApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly statusText?: string
  ) {
    super(message);
    this.name = 'VatsimApiError';
  }
}

export class VatsimApiClient {
  private readonly baseUrl = 'https://data.vatsim.net/v3';

  /**
   * Fetch all currently online controllers from VATSIM
   * @throws {VatsimApiError} If the API request fails or returns invalid data
   */
  async getOnlineControllers(): Promise<VatsimController[]> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/vatsim-data.json`);
    } catch (error) {
      throw new VatsimApiError(
        `Failed to connect to VATSIM API: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    if (!response.ok) {
      throw new VatsimApiError(
        `VATSIM API returned error: ${response.status} ${response.statusText}`,
        response.status,
        response.statusText
      );
    }

    let data: VatsimDataResponse;
    try {
      data = (await response.json()) as VatsimDataResponse;
    } catch (error) {
      throw new VatsimApiError(
        `Failed to parse VATSIM API response: ${error instanceof Error ? error.message : 'Invalid JSON'}`
      );
    }

    if (!data.controllers || !Array.isArray(data.controllers)) {
      throw new VatsimApiError(
        'VATSIM API returned invalid data structure: missing controllers array'
      );
    }

    return data.controllers.map((c) => ({
      cid: c.cid,
      callsign: c.callsign,
      start: c.logon_time,
      rating: c.rating
    }));
  }
}
