const pool = require('../config/database');
const bcrypt = require('bcrypt');

const seedData = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('Seeding users...');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Create users
    await client.query(`
      INSERT INTO users (name, email, password_hash, role, is_priority) VALUES
      ('Admin User', 'admin@cafeteria.com', $1, 'Admin', false),
      ('Manager User', 'manager@cafeteria.com', $1, 'Manager', false),
      ('Canteen Staff User', 'canteenstaff@cafeteria.com', $1, 'CanteenStaff', false),
      ('John Doe', 'john@user.com', $1, 'User', false),
      ('Jane Smith', 'jane@user.com', $1, 'User', true),
      ('Bob Wilson', 'bob@user.com', $1, 'User', false),
      ('Alice Brown', 'alice@user.com', $1, 'User', true),
      ('Charlie Davis', 'charlie@user.com', $1, 'User', false)
    `, [passwordHash]);

    console.log('Seeding cafeteria timings...');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    for (const day of days) {
      await client.query(`
        INSERT INTO cafeteria_timings (day, meal_type, opening_time, closing_time, is_holiday) VALUES
        ($1, 'Breakfast', '08:00:00', '10:00:00', false),
        ($1, 'Lunch', '12:00:00', '14:30:00', false),
        ($1, 'Snacks', '16:00:00', '17:30:00', false),
        ($1, 'Dinner', '19:00:00', '21:00:00', false)
      `, [day]);
    }

    console.log('Seeding capacity for next 7 days...');
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      // Breakfast slots (8:00 AM - 10:00 AM)
      for (let hour = 8; hour < 10; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const slotTime = new Date(currentDate);
          slotTime.setHours(hour, minute, 0, 0);
          
          await client.query(`
            INSERT INTO capacity (slot_time, meal_type, max_capacity, priority_capacity)
            VALUES ($1, 'Breakfast', 50, 5)
          `, [slotTime]);
        }
      }
      
      // Lunch slots (12:00 PM - 2:30 PM)
      for (let hour = 12; hour < 15; hour++) {
        const maxMinute = hour === 14 ? 30 : 60;
        for (let minute = 0; minute < maxMinute; minute += 15) {
          const slotTime = new Date(currentDate);
          slotTime.setHours(hour, minute, 0, 0);
          
          await client.query(`
            INSERT INTO capacity (slot_time, meal_type, max_capacity, priority_capacity)
            VALUES ($1, 'Lunch', 50, 5)
          `, [slotTime]);
        }
      }
      
      // Snacks slots (4:00 PM - 5:30 PM)
      for (let hour = 16; hour < 18; hour++) {
        const maxMinute = hour === 17 ? 30 : 60;
        for (let minute = 0; minute < maxMinute; minute += 15) {
          const slotTime = new Date(currentDate);
          slotTime.setHours(hour, minute, 0, 0);
          
          await client.query(`
            INSERT INTO capacity (slot_time, meal_type, max_capacity, priority_capacity)
            VALUES ($1, 'Snacks', 40, 5)
          `, [slotTime]);
        }
      }
      
      // Dinner slots (7:00 PM - 9:00 PM)
      for (let hour = 19; hour < 21; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const slotTime = new Date(currentDate);
          slotTime.setHours(hour, minute, 0, 0);
          
          await client.query(`
            INSERT INTO capacity (slot_time, meal_type, max_capacity, priority_capacity)
            VALUES ($1, 'Dinner', 50, 5)
          `, [slotTime]);
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Seed data inserted successfully!');
    console.log('\nTest Credentials:');
    console.log('==================');
    console.log('Admin: admin@cafeteria.com / password123');
    console.log('Manager: manager@cafeteria.com / password123');
    console.log('Staff: canteenstaff@cafeteria.com / password123');
    console.log('User: john@user.com / password123');
    console.log('Priority User: jane@user.com / password123');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  seedData()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

module.exports = seedData;