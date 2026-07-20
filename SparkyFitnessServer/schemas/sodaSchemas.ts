import { z } from 'zod/v4';

const coerceLegacyNumber = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? value : parsed;
};

const requiredLegacyString = (fieldName: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1, `${fieldName} is required`)
  );

const optionalLegacyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional()
);

const requiredLegacyNumber = z.preprocess(coerceLegacyNumber, z.number());

const optionalLegacyNumber = z.preprocess((value) => {
  if (value === '') {
    return undefined;
  }

  return coerceLegacyNumber(value);
}, z.number().optional());

const nullableOptionalLegacyNumber = z.preprocess((value) => {
  if (value === '') {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return coerceLegacyNumber(value);
}, z.number().nullable().optional());

// Soda has no rollup/aggregate table (unlike water_intake), so logging an
// entry is a straightforward "log an entry" call: entry_date + soda_ml + an
// optional container_id, rather than water's change_drinks/container delta
// reconciliation.
export const LogSodaIntakeBodySchema = z
  .object({
    entry_date: requiredLegacyString('entry_date'),
    soda_ml: requiredLegacyNumber,
    container_id: nullableOptionalLegacyNumber,
    user_id: optionalLegacyString,
  })
  .loose();

export type LogSodaIntakeBody = z.infer<typeof LogSodaIntakeBodySchema>;

export const UpdateSodaIntakeBodySchema = z
  .object({
    soda_ml: optionalLegacyNumber,
    entry_date: optionalLegacyString,
    source: optionalLegacyString,
  })
  .loose();

export type UpdateSodaIntakeBody = z.infer<typeof UpdateSodaIntakeBodySchema>;

export const UpdateSodaIntakeLogTimeBodySchema = z
  .object({
    loggedAt: z.string().datetime({
      message: 'loggedAt must be a valid ISO 8601 datetime string',
    }),
  })
  .strict();

export type UpdateSodaIntakeLogTimeBody = z.infer<
  typeof UpdateSodaIntakeLogTimeBodySchema
>;
