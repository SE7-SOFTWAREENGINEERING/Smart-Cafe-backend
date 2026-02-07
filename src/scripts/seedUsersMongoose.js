const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
require('dotenv').config();

const users = [
    {
        name: 'Admin User',
        email: 'admin@smartcafe.com',
        password: 'Admin@123',
        role: 'Admin',
        user_id: 1
    },
    {
        name: 'Canteen Staff User',
        email: 'canteenstaff@smartcafe.com',
        password: 'CanteenStaff@123',
        role: 'CanteenStaff',
        user_id: 2
    },
    {
        name: 'Manager User',
        email: 'manager@smartcafe.com',
        password: 'Manager@123',
        role: 'Manager',
        user_id: 3
    },
    {
        name: 'Regular User',
        email: 'user@smartcafe.com',
        password: 'User@123',
        role: 'User',
        user_id: 4
    }
];

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB Connected');

        // Clear existing users
        await User.deleteMany({});
        console.log('🗑️  Cleared existing users');

        // Insert new users
        for (const user of users) {
             const salt = await bcrypt.genSalt(10);
             const hashedPassword = await bcrypt.hash(user.password, salt);
             
             await User.create({
                 user_id: user.user_id,
                 name: user.name,
                 email: user.email,
                 password: hashedPassword,
                 role: user.role,
                 is_verified: true // Auto verify seeder users
             });
        }

        console.log('✅ Users Seeded Successfully');
        console.log('-----------------------------------');
        users.forEach(u => console.log(`${u.role}: ${u.email} / ${u.password}`));
        console.log('-----------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();
