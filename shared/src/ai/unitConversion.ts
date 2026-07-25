/**
 * AI-assisted unit conversion: gate helpers and request/response schemas.
 *
 * AI conversion only fills the gap between **standard weight and volume units**
 * (e.g. cup of yogurt → grams). It explicitly does NOT handle quantity-style
 * units (piece, slice, scoop, bar, etc.) — those keep the existing manual
 * conversion-factor flow.
 */

import { z } from "zod";
import {
  STANDARD_UNIT_KEYS,
  areUnitsCompatible,
  getUnitCategory,
  SERVING_UNIT_GROUP,
} from "../utils/servingSizeConversions.ts";

/** Units AI is allowed to convert between. Derived from the canonical weight + volume tables. */
export const AI_CONVERTIBLE_UNITS: readonly string[] = STANDARD_UNIT_KEYS;

/** Case-insensitive membership in the AI-convertible set. Quantity units return false. */
export function isAiConvertibleUnit(unit: string): boolean {
  return getUnitCategory(unit) !== null;
}

/**
 * True iff the AI conversion path should be offered for `fromUnit → toUnit`:
 * - Both units are AI-convertible (standard weight/volume), AND
 * - They are NOT already compatible (math handles same-category conversions).
 *
 * Examples:
 *   - cup → g       => true  (volume → weight, needs AI density)
 *   - g → kg        => false (compatible, pure math)
 *   - piece → g     => false (quantity unit, manual factor)
 *   - g → piece     => false (quantity unit on either side)
 */
export function shouldOfferAiConversion(
  fromUnit: string,
  toUnit: string,
): boolean {
  if (!isAiConvertibleUnit(fromUnit) || !isAiConvertibleUnit(toUnit)) {
    return false;
  }
  return !areUnitsCompatible(fromUnit, toUnit);
}

/**
 * True iff `fromUnit` is a quantity-style unit (piece, slice, serving, ...)
 * and `toUnit` is grams. Used exclusively by the meal-weight auto-sum path
 * (`resolveMealIngredientWeights` in the server's mealService) to let the AI
 * estimate "typical weight of one <unit>" for ingredients logged in a count
 * unit with no gram variant on file.
 *
 * Deliberately NOT folded into `isAiConvertibleUnit`/`shouldOfferAiConversion`
 * — those gate the general-purpose unit-conversion picker (FoodUnitSelector /
 * VariantCard) and must keep excluding quantity units there, per this file's
 * existing design.
 */
export function isCountToGramEstimate(
  fromUnit: string,
  toUnit: string,
): boolean {
  const normalizedFrom = fromUnit.toLowerCase().trim();
  const normalizedTo = toUnit.toLowerCase().trim();
  if (normalizedTo !== "g") return false;
  return SERVING_UNIT_GROUP.units.includes(normalizedFrom);
}

/** Confidence levels the AI provider is asked to return. */
export const aiConfidenceSchema = z.enum(["high", "medium", "low"]);
export type AiConfidence = z.infer<typeof aiConfidenceSchema>;

/** Schema for a single existing variant passed as anchor context to the prompt. */
export const aiKnownVariantSchema = z.object({
  amount: z.number().positive(),
  unit: z.string().min(1),
});

/** Request body for POST /api/ai/convert-unit. */
export const aiUnitConversionRequestSchema = z.object({
  foodId: z.string().min(1),
  foodName: z.string().min(1),
  brand: z.string().optional(),
  fromUnit: z.string().min(1),
  fromAmount: z.number().positive(),
  toUnit: z.string().min(1),
  knownVariants: z.array(aiKnownVariantSchema).default([]),
});
export type AiUnitConversionRequest = z.infer<
  typeof aiUnitConversionRequestSchema
>;

/** Response body for POST /api/ai/convert-unit. */
export const aiUnitConversionResponseSchema = z.object({
  estimatedAmount: z.number().positive(),
  confidence: aiConfidenceSchema,
  fromUnit: z.string(),
  fromAmount: z.number().positive(),
  toUnit: z.string(),
});
export type AiUnitConversionResponse = z.infer<
  typeof aiUnitConversionResponseSchema
>;

/** Raw JSON shape expected from the LLM (snake_case to match the prompt). */
export const aiProviderRawResponseSchema = z.object({
  estimated_amount: z.number().positive(),
  confidence: aiConfidenceSchema,
});
export type AiProviderRawResponse = z.infer<typeof aiProviderRawResponseSchema>;

/**
 * Strict JSON Schema for provider-side structured outputs (OpenAI, Groq,
 * OpenRouter, Anthropic, Gemini, Ollama). Mirrors `aiProviderRawResponseSchema`
 * in shape. Consumed by every provider request builder in
 * `aiUnitConversionService.callProvider` that supports per-shape validation.
 */
export const STRUCTURED_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    estimated_amount: { type: "number" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
  required: ["estimated_amount", "confidence"],
  additionalProperties: false,
} as const;
