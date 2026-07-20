import { useState } from 'react';
import { instantHourMinute, dayToUtcRange } from '@workspace/shared';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CupSoda,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Star,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePreferences } from '@/contexts/PreferencesContext';
import { convertMlToSelectedUnit } from '@/utils/nutritionCalculations';
import { useSodaContainer } from '@/contexts/SodaContainerContext';
import { useActiveUser } from '@/contexts/ActiveUserContext';
import {
  useSodaIntakeQuery,
  useLogSodaIntakeMutation,
  useSodaIntakeLogQuery,
  useDeleteSodaIntakeLogMutation,
  useUpdateSodaIntakeLogTimeMutation,
} from '@/hooks/Diary/useSodaIntake';

interface SodaIntakeProps {
  selectedDate: string;
}

// Unlike WaterIntake, there is no daily goal for soda (deliberately scoped
// out), so this widget shows a running total instead of a goal-based fill
// visualization, and "remove" deletes the most recently logged entry rather
// than reconciling a delta against an aggregate rollup row (soda has none).
const SodaIntake = ({ selectedDate }: SodaIntakeProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeUserId } = useActiveUser(); // Get activeUserId
  const { activeContainer, containers } = useSodaContainer();
  const userId = activeUserId || user?.id;
  const { data: sodaMl = 0 } = useSodaIntakeQuery(selectedDate, userId);
  const { mutate: logSodaIntake, isPending: loading } =
    useLogSodaIntakeMutation();
  const { data: logEntries = [] } = useSodaIntakeLogQuery(selectedDate, userId);
  const { mutate: deleteLogEntry, isPending: deleting } =
    useDeleteSodaIntakeLogMutation();
  const { mutate: updateLogTime } = useUpdateSodaIntakeLogTimeMutation();

  // Local state for the selected container in the diary
  const [selectedContainerId, setSelectedContainerId] = useState<number | null>(
    () => activeContainer?.id ?? null
  );

  // Local state for log panel visibility
  const [showLog, setShowLog] = useState(false);

  // State for editing time on a log entry
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);

  // Derived selected container
  const currentContainer =
    containers.find((c) => c.id === selectedContainerId) || activeContainer;

  const cycleContainer = (direction: 'next' | 'prev') => {
    if (containers.length <= 1) return;

    const currentIndex = containers.findIndex(
      (c) => c.id === currentContainer?.id
    );
    let nextIndex;

    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % containers.length;
    } else {
      nextIndex = (currentIndex - 1 + containers.length) % containers.length;
    }

    const nextContainer = containers[nextIndex];
    if (nextContainer) {
      setSelectedContainerId(nextContainer.id);
    }
  };

  const getAmountPerDrink = () => {
    if (currentContainer) {
      const servings = Math.max(
        1,
        currentContainer.servings_per_container || 1
      );
      return Number(currentContainer.volume) / servings;
    }
    return 355; // Default: one standard can
  };

  const addDrink = () => {
    if (!userId) {
      return;
    }
    logSodaIntake({
      user_id: userId,
      entry_date: selectedDate,
      soda_ml: getAmountPerDrink(),
      container_id: currentContainer?.id || null,
    });
  };

  const removeLastDrink = () => {
    const lastEntry = logEntries[0];
    if (lastEntry) {
      deleteLogEntry(lastEntry.id);
    }
  };

  const getVolumeDisplay = () => {
    const displayUnit = currentContainer?.unit || 'ml';
    const displayVolume = convertMlToSelectedUnit(
      getAmountPerDrink(),
      displayUnit
    ).toFixed(displayUnit === 'ml' ? 0 : 2);

    return t('foodDiary.sodaIntake.perDrink', {
      volume: displayVolume,
      unit: displayUnit,
    });
  };

  const { timezone } = usePreferences();

  const formatLogTime = (timestamp: string) => {
    try {
      const { hour, minute } = instantHourMinute(timestamp, timezone);
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    } catch {
      return '--:--';
    }
  };

  const getTimeInputValue = (timestamp: string) => {
    try {
      const { hour, minute } = instantHourMinute(timestamp, timezone);
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    } catch {
      return '12:00';
    }
  };

  const handleTimeChange = (
    entryId: string,
    entryDate: string,
    newTime: string
  ) => {
    try {
      // entryDate is a Postgres DATE column serialized as UTC midnight
      // (e.g. "2026-05-14T00:00:00.000Z"). Extract the YYYY-MM-DD substring
      // directly — do NOT use instantToDay, which would roll back to the
      // previous day for users west of UTC.
      const datePart = entryDate.substring(0, 10);
      const timeParts = newTime.split(':');
      const hours = parseInt(timeParts[0] || '0', 10);
      const minutes = parseInt(timeParts[1] || '0', 10);

      // Build a UTC instant from the user's local day + time using dayToUtcRange
      // dayToUtcRange gives midnight UTC for this day in the user's timezone
      const { start } = dayToUtcRange(datePart, timezone);
      const loggedAt = new Date(
        start.getTime() + hours * 3600000 + minutes * 60000
      ).toISOString();

      updateLogTime({ logId: entryId, loggedAt });
      setEditingTimeId(null);
    } catch (e) {
      console.error('Error formatting time:', e);
      setEditingTimeId(null);
    }
  };

  if (!user) {
    return null;
  }

  const displayUnit = currentContainer?.unit || 'ml';

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-base dark:text-slate-300">
          <CupSoda className="w-4 h-4 mr-2" />
          {t('foodDiary.sodaIntake.title', 'Soda Intake')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between p-3 dark:text-slate-300">
        {/* Soda total display */}
        <div className="text-center mb-3">
          <div className="text-xl font-bold">
            {convertMlToSelectedUnit(sodaMl, displayUnit).toFixed(
              displayUnit === 'ml' ? 0 : 2
            )}
          </div>
          <div className="text-gray-500 text-xs">{displayUnit}</div>
        </div>

        {/* Soda Can Visualization */}
        <div className="flex-1 flex flex-col items-center justify-center mb-3">
          <div className="relative flex flex-col items-center">
            <div className="w-16 h-32 border-3 dark:bg-slate-300 border-amber-500 rounded-xl bg-amber-50 flex items-center justify-center">
              <CupSoda className="w-8 h-8 text-amber-600" />
            </div>
            <div className="text-xs text-gray-600 mt-1.5 font-medium">
              {logEntries.length}{' '}
              {t('foodDiary.sodaIntake.drinksToday', 'today')}
            </div>
          </div>
        </div>

        {/* Intuitive Soda Controls: [ - ] VOLUME [ + ] */}
        <div className="flex items-center justify-center space-x-3">
          <Button
            variant="outline"
            onClick={removeLastDrink}
            disabled={logEntries.length === 0 || deleting}
            size="icon"
            className="h-8 w-8 rounded-full"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="text-center min-w-[70px]">
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {getVolumeDisplay()}
            </div>
          </div>

          <Button
            onClick={addDrink}
            disabled={loading}
            size="icon"
            className="h-8 w-8 rounded-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Container Toggle (Source) */}
        <div className="flex items-center justify-center mt-3 pt-2 border-t border-gray-100 dark:border-slate-800 space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => cycleContainer('prev')}
            disabled={containers.length <= 1}
            className="h-6 w-6 text-gray-400 hover:text-gray-600"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center justify-center space-x-1 px-1">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate max-w-[110px]">
              {currentContainer?.name ||
                t('foodDiary.sodaIntake.defaultContainer', 'Container')}
            </div>
            {currentContainer?.is_primary && (
              <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => cycleContainer('next')}
            disabled={containers.length <= 1}
            className="h-6 w-6 text-gray-400 hover:text-gray-600"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Drink History Log */}
        {logEntries.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={() => setShowLog(!showLog)}
              className="flex items-center justify-between w-full text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <span>
                {t('foodDiary.sodaIntake.logTitle', "Today's drinks")} (
                {logEntries.length})
              </span>
              {showLog ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {showLog && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {logEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-1 px-1.5 rounded text-xs bg-gray-50 dark:bg-slate-800/50 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {editingTimeId === entry.id ? (
                        <input
                          type="time"
                          className="text-xs tabular-nums bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-600 rounded px-1 py-0.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-400 w-[72px]"
                          defaultValue={getTimeInputValue(
                            entry.logged_at || entry.created_at
                          )}
                          onBlur={(e) =>
                            handleTimeChange(
                              entry.id,
                              entry.entry_date,
                              e.target.value
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleTimeChange(
                                entry.id,
                                entry.entry_date,
                                (e.target as HTMLInputElement).value
                              );
                            } else if (e.key === 'Escape') {
                              setEditingTimeId(null);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => setEditingTimeId(entry.id)}
                          className="text-gray-400 dark:text-gray-500 tabular-nums shrink-0 hover:text-amber-500 dark:hover:text-amber-400 hover:underline cursor-pointer transition-colors"
                          title={t(
                            'foodDiary.sodaIntake.editTime',
                            'Click to change time'
                          )}
                        >
                          {formatLogTime(entry.logged_at || entry.created_at)}
                        </button>
                      )}
                      <span className="text-gray-600 dark:text-gray-300 truncate">
                        {entry.container_name ||
                          t(
                            'foodDiary.sodaIntake.defaultContainer',
                            'Container'
                          )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {convertMlToSelectedUnit(
                          Number(entry.soda_ml),
                          displayUnit
                        ).toFixed(displayUnit === 'ml' ? 0 : 1)}{' '}
                        {displayUnit}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => deleteLogEntry(entry.id)}
                        disabled={deleting}
                        title={t(
                          'foodDiary.sodaIntake.deleteEntry',
                          'Delete this drink'
                        )}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SodaIntake;
