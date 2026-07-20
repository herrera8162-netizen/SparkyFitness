import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePreferences } from '@/contexts/PreferencesContext';
import { debug, info, warn } from '@/utils/logging';
import { useTranslation } from 'react-i18next';
import type { Meal } from '@/types/meal';

interface MealUnitSelectorProps {
  meal: Meal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (meal: Meal, quantity: number, unit: string) => void;
  initialQuantity?: number;
  initialUnit?: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

const MealUnitSelector = ({
  meal,
  open,
  onOpenChange,
  onSelect,
  initialQuantity,
  initialUnit,
  title,
  description,
  confirmLabel,
}: MealUnitSelectorProps) => {
  const { loggingLevel, energyUnit, convertEnergy } = usePreferences();
  const { t } = useTranslation();
  debug(loggingLevel, 'MealUnitSelector component rendered.', { meal, open });

  const getEnergyUnitString = (unit: 'kcal' | 'kJ'): string => {
    return unit === 'kcal' ? 'kcal' : 'kJ';
  };

  // Default the prefilled quantity to one serving's worth (meal.serving_size),
  // matching MealBuilder. For an 8-serving meal this prefills 1.
  const [quantity, setQuantity] = useState(
    initialQuantity ?? meal?.serving_size ?? 1.0
  );
  const mealServingUnit = meal?.serving_unit || 'serving';
  // cooked_weight_g (MEAL_WEIGHT_PLAN.md Phase 3) is an alternate denominator:
  // when set, this meal can ALSO be logged by plate weight in grams,
  // independent of its serving_unit. Only offer the choice when the two units
  // actually differ (a 'g'-serving_unit meal doesn't need a second 'g' option).
  const canLogByPlateWeight =
    !!meal?.cooked_weight_g && mealServingUnit !== 'g';
  const [unit, setUnit] = useState(initialUnit || mealServingUnit);

  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit);
    // Reset quantity to a sensible default for the newly selected unit so a
    // stale serving-count doesn't get interpreted as a gram amount (or vice
    // versa).
    if (newUnit === 'g' && meal?.cooked_weight_g) {
      setQuantity(meal.cooked_weight_g);
    } else {
      setQuantity(meal?.serving_size ?? 1.0);
    }
  };

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    debug(loggingLevel, 'Handling meal unit selector submit.');

    info(loggingLevel, 'Submitting meal selection:', {
      meal,
      quantity,
      unit,
    });

    onSelect(meal, quantity, unit);
    onOpenChange(false);
    setQuantity(1.0);
  };

  const calculateNutrition = () => {
    debug(loggingLevel, 'Calculating meal nutrition preview.');
    if (!meal || !meal.foods || meal.foods.length === 0) {
      warn(loggingLevel, 'calculateNutrition called with no meal foods.');
      return null;
    }

    // Calculate total nutrition for the meal based on its component foods
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    meal.foods.forEach((foodItem) => {
      const scale = foodItem.quantity / (foodItem.serving_size || 1);
      totalCalories += (foodItem.calories || 0) * scale;
      totalProtein += (foodItem.protein || 0) * scale;
      totalCarbs += (foodItem.carbs || 0) * scale;
      totalFat += (foodItem.fat || 0) * scale;
    });

    // cooked_weight_g is an alternate denominator: a 'g' selection here means
    // plate weight against the whole recipe's cooked mass, not the uniform
    // serving_size × total_servings model.
    let multiplier: number;
    if (unit === 'g' && meal.cooked_weight_g) {
      multiplier =
        meal.cooked_weight_g > 0 ? quantity / meal.cooked_weight_g : 1;
    } else {
      // Uniform multiplier: quantity / (serving_size × total_servings).
      // For pre-migration data where total_servings defaults to 1, this collapses
      // to quantity/serving_size — matches today's non-serving behavior.
      const mealServingSize = meal.serving_size || 1.0;
      const mealTotalServings = meal.total_servings || 1;
      const denominator = mealServingSize * mealTotalServings;
      multiplier = denominator > 0 ? quantity / denominator : 1;
    }

    const result = {
      calories: totalCalories * multiplier,
      protein: totalProtein * multiplier,
      carbs: totalCarbs * multiplier,
      fat: totalFat * multiplier,
    };

    debug(loggingLevel, 'Calculated meal nutrition result:', result);
    return result;
  };

  const nutrition = calculateNutrition();

  const focusAndSelect = useCallback((e: HTMLInputElement) => {
    if (e) {
      e.focus();
      e.select();
    }
  }, []);

  // Display unit reflects the currently selected unit, not always serving_unit
  // — a plate-weight selection displays 'g'.
  const displayUnit = unit || mealServingUnit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title ??
              (initialQuantity
                ? `Edit ${meal?.name}`
                : `Add ${meal?.name} to Meal Plan`)}
          </DialogTitle>
          <DialogDescription>
            {description ??
              (initialQuantity
                ? `Edit the quantity for ${meal?.name}.`
                : `Select the quantity for this meal in your meal plan.`)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  min="0.01"
                  value={quantity}
                  ref={focusAndSelect}
                  onChange={(e) => {
                    const newQuantity = Number(e.target.value);
                    debug(loggingLevel, 'Meal quantity changed:', newQuantity);
                    setQuantity(newQuantity);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                {canLogByPlateWeight ? (
                  <Select value={unit} onValueChange={handleUnitChange}>
                    <SelectTrigger id="unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={mealServingUnit}>
                        {mealServingUnit}
                      </SelectItem>
                      <SelectItem value="g">
                        {t('mealUnitSelector.plateWeight', 'Plate weight (g)')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="unit"
                    type="text"
                    value={displayUnit}
                    disabled
                    className="bg-muted"
                  />
                )}
              </div>
            </div>

            {nutrition && (
              <div className="bg-muted p-3 rounded-lg">
                <h4 className="font-medium mb-2">
                  Nutrition for {quantity} {displayUnit}:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    {Math.round(
                      convertEnergy(nutrition.calories, 'kcal', energyUnit)
                    )}{' '}
                    {getEnergyUnitString(energyUnit)}
                  </div>
                  <div>{nutrition.protein.toFixed(1)}g protein</div>
                  <div>{nutrition.carbs.toFixed(1)}g carbs</div>
                  <div>{nutrition.fat.toFixed(1)}g fat</div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {confirmLabel ??
                  (initialQuantity ? 'Update Meal' : 'Add to Meal Plan')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MealUnitSelector;
