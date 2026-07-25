import { apiCall } from '@/api/api';

// Soda has no dedicated preferences endpoint of its own; soda_display_unit
// lives on the same user_preferences row as water_display_unit. This is a
// thin, soda-scoped wrapper around the generic /user-preferences endpoint so
// SodaTrackingSettings doesn't need to depend on the (heavily water-typed)
// PreferencesContext for a single field.
export type SodaDisplayUnit = 'ml' | 'oz' | 'liter';

export const getSodaDisplayUnit = async (): Promise<SodaDisplayUnit | null> => {
  try {
    const data = await apiCall('/user-preferences', {
      method: 'GET',
      suppress404Toast: true,
    });
    return (data?.soda_display_unit as SodaDisplayUnit) ?? null;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('404')) {
      return null;
    }
    throw err;
  }
};

export const updateSodaDisplayUnit = async (
  unit: SodaDisplayUnit
): Promise<unknown> => {
  return apiCall('/user-preferences', {
    method: 'POST',
    body: { soda_display_unit: unit },
  });
};
