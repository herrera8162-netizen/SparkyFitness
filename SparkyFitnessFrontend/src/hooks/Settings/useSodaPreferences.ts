import {
  getSodaDisplayUnit,
  updateSodaDisplayUnit,
  SodaDisplayUnit,
} from '@/api/Settings/sodaPreferencesService';
import { useQuery, useMutation } from '@tanstack/react-query';

export const sodaPreferencesKeys = {
  all: ['sodaPreferences'] as const,
  displayUnit: () => [...sodaPreferencesKeys.all, 'displayUnit'] as const,
};

export const useSodaDisplayUnitQuery = (enabled: boolean) => {
  return useQuery({
    queryKey: sodaPreferencesKeys.displayUnit(),
    queryFn: getSodaDisplayUnit,
    enabled,
  });
};

export const useUpdateSodaDisplayUnitMutation = () => {
  return useMutation({
    mutationFn: (unit: SodaDisplayUnit) => updateSodaDisplayUnit(unit),
    meta: {
      successMessage: 'Preferences saved.',
      errorMessage: 'Failed to save preferences.',
    },
  });
};
