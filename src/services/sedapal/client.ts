/**
 * SEDAPAL API Client - Lima Water Service
 * https://webapp16.sedapal.com.pe/OficinaComercialVirtual
 */

import type {
  SedapalSystemLoginResponse,
  SedapalUserLoginRequest,
  SedapalUserLoginResponse,
} from "./types";

const BASE_URL = "https://webapp16.sedapal.com.pe/OficinaComercialVirtual/api";

export class SedapalClient {
  private systemToken: string | null = null;
  private userSession: SedapalUserLoginResponse["bRESP"] | null = null;

  /**
   * Performs system login to obtain the authorization token
   */
  async systemLogin(): Promise<string> {
    const response = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "username=OCV_Sedapal&password=OCV0109",
    });

    const data = (await response.json()) as SedapalSystemLoginResponse;

    if (data.nRESP_SP !== 1 || !data.bRESP?.token) {
      throw new Error(`System login failed: ${data.cRESP_SP}`);
    }

    this.systemToken = data.bRESP.token;
    return this.systemToken;
  }

  /**
   * Ensures we have a valid system token
   */
  private async ensureSystemToken(): Promise<string> {
    if (!this.systemToken) {
      await this.systemLogin();
    }
    return this.systemToken!;
  }

  /**
   * User authentication with email and password
   */
  async login(
    email: string,
    password: string
  ): Promise<SedapalUserLoginResponse> {
    const token = await this.ensureSystemToken();

    const body: SedapalUserLoginRequest = {
      correo: email,
      clave: password,
      flagChannel: "1",
    };

    const response = await fetch(
      `${BASE_URL}/autenticacion-usuario/aut-nuevo-usu`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(body),
      }
    );

    const data = (await response.json()) as SedapalUserLoginResponse;

    if (data.nRESP_SP === 1) {
      this.userSession = data.bRESP;
    }

    return data;
  }

  /**
   * Checks if the user is authenticated
   */
  isAuthenticated(): boolean {
    return this.userSession !== null && this.userSession.id_cliente > 0;
  }

  /**
   * Gets the main supply number (NIS)
   */
  getSupplyNumber(): number | null {
    return this.userSession?.nis_rad ?? null;
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
      "Not implemented yet - need to discover endpoint after login"
    );
  }
}

// Singleton instance for easy usage
export const sedapal = new SedapalClient();
