const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Invalid ID format',
});

const createBooking = Joi.object({
  body: Joi.object({
    slotId: objectId.required(),
    items: Joi.array().items(
      Joi.object({
        menuItemId: objectId.required(),
        quantity: Joi.number().integer().min(1).default(1),
      })
    ).min(1).required(),
    notes: Joi.string().max(500).allow(''),
  }),
});

const cancelBooking = Joi.object({
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    reason: Joi.string().max(500),
  }),
});

const getBookings = Joi.object({
  query: Joi.object({
    status: Joi.string().valid('confirmed', 'completed', 'cancelled', 'no_show'),
    date: Joi.date(),
    slotId: objectId,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
});

module.exports = {
  createBooking,
  cancelBooking,
  getBookings,
};
