/**
 * Standalone translation functions using OpenRouter
 */

import { getClient } from "./client";
import { getModelConfig } from "../research-engine/config";
import { VALID_LANGUAGE_CODES } from "../../utils/language-validation";

/**
 * Validate that a language code is in the whitelist to prevent prompt injection.
 */
function validateLanguageCode(code: string): string {
  if (!VALID_LANGUAGE_CODES.has(code)) {
    throw new Error(`Invalid language code: ${code}`);
  }
  return code;
}

/**
 * Translate a full research report from source language to target language
 */
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  const client = getClient();
  const { model } = getModelConfig("reportSummary");

  const safeSrc = validateLanguageCode(sourceLanguage);
  const safeTgt = validateLanguageCode(targetLanguage);

  const systemPrompt = `You are a professional translator. Translate the following research report from ${safeSrc} to ${safeTgt}. Preserve all markdown formatting, links, and structure exactly as they appear. Maintain technical accuracy and professional tone. Do not add any commentary or explanations - only return the translated text.`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.2,
    });

    return response.choices[0]?.message?.content || text;
  } catch (error) {
    console.error("Translation failed:", error);
    throw error;
  }
}

/**
 * Translate a short text (title, summary) with a constrained prompt and hard token cap.
 * Prevents the LLM from hallucinating/expanding short inputs.
 */
export async function translateShortText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  const client = getClient();
  const { model } = getModelConfig("reportSummary");

  const safeSrc = validateLanguageCode(sourceLanguage);
  const safeTgt = validateLanguageCode(targetLanguage);

  const systemPrompt = `You are a translator. Translate the following short text from ${safeSrc} to ${safeTgt}. Return ONLY the translated text, nothing else. Do not add explanations, formatting, or extra content.`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.2,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content || text;
  } catch (error) {
    console.error("Short text translation failed:", error);
    throw error;
  }
}
