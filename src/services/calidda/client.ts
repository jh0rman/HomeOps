/**
 * Cálidda API Client - Lima Gas Service
 * https://www.calidda.com.pe
 */

import type {
  CaliddaLoginRequest,
  CaliddaLoginResponse,
  CaliddaTokenResponse,
  CaliddaAccountsResponse,
  CaliddaAccountStatementResponse,
} from "./types";

const BASE_URL = "https://appadmin.calidda.com.pe/Back/api";
const BASE_URL_OV = "https://appadmin.calidda.com.pe/BackOV/api";

export class CaliddaClient {
  private accessToken: string | null = null;
  private temporaryAccessId: string | null = null;

  /**
   * Step 1: Request temporary access with email and password
   */
  async requestAccess(
    email: string,
    password: string
  ): Promise<CaliddaLoginResponse> {
    const body: CaliddaLoginRequest = {
      username: email,
      password,
      platform: 2, // Web platform
      ctaCto: "",
    };

    const response = await fetch(`${BASE_URL}/Login/TemporaryAccessV2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as CaliddaLoginResponse;

    // The temporaryAccessId comes in the 'data' field
    if (data.valid && data.data) {
      this.temporaryAccessId = data.data;
    }

    return data;
  }

  /**
   * Step 2: Exchange temporary access ID for a bearer token
   */
  async getAccessToken(
    temporaryAccessId?: string
  ): Promise<CaliddaTokenResponse> {
    const accessId = temporaryAccessId ?? this.temporaryAccessId;

    if (!accessId) {
      throw new Error("No temporary access ID. Call requestAccess() first.");
    }

    const response = await fetch(
      `${BASE_URL}/Login/TemporaryAccessToken?temporaryAccessId=${accessId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
          Authorization: "Bearer null",
        },
      }
    );

    const data = (await response.json()) as CaliddaTokenResponse;

    // The JWT token comes in the 'data' field
    if (data.valid && data.data) {
      this.accessToken = data.data;
    }

    return data;
  }

  /**
   * Full login flow: request access + get token
   */
  async login(
    email: string,
    password: string
  ): Promise<{
    accessResponse: CaliddaLoginResponse;
    tokenResponse: CaliddaTokenResponse | null;
  }> {
    const accessResponse = await this.requestAccess(email, password);

    let tokenResponse: CaliddaTokenResponse | null = null;
    if (this.temporaryAccessId) {
      tokenResponse = await this.getAccessToken();
    }

    return { accessResponse, tokenResponse };
  }

  /**
   * Checks if the user is authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Gets the temporary access ID
   */
  getTemporaryAccessId(): string | null {
    return this.temporaryAccessId;
  }

  /**
   * Gets the auth token (JWT)
   */
  getToken(): string | null {
    return this.accessToken;
  }

  /**
   * Gets the authenticated headers with Bearer token
   */
  private getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) {
      throw new Error("User not authenticated. Call login() first.");
    }
    return {
      Accept: "application/json, text/plain, */*",
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  /**
   * Lists user's accounts
   */
  async getAccounts(): Promise<CaliddaAccountsResponse> {
    const response = await fetch(`${BASE_URL_OV}/Account/List`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    const data = (await response.json()) as CaliddaAccountsResponse;
    return data;
  }

  /**
   * Gets account statement with invoices
   * @param clientCode - The client code
   */
  async getAccountStatement(
    clientCode: string
  ): Promise<CaliddaAccountStatementResponse> {
    const response = await fetch(
      `${BASE_URL_OV}/Account/GetAccountStatement?clientCode=${clientCode}`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );

    const data = (await response.json()) as CaliddaAccountStatementResponse;
    return data;
  }
}

// Singleton instance for easy usage
export const calidda = new CaliddaClient();
