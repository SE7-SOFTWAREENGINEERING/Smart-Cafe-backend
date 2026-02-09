// Migration script to recalculate all queue positions based on timestamps
const mongoose = require('mongoose');
require('dotenv').config();

const Booking = require('./src/models/Booking');

async function recalculateAllQueuePositions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_mess_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Connected to MongoDB');

        // Get all unique slot times that have active bookings
        const uniqueSlots = await Booking.distinct('slot_time', { status: 'Booked' });

        console.log(`Found ${uniqueSlots.length} unique slots with active bookings`);

        for (const slotTime of uniqueSlots) {
            // Get all bookings for this slot
            const bookings = await Booking.find({
                slot_time: slotTime,
                status: 'Booked'
            }).sort({ is_priority_slot: -1, created_at: 1 });

            console.log(`\nSlot: ${slotTime}`);
            console.log(`Total bookings: ${bookings.length}`);

            // Reassign queue positions
            for (let i = 0; i < bookings.length; i++) {
                const oldPosition = bookings[i].queue_position;
                bookings[i].queue_position = i + 1;
                await bookings[i].save();

                console.log(`  User ${bookings[i].user_id}: ${oldPosition} → ${i + 1} (created: ${bookings[i].created_at})`);
            }
        }

        console.log('\n✅ Queue positions recalculated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

recalculateAllQueuePositions();
