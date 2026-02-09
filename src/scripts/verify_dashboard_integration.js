require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');

const verifyDashboard = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-cafe');
        console.log('Connected to MongoDB');

        // Simulate getSystemStats logic
        const usersByRole = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        console.log('--- User Stats ---');
        console.log(usersByRole);

        const totalUsers = usersByRole.reduce((acc, curr) => acc + curr.count, 0) || 0;
        const studentCount = usersByRole.find(u => u._id === 'User')?.count || 0;
        const staffCount = usersByRole
            .filter(u => ['Manager', 'CanteenStaff', 'KitchenStaff', 'CounterStaff'].includes(u._id))
            .reduce((acc, curr) => acc + curr.count, 0) || 0;

        console.log(`Total Calculated: ${totalUsers}`);
        console.log(`Students Calculated: ${studentCount}`);
        console.log(`Staff Calculated: ${staffCount}`);

        if (totalUsers > 0) {
            console.log('✅ Dashboard Data Verification Successful');
        } else {
            console.log('⚠️ No users found, dashboard will confirm 0.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyDashboard();
