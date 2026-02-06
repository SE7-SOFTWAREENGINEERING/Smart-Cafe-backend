const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Token = require('../models/Token');
const CafeteriaTimings = require('../models/CafeteriaTimings');
const Capacity = require('../models/Capacity');
const Forecast = require('../models/Forecast');
const Notification = require('../models/Notification');
const WasteReport = require('../models/WasteReport');

console.log('✅ Verifying Mongoose Models...');

try {
  const models = [
    { name: 'User', model: User },
    { name: 'Booking', model: Booking },
    { name: 'Token', model: Token },
    { name: 'CafeteriaTimings', model: CafeteriaTimings },
    { name: 'Capacity', model: Capacity },
    { name: 'Forecast', model: Forecast },
    { name: 'Notification', model: Notification },
    { name: 'WasteReport', model: WasteReport }
  ];

  models.forEach(({ name, model }) => {
    if (model && model.modelName === name) {
      console.log(`   - ${name} Model loaded successfully.`);
    } else {
      console.error(`   - ❌ Failed to load ${name} Model.`);
      process.exit(1);
    }
  });

  console.log('\n✅ All models verified successfully!');
  console.log('Note: Database connection was not tested as API key is pending.');
  process.exit(0);

} catch (error) {
  console.error('❌ Error during verification:', error);
  process.exit(1);
}
