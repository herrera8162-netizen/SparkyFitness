import {
  getSodaIntakeForDate,
  getSodaIntakeLog,
  deleteSodaIntakeLogEntry,
  updateSodaIntakeLogTime,
  LogSodaPayload,
  logSodaIntake,
  SodaIntakeLogEntry,
} from '@/api/Diary/sodaIntakeService';
import { sodaIntakeKeys } from '@/api/keys/diary';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDiaryInvalidation } from '../useInvalidateKeys';

// Soda has no goal field and no rollup table: the daily total is always
// SUM(soda_ml) computed server-side, read fresh on every query.
export const useSodaIntakeQuery = (date: string, userId?: string) => {
  return useQuery({
    queryKey: sodaIntakeKeys.daily(date, userId!),
    queryFn: async () => {
      const sodaData = await getSodaIntakeForDate(date, userId!);
      if (
        sodaData &&
        (sodaData as { soda_ml?: number }).soda_ml !== undefined &&
        (sodaData as { soda_ml?: number }).soda_ml !== null
      ) {
        return Number((sodaData as { soda_ml: number }).soda_ml);
      }
      return 0;
    },
    enabled: !!userId && !!date,
  });
};

export const useLogSodaIntakeMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const invalidate = useDiaryInvalidation();
  return useMutation({
    mutationFn: (payload: LogSodaPayload) => logSodaIntake(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: sodaIntakeKeys.daily(variables.entry_date, variables.user_id),
      });
      // Also invalidate the log since a new entry was added
      queryClient.invalidateQueries({
        queryKey: sodaIntakeKeys.log(variables.entry_date, variables.user_id),
      });
      invalidate();
    },
    meta: {
      successMessage: t('foodDiary.sodaIntake.updated', 'Soda intake updated'),
      errorMessage: t(
        'foodDiary.sodaIntake.updateError',
        'Failed to save soda intake'
      ),
    },
  });
};

export const useSodaIntakeLogQuery = (date: string, userId?: string) => {
  return useQuery<SodaIntakeLogEntry[]>({
    queryKey: sodaIntakeKeys.log(date, userId!),
    queryFn: () => getSodaIntakeLog(date, userId!),
    enabled: !!userId && !!date,
  });
};

export const useDeleteSodaIntakeLogMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const invalidate = useDiaryInvalidation();

  return useMutation({
    mutationFn: (logId: string) => deleteSodaIntakeLogEntry(logId),
    onSuccess: () => {
      // Invalidate all soda intake queries (total + log)
      queryClient.invalidateQueries({
        queryKey: sodaIntakeKeys.all,
      });
      invalidate();
    },
    meta: {
      successMessage: t('foodDiary.sodaIntake.deletedSuccess', 'Drink removed'),
      errorMessage: t(
        'foodDiary.sodaIntake.deletedError',
        'Failed to remove drink'
      ),
    },
  });
};

export const useUpdateSodaIntakeLogTimeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ logId, loggedAt }: { logId: string; loggedAt: string }) =>
      updateSodaIntakeLogTime(logId, loggedAt),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sodaIntakeKeys.all,
      });
    },
  });
};
