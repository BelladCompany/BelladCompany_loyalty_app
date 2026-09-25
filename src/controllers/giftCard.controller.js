const GiftCardService = require('../services/giftCard.service');
const env = require('../config/env');

class GiftCardController {
  static async issueGiftCard(req, res, next) {
    try {
      const tenantId = req.tenantId || env.defaultTenantId;
      const createdBy = req.user?.id || null;

      const result = await GiftCardService.issueGiftCard({
        ...req.body,
        created_by: createdBy,
        tenant_id: tenantId,
      });

      res.status(201).json({
        status: 'success',
        message: 'Gift card issued successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async lookupGiftCard(req, res, next) {
    try {
      const tenantId = req.tenantId || env.defaultTenantId;
      const { card_number, pin_code } = req.body;

      const result = await GiftCardService.lookupGiftCard(card_number, pin_code, tenantId);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async claimGiftCard(req, res, next) {
    try {
      const tenantId = req.tenantId || env.defaultTenantId;
      const cashierId = req.user?.id || null;
      const { card_number, pin_code, customer_id } = req.body;

      const targetCustomerId = customer_id || req.user?.customer_id;

      const result = await GiftCardService.claimGiftCardToPoints({
        card_number,
        pin_code,
        customer_id: targetCustomerId,
        cashier_id: cashierId,
        tenant_id: tenantId,
      });

      res.status(200).json({
        status: 'success',
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async redeemGiftCardAtPos(req, res, next) {
    try {
      const tenantId = req.tenantId || env.defaultTenantId;
      const cashierId = req.user?.id || null;

      const result = await GiftCardService.redeemGiftCardAtPos({
        ...req.body,
        cashier_id: cashierId,
        tenant_id: tenantId,
      });

      res.status(200).json({
        status: 'success',
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listGiftCards(req, res, next) {
    try {
      const tenantId = req.tenantId || env.defaultTenantId;
      const { search, status, limit, offset } = req.query;

      const result = await GiftCardService.listGiftCards({
        search,
        status,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
        tenant_id: tenantId,
      });

      res.status(200).json({
        status: 'success',
        data: result.gift_cards,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyGiftCards(req, res, next) {
    try {
      const tenantId = req.tenantId || env.defaultTenantId;
      const customerId = req.user?.customer_id;

      if (!customerId) {
        return res.status(403).json({ status: 'fail', error: 'Customer token required.' });
      }

      const result = await GiftCardService.getCustomerGiftCards(customerId, tenantId);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GiftCardController;
