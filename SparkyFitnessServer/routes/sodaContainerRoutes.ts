import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import sodaContainerService from '../services/sodaContainerService.js';
import { canAccessUserData } from '../utils/permissionUtils.js';
const router = express.Router();
/**
 * @swagger
 * /soda-containers:
 *   post:
 *     summary: Create a new soda container
 *     tags: [Wellness & Metrics]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SodaContainer'
 *     responses:
 *       201:
 *         description: Soda container created successfully.
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const container = await sodaContainerService.createSodaContainer(
      req.userId,
      req.body
    );
    res.status(201).json(container);
  } catch (error) {
    next(error);
  }
});
/**
 * @swagger
 * /soda-containers:
 *   get:
 *     summary: Get all soda containers for the user
 *     tags: [Wellness & Metrics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: A list of soda containers.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SodaContainer'
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.query;

    const targetUserId = userId || req.userId;

    if (targetUserId !== req.userId) {
      const hasPermission = await { canAccessUserData }.canAccessUserData(
        targetUserId,
        'diary',

        req.userId
      ); // Assuming diary permission allows viewing containers
      if (!hasPermission) return res.status(403).json({ error: 'Forbidden' });
    }
    const containers =
      await sodaContainerService.getSodaContainersByUserId(targetUserId);
    res.status(200).json(containers);
  } catch (error) {
    next(error);
  }
});
/**
 * @swagger
 * /soda-containers/{id}:
 *   put:
 *     summary: Update a soda container
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SodaContainer'
 *     responses:
 *       200:
 *         description: Soda container updated successfully.
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const container = await sodaContainerService.updateSodaContainer(
      req.params.id,

      req.userId,
      req.body
    );
    if (!container) {
      return res
        .status(404)
        .json({ error: 'Container not found or not authorized.' });
    }
    res.status(200).json(container);
  } catch (error) {
    next(error);
  }
});
/**
 * @swagger
 * /soda-containers/{id}:
 *   delete:
 *     summary: Delete a soda container
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
 *     responses:
 *       200:
 *         description: Deleted successfully.
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await sodaContainerService.deleteSodaContainer(
      req.params.id,

      req.userId
    );
    res.status(200).json(result);
  } catch (error) {
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    if (error.message.includes('not found')) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});
/**
 * @swagger
 * /soda-containers/{id}/set-primary:
 *   put:
 *     summary: Set a soda container as primary
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
 *     responses:
 *       200:
 *         description: Primary container set successfully.
 */
router.put('/:id/set-primary', authenticate, async (req, res, next) => {
  try {
    const container = await sodaContainerService.setPrimarySodaContainer(
      req.params.id,

      req.userId
    );
    if (!container) {
      return res
        .status(404)
        .json({ error: 'Container not found or not authorized.' });
    }
    res.status(200).json(container);
  } catch (error) {
    next(error);
  }
});
/**
 * @swagger
 * /soda-containers/primary:
 *   get:
 *     summary: Get the primary soda container for the user
 *     tags: [Wellness & Metrics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: The primary soda container.
 */
router.get('/primary', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.query;

    const targetUserId = userId || req.userId;

    if (targetUserId !== req.userId) {
      const hasPermission = await { canAccessUserData }.canAccessUserData(
        targetUserId,
        'diary',

        req.userId
      );
      if (!hasPermission) return res.status(403).json({ error: 'Forbidden' });
    }
    const primaryContainer =
      await sodaContainerService.getPrimarySodaContainerByUserId(targetUserId);
    if (primaryContainer) {
      res.status(200).json(primaryContainer);
    } else {
      // Return a default container if no primary is found
      res.status(200).json({
        id: null, // Indicate no actual container ID
        user_id: targetUserId,
        name: 'Default Container',
        volume: 2000, // Default to 2000ml
        unit: 'ml',
        is_primary: true,
        servings_per_container: 8, // Default to 8 servings
      });
    }
  } catch (error) {
    next(error);
  }
});
export default router;
