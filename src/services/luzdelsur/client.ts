/**
 * Luz del Sur API Client - Lima Electricity Service
 * https://www.luzdelsur.pe
 */

import type {
  LuzDelSurLoginRequest,
  LuzDelSurLoginResponse,
  LuzDelSurSuppliesRequest,
  LuzDelSurSuppliesResponse,
  LuzDelSurLatestInvoiceRequest,
  LuzDelSurLatestInvoiceResponse,
} from "./types";

const BASE_URL = "https://www.luzdelsur.pe/es";

export class LuzDelSurClient {
  private authToken: string | null = null;
  private userEmail: string | null = null;

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

    const response = await fetch(`${BASE_URL}/Login/ValidarAcceso`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as LuzDelSurLoginResponse;

    if (data.success && data.datos?.token) {
      this.authToken = data.datos.token;
      this.userEmail = email;
    }

    return data;
  }

  /**
   * Checks if the user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authToken !== null && this.userEmail !== null;
  }

  /**
   * Gets the auth token
   */
  getToken(): string | null {
    return this.authToken;
  }

  /**
   * Lists user's supplies (suministros)
   */
  async getSupplies(): Promise<LuzDelSurSuppliesResponse> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated. Call login() first.");
    }

    const body: LuzDelSurSuppliesRequest = {
      request: {
        Token: this.authToken!,
        Correo: this.userEmail!,
      },
    };

    const response = await fetch(
      `${BASE_URL}/InformacionGuardada/ListarSuministros`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(body),
      }
    );

    const data = (await response.json()) as LuzDelSurSuppliesResponse;
    return data;
  }

  /**
   * Gets the latest invoice for a supply
   * @param supplyNumber - The supply number (suministro)
   */
  async getLatestInvoice(
    supplyNumber: string
  ): Promise<LuzDelSurLatestInvoiceResponse> {
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated. Call login() first.");
    }

    const body: LuzDelSurLatestInvoiceRequest = {
      request: {
        Token: this.authToken!,
        Correo: this.userEmail!,
        Suministro: supplyNumber,
      },
    };

    const response = await fetch(
      `${BASE_URL}/InformacionGuardada/ObtenerUltimaFacturacion`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(body),
      }
    );

    const data = (await response.json()) as LuzDelSurLatestInvoiceResponse;
    return data;
  }
}

// Singleton instance for easy usage
export const luzdelsur = new LuzDelSurClient();
