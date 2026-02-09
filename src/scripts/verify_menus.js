require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const Menu = require('../models/Menu');

const verifyData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-cafe');
        console.log('Connected to MongoDB');

        console.log('\n--- Checking Menus ---');
        const menus = await Menu.find({});
        console.log(`Found ${menus.length} menus.`);
        menus.forEach(m => {
            console.log(`- [${m.menuDate.toDateString()}] ${m.mealType} (ID: ${m._id})`);
        });

        console.log('\n--- Checking Menu Items ---');
        const items = await MenuItem.find({});
        console.log(`Found ${items.length} items.`);
        items.forEach(i => {
            console.log(`- ${i.itemName}: ₹${i.price} [${i.category}] (MenuID: ${i.menuId})`);
            if (i.allergens && i.allergens.length > 0) console.log(`  Allergens: ${i.allergens.join(', ')}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyData();
