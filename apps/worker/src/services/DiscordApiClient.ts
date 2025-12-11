/**
 * Discord API Client
 * Following SRP: Only handles Discord API communication and rate limiting
 */

interface DiscordRole {
  id: string;
  name: string;
  managed: boolean;
}

interface DiscordMember {
  roles: string[];
  nick: string | null;
  user: {
    id: string;
  };
}

interface ApiRequest {
  method: string;
  endpoint: string;
  body?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

export class DiscordApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly endpoint: string
  ) {
    super(message);
    this.name = 'DiscordApiError';
  }
}

export class DiscordApiClient {
  private readonly baseUrl = 'https://discord.com/api';

  constructor(
    private readonly botToken: string,
    private readonly guildId: string
  ) {}

  /**
   * Fetch all roles from the guild
   */
  async getGuildRoles(): Promise<DiscordRole[]> {
    const endpoint = `/guilds/${this.guildId}/roles`;
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw await this.createApiError(response, endpoint);
    }

    return response.json() as Promise<DiscordRole[]>;
  }

  /**
   * Fetch all members from the guild (up to 1000)
   */
  async getGuildMembers(limit = 1000): Promise<DiscordMember[]> {
    const endpoint = `/guilds/${this.guildId}/members?limit=${limit}`;
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw await this.createApiError(response, endpoint);
    }

    return response.json() as Promise<DiscordMember[]>;
  }

  /**
   * Create a DiscordApiError from a failed response
   */
  private async createApiError(response: Response, endpoint: string): Promise<DiscordApiError> {
    let errorMessage = `Discord API error: ${response.status} ${response.statusText}`;

    try {
      const errorBody = await response.text();
      if (errorBody) {
        // Try to parse as JSON for more details
        try {
          const errorJson = JSON.parse(errorBody);
          if (errorJson.message) {
            errorMessage += ` - ${errorJson.message}`;
          }
        } catch {
          // Not JSON, append raw text if short enough
          if (errorBody.length < 200) {
            errorMessage += ` - ${errorBody}`;
          }
        }
      }
    } catch {
      // Couldn't read response body, use default message
    }

    return new DiscordApiError(errorMessage, response.status, response.statusText, endpoint);
  }

  /**
   * Execute a batch of API requests with rate limiting
   */
  async executeBatch(requests: ApiRequest[], isDev = false): Promise<void> {
    for (const request of requests) {
      await this.executeRequest(request, isDev);
    }
  }

  private async executeRequest(request: ApiRequest, isDev: boolean): Promise<void> {
    const { method, endpoint, body, headers, query } = request;
    const url = new URL('/api' + endpoint, 'https://discord.com');

    if (query) {
      Object.entries(query).forEach(([key, value]) => url.searchParams.append(key, value));
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        ...headers,
        ...this.getHeaders()
      },
      body
    });

    if (!response.ok) {
      console.error(
        `Discord API request failed: ${response.status} ${response.statusText} for ${url.href}`
      );
    } else if (isDev) {
      console.log(`[DEV] Discord API request successful: ${response.status} for ${url.href}`);
    }

    await this.handleRateLimit(response);
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bot ${this.botToken}`,
      'Content-Type': 'application/json'
    };
  }

  private async handleRateLimit(response: Response): Promise<void> {
    if (response.headers.get('x-ratelimit-remaining') === '0') {
      const resetTime = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10) * 1000;
      const currentTime = Date.now();
      const waitTime = resetTime - currentTime + 1000; // buffer
      console.log(`Rate limit hit, waiting for ${waitTime}ms`);
      await this.sleep(waitTime);
    } else {
      await this.sleep(1000);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a request to update a member's roles and nickname
   */
  createMemberUpdateRequest(
    memberId: string,
    roles: string[],
    nick: string | null,
    reason: string
  ): ApiRequest {
    return {
      method: 'PATCH',
      endpoint: `/guilds/${this.guildId}/members/${memberId}`,
      body: JSON.stringify({ roles, nick }),
      headers: { 'X-Audit-Log-Reason': reason }
    };
  }
}
