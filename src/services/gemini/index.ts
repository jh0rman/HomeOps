/**
 * Gemini AI Service
 * Uses Google AI SDK for vision/OCR tasks
 */

import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface GeminiResponse {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Extract meter reading from an image using Gemini Flash vision
 */
export async function extractMeterReading(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<GeminiResponse> {
  if (!GEMINI_API_KEY) {
    return { success: false, error: "GEMINI_API_KEY not configured" };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const base64Image = imageBuffer.toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this image of an electricity meter.
Extract the current reading from the meter (the number displayed).
Respond ONLY with the reading number, no additional text.
If you cannot read the number clearly, respond with "UNREADABLE".
Example response: 6294.8`,
            },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const text = response.text?.trim();

    if (!text) {
      return { success: false, error: "No response from Gemini" };
    }

    return { success: true, text };
  } catch (error) {
    console.error("Gemini error:", error);
    return { success: false, error: String(error) };
  }
}

export const gemini = {
  extractMeterReading,
};
