require('dotenv').config();
const mongoose = require('mongoose');
const { Menu, MealSlot, Capacity } = require('../models');

const seedSlots = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-cafe');
        console.log('Connected to MongoDB');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let menu = await Menu.findOne({ menuDate: today });
        if (!menu) {
            console.log('Creating menu for today...');
            menu = await Menu.create({
                menuDate: today,
                mealType: 'LUNCH',
                items: [], // Items added separately
                isActive: true
            });
        }

        console.log(`Using Menu ID: ${menu._id}`);

        // Define slots
        const slotsToCreate = [
            { slotStart: '12:00', slotEnd: '12:15', maxCapacity: 50 },
            { slotStart: '12:15', slotEnd: '12:30', maxCapacity: 50 },
            { slotStart: '12:30', slotEnd: '12:45', maxCapacity: 50 },
            { slotStart: '12:45', slotEnd: '13:00', maxCapacity: 50 },
            { slotStart: '13:00', slotEnd: '13:15', maxCapacity: 50 },
        ];

        // Clear existing slots for this menu
        await Capacity.deleteMany({
            slot_time: {
                $gte: new Date(today.setHours(0, 0, 0, 0)),
                $lte: new Date(today.setHours(23, 59, 59, 999))
            }
        });

        for (const s of slotsToCreate) {
            const [startHour, startMin] = s.slotStart.split(':').map(Number);
            const slotTime = new Date(today);
            slotTime.setHours(startHour, startMin, 0, 0);

            // Find last ID
            const lastC = await Capacity.findOne().sort({ capacity_id: -1 });
            const nextId = lastC ? lastC.capacity_id + 1 : 1;

            await Capacity.create({
                capacity_id: nextId, // Needs unique ID handling if parallel, but simple here
                slot_time: slotTime,
                max_capacity: s.maxCapacity,
                isActive: true,
                isCancelled: false
            });
            // Also need to update nextId for loop? 
            // Better to fetch or increment locally?
            // Since this is a seed script, safe to assume sequential execution.
        }

        console.log(`Created ${slotsToCreate.length} slots for today.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

seedSlots();
