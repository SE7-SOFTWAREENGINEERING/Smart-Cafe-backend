const pool = require('../config/database');

const initDatabase = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Drop existing tables (for clean setup)
    console.log('Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS waste_report CASCADE;
      DROP TABLE IF EXISTS notification CASCADE;
      DROP TABLE IF EXISTS token CASCADE;
      DROP TABLE IF EXISTS booking CASCADE;
      DROP TABLE IF EXISTS capacity CASCADE;
      DROP TABLE IF EXISTS cafeteria_timings CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS booking_status CASCADE;
      DROP TYPE IF EXISTS token_status CASCADE;
      DROP TYPE IF EXISTS notification_type CASCADE;
      DROP TYPE IF EXISTS meal_type CASCADE;
    `);

    // Create ENUM types
    console.log('Creating ENUM types...');
    await client.query(`
      CREATE TYPE user_role AS ENUM ('User', 'CanteenStaff', 'Manager', 'Admin');
      CREATE TYPE booking_status AS ENUM ('Booked', 'Cancelled', 'Completed', 'NoShow');
      CREATE TYPE token_status AS ENUM ('Active', 'Expired', 'Used');
      CREATE TYPE notification_type AS ENUM ('Reminder', 'Alert', 'Announcement');
      CREATE TYPE meal_type AS ENUM ('Breakfast', 'Lunch', 'Snacks', 'Dinner');
    `);

    // Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE users (
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL DEFAULT 'User',
        is_priority BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_role ON users(role);
    `);

    // Create cafeteria_timings table
    console.log('Creating cafeteria_timings table...');
    await client.query(`
      CREATE TABLE cafeteria_timings (
        timing_id SERIAL PRIMARY KEY,
        day VARCHAR(20) NOT NULL,
        meal_type meal_type NOT NULL,
        opening_time TIME NOT NULL,
        closing_time TIME NOT NULL,
        is_holiday BOOLEAN DEFAULT FALSE,
        specific_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(day, meal_type)
      );
      
      CREATE INDEX idx_timings_day ON cafeteria_timings(day);
      CREATE INDEX idx_timings_date ON cafeteria_timings(specific_date);
    `);

    // Create capacity table
    console.log('Creating capacity table...');
    await client.query(`
      CREATE TABLE capacity (
        capacity_id SERIAL PRIMARY KEY,
        slot_time TIMESTAMP NOT NULL,
        meal_type meal_type NOT NULL,
        max_capacity INTEGER NOT NULL DEFAULT 50,
        priority_capacity INTEGER NOT NULL DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(slot_time)
      );
      
      CREATE INDEX idx_capacity_slot_time ON capacity(slot_time);
      CREATE INDEX idx_capacity_meal_type ON capacity(meal_type);
    `);

    // Create booking table
    console.log('Creating booking table...');
    await client.query(`
      CREATE TABLE booking (
        booking_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        slot_time TIMESTAMP NOT NULL,
        meal_type meal_type NOT NULL,
        status booking_status NOT NULL DEFAULT 'Booked',
        is_priority_slot BOOLEAN DEFAULT FALSE,
        queue_position INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_slot UNIQUE(user_id, slot_time)
      );
      
      CREATE INDEX idx_booking_user ON booking(user_id);
      CREATE INDEX idx_booking_slot_time ON booking(slot_time);
      CREATE INDEX idx_booking_status ON booking(status);
      CREATE INDEX idx_booking_meal_type ON booking(meal_type);
    `);

    // Create token table
    console.log('Creating token table...');
    await client.query(`
      CREATE TABLE token (
        token_id SERIAL PRIMARY KEY,
        booking_id INTEGER UNIQUE NOT NULL REFERENCES booking(booking_id) ON DELETE CASCADE,
        qr_code VARCHAR(255) UNIQUE NOT NULL,
        status token_status NOT NULL DEFAULT 'Active',
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        scanned_at TIMESTAMP,
        scanned_by INTEGER REFERENCES users(user_id)
      );
      
      CREATE INDEX idx_token_qr_code ON token(qr_code);
      CREATE INDEX idx_token_booking ON token(booking_id);
      CREATE INDEX idx_token_status ON token(status);
    `);

    // Create notification table
    console.log('Creating notification table...');
    await client.query(`
      CREATE TABLE notification (
        notification_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        notification_type notification_type NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        booking_id INTEGER REFERENCES booking(booking_id) ON DELETE SET NULL
      );
      
      CREATE INDEX idx_notification_user ON notification(user_id);
      CREATE INDEX idx_notification_type ON notification(notification_type);
      CREATE INDEX idx_notification_read ON notification(is_read);
      CREATE INDEX idx_notification_sent_at ON notification(sent_at);
    `);

    // Create waste_report table
    console.log('Creating waste_report table...');
    await client.query(`
      CREATE TABLE waste_report (
        waste_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        meal_type meal_type NOT NULL,
        reason TEXT NOT NULL,
        reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_waste_user ON waste_report(user_id);
      CREATE INDEX idx_waste_meal_type ON waste_report(meal_type);
    `);

    // Create trigger function for updated_at
    console.log('Creating trigger functions...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
      CREATE TRIGGER update_booking_updated_at
        BEFORE UPDATE ON booking
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');
    console.log('✅ Database initialized successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Database setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = initDatabase;