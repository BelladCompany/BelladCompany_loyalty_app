const SearchService = require('../services/search.service');

class SearchController {
  static async search(req, res, next) {
    try {
      const { q, phone, name, vehicle, limit, offset } = req.query;
      const tenantId = req.tenantId;

      let results = [];
      let searchType = '';

      if (q) {
        searchType = 'unified_search';
        results = await SearchService.searchUnified(q, tenantId, limit, offset);
      } else if (phone) {
        searchType = 'phone_lookup';
        results = await SearchService.searchByPhone(phone, tenantId);
      } else if (vehicle) {
        searchType = 'vehicle_lookup';
        results = await SearchService.searchByVehicle(vehicle, tenantId);
      } else if (name) {
        searchType = 'name_fuzzy_trgm';
        results = await SearchService.searchByName(name, tenantId, limit, offset);
      }

      res.status(200).json({
        status: 'success',
        search_type: searchType,
        count: results.length,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SearchController;
