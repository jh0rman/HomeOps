/**
 * Luz del Sur API Client - Lima Electricity Service
 * https://www.luzdelsur.pe
 */

import type { LuzDelSurLoginRequest, LuzDelSurLoginResponse } from "./types";

const BASE_URL = "https://www.luzdelsur.pe/es";

export class LuzDelSurClient {
  private authToken: string | null = null;
  private cookies: string | null = null;

  /**
   * User authentication with email and password
   */
  async login(
    email: string,
    password: string
  ): Promise<LuzDelSurLoginResponse> {
    const body: LuzDelSurLoginRequest = {
      request: {
        password,
        Correo: email,
        Plataforma: "WEB",
      },
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8",
    };

    if (this.cookies) {
      headers["Cookie"] = this.cookies;
    }

    const response = await fetch(`${BASE_URL}/Login/ValidarAcceso`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    // Capture cookies from response
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookies = setCookie;
    }

    const data = (await response.json()) as LuzDelSurLoginResponse;

    if (data.success && data.datos?.token) {
      this.authToken = data.datos.token;
    }

    return data;
  }

  /**
   * Checks if the user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authToken !== null;
  }

  /**
   * Gets the auth token
   */
  getToken(): string | null {
    return this.authToken;
  }

  /**
   * Gets the user's invoices
   * TODO: Implement when we discover the endpoint
   */
  async getInvoices(): Promise<unknown> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated. Call login() first.");
    }
    throw new Error(
      "Not implemented yet - need to discover the invoices endpoint"
    );
  }
}

// Singleton instance for easy usage
export const luzdelsur = new LuzDelSurClient();
