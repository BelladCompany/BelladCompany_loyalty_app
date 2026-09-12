const CustomerService = require('../services/customer.service');

class CustomerController {
  static async createCustomer(req, res, next) {
    try {
      const { name, email, phone_numbers, vehicle, opening_points, aadhaar_number, age, firm_name, address, visit_type, is_first_time_visitor } = req.body;
      const tenantId = req.tenantId;

      const customer = await CustomerService.createCustomer({
        name,
        email,
        phone_numbers,
        vehicle,
        opening_points,
        aadhaar_number,
        age,
        firm_name,
        address,
        visit_type,
        is_first_time_visitor,
        created_by: req.user?.id || null,
        tenant_id: tenantId,
        award_auto_sales_points: false, // Explicitly false for cashier manual customer creation
      });

      res.status(201).json({
        status: 'success',
        message: 'Customer created successfully.',
        data: customer,
      });
    } catch (error) {
      // Surface duplicate phone error clearly
      if (error?.code === '23505' && error?.constraint?.includes('phone')) {
        return res.status(409).json({
          status: 'fail',
          error: 'A customer with this phone number already exists.',
        });
      }
      next(error);
    }
  }

  static async getCustomer(req, res, next) {
    try {
      const { customerId } = req.params;
      const tenantId = req.tenantId;

      const customer = await CustomerService.getCustomerById(customerId, tenantId);

      if (!customer) {
        return res.status(404).json({
          status: 'fail',
          error: `Customer not found with customer_id: '${customerId}'`,
        });
      }

      res.status(200).json({
        status: 'success',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getByReferralCode(req, res, next) {
    try {
      const { code } = req.params;
      const tenantId = req.tenantId;

      const customer = await CustomerService.getCustomerByReferralCode(code, tenantId);

      res.status(200).json({
        status: 'success',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listCustomers(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const limit = parseInt(req.query.limit || '20', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const customers = await CustomerService.listCustomers(tenantId, limit, offset);

      res.status(200).json({
        status: 'success',
        results: customers.length,
        data: customers,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateCustomer(req, res, next) {
    try {
      const { customerId } = req.params;
      const tenantId = req.tenantId;

      const updated = await CustomerService.updateCustomer(customerId, req.body, tenantId);

      if (!updated) {
        return res.status(404).json({
          status: 'fail',
          error: `Customer not found with customer_id: '${customerId}'`,
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Customer updated successfully.',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCustomer(req, res, next) {
    try {
      const { customerId } = req.params;
      const tenantId = req.tenantId;

      const deleted = await CustomerService.deleteCustomer(customerId, tenantId);

      if (!deleted) {
        return res.status(404).json({
          status: 'fail',
          error: `Customer not found with customer_id: '${customerId}'`,
        });
      }

      res.status(200).json({
        status: 'success',
        message: `Customer ${customerId} deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addPhone(req, res, next) {
    try {
      const { customerId } = req.params;
      const tenantId = req.tenantId;

      const phone = await CustomerService.addPhone(customerId, req.body, tenantId);

      if (!phone) {
        return res.status(404).json({
          status: 'fail',
          error: `Customer not found with customer_id: '${customerId}'`,
        });
      }

      res.status(201).json({
        status: 'success',
        message: 'Phone number added to customer successfully.',
        data: phone,
      });
    } catch (error) {
      next(error);
    }
  }

  static async removePhone(req, res, next) {
    try {
      const { customerId, phoneId } = req.params;
      const tenantId = req.tenantId;

      const removed = await CustomerService.removePhone(customerId, phoneId, tenantId);

      if (!removed) {
        return res.status(404).json({
          status: 'fail',
          error: `Phone record not found for customer_id: '${customerId}' and phone ID: '${phoneId}'`,
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Phone number removed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CustomerController;
