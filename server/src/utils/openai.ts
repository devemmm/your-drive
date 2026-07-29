import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const configureOpenAI = (): OpenAI | null => {
  const apiKey = process.env.OPENAI_APIKEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn(
      "OpenAI API key not found. Content moderation will use local fallback only."
    );
    return null;
  }

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
  });

  return openai;
};
