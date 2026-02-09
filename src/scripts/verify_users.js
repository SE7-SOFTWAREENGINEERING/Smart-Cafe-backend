require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const verifyUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-cafe');
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Found ${users.length} users.`);

        users.forEach(u => {
            console.log(`- [${u.user_id}] ${u.name} (${u.role}) - Status: ${u.status}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyUsers();
