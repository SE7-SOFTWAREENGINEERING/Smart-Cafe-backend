const stockService = require('../services/stock.service');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Get all stock items
 * GET /api/stock
 */
const getStockItems = catchAsync(async (req, res) => {
  const result = await stockService.getStockItems(req.query);
  ApiResponse.ok(res, 'Stock items retrieved', result);
});

/**
 * Get stock item by ID
 * GET /api/stock/:id
 */
const getStockItemById = catchAsync(async (req, res) => {
  const item = await stockService.getStockItemById(req.params.id);
  ApiResponse.ok(res, 'Stock item retrieved', item);
});

/**
 * Create stock item
 * POST /api/stock
 */
const createStockItem = catchAsync(async (req, res) => {
  const item = await stockService.createStockItem(req.body);
  ApiResponse.created(res, 'Stock item created', item);
});

/**
 * Update stock item
 * PATCH /api/stock/:id
 */
const updateStockItem = catchAsync(async (req, res) => {
  const item = await stockService.updateStockItem(req.params.id, req.body);
  ApiResponse.ok(res, 'Stock item updated', item);
});

/**
 * Delete stock item
 * DELETE /api/stock/:id
 */
const deleteStockItem = catchAsync(async (req, res) => {
  await stockService.deleteStockItem(req.params.id);
  ApiResponse.ok(res, 'Stock item deleted');
});

/**
 * Restock an item
 * POST /api/stock/:id/restock
 */
const restockItem = catchAsync(async (req, res) => {
  const { quantity, unitPrice, referenceNumber } = req.body;
  const item = await stockService.restockItem(req.params.id, quantity, unitPrice, req.userId, referenceNumber);
  ApiResponse.ok(res, 'Stock item restocked', item);
});

/**
 * Consume stock
 * POST /api/stock/:id/consume
 */
const consumeStock = catchAsync(async (req, res) => {
  const { quantity, reason } = req.body;
  const item = await stockService.consumeStock(req.params.id, quantity, reason, req.userId);
  ApiResponse.ok(res, 'Stock consumed', item);
});

/**
 * Adjust stock
 * POST /api/stock/:id/adjust
 */
const adjustStock = catchAsync(async (req, res) => {
  const { newQuantity, reason } = req.body;
  const item = await stockService.adjustStock(req.params.id, newQuantity, reason, req.userId);
  ApiResponse.ok(res, 'Stock adjusted', item);
});

/**
 * Get low stock alerts
 * GET /api/stock/alerts
 */
const getLowStockAlerts = catchAsync(async (req, res) => {
  const alerts = await stockService.getLowStockAlerts();
  ApiResponse.ok(res, 'Low stock alerts retrieved', { alerts, count: alerts.length });
});

/**
 * Get stock transactions
 * GET /api/stock/transactions
 */
const getStockTransactions = catchAsync(async (req, res) => {
  const result = await stockService.getStockTransactions(req.query);
  ApiResponse.ok(res, 'Stock transactions retrieved', result);
});

/**
 * Get stock summary
 * GET /api/stock/summary
 */
const getStockSummary = catchAsync(async (req, res) => {
  const summary = await stockService.getStockSummary();
  ApiResponse.ok(res, 'Stock summary retrieved', summary);
});

module.exports = {
  getStockItems,
  getStockItemById,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  restockItem,
  consumeStock,
  adjustStock,
  getLowStockAlerts,
  getStockTransactions,
  getStockSummary,
};

