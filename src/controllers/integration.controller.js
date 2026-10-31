const IntegrationService = require('../services/integration.service');

class IntegrationController {
  /**
   * GET /api/v1/integration/health
   */
  static async getHealth(req, res, next) {
    try {
      const data = await IntegrationService.getHealth(req.apiClient);
      res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/integration/docs
   */
  static async getDocs(req, res, next) {
    try {
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}/api/v1/integration`;
      const docs = IntegrationService.getDocs(baseUrl);
      res.status(200).json({ status: 'success', data: docs });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/integration/customers
   */
  static async getCustomers(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { search, phone, customer_id, limit, offset } = req.query;

      const result = await IntegrationService.getCustomers({
        tenantId,
        search,
        phone,
        customerId: customer_id,
        limit,
        offset,
      });

      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/integration/customers/:id
   */
  static async getCustomerById(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { id } = req.params;

      const customer = await IntegrationService.getCustomerById(id, tenantId);
      res.status(200).json({ status: 'success', data: customer });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/integration/customers
   */
  static async createCustomer(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const result = await IntegrationService.createCustomer({
        ...req.body,
        tenant_id: tenantId,
      });

      const statusCode = result.status === 'created' ? 201 : 200;
      res.status(statusCode).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/integration/customers/:id
   */
  static async updateCustomer(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { id } = req.params;

      const result = await IntegrationService.updateCustomer(id, req.body, tenantId);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/integration/transactions/invoice
   * Main DMS & AppSheet billing ingestion endpoint
   */
  static async ingestInvoice(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const createdBy = req.apiClient ? `${req.apiClient.name} (${req.apiClient.client_type})` : 'dms_api';

      const result = await IntegrationService.ingestInvoice({
        ...req.body,
        tenant_id: tenantId,
        created_by: createdBy,
      });

      res.status(201).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/integration/transactions/redeem
   * Cashier / DMS points redemption at counter
   */
  static async redeemPoints(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const createdBy = req.apiClient ? `${req.apiClient.name} (${req.apiClient.client_type})` : 'dms_api';

      const result = await IntegrationService.redeemPoints({
        ...req.body,
        tenant_id: tenantId,
        created_by: createdBy,
      });

      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/integration/realbooks/feed
   */
  static async getRealBooksFeed(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { limit } = req.query;

      const result = await IntegrationService.getRealBooksSyncFeed({
        tenantId,
        limit,
      });

      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/integration/realbooks/ack
   */
  static async ackRealBooks(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { sync_ids, realbooks_voucher_no } = req.body;

      const result = await IntegrationService.acknowledgeRealBooksSync({
        sync_ids,
        realbooks_voucher_no,
        tenantId,
      });

      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/integration/appsheet/webhook
   */
  static async appsheetWebhook(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const payload = req.body;

      // Extract details from AppSheet webhook format
      const invoiceNo = payload.invoice_number || payload['Invoice No'] || payload.id || `APPSHEET-${Date.now()}`;
      const phone = payload.phone_number || payload['Phone'] || payload['Mobile Number'] || payload.phone;
      const amount = payload.bill_amount || payload['Bill Amount'] || payload['Amount'] || payload.ex_showroom_price;
      const dept = payload.department || payload['Department'] || payload.category || 'service';
      const regNo = payload.registration_number || payload['Vehicle No'] || payload['Registration Number'] || payload.reg_no;

      if (!phone || !amount) {
        return res.status(400).json({
          status: 'fail',
          error: 'Missing required AppSheet fields: phone and bill_amount/amount required.',
          received_payload: payload,
        });
      }

      const result = await IntegrationService.ingestInvoice({
        department: dept,
        invoice_number: invoiceNo,
        bill_amount: Number(amount),
        customer_phone: phone,
        customer_name: payload.customer_name || payload['Customer Name'],
        vehicle_registration: regNo,
        vehicle_model: payload.model || payload['Model'],
        branch_id: payload.branch_id || 1,
        remarks: 'AppSheet Webhook Ingestion',
        tenant_id: tenantId,
        created_by: 'appsheet_webhook',
      });

      res.status(200).json({
        status: 'success',
        message: 'AppSheet event successfully synced to Bellad Loyalty ledger.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/integration/keys
   */
  static async listKeys(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const keys = await IntegrationService.listApiKeys(tenantId);
      res.status(200).json({ status: 'success', data: keys });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/integration/keys
   */
  static async createKey(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { name, client_type, scopes } = req.body;

      const newKey = await IntegrationService.createApiKey({
        name,
        client_type,
        scopes,
        tenantId,
      });

      res.status(201).json({ status: 'success', data: newKey });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/integration/keys/:id
   */
  static async revokeKey(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { id } = req.params;

      const result = await IntegrationService.revokeApiKey(parseInt(id, 10), tenantId);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = IntegrationController;
