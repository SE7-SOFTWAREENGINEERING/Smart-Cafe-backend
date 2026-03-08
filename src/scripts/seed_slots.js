require('dotenv').config();
const mongoose = require('mongoose');
const { Canteen, Slot } = require('../models');

// ─── Configuration ────────────────────────────────────────────────────────────

const DAYS_AHEAD = 7;          // today + 7 future days (8 days total)
const SLOT_CAPACITY = 50;      // seats per slot per canteen

// Each meal type maps to one or more time-range slots
const MEAL_SLOTS = [
    { mealType: 'BREAKFAST', times: ['7:30 AM - 8:30 AM', '8:30 AM - 9:30 AM'] },
    { mealType: 'LUNCH', times: ['12:00 PM - 1:00 PM', '1:00 PM - 2:00 PM', '2:00 PM - 3:00 PM'] },
    { mealType: 'SNACKS', times: ['4:00 PM - 5:00 PM'] },
    { mealType: 'DINNER', times: ['7:00 PM - 8:00 PM', '8:00 PM - 9:00 PM'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateOnly(d) {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seedSlots() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-cafe';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Fetch all active canteens
    const canteens = await Canteen.find({ isActive: true });
    if (canteens.length === 0) {
        console.error('❌ No active canteens found. Run migrate_canteens.js first.');
        process.exit(1);
    }
    console.log(`📋 Found ${canteens.length} canteen(s): ${canteens.map(c => c.name).join(', ')}`);

    // Build date range: today … today + DAYS_AHEAD
    const today = dateOnly(new Date());
    const dates = [];
    for (let i = 0; i <= DAYS_AHEAD; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d);
    }

    let created = 0;
    let skipped = 0;

    for (const canteen of canteens) {
        const canteenId = canteen._id.toString();

        for (const date of dates) {
            for (const { mealType, times } of MEAL_SLOTS) {
                for (const time of times) {
                    try {
                        await Slot.create({
                            date,
                            time,
                            capacity: SLOT_CAPACITY,
                            booked: 0,
                            status: 'Open',
                            mealType,
                            canteenId,
                        });
                        created++;
                    } catch (err) {
                        // Duplicate key → slot already exists; skip silently
                        if (err.code === 11000) {
                            skipped++;
                        } else {
                            console.error(`  ⚠️  Error creating slot [${canteen.name}] ${date.toDateString()} ${time}:`, err.message);
                        }
                    }
                }
            }
        }
        console.log(`  ✔ Processed canteen: ${canteen.name}`);
    }

    console.log(`\n🎉 Done! Created: ${created} slot(s), Skipped (already existed): ${skipped}`);
    await mongoose.disconnect();
    process.exit(0);
}

seedSlots().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
