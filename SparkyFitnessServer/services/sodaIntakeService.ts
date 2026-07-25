import sodaIntakeRepository from '../models/sodaIntakeRepository.js';
import sodaContainerRepository from '../models/sodaContainerRepository.js';
import { log } from '../config/logging.js';

// ── Soda Intake (daily total, computed at read time) ─────────────────────

async function getSodaIntake(
  authenticatedUserId: string,
  targetUserId: string,
  date: string
) {
  try {
    const sodaData = await sodaIntakeRepository.getSodaIntakeByDate(
      targetUserId,
      date
    );
    // sodaData will be { soda_ml: SUM(...) } from the repository logic
    return sodaData || { soda_ml: 0 };
  } catch (error) {
    log(
      'error',
      `Error fetching soda intake for user ${targetUserId} on ${date} by ${authenticatedUserId}:`,
      error
    );
    throw error;
  }
}

// Logs a raw ml amount into the itemized soda_intake_entries log. There is no
// aggregated rollup table to keep in sync for soda; the daily total is always
// computed as SUM(soda_ml) at read time (see getSodaIntake above).
async function logSodaIntakeAmount(
  userId: string,
  authenticatedUserId: string,
  entryDate: string,
  sodaMl: number,
  containerId: number | null = null
) {
  try {
    let containerName: string | null = null;
    if (containerId) {
      const container = await sodaContainerRepository.getSodaContainerById(
        containerId,
        authenticatedUserId
      );
      if (container) {
        containerName = container.name || null;
      } else {
        log(
          'warn',
          `Container with ID ${containerId} not found for user ${authenticatedUserId}. Logging without container.`
        );
        containerId = null;
      }
    }
    const logEntry = await sodaIntakeRepository.insertSodaIntakeLog(
      userId,
      authenticatedUserId,
      entryDate,
      sodaMl,
      containerId,
      containerName,
      'manual'
    );
    return logEntry;
  } catch (error) {
    log(
      'error',
      `Error logging soda intake amount for user ${userId} by ${authenticatedUserId}:`,
      error
    );
    throw error;
  }
}

async function getSodaIntakeLog(
  authenticatedUserId: string,
  targetUserId: string,
  date: string
) {
  try {
    const logEntries = await sodaIntakeRepository.getSodaIntakeLogByDate(
      targetUserId,
      date
    );
    return logEntries || [];
  } catch (error) {
    log(
      'error',
      `Error fetching soda intake log for user ${targetUserId} on ${date} by ${authenticatedUserId}:`,
      error
    );
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSodaIntakeEntryById(authenticatedUserId: any, id: any) {
  try {
    const entryOwnerId = await sodaIntakeRepository.getSodaIntakeEntryOwnerId(
      id,
      authenticatedUserId
    );
    if (!entryOwnerId) {
      throw new Error('Soda intake entry not found.');
    }
    const entry = await sodaIntakeRepository.getSodaIntakeEntryById(
      id,
      authenticatedUserId
    );
    return entry;
  } catch (error) {
    log(
      'error',
      `Error fetching soda intake entry ${id} by ${authenticatedUserId}:`,
      error
    );
    throw error;
  }
}

async function updateSodaIntake(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authenticatedUserId: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actingUserId: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  id: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateData: any
) {
  try {
    const entryOwnerId = await sodaIntakeRepository.getSodaIntakeEntryOwnerId(
      id,
      authenticatedUserId
    );
    if (!entryOwnerId) {
      throw new Error('Soda intake entry not found.');
    }
    if (entryOwnerId !== authenticatedUserId) {
      throw new Error(
        'Forbidden: You do not have permission to update this soda intake entry.'
      );
    }
    const updatedEntry = await sodaIntakeRepository.updateSodaIntake(
      id,
      authenticatedUserId,
      actingUserId,
      updateData
    );
    if (!updatedEntry) {
      throw new Error(
        'Soda intake entry not found or not authorized to update.'
      );
    }
    return updatedEntry;
  } catch (error) {
    log(
      'error',
      `Error updating soda intake entry ${id} by ${authenticatedUserId} on behalf of ${actingUserId}:`,
      error
    );
    throw error;
  }
}

async function deleteSodaIntake(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authenticatedUserId: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actingUserId: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  id: any
) {
  try {
    const entryOwnerId = await sodaIntakeRepository.getSodaIntakeEntryOwnerId(
      id,
      authenticatedUserId
    );
    if (!entryOwnerId) {
      throw new Error('Soda intake entry not found.');
    }
    if (entryOwnerId !== authenticatedUserId) {
      throw new Error(
        'Forbidden: You do not have permission to delete this soda intake entry.'
      );
    }
    const success = await sodaIntakeRepository.deleteSodaIntake(
      id,
      authenticatedUserId
    );
    if (!success) {
      throw new Error('Soda intake entry not found.');
    }
    return { message: 'Soda intake entry deleted successfully.' };
  } catch (error) {
    log(
      'error',
      `Error deleting soda intake entry ${id} by ${authenticatedUserId} on behalf of ${actingUserId}:`,
      error
    );
    throw error;
  }
}

async function deleteSodaIntakeLogEntry(
  authenticatedUserId: string,
  actingUserId: string,
  logId: string
) {
  try {
    // 1. Verify ownership
    const ownerId = await sodaIntakeRepository.getSodaIntakeLogEntryOwnerId(
      logId,
      authenticatedUserId
    );
    if (!ownerId) {
      throw new Error('Soda intake log entry not found.');
    }
    if (ownerId !== authenticatedUserId) {
      throw new Error(
        'Forbidden: You do not have permission to delete this soda intake log entry.'
      );
    }

    // 2. Delete the log entry. There is no rollup table to reconcile for soda;
    //    the daily total is always computed as SUM(soda_ml) at read time.
    const deleted = await sodaIntakeRepository.deleteSodaIntakeLog(
      logId,
      authenticatedUserId
    );
    if (!deleted) {
      throw new Error('Soda intake log entry not found.');
    }

    return { message: 'Soda intake log entry deleted successfully.' };
  } catch (error) {
    log(
      'error',
      `Error deleting soda intake log entry ${logId} by ${authenticatedUserId}:`,
      error
    );
    throw error;
  }
}

async function updateSodaIntakeLogTime(
  logId: string,
  loggedAt: string,
  authenticatedUserId: string
) {
  const ownerId = await sodaIntakeRepository.getSodaIntakeLogEntryOwnerId(
    logId,
    authenticatedUserId
  );
  if (!ownerId) {
    throw new Error('Soda intake log entry not found or access denied');
  }
  const updated = await sodaIntakeRepository.updateSodaIntakeLogTime(
    logId,
    authenticatedUserId,
    loggedAt
  );
  return updated;
}

export { getSodaIntake };
export { logSodaIntakeAmount };
export { getSodaIntakeLog };
export { getSodaIntakeEntryById };
export { updateSodaIntake };
export { deleteSodaIntake };
export { deleteSodaIntakeLogEntry };
export { updateSodaIntakeLogTime };

export default {
  getSodaIntake,
  logSodaIntakeAmount,
  getSodaIntakeLog,
  getSodaIntakeEntryById,
  updateSodaIntake,
  deleteSodaIntake,
  deleteSodaIntakeLogEntry,
  updateSodaIntakeLogTime,
};
