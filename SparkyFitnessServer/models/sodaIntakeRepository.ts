import { getClient } from '../db/poolManager.js';

// ── Soda Intake Entries (granular drink-by-drink tracking) ───────────────
// Unlike water, soda has no daily-rollup table: the daily total is always
// computed as SUM(soda_ml) FROM soda_intake_entries at read time.

async function insertSodaIntakeLog(
  userId: string,
  actingUserId: string,
  entryDate: string,
  sodaMl: number,
  containerId: number | null,
  containerName: string | null,
  source = 'manual',
  loggedAt: string | null = null
) {
  const client = await getClient(actingUserId);
  try {
    const result = await client.query(
      `INSERT INTO soda_intake_entries
        (user_id, entry_date, soda_ml, container_id, container_name, source, created_at, created_by_user_id, logged_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, COALESCE($8, NOW()))
       RETURNING *`,
      [
        userId,
        entryDate,
        sodaMl,
        containerId,
        containerName,
        source,
        actingUserId,
        loggedAt,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSodaIntakeByDate(userId: any, date: any, source = null) {
  const client = await getClient(userId);
  try {
    let query;
    let values;
    if (source) {
      query =
        'SELECT SUM(soda_ml) as soda_ml FROM soda_intake_entries WHERE user_id = $1 AND entry_date = $2 AND source = $3';
      values = [userId, date, source];
    } else {
      // Sum all sources for the day
      query =
        'SELECT SUM(soda_ml) as soda_ml FROM soda_intake_entries WHERE user_id = $1 AND entry_date = $2';
      values = [userId, date];
    }
    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getSodaIntakesByDates(userId: string, dates: string[]) {
  const client = await getClient(userId);
  try {
    const query =
      'SELECT entry_date, SUM(soda_ml) as soda_ml FROM soda_intake_entries WHERE user_id = $1 AND entry_date = ANY($2::date[]) GROUP BY entry_date';
    const values = [userId, dates];
    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
}

async function getSodaIntakeLogsByDates(userId: string, dates: string[]) {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      `SELECT id, user_id, entry_date, soda_ml, container_id, container_name, source, created_at, logged_at
       FROM soda_intake_entries
       WHERE user_id = $1 AND entry_date = ANY($2::date[])
       ORDER BY entry_date, logged_at ASC`,
      [userId, dates]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function getSodaIntakeLogByDate(userId: string, date: string) {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      `SELECT id, user_id, entry_date, soda_ml, container_id, container_name, source, created_at, logged_at
       FROM soda_intake_entries
       WHERE user_id = $1 AND entry_date = $2
       ORDER BY logged_at DESC`,
      [userId, date]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSodaIntakeEntryById(id: any, userId: any) {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      'SELECT * FROM soda_intake_entries WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSodaIntakeEntryOwnerId(id: any, userId: any) {
  const client = await getClient(userId);
  try {
    const entryResult = await client.query(
      'SELECT user_id FROM soda_intake_entries WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return entryResult.rows[0]?.user_id;
  } finally {
    client.release();
  }
}

async function updateSodaIntake(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  id: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userId: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actingUserId: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateData: any
) {
  const client = await getClient(actingUserId);
  try {
    const result = await client.query(
      `UPDATE soda_intake_entries SET
        soda_ml = COALESCE($1, soda_ml),
        entry_date = COALESCE($2, entry_date),
        source = COALESCE($3, source)
      WHERE id = $4 AND user_id = $5
      RETURNING *`,
      [updateData.soda_ml, updateData.entry_date, updateData.source, id, userId]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deleteSodaIntake(id: any, userId: any) {
  const client = await getClient(userId); // User-specific operation
  try {
    const result = await client.query(
      'DELETE FROM soda_intake_entries WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return result.rowCount > 0;
  } finally {
    client.release();
  }
}

async function deleteSodaIntakeLog(id: string, userId: string) {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      'DELETE FROM soda_intake_entries WHERE id = $1 AND user_id = $2 RETURNING id, soda_ml, entry_date, source',
      [id, userId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function getSodaIntakeLogEntryOwnerId(id: string, userId: string) {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      'SELECT user_id FROM soda_intake_entries WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0]?.user_id as string | undefined;
  } finally {
    client.release();
  }
}

async function updateSodaIntakeLogTime(
  id: string,
  userId: string,
  loggedAt: string
) {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      'UPDATE soda_intake_entries SET logged_at = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [loggedAt, id, userId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export { insertSodaIntakeLog };
export { getSodaIntakeByDate };
export { getSodaIntakesByDates };
export { getSodaIntakeLogsByDates };
export { getSodaIntakeLogByDate };
export { getSodaIntakeEntryById };
export { getSodaIntakeEntryOwnerId };
export { updateSodaIntake };
export { deleteSodaIntake };
export { deleteSodaIntakeLog };
export { getSodaIntakeLogEntryOwnerId };
export { updateSodaIntakeLogTime };

export default {
  insertSodaIntakeLog,
  getSodaIntakeByDate,
  getSodaIntakesByDates,
  getSodaIntakeLogsByDates,
  getSodaIntakeLogByDate,
  getSodaIntakeEntryById,
  getSodaIntakeEntryOwnerId,
  updateSodaIntake,
  deleteSodaIntake,
  deleteSodaIntakeLog,
  getSodaIntakeLogEntryOwnerId,
  updateSodaIntakeLogTime,
};
