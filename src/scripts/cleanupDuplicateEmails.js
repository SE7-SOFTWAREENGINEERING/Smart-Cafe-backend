const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const cleanupDuplicateEmails = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB Connected');

        // Find all emails that have more than one account
        const duplicates = await User.aggregate([
            { $group: { _id: "$email", count: { $sum: 1 }, ids: { $push: "$_id" } } },
            { $match: { count: { $gt: 1 } } }
        ]);

        console.log(`Found ${duplicates.length} emails with duplicate accounts`);

        for (const dup of duplicates) {
            console.log(`Email: ${dup._id} has ${dup.count} accounts`);
            
            // Keep the first one (oldest), delete the rest
            const idsToDelete = dup.ids.slice(1);
            await User.deleteMany({ _id: { $in: idsToDelete } });
            console.log(`  Deleted ${idsToDelete.length} duplicate(s)`);
        }

        console.log('✅ Cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

cleanupDuplicateEmails();
