const mongoose = require('mongoose');
require('dotenv').config();

const Capacity = require('../models/Capacity');

const CANTEENS = ['Sopanam', 'Prasada', 'Samudra'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

// Typical meal time slots
const MEAL_TIMES = {
    Breakfast: [
        { hour: 7, minute: 0 },
        { hour: 7, minute: 30 },
        { hour: 8, minute: 0 },
        { hour: 8, minute: 30 }
    ],
    Lunch: [
        { hour: 12, minute: 0 },
        { hour: 12, minute: 30 },
        { hour: 13, minute: 0 },
        { hour: 13, minute: 30 }
    ],
    Snacks: [
        { hour: 16, minute: 0 },
        { hour: 16, minute: 30 },
        { hour: 17, minute: 0 }
    ],
    Dinner: [
        { hour: 19, minute: 0 },
        { hour: 19, minute: 30 },
        { hour: 20, minute: 0 },
        { hour: 20, minute: 30 }
    ]
};

async function seedSlots() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-cafeteria');
        console.log('✅ Connected to MongoDB');

        // Clear existing capacity data
        console.log('Clearing existing slots...');
        await Capacity.deleteMany({});
        console.log('✅ Cleared existing slots');

        const slots = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let capacityId = 1;

        // Generate slots for next 7 days
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const date = new Date(today);
            date.setDate(date.getDate() + dayOffset);

            for (const canteen of CANTEENS) {
                for (const mealType of MEAL_TYPES) {
                    const timeSlots = MEAL_TIMES[mealType];

                    for (const timeSlot of timeSlots) {
                        const slotTime = new Date(date);
                        slotTime.setHours(timeSlot.hour, timeSlot.minute, 0, 0);

                        slots.push({
                            capacity_id: capacityId++,
                            slot_time: slotTime,
                            max_capacity: 50, // 50 slots per time slot
                            canteen: canteen,
                            isActive: true,
                            isCancelled: false
                        });
                    }
                }
            }
        }

        console.log(`Creating ${slots.length} slots...`);
        await Capacity.insertMany(slots);
        console.log(`✅ Successfully created ${slots.length} booking slots!`);

        console.log('\nSlot Distribution:');
        console.log(`- Days: 7 (${today.toDateString()} to ${new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000).toDateString()})`);
        console.log(`- Canteens: ${CANTEENS.join(', ')}`);
        console.log(`- Meal Types: ${MEAL_TYPES.join(', ')}`);
        console.log(`- Total Slots: ${slots.length}`);
        console.log(`- Capacity per slot: 50`);

        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding slots:', error);
        process.exit(1);
    }
}

seedSlots();
