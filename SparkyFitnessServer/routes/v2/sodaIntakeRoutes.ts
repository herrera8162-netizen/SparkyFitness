import express, { RequestHandler } from 'express';
import {
  LogSodaIntakeBodySchema,
  UpdateSodaIntakeBodySchema,
  UpdateSodaIntakeLogTimeBodySchema,
} from '../../schemas/sodaSchemas.js';
import {
  DateParamSchema,
  UuidParamSchema,
} from '../../schemas/measurementSchemas.js';

import checkPermissionMiddleware from '../../middleware/checkPermissionMiddleware.js';
import onBehalfOfMiddleware from '../../middleware/onBehalfOfMiddleware.js';
import sodaIntakeService from '../../services/sodaIntakeService.js';

const router = express.Router();

router.use(onBehalfOfMiddleware);
router.use(checkPermissionMiddleware('checkin'));

/**
 * @swagger
 * /v2/measurements/soda-intake/entry/{id}:
 *   get:
 *     summary: Get a soda intake entry by ID
 *     tags: [Wellness & Metrics]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the soda intake entry.
 *       - in: header
 *         name: x-on-behalf-of-user-id
 *         schema:
 *           type: string
 *         description: Target user ID for family access.
 *     responses:
 *       200:
 *         description: Soda intake entry retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 soda_ml:
 *                   type: number
 *                 entry_date:
 *                   type: string
 *                   format: date
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error - invalid UUID format.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Validation error"
 *                 details:
 *                   type: object
 *       403:
 *         description: Forbidden - user doesn't have permission.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden: access denied."
 *       404:
 *         description: Soda intake entry not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Soda intake entry not found."
 */
const getSodaIntakeEntryHandler: RequestHandler = async (req, res, next) => {
  try {
    const paramResult = UuidParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: paramResult.error.flatten().fieldErrors,
      });
      return;
    }
    const { id } = paramResult.data;
    const entry = await sodaIntakeService.getSodaIntakeEntryById(
      req.userId,
      id
    );
    res.status(200).json(entry);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.startsWith('Forbidden')) {
        res.status(403).json({ error: error.message });
        return;
      }
      if (error.message === 'Soda intake entry not found.') {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

/**
 * @swagger
 * /v2/measurements/soda-intake/{date}:
 *   get:
 *     summary: Get soda intake for a date
 *     tags: [Wellness & Metrics]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format.
 *       - in: header
 *         name: x-on-behalf-of-user-id
 *         schema:
 *           type: string
 *         description: Target user ID for family access.
 *     responses:
 *       200:
 *         description: Soda intake data retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 soda_ml:
 *                   type: number
 *                   description: Total soda_ml logged for the day (summed across entries).
 *       400:
 *         description: Validation error - invalid date format.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Validation error"
 *                 details:
 *                   type: object
 *       403:
 *         description: Forbidden - user doesn't have permission.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden: access denied."
 */
const getSodaIntakeHandler: RequestHandler = async (req, res, next) => {
  try {
    const paramResult = DateParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: paramResult.error.flatten().fieldErrors,
      });
      return;
    }
    const { date } = paramResult.data;
    const sodaData = await sodaIntakeService.getSodaIntake(
      req.originalUserId || req.userId,

      req.userId,
      date
    );
    res.status(200).json(sodaData);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      res.status(403).json({ error: error.message });
      return;
    }
    next(error);
  }
};

/**
 * @swagger
 * /v2/measurements/soda-intake:
 *   post:
 *     summary: Log a soda intake entry
 *     tags: [Wellness & Metrics]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: x-on-behalf-of-user-id
 *         schema:
 *           type: string
 *         description: Target user ID for family access.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [entry_date, soda_ml]
 *             properties:
 *               entry_date:
 *                 type: string
 *                 format: date
 *                 description: Date of soda intake in YYYY-MM-DD format.
 *                 example: "2023-01-01"
 *               soda_ml:
 *                 type: number
 *                 description: Amount of soda logged, in milliliters.
 *                 example: 355
 *               container_id:
 *                 type: number
 *                 nullable: true
 *                 description: Optional container ID for tracking.
 *                 example: 1
 *     responses:
 *       200:
 *         description: Soda intake entry logged successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 soda_ml:
 *                   type: number
 *                 entry_date:
 *                   type: string
 *                   format: date
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error - missing required fields or invalid data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid request body"
 *                 details:
 *                   type: object
 *       403:
 *         description: Forbidden - user doesn't have permission.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden: access denied."
 */
const logSodaIntakeHandler: RequestHandler = async (req, res, next) => {
  try {
    const bodyResult = LogSodaIntakeBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.flatten().fieldErrors,
      });
      return;
    }
    const { entry_date, soda_ml, container_id } = bodyResult.data;
    const result = await sodaIntakeService.logSodaIntakeAmount(
      req.userId,

      req.originalUserId || req.userId,
      entry_date,
      soda_ml,
      container_id ?? null
    );
    res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      res.status(403).json({ error: error.message });
      return;
    }
    next(error);
  }
};

/**
 * @swagger
 * /v2/measurements/soda-intake/{id}:
 *   put:
 *     summary: Update a soda intake entry
 *     tags: [Wellness & Metrics]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the soda intake entry.
 *       - in: header
 *         name: x-on-behalf-of-user-id
 *         schema:
 *           type: string
 *         description: Target user ID for family access.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               soda_ml:
 *                 type: number
 *                 description: Updated soda amount in milliliters.
 *                 example: 250
 *               entry_date:
 *                 type: string
 *                 format: date
 *                 description: Updated date in YYYY-MM-DD format.
 *                 example: "2023-01-01"
 *               source:
 *                 type: string
 *                 description: Source of the update (e.g., 'manual', 'garmin').
 *                 example: "manual"
 *     responses:
 *       200:
 *         description: Soda intake entry updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 soda_ml:
 *                   type: number
 *                 entry_date:
 *                   type: string
 *                   format: date
 *       400:
 *         description: Validation error - invalid UUID or request body.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Validation error"
 *                 details:
 *                   type: object
 *       403:
 *         description: Forbidden - user doesn't have permission.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden: access denied."
 *       404:
 *         description: Soda intake entry not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Soda intake entry not found."
 */
const updateSodaIntakeHandler: RequestHandler = async (req, res, next) => {
  try {
    const paramResult = UuidParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: paramResult.error.flatten().fieldErrors,
      });
      return;
    }
    const { id } = paramResult.data;

    const bodyResult = UpdateSodaIntakeBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.flatten().fieldErrors,
      });
      return;
    }

    const updatedEntry = await sodaIntakeService.updateSodaIntake(
      req.userId,

      req.originalUserId || req.userId,
      id,
      bodyResult.data
    );
    res.status(200).json(updatedEntry);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.startsWith('Forbidden')) {
        res.status(403).json({ error: error.message });
        return;
      }
      if (
        error.message === 'Soda intake entry not found.' ||
        error.message ===
          'Soda intake entry not found or not authorized to update.'
      ) {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

/**
 * @swagger
 * /v2/measurements/soda-intake/{id}:
 *   delete:
 *     summary: Delete a soda intake entry
 *     tags: [Wellness & Metrics]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: x-on-behalf-of-user-id
 *         schema:
 *           type: string
 *         description: Target user ID for family access.
 *     responses:
 *       200:
 *         description: Soda intake entry deleted successfully.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Soda intake entry not found.
 */
const deleteSodaIntakeHandler: RequestHandler = async (req, res, next) => {
  try {
    const paramResult = UuidParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: paramResult.error.flatten().fieldErrors,
      });
      return;
    }
    const { id } = paramResult.data;
    const result = await sodaIntakeService.deleteSodaIntake(
      req.userId,

      req.originalUserId || req.userId,
      id
    );
    res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.startsWith('Forbidden')) {
        res.status(403).json({ error: error.message });
        return;
      }
      if (
        error.message === 'Soda intake entry not found.' ||
        error.message ===
          'Soda intake entry not found or not authorized to delete.'
      ) {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

/**
 * @swagger
 * /v2/measurements/soda-intake/{date}/log:
 *   get:
 *     summary: Get soda intake log entries for a date
 *     tags: [Wellness & Metrics]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format.
 *       - in: header
 *         name: x-on-behalf-of-user-id
 *         schema:
 *           type: string
 *         description: Target user ID for family access.
 *     responses:
 *       200:
 *         description: Soda intake log entries retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   soda_ml:
 *                     type: number
 *                   container_name:
 *                     type: string
 *                     nullable: true
 *                   container_id:
 *                     type: integer
 *                     nullable: true
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Validation error.
 *       403:
 *         description: Forbidden.
 */
const getSodaIntakeLogHandler: RequestHandler = async (req, res, next) => {
  try {
    const paramResult = DateParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: paramResult.error.flatten().fieldErrors,
      });
      return;
    }
    const { date } = paramResult.data;
    const logEntries = await sodaIntakeService.getSodaIntakeLog(
      req.originalUserId || req.userId,
      req.userId,
      date
    );
    res.status(200).json(logEntries);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      res.status(403).json({ error: error.message });
      return;
    }
    next(error);
  }
};

/**
 * @swagger
 * /v2/measurements/soda-intake/log/{id}:
 *   delete:
 *     summary: Delete a soda intake log entry
 *     tags: [Wellness & Metrics]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: x-on-behalf-of-user-id
 *         schema:
 *           type: string
 *         description: Target user ID for family access.
 *     responses:
 *       200:
 *         description: Soda intake log entry deleted.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Log entry not found.
 */
const deleteSodaIntakeLogHandler: RequestHandler = async (req, res, next) => {
  try {
    const paramResult = UuidParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: paramResult.error.flatten().fieldErrors,
      });
      return;
    }
    const { id } = paramResult.data;
    const result = await sodaIntakeService.deleteSodaIntakeLogEntry(
      req.userId,
      req.originalUserId || req.userId,
      id
    );
    res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.startsWith('Forbidden')) {
        res.status(403).json({ error: error.message });
        return;
      }
      if (error.message === 'Soda intake log entry not found.') {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

// ── PATCH /soda-intake/log/:id  ─ Update logged_at time ────────────
const updateSodaIntakeLogTimeHandler: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const paramsResult = UuidParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      res.status(400).json({
        error: 'Invalid request params',
        details: paramsResult.error.flatten().fieldErrors,
      });
      return;
    }
    const bodyResult = UpdateSodaIntakeLogTimeBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.flatten().fieldErrors,
      });
      return;
    }
    const { id } = paramsResult.data;
    const { loggedAt } = bodyResult.data;
    const authenticatedUserId = req.userId;

    const updated = await sodaIntakeService.updateSodaIntakeLogTime(
      id,
      loggedAt,
      authenticatedUserId
    );

    if (!updated) {
      res.status(404).json({ error: 'Log entry not found' });
      return;
    }

    res.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found or access denied')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

// Note: /entry/:id and /log routes must be registered before /:date to avoid
// Express matching "entry" or "log" as a date parameter.
router.get('/soda-intake/entry/:id', getSodaIntakeEntryHandler);
router.get('/soda-intake/:date/log', getSodaIntakeLogHandler);
router.get('/soda-intake/:date', getSodaIntakeHandler);
router.post('/soda-intake', logSodaIntakeHandler);
router.put('/soda-intake/:id', updateSodaIntakeHandler);
router.patch('/soda-intake/log/:id', updateSodaIntakeLogTimeHandler);
router.delete('/soda-intake/log/:id', deleteSodaIntakeLogHandler);
router.delete('/soda-intake/:id', deleteSodaIntakeHandler);

export default router;
