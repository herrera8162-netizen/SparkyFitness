import chatRepository from '../models/chatRepository.js';
import { log } from '../config/logging.js';
import {
  dispatchAiRequest,
  type DispatchErrorCategory,
  type ProviderConfig,
} from '../ai/providerDispatch.js';
import { deriveAiNetworkPolicy } from '../utils/outboundUrlPolicy.js';

const LABEL_SCAN_PROMPT =
  'Extract the nutrition facts from this food label image. ' +
  'Return a JSON object with these fields: ' +
  'name (string), brand (string), serving_size (number), ' +
  "serving_unit (string; the unit shown on the label for the serving size, e.g. 'g', 'ml', 'oz'; use 'ml' for liquids/beverages), " +
  'calories (number), protein (number in grams), carbs (number in grams), fat (number in grams), ' +
  'fiber (number in grams), saturated_fat (number in grams), trans_fat (number in grams), ' +
  'sodium (number in mg), sugars (number in grams), ' +
  'cholesterol (number in mg), potassium (number in mg), ' +
  'calcium (number in mg), iron (number in mg), vitamin_a (number in mcg), vitamin_c (number in mg). ' +
  'All numeric fields should be absolute amounts (not percent daily value), as numbers not strings. ' +
  'serving_size should be a number. ' +
  'Use null for any field not visible on the label. ' +
  "Many labels state the serving size as a count alongside a weight/volume, e.g. 'Serving size 5 wafers (31g)' or '2 cookies (28g)'. " +
  'When the label gives such a paired count, also return alt_serving_size (number; the count, e.g. 5) and ' +
  "alt_serving_unit (string; the singular unit name for that count, e.g. 'wafer', 'cookie', 'piece'). " +
  'These represent the exact same serving as serving_size/serving_unit, just expressed in a different unit — not a separate quantity. ' +
  'Use null for alt_serving_size and alt_serving_unit if the label only gives one unit for the serving size. ' +
  'Return only the JSON object, no other text.';

// 'no_ai_configured' is the only category this service mints itself; every
// dispatch failure passes its category through unchanged for the route's
// HTTP-status map.
export type LabelScanErrorCategory = DispatchErrorCategory | 'no_ai_configured';

export type ExtractNutritionFromLabelResult =
  | { success: true; nutrition: unknown }
  | { success: false; category: LabelScanErrorCategory; error: string };

async function extractNutritionFromLabel(
  base64Image: string,
  mimeType: string,
  userId: string,
  actorIsAdmin = false
): Promise<ExtractNutritionFromLabelResult> {
  const setting = await chatRepository.getActiveVisionAiServiceSetting(userId);
  if (!setting) {
    return {
      success: false,
      category: 'no_ai_configured',
      error: 'No AI service configured',
    };
  }
  const aiService = await chatRepository.getAiServiceSettingForBackend(
    setting.id,
    userId
  );
  if (!aiService) {
    return {
      success: false,
      category: 'no_ai_configured',
      error: 'No AI service configured',
    };
  }

  // Dispatch reads everything from the decrypted backend detail. The helper
  // enforces the supported-provider, api-key, custom-url, and HEIC checks and
  // reports each as a category the route maps to an HTTP status.
  const provider: ProviderConfig = {
    service_type: aiService.service_type,
    api_key: aiService.api_key ?? undefined,
    model_name: aiService.model_name ?? undefined,
    custom_url: aiService.custom_url ?? undefined,
    timeout: aiService.timeout ?? undefined,
  };

  const result = await dispatchAiRequest({
    provider,
    networkPolicy: deriveAiNetworkPolicy(aiService, actorIsAdmin),
    prompt: LABEL_SCAN_PROMPT,
    images: [{ base64: base64Image, mimeType }],
    parseJson: true,
  });

  if (!result.ok) {
    log(
      result.category === 'refused' || result.category === 'no_content'
        ? 'warn'
        : 'error',
      `Label scan: ${provider.service_type} failed for user ${userId} (${result.category}): ${result.detail}`
    );
    return { success: false, category: result.category, error: result.detail };
  }
  return { success: true, nutrition: result.json };
}

export { extractNutritionFromLabel };
export default {
  extractNutritionFromLabel,
};
