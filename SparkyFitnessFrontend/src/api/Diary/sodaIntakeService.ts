import { apiCall } from '@/api/api';

// Unlike water, soda has no daily-rollup table: the daily total is always
// computed server-side as SUM(soda_ml) FROM soda_intake_entries. There is
// also no "change_drinks"/rollup reconciliation to keep in sync, so logging
// an entry is a straightforward POST of an amount rather than a delta.
export interface LogSodaPayload {
  user_id: string;
  entry_date: string;
  soda_ml: number;
  container_id: number | null;
}

export interface SodaIntakeLogEntry {
  id: string;
  user_id: string;
  entry_date: string;
  soda_ml: number;
  container_id: number | null;
  container_name: string | null;
  source: string;
  created_at: string;
  logged_at: string;
}

export const getSodaIntakeForDate = async (date: string, userId: string) => {
  return apiCall(`/v2/measurements/soda-intake/${date}?userId=${userId}`);
};

export const logSodaIntake = async (payload: LogSodaPayload) => {
  return apiCall('/v2/measurements/soda-intake', {
    method: 'POST',
    body: payload,
  });
};

export const getSodaIntakeLog = async (
  date: string,
  userId: string
): Promise<SodaIntakeLogEntry[]> => {
  return apiCall(`/v2/measurements/soda-intake/${date}/log?userId=${userId}`);
};

export const deleteSodaIntakeLogEntry = async (logId: string) => {
  return apiCall(`/v2/measurements/soda-intake/log/${logId}`, {
    method: 'DELETE',
  });
};

export const updateSodaIntakeLogTime = async (
  logId: string,
  loggedAt: string
) => {
  return apiCall(`/v2/measurements/soda-intake/log/${logId}`, {
    method: 'PATCH',
    body: { loggedAt },
  });
};
