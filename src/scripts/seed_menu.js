require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const Menu = require('../models/Menu');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-cafe');
        console.log('Connected to MongoDB');

        // Clear existing data
        await Menu.deleteMany({});
        await MenuItem.deleteMany({});

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Create Menu for Lunch
        const lunchMenu = await Menu.create({
            menuDate: today,
            mealType: 'LUNCH',
            isActive: true,
            createdBy: new mongoose.Types.ObjectId() // Mock ID
        });

        // Sample Items
        const items = [
            {
                itemName: 'Veg Thali',
                price: 120,
                isVeg: true,
                description: 'Complete meal with rice, dal, sabzi, chapati',
                category: 'MAIN COURSE',
                mealType: 'Lunch',
                dietaryType: 'Veg',
                allergens: ['Dairy', 'Gluten'],
                portionSize: 'Regular',
                nutritionalInfo: { ecoScore: 'B' },
                menuId: lunchMenu._id
            },
            {
                itemName: 'Chicken Biryani',
                price: 180,
                isVeg: false,
                description: 'Aromatic rice with spiced chicken',
                category: 'MAIN COURSE',
                mealType: 'Lunch',
                dietaryType: 'Non-Veg',
                allergens: [],
                portionSize: 'Large',
                nutritionalInfo: { ecoScore: 'C' },
                menuId: lunchMenu._id
            },
            {
                itemName: 'Paneer Wrap',
                price: 90,
                isVeg: true,
                description: 'Grilled paneer in wheat wrap',
                category: 'SNACKS',
                mealType: 'Snacks',
                dietaryType: 'Veg',
                allergens: ['Dairy', 'Gluten'],
                portionSize: 'Regular',
                nutritionalInfo: { ecoScore: 'A' },
                menuId: lunchMenu._id
            }
        ];

        await MenuItem.insertMany(items);
        console.log('Database seeded successfully via script');

    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await mongoose.disconnect();
    }
};

seedData();
