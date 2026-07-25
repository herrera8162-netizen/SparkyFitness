import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Save, CupSoda } from 'lucide-react';
import SodaContainerManager from './SodaContainerManager';
import { AccordionTrigger, AccordionContent } from '@/components/ui/accordion'; // Import Accordion components
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  useSodaDisplayUnitQuery,
  useUpdateSodaDisplayUnitMutation,
} from '@/hooks/Settings/useSodaPreferences';

// Soda has no goal field (deliberately scoped out), so unlike
// WaterTrackingSettings this only manages the display unit and the
// container manager - there is no "add exercise loss to goal" toggle.
export const SodaTrackingSettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: savedSodaDisplayUnit } = useSodaDisplayUnitQuery(!!user);
  // Local override only while the user is actively picking a new value;
  // falls back to the saved preference (avoids syncing query data into
  // state via an effect).
  const [localOverride, setLocalOverride] = useState<
    'ml' | 'oz' | 'liter' | null
  >(null);
  const sodaDisplayUnit = localOverride ?? savedSodaDisplayUnit ?? 'ml';
  const { mutateAsync: updateSodaDisplayUnit, isPending: loading } =
    useUpdateSodaDisplayUnitMutation();

  const handlePreferencesUpdate = async () => {
    if (!user) return;
    try {
      await updateSodaDisplayUnit(sodaDisplayUnit);

      toast({
        title: t('settings.preferences.successTitle', 'Erfolg'),
        description: t(
          'settings.preferences.successDescription',
          'Preferences saved.'
        ),
      });
    } catch (error: unknown) {
      console.error('Error updating preferences:', error);
    }
  };

  return (
    <>
      <AccordionTrigger
        className="flex items-center gap-2 p-4 hover:no-underline"
        description={t(
          'settings.sodaTracking.description',
          'Configure your soda intake tracking settings'
        )}
      >
        <CupSoda className="h-5 w-5" />
        {t('settings.sodaTracking.title', 'Soda Tracking')}
      </AccordionTrigger>
      <AccordionContent className="p-4 pt-0 space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="soda_display_unit">
            {t('settings.sodaTracking.sodaDisplayUnit', 'Soda Display Unit')}
          </Label>
          <Select
            value={sodaDisplayUnit}
            onValueChange={(unit: 'ml' | 'oz' | 'liter') =>
              setLocalOverride(unit)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ml">
                {t('settings.sodaTracking.milliliters', 'Milliliters (ml)')}
              </SelectItem>
              <SelectItem value="oz">
                {t('settings.sodaTracking.fluidOunces', 'Fluid Ounces (oz)')}
              </SelectItem>
              <SelectItem value="liter">
                {t('settings.sodaTracking.liters', 'Liters')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handlePreferencesUpdate} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading
            ? t('settings.profileInformation.saving', 'Saving...')
            : t(
                'settings.sodaTracking.saveSodaDisplayUnit',
                'Save Soda Display Unit'
              )}
        </Button>
        <Separator />
        <SodaContainerManager />
      </AccordionContent>
    </>
  );
};
