import type { Food } from './food';

export interface Meal {
  id?: string;
  user_id?: string;
  name: string;
  description?: string;
  is_public?: boolean;
  serving_size?: number;
  serving_unit?: string;
  total_servings?: number;
  // Mass in grams of the full recipe as finished/cooked. An alternate
  // denominator alongside serving_size × total_servings: when set, this meal
  // may also be logged by plate weight in grams regardless of serving_unit.
  cooked_weight_g?: number | null;
  // How cooked_weight_g was set: 'manual' (typed by the user) or 'auto_sum'
  // (computed from ingredient weights via the auto_sum_meal_weight MCP action).
  cooked_weight_source?: 'manual' | 'auto_sum' | null;
  foods?: MealFood[];
  // ISO timestamp of when the current user starred this meal. Present only on
  // items returned by the favorites endpoint; used to order the Favorites list.
  favorited_at?: string;
}

export type MealComponentType = 'food' | 'meal';

export interface MealFood {
  id?: string;
  // 'food' (default) or 'meal' when this ingredient links a reusable sub-meal.
  item_type?: MealComponentType;
  food_id?: string;
  // Set when item_type === 'meal': the linked sub-meal being composed in.
  child_meal_id?: string;
  child_meal_name?: string;
  child_meal_serving_size?: number;
  child_meal_serving_unit?: string;
  child_meal_total_servings?: number;
  quantity: number;
  unit: string;
  food_name?: string;
  food?: Food;
  variant_id?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  saturated_fat?: number;
  polyunsaturated_fat?: number;
  monounsaturated_fat?: number;
  trans_fat?: number;
  cholesterol?: number;
  sodium?: number;
  potassium?: number;
  dietary_fiber?: number;
  sugars?: number;
  vitamin_a?: number;
  vitamin_c?: number;
  calcium?: number;
  iron?: number;
  glycemic_index?: string;
  custom_nutrients?: Record<string, string | number>;
  serving_size?: number;
  serving_unit?: string;
  // Gram weight last resolved by the auto_sum_meal_weight MCP action, and its
  // provenance. Null/absent until auto-sum has run for this ingredient.
  resolved_weight_g?: number | null;
  weight_source?: 'deterministic' | 'ai_estimated' | null;
  weight_confidence?: 'high' | 'medium' | 'low' | null;
}

export interface MealPayload {
  name: string;
  description?: string;
  is_public?: boolean;
  serving_size?: number;
  serving_unit?: string;
  total_servings?: number;
  cooked_weight_g?: number | null;
  cooked_weight_source?: 'manual' | 'auto_sum' | null;
  foods: MealFoodPayload[];
}

export interface MealFoodPayload {
  item_type?: MealComponentType;
  food_id?: string;
  child_meal_id?: string;
  quantity: number;
  unit: string;
  food_name?: string;
  variant_id?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  saturated_fat?: number;
  polyunsaturated_fat?: number;
  monounsaturated_fat?: number;
  trans_fat?: number;
  cholesterol?: number;
  sodium?: number;
  potassium?: number;
  dietary_fiber?: number;
  sugars?: number;
  vitamin_a?: number;
  vitamin_c?: number;
  calcium?: number;
  iron?: number;
  glycemic_index?: string;
  custom_nutrients?: Record<string, string | number>;
  serving_size?: number;
  serving_unit?: string;
}

export interface MealPlanTemplateAssignment {
  item_type: 'food' | 'meal';
  day_of_week: number; // 0 for Sunday, 1 for Monday, etc.
  meal_type: string; // e.g., 'breakfast', 'lunch', 'dinner', 'snacks'
  food_id?: string;
  food_name?: string;
  meal_id?: string;
  meal_name?: string;
  variant_id?: string;
  quantity?: number;
  unit?: string;
}

export interface MealPlanTemplate {
  id?: string;
  user_id?: string;
  plan_name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  assignments: MealPlanTemplateAssignment[];
}

export interface MealDeletionImpact {
  usedByOtherUsers: boolean;
  usedByCurrentUser: boolean;
}

// New interface for FoodEntryMeal
export interface FoodEntryMeal {
  id: string;
  user_id: string;
  meal_template_id?: string;
  meal_type: string;
  entry_date: string;
  entry_time?: string | null;
  name: string;
  description?: string;
  quantity?: number;
  unit?: string;
  legacy_serving_unit_math?: boolean;
  foods: MealFood[]; // The component foods of this logged meal
  calories?: number; // Aggregated calories
  protein?: number; // Aggregated protein
  carbs?: number; // Aggregated carbs
  fat?: number; // Aggregated fat
  saturated_fat?: number;
  polyunsaturated_fat?: number;
  monounsaturated_fat?: number;
  trans_fat?: number;
  cholesterol?: number;
  sodium?: number;
  potassium?: number;
  dietary_fiber?: number;
  sugars?: number;
  vitamin_a?: number;
  vitamin_c?: number;
  calcium?: number;
  iron?: number;
  glycemic_index?: string; // Aggregated glycemic index
  custom_nutrients?: Record<string, string | number>;
}

export interface MealTotals {
  calories: number; // Stored internally as kcal
  protein: number;
  carbs: number;
  fat: number;
  dietary_fiber: number;
  sugars: number;
  sodium: number;
  cholesterol: number;
  saturated_fat: number;
  monounsaturated_fat: number;
  polyunsaturated_fat: number;
  trans_fat: number;
  potassium: number;
  vitamin_a: number;
  vitamin_c: number;
  iron: number;
  calcium: number;
  custom_nutrients?: Record<string, number>; // Add custom_nutrients support
  [key: string]: number | string | Record<string, number> | null | undefined;
}

export type MealFilter = 'all' | 'mine' | 'family' | 'public' | 'needs-review';
export type MealPercentages = Record<string, number>;
