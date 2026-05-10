import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateSmartSummary(reportData: any) {
  try {
    const prompt = `
      As a business consultant and financial analyst, analyze the following credit registry report data and provide:
      1. A concise executive summary of the business's current financial health.
      2. 3-4 actionable tips to improve collection, manage debt, or increase sales.
      3. Identify any major risks or outstanding trends.

      Report Data:
      ${JSON.stringify(reportData, null, 2)}

      Please provide the response in a structured format suitable for a dashboard. If the user's language preference is detected as Bengali from the data or labels, provide a bilingual response (English and Bengali).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini AI error:", error);
    throw error;
  }
}
