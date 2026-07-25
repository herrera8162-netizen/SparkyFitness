import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MealUnitSelector from '@/pages/Foods/MealUnitSelector';
import type { Meal } from '@/types/meal';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultValue?: string) => defaultValue,
  }),
}));

jest.mock('@/contexts/PreferencesContext', () => ({
  usePreferences: () => ({
    loggingLevel: 'DEBUG',
    energyUnit: 'kcal' as const,
    convertEnergy: (value: number) => value,
  }),
}));

jest.mock('@/utils/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// MEAL_WEIGHT_PLAN.md Phase 3: MealUnitSelector offers 'g' (plate weight) as
// a unit choice alongside serving_unit when cooked_weight_g is set. Mock the
// Radix Select with plain buttons so jsdom can drive selection directly.
jest.mock('@/components/ui/select', () => {
  const SelectContext = React.createContext<(value: string) => void>(() => {});
  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
    }) => (
      <SelectContext.Provider value={onValueChange ?? (() => {})}>
        {children}
      </SelectContext.Provider>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SelectItem: ({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: string;
    }) => {
      const onValueChange = React.useContext(SelectContext);
      return (
        <button
          type="button"
          data-testid={`select-unit-${value}`}
          onClick={() => onValueChange(value)}
        >
          {children}
        </button>
      );
    },
    SelectTrigger: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SelectValue: () => <span />,
  };
});

const chiliMeal: Meal = {
  id: 'chili-1',
  name: 'Chili',
  serving_size: 1,
  serving_unit: 'serving',
  total_servings: 4,
  cooked_weight_g: 800,
  foods: [
    {
      food_id: 'beans',
      quantity: 400,
      unit: 'g',
      serving_size: 100,
      calories: 120,
      protein: 8,
      carbs: 20,
      fat: 1,
    },
  ],
};

describe('MealUnitSelector', () => {
  it('offers a plate-weight (g) unit option when cooked_weight_g is set', () => {
    render(
      <MealUnitSelector
        meal={chiliMeal}
        open={true}
        onOpenChange={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByTestId('select-unit-g')).toBeInTheDocument();
    expect(screen.getByTestId('select-unit-serving')).toBeInTheDocument();
  });

  it('does not offer a plate-weight option when cooked_weight_g is unset', () => {
    render(
      <MealUnitSelector
        meal={{ ...chiliMeal, cooked_weight_g: null }}
        open={true}
        onOpenChange={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    expect(screen.queryByTestId('select-unit-g')).not.toBeInTheDocument();
  });

  it('switches to plate-weight logging and recomputes nutrition against cooked_weight_g', () => {
    const onSelect = jest.fn();
    render(
      <MealUnitSelector
        meal={chiliMeal}
        open={true}
        onOpenChange={jest.fn()}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByTestId('select-unit-g'));

    // Switching to 'g' defaults quantity to the full cooked weight (800g).
    const quantityInput = screen.getByLabelText('Quantity') as HTMLInputElement;
    expect(quantityInput.value).toBe('800');

    fireEvent.submit(quantityInput.closest('form')!);

    expect(onSelect).toHaveBeenCalledWith(chiliMeal, 800, 'g');
  });

  it('still uses serving_size × total_servings when the serving unit is selected', () => {
    const onSelect = jest.fn();
    render(
      <MealUnitSelector
        meal={chiliMeal}
        open={true}
        onOpenChange={jest.fn()}
        onSelect={onSelect}
        initialQuantity={1}
      />
    );

    const quantityInput = screen.getByLabelText('Quantity') as HTMLInputElement;
    fireEvent.submit(quantityInput.closest('form')!);

    expect(onSelect).toHaveBeenCalledWith(chiliMeal, 1, 'serving');
  });
});
