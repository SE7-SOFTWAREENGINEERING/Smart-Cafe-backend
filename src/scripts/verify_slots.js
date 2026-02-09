require('dotenv').config();
const mongoose = require('mongoose');
const { MealSlot, Menu } = require('../models');

const verifySlots = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-cafe');
        console.log('Connected to MongoDB');

        // Create a dummy menu if needed
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find existing menu or check slots
        const menu = await Menu.findOne({ menuDate: today });
        if (menu) {
            console.log(`Found menu for today: ${menu._id}`);
            const slots = await MealSlot.find({ menuId: menu._id });
            console.log(`Found ${slots.length} slots.`);
            slots.forEach(s => {
                console.log(`- ${s.slotStart} to ${s.slotEnd} | Cap: ${s.maxCapacity} | Booked: ${s.currentCount}`);
            });
        } else {
            console.log('No menu for today. Cannot verify live slots without a menu.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifySlots();
