import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MealBuilder from '@/components/MealBuilder';
import { renderWithClient } from '../test-utils';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValueOrOpts?: string | Record<string, unknown>) => {
      if (typeof defaultValueOrOpts === 'string') return defaultValueOrOpts;
      if (
        defaultValueOrOpts &&
        typeof defaultValueOrOpts === 'object' &&
        'defaultValue' in defaultValueOrOpts
      ) {
        return defaultValueOrOpts['defaultValue'] as string;
      }
      return key;
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

// Mock contexts
jest.mock('@/contexts/ActiveUserContext', () => ({
  useActiveUser: () => ({ activeUserId: 'test-user-id' }),
}));
jest.mock('@/contexts/PreferencesContext', () => ({
  usePreferences: () => ({
    loggingLevel: 'debug',
    itemDisplayLimit: 100,
    nutrientDisplayPreferences: [
      {
        view_group: 'quick_info',
        platform: 'desktop',
        visible_nutrients: ['calories', 'protein', 'carbs', 'fat'],
      },
    ],
    energyUnit: 'kcal' as const,
    convertEnergy: (value: number) => value,
  }),
}));

// Mock toast
const mockToast = jest.fn();
jest.mock('@/hooks/Diary/useMealTypes', () => ({
  useMealTypes: () => ({
    data: [
      { id: 'mt-breakfast', name: 'breakfast' },
      { id: 'mt-lunch', name: 'lunch' },
      { id: 'mt-dinner', name: 'dinner' },
    ],
  }),
}));
jest.mock('@/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

// Mock logging
jest.mock('@/utils/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock services
const mockCreateMeal = jest.fn();
const mockUpdateMeal = jest.fn();
const mockGetMealById = jest.fn();
jest.mock('@/api/Foods/meals', () => ({
  createMeal: (...args: unknown[]) => mockCreateMeal(...args),
  updateMeal: (...args: unknown[]) => mockUpdateMeal(...args),
  getMealById: (...args: unknown[]) => mockGetMealById(...args),
}));

const mockCreateFoodEntryMeal = jest.fn();
const mockUpdateFoodEntryMeal = jest.fn();
const mockGetFoodEntryMealWithComponents = jest.fn();
jest.mock('@/api/Diary/foodEntryService', () => ({
  createFoodEntryMeal: (...args: unknown[]) => mockCreateFoodEntryMeal(...args),
  updateFoodEntryMeal: (...args: unknown[]) => mockUpdateFoodEntryMeal(...args),
  getFoodEntryMealWithComponents: (...args: unknown[]) =>
    mockGetFoodEntryMealWithComponents(...args),
}));

// Mock complex sub-components as simple stubs
jest.mock('@/components/FoodUnitSelector', () => {
  return function MockFoodUnitSelector() {
    return <div data-testid="food-unit-selector">FoodUnitSelector</div>;
  };
});

jest.mock('@/components/FoodSearch/FoodSearchDialog', () => {
  return function MockFoodSearchDialog() {
    return <div data-testid="food-search-dialog">FoodSearchDialog</div>;
  };
});

const sampleFoods = [
  {
    food_id: 'food1',
    food_name: 'Apple',
    variant_id: 'v1',
    quantity: 1,
    unit: 'piece',
    calories: 95,
    protein: 0.5,
    carbs: 25,
    fat: 0.3,
    serving_size: 1,
    serving_unit: 'piece',
  },
];

describe('MealBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gives a photo-built diary meal the full serving model', async () => {
    // A new custom meal in the diary (no mealId, no foodEntryId) is the photo
    // path: the ingredients are a whole dish, so it gets the same unit +
    // amount + serving size controls a saved meal has, plus how much was eaten.
    renderWithClient(
      <MealBuilder
        initialFoods={sampleFoods}
        source="food-diary"
        foodEntryDate="2026-08-28"
        foodEntryMealType="dinner"
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Total Servings')).toBeInTheDocument();
    });
    expect(
      screen.getByLabelText('Quantity Consumed (serving)')
    ).toBeInTheDocument();
    // The unit is a real choice here, unlike the template-backed diary flows.
    expect(screen.getAllByRole('combobox')[1]).toBeEnabled();
  });

  it('toggles diary nutrition between the consumed portion and the whole dish', async () => {
    // The diary dialog shows the portion by default, but the whole-dish totals
    // have to stay reachable so the ingredient list above (which is always at
    // dish scale) can be reconciled against a number.
    renderWithClient(
      <MealBuilder
        initialFoods={sampleFoods}
        source="food-diary"
        foodEntryDate="2026-08-28"
        foodEntryMealType="dinner"
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Total Servings')).toBeInTheDocument();
    });

    // The label and value are separate text nodes, so read the row's textContent.
    const caloriesRow = () =>
      screen
        .getAllByText((_content, element) =>
          /^Calories:/.test(element?.textContent ?? '')
        )
        .at(-1)?.textContent;

    // Default: one serving of a dish that yields one, so the portion is all of it.
    expect(screen.getByRole('tab', { name: 'Consumed' })).toBeInTheDocument();
    expect(caloriesRow()).toMatch(/95/);

    // Yield 4, still one serving consumed: the portion is a quarter (95/4,
    // shown rounded)...
    fireEvent.change(screen.getByLabelText('Total Servings'), {
      target: { value: '4' },
    });
    await waitFor(() => {
      expect(caloriesRow()).toMatch(/24/);
    });

    // ...while Total keeps showing the whole dish.
    // Radix tabs activate on mousedown, not click.
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Total' }));
    await waitFor(() => {
      expect(caloriesRow()).toMatch(/95/);
    });
  });

  it('keeps the unit locked and shows whole dish yield when logging or editing a template-backed meal', async () => {
    // Risk guard: these two dialogs share this component. In diary mode the unit
    // is locked to preserve ingredient math, while the whole-dish yield and
    // consumed quantity are both visible and editable.
    renderWithClient(
      <MealBuilder
        initialFoods={sampleFoods}
        source="food-diary"
        foodEntryId="entry-1"
        foodEntryDate="2026-08-28"
        foodEntryMealType="dinner"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText('Quantity Consumed (serving)')
      ).toBeInTheDocument();
    });
    expect(screen.getAllByRole('combobox')[1]).toBeDisabled();
    expect(screen.getByLabelText('Total Servings')).toBeInTheDocument();
  });

  it('renders in create mode with correct labels', () => {
    renderWithClient(<MealBuilder />);

    expect(screen.getByText('Meal Name')).toBeInTheDocument();
    expect(screen.getByText('Description (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Share with Public')).toBeInTheDocument();
    expect(screen.getByText('Save Meal')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Add Food')).toBeInTheDocument();
  });

  it('shows empty state message when no foods added', () => {
    renderWithClient(<MealBuilder />);
    expect(
      screen.getByText('No foods added to this meal yet.')
    ).toBeInTheDocument();
  });

  it('shows validation error when saving with no foods', () => {
    renderWithClient(<MealBuilder />);
    fireEvent.click(screen.getByText('Save Meal'));

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'A meal must contain at least one food item.',
      variant: 'destructive',
    });
  });

  it('shows validation error for empty meal name when foods exist', async () => {
    renderWithClient(<MealBuilder initialFoods={sampleFoods} />);

    // useEffect sets name to 'Logged Meal' — wait for it, then clear it
    await waitFor(() => {
      expect(screen.getByLabelText('Meal Name')).toHaveValue('Logged Meal');
    });
    fireEvent.change(screen.getByLabelText('Meal Name'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByText('Save Meal'));

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Meal name cannot be empty.',
      variant: 'destructive',
    });
  });

  it('loads existing meal data in edit mode', async () => {
    const mockMeal = {
      id: 'meal1',
      name: 'Test Meal',
      description: 'A test description',
      is_public: true,
      serving_size: 1,
      serving_unit: 'serving',
      foods: sampleFoods,
    };
    mockGetMealById.mockResolvedValue(mockMeal);

    renderWithClient(<MealBuilder mealId="meal1" />);

    await waitFor(() => {
      expect(mockGetMealById).toHaveBeenCalledWith('meal1');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Meal')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('A test description')
      ).toBeInTheDocument();
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });
  });

  it('calls createMeal on save with valid data', async () => {
    const mockResult = { id: 'new-meal', name: 'My Meal', foods: sampleFoods };
    mockCreateMeal.mockResolvedValue(mockResult);
    const onSave = jest.fn();

    renderWithClient(
      <MealBuilder initialFoods={sampleFoods} onSave={onSave} />
    );

    // Set meal name
    fireEvent.change(screen.getByLabelText('Meal Name'), {
      target: { value: 'My Meal' },
    });
    fireEvent.click(screen.getByText('Save Meal'));

    await waitFor(() => {
      expect(mockCreateMeal).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Meal' }),
        // No image files staged in this flow.
        []
      );
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith();
    });
  });

  it('calls updateMeal when saving in edit mode', async () => {
    const mockMeal = {
      id: 'meal1',
      name: 'Original',
      description: '',
      is_public: false,
      serving_size: 1,
      serving_unit: 'serving',
      foods: sampleFoods,
    };
    mockGetMealById.mockResolvedValue(mockMeal);
    const mockUpdated = { ...mockMeal, name: 'Updated' };
    mockUpdateMeal.mockResolvedValue(mockUpdated);
    const onSave = jest.fn();

    renderWithClient(<MealBuilder mealId="meal1" onSave={onSave} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Original')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Meal Name'), {
      target: { value: 'Updated' },
    });
    fireEvent.click(screen.getByText('Save Meal'));

    await waitFor(() => {
      expect(mockUpdateMeal).toHaveBeenCalledWith(
        'meal1',
        expect.objectContaining({ name: 'Updated' }),
        // No image files staged in this flow.
        []
      );
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith();
    });
  });

  // Regression: review fix #1.
  // Without this validation, the save handler used `parseFloat(x) || 1` which
  // silently coerced 0 / NaN to 1 and sent valid-looking data to the server.
  it('shows a validation toast (not a silent save) when Total Servings is 0', async () => {
    renderWithClient(<MealBuilder initialFoods={sampleFoods} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Meal Name')).toHaveValue('Logged Meal');
    });
    fireEvent.change(screen.getByLabelText('Meal Name'), {
      target: { value: 'My Meal' },
    });

    // Default unit is 'serving', so the Total Servings input is visible.
    fireEvent.change(screen.getByLabelText('Total Servings'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByText('Save Meal'));

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Total servings must be greater than zero.',
      variant: 'destructive',
    });
    expect(mockCreateMeal).not.toHaveBeenCalled();
  });

  // Regression: review fix #1 (non-serving branch).
  it('shows a validation toast when Total Amount is empty for a non-serving meal', async () => {
    // Start in ml mode directly via prop — avoids interacting with the shadcn Select.
    renderWithClient(
      <MealBuilder
        initialFoods={sampleFoods}
        initialServingUnit="ml"
        initialServingSize={250}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Meal Name')).toHaveValue('Logged Meal');
    });
    fireEvent.change(screen.getByLabelText('Meal Name'), {
      target: { value: 'My Meal' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Total Amount (ml)')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Total Amount (ml)'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByText('Save Meal'));

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Total amount must be greater than zero.',
      variant: 'destructive',
    });
    expect(mockCreateMeal).not.toHaveBeenCalled();
  });

  // Regression: Fix meal serving model regressions (63e11655). Plain
  // division (1000 / 333) leaks IEEE-754 noise (3.0030030030030033);
  // total_servings must be rounded via MEAL_SERVING_PRECISION before saving.
  // Mirrors the equivalent mobile (MealAddScreen.test.tsx) and server
  // (mealService.test.ts) regression tests for the same fix.
  it('rounds derived total_servings for non-serving meals before saving', async () => {
    mockCreateMeal.mockResolvedValue({ id: 'new-meal', name: 'My Meal' });

    renderWithClient(
      <MealBuilder
        initialFoods={sampleFoods}
        initialServingUnit="ml"
        initialServingSize={333}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Meal Name')).toHaveValue('Logged Meal');
    });
    fireEvent.change(screen.getByLabelText('Meal Name'), {
      target: { value: 'My Meal' },
    });

    fireEvent.change(screen.getByLabelText('Total Amount (ml)'), {
      target: { value: '1000' },
    });
    fireEvent.change(screen.getByLabelText('Default Serving Size (ml)'), {
      target: { value: '333' },
    });
    fireEvent.click(screen.getByText('Save Meal'));

    await waitFor(() => {
      expect(mockCreateMeal).toHaveBeenCalledWith(
        expect.objectContaining({
          serving_unit: 'ml',
          serving_size: 333,
          total_servings: 3.003003,
        }),
        []
      );
    });
  });

  // Regression: P1 Codex finding.
  // After editing in a quantity-based unit and toggling back to 'serving',
  // total_servings must be DERIVED from totalAmount / servingSize, not left as
  // the stale value the field had before the user entered ml mode.
  it('derives total_servings from totalAmount/servingSize when toggling ml → serving', async () => {
    mockCreateMeal.mockResolvedValue({ id: 'new-meal', name: 'My Meal' });

    renderWithClient(
      <MealBuilder
        initialFoods={sampleFoods}
        initialServingUnit="ml"
        initialServingSize={250}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Meal Name')).toHaveValue('Logged Meal');
    });
    fireEvent.change(screen.getByLabelText('Meal Name'), {
      target: { value: 'My Meal' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Total Amount (ml)')).toBeInTheDocument();
    });

    // 2000 ml batch with 250 ml servings = 8 servings.
    fireEvent.change(screen.getByLabelText('Total Amount (ml)'), {
      target: { value: '2000' },
    });
    fireEvent.change(screen.getByLabelText('Default Serving Size (ml)'), {
      target: { value: '250' },
    });

    // Toggle BACK to 'serving' via the shadcn Select. SelectTrigger renders
    // a button with role="combobox" (Radix). The label htmlFor isn't wired to
    // an id on the trigger, so query by role instead.
    const unitTrigger = screen.getByRole('combobox');
    fireEvent.click(unitTrigger);
    const servingOption = await screen.findByRole('option', {
      name: /serving/i,
    });
    fireEvent.click(servingOption);

    // After toggle: serving_size resets to 1 (tautological) AND
    // total_servings is derived from the pre-toggle totalAmount/servingSize.
    await waitFor(() => {
      expect(screen.getByLabelText('Total Servings')).toHaveValue(8);
    });

    fireEvent.click(screen.getByText('Save Meal'));

    await waitFor(() => {
      expect(mockCreateMeal).toHaveBeenCalledWith(
        expect.objectContaining({
          serving_unit: 'serving',
          serving_size: 1,
          total_servings: 8,
        }),
        // No image files staged in this flow.
        []
      );
    });
  });

  // MEAL_WEIGHT_PLAN.md Phase 3: cooked_weight_g is an optional alternate
  // denominator, independent of serving_unit.
  it('persists cooked_weight_g when provided in food-diary mode', async () => {
    mockCreateFoodEntryMeal.mockResolvedValue({ id: 'new-entry' });

    renderWithClient(
      <MealBuilder
        source="food-diary"
        initialFoods={sampleFoods}
        foodEntryDate="2026-07-28"
        foodEntryMealType="lunch"
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Cooked Weight (g)')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Cooked Weight (g)'), {
      target: { value: '800' },
    });
    fireEvent.click(screen.getByText('Add to Meal'));

    await waitFor(() => {
      expect(mockCreateFoodEntryMeal).toHaveBeenCalledWith(
        expect.objectContaining({ cooked_weight_g: 800 }),
        expect.anything()
      );
    });
  });

  it('sends cooked_weight_g as null when left empty in food-diary mode', async () => {
    mockCreateFoodEntryMeal.mockResolvedValue({ id: 'new-entry' });

    renderWithClient(
      <MealBuilder
        source="food-diary"
        initialFoods={sampleFoods}
        foodEntryDate="2026-07-28"
        foodEntryMealType="lunch"
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Cooked Weight (g)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add to Meal'));

    await waitFor(() => {
      expect(mockCreateFoodEntryMeal).toHaveBeenCalledWith(
        expect.objectContaining({ cooked_weight_g: null }),
        expect.anything()
      );
    });
  });

  it('rejects a zero cooked_weight_g with a validation toast in food-diary mode', async () => {
    renderWithClient(
      <MealBuilder
        source="food-diary"
        initialFoods={sampleFoods}
        foodEntryDate="2026-07-28"
        foodEntryMealType="lunch"
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Cooked Weight (g)')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Cooked Weight (g)'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByText('Add to Meal'));

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Cooked weight must be greater than zero.',
      variant: 'destructive',
    });
    expect(mockCreateFoodEntryMeal).not.toHaveBeenCalled();
  });

  // MEAL_WEIGHT_PLAN.md Phase 3 gap fix: cooked_weight_g must be selectable
  // from the actual food-diary logging flow (source='food-diary'), not just
  // from MealUnitSelector's "add meal as sub-ingredient"/meal-plan paths.
  describe('food-diary plate-weight logging (cooked_weight_g)', () => {
    const cookedWeightMeal = {
      id: 'meal-cw',
      name: 'Chili',
      description: '',
      is_public: false,
      serving_size: 1,
      serving_unit: 'serving',
      total_servings: 4,
      cooked_weight_g: 800,
      foods: sampleFoods,
    };

    it('enables the unit selector and offers a Plate weight (g) option when the template has cooked_weight_g', async () => {
      mockGetMealById.mockResolvedValue(cookedWeightMeal);

      renderWithClient(
        <MealBuilder
          source="food-diary"
          mealId="meal-cw"
          foodEntryDate="2026-07-21"
          foodEntryMealType="lunch"
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Chili')).toBeInTheDocument();
      });

      const unitTrigger = screen.getByLabelText('Portion unit');
      expect(unitTrigger).not.toBeDisabled();
      fireEvent.click(unitTrigger);

      expect(
        await screen.findByRole('option', { name: 'Plate weight (g)' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'serving' })
      ).toBeInTheDocument();
    });

    it('does not offer a plate-weight option when the template has no cooked_weight_g', async () => {
      mockGetMealById.mockResolvedValue({
        ...cookedWeightMeal,
        cooked_weight_g: null,
      });

      renderWithClient(
        <MealBuilder
          source="food-diary"
          mealId="meal-cw"
          foodEntryDate="2026-07-21"
          foodEntryMealType="lunch"
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Chili')).toBeInTheDocument();
      });

      expect(screen.queryByLabelText('Portion unit')).not.toBeInTheDocument();
    });

    it('logs a partial plate by weight, scaling nutrition by quantity/cooked_weight_g', async () => {
      mockGetMealById.mockResolvedValue(cookedWeightMeal);
      mockCreateFoodEntryMeal.mockResolvedValue({ id: 'entry1' });

      renderWithClient(
        <MealBuilder
          source="food-diary"
          mealId="meal-cw"
          foodEntryDate="2026-07-21"
          foodEntryMealType="lunch"
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Chili')).toBeInTheDocument();
      });

      // Switch the unit to plate weight (g); this should default Quantity
      // Consumed to the full cooked_weight_g (800).
      fireEvent.click(screen.getByLabelText('Portion unit'));
      fireEvent.click(
        await screen.findByRole('option', { name: 'Plate weight (g)' })
      );
      await waitFor(() => {
        expect(screen.getByLabelText('Quantity Consumed (g)')).toHaveValue(800);
      });

      // Log a 250g plate instead of the whole pot.
      fireEvent.change(screen.getByLabelText('Quantity Consumed (g)'), {
        target: { value: '250' },
      });
      fireEvent.click(screen.getByText('Add to Meal'));

      await waitFor(() => {
        expect(mockCreateFoodEntryMeal).toHaveBeenCalledWith(
          expect.objectContaining({
            meal_template_id: 'meal-cw',
            quantity: 250,
            unit: 'g',
          }),
          // TanStack Query v5 passes a mutationFnContext as a second arg
          // whenever mutationFn is referenced directly (not wrapped).
          expect.anything()
        );
      });
    });
  });
});
