const express = require('express');
const router = express.Router();
const OfferService = require('../services/offer.service');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');

// ─── PUBLIC ENDPOINTS (Accessed by Public Offers Page & Customer Portal) ────

/**
 * GET /api/offers
 * Query params: brand, model, category, branch, month, search, includeInactive (admin)
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 'bellad_and_company';
    const { brand, model, category, branch, month, search, includeInactive } = req.query;

    const data = await OfferService.getOffers({
      tenantId,
      brand,
      model,
      category,
      branch,
      month,
      search,
      includeInactive: includeInactive === 'true',
    });

    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/offers/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 'bellad_and_company';
    const offer = await OfferService.getOfferById(req.params.id, tenantId);
    if (!offer) {
      return res.status(404).json({
        status: 'error',
        message: 'Offer not found.',
      });
    }
    res.json({
      status: 'success',
      data: offer,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PROTECTED ADMIN / MANAGEMENT ENDPOINTS ─────────────────────────────────

const STAFF_ROLES = ['admin', 'super_admin', 'director', 'branch_manager', 'manager'];

/**
 * POST /api/offers
 * Create new monthly dealership offer
 */
router.post('/', authenticateToken, requireRole(STAFF_ROLES), async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const newOffer = await OfferService.createOffer(req.body, tenantId);

    res.status(201).json({
      status: 'success',
      message: 'Monthly dealership offer created successfully.',
      data: newOffer,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/offers/:id
 * Update existing monthly dealership offer
 */
router.put('/:id', authenticateToken, requireRole(STAFF_ROLES), async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const updatedOffer = await OfferService.updateOffer(req.params.id, req.body, tenantId);

    res.json({
      status: 'success',
      message: 'Monthly dealership offer updated successfully.',
      data: updatedOffer,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/offers/:id/toggle
 * Toggle active / inactive status
 */
router.patch('/:id/toggle', authenticateToken, requireRole(STAFF_ROLES), async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const toggled = await OfferService.toggleOfferStatus(req.params.id, tenantId);

    res.json({
      status: 'success',
      message: `Offer is now ${toggled?.is_active ? 'Active' : 'Inactive'}.`,
      data: toggled,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/offers/:id
 * Delete offer
 */
router.delete('/:id', authenticateToken, requireRole(STAFF_ROLES), async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
    const deleted = await OfferService.deleteOffer(req.params.id, tenantId);

    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: 'Offer not found or already deleted.',
      });
    }

    res.json({
      status: 'success',
      message: 'Offer deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
