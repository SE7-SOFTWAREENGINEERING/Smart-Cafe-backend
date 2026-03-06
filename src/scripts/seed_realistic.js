require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
    User, Menu, MenuItem, Slot, SystemSetting,
    Booking, Canteen, WasteReport
} = require('../models');
const FinancialTransaction = require('../models/FinancialTransaction');

const seedRealisticData = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-cafe';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Clear existing data
        await Promise.all([
            User.deleteMany({}),
            Menu.deleteMany({}),
            MenuItem.deleteMany({}),
            Slot.deleteMany({}),
            SystemSetting.deleteMany({}),
            Booking.deleteMany({}),
            Canteen.deleteMany({}),
            WasteReport.deleteMany({}),
            FinancialTransaction.deleteMany({})
        ]);
        console.log('Cleared existing data');

        // 1. Create Canteens
        const canteenNames = ["Sopanam", "Prasada", "Samudra"];
        const createdCanteens = [];
        for (const name of canteenNames) {
            const canteen = await Canteen.create({
                name: name,
                location: 'Campus',
                status: 'Open',
                crowd: 'Medium',
                capacity: 150,
                occupancy: Math.floor(Math.random() * 50),
                description: `${name} dining area.`,
                imageColor: 'bg-orange-100'
            });
            createdCanteens.push(canteen);
        }
        const canteenIds = createdCanteens.map(c => c._id);
        const canteenIdStrs = createdCanteens.map(c => c._id.toString());

        // 2. Create Users
        const hashedPassword = await bcrypt.hash('password123', 12);
        const manager = await User.create({ fullName: 'Canteen Manager', email: 'manager@smartcafe.com', password: hashedPassword, role: 'manager', status: 'active' });
        const student = await User.create({ fullName: 'Test Student', email: 'student@college.edu', password: hashedPassword, role: 'user', status: 'active', walletBalance: 1200 });

        // 3. Create Menu Items
        const menuItems = await MenuItem.create([
            { itemName: 'Butter Chicken', price: 150, isVeg: false, category: 'LUNCH', dietaryType: 'Non-Veg', isAvailable: true, canteens: canteenIds },
            { itemName: 'Paneer Tikka', price: 120, isVeg: true, category: 'LUNCH', dietaryType: 'Veg', isAvailable: true, canteens: canteenIds },
            { itemName: 'Dal Tadka', price: 80, isVeg: true, category: 'DINNER', dietaryType: 'Veg', isAvailable: true, canteens: canteenIds },
            { itemName: 'Masala Dosa', price: 60, isVeg: true, category: 'BREAKFAST', dietaryType: 'Veg', isAvailable: true, canteens: canteenIds },
            { itemName: 'Cold Coffee', price: 40, isVeg: true, category: 'BEVERAGES', dietaryType: 'Veg', isAvailable: true, canteens: canteenIds },
            { itemName: 'Samosa', price: 15, isVeg: true, category: 'SNACKS', dietaryType: 'Veg', isAvailable: true, canteens: canteenIds }
        ]);

        // 4. Create Slots for Today
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const meals = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
        const times = ['09:00', '13:00', '17:00', '20:00'];

        const slots = [];
        for (const cStr of canteenIdStrs) {
            for (let i = 0; i < meals.length; i++) {
                const slot = await Slot.create({
                    date: todayStart,
                    time: times[i],
                    mealType: meals[i],
                    capacity: 100,
                    booked: 45,
                    status: 'Open',
                    canteenId: cStr
                });
                slots.push(slot);
            }
        }

        // 5. Create Financial Data
        console.log('Seeding financial data...');
        for (let i = 30; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);

            for (const cStr of canteenIdStrs) {
                await FinancialTransaction.create({
                    transactionType: 'SALE',
                    amount: 2500 + (Math.random() * 2000),
                    description: 'Daily Aggregate Sales',
                    category: 'BOOKING',
                    paymentMethod: Math.random() > 0.5 ? 'UPI' : 'CASH',
                    status: 'COMPLETED',
                    date: d,
                    canteenId: cStr
                });

                if (i % 5 === 0) {
                    await FinancialTransaction.create({
                        transactionType: 'EXPENSE',
                        amount: -1200,
                        description: 'Inventory Restock',
                        category: 'STOCK_PURCHASE',
                        paymentMethod: 'CASH',
                        status: 'COMPLETED',
                        date: d,
                        canteenId: cStr
                    });
                }
            }
        }

        // 6. Create Bookings
        console.log('Seeding bookings...');
        for (let i = 0; i < 70; i++) {
            const statusList = ['confirmed', 'completed', 'no_show'];
            const status = i < 25 ? 'confirmed' : (i < 65 ? 'completed' : 'no_show');
            await Booking.create({
                user: student._id,
                slot: slots[1]._id, // Lunch slot
                items: [{ menuItem: menuItems[0]._id, quantity: 1, price: 150 }],
                totalAmount: 150,
                status: status,
                tokenNumber: `TKN-${2000 + i}`
            });
        }

        // 7. Waste Reports
        const wasteReasons = ['Too much food', 'Did not like the taste', 'Poor quality', 'Other'];
        await WasteReport.create([
            { user: student._id, date: now, mealType: 'LUNCH', wasteAmount: 'Little', reason: wasteReasons[0] },
            { user: student._id, date: new Date(now.getTime() - 86400000), mealType: 'LUNCH', wasteAmount: 'Some', reason: wasteReasons[2] },
            { user: student._id, date: new Date(now.getTime() - 172800000), mealType: 'DINNER', wasteAmount: 'Most', reason: wasteReasons[3], notes: 'Unexpected event' }
        ]);

        // 8. System Settings
        const settingsData = [
            { key: 'master_booking_enabled', val: 'true', cat: 'BOOKING', type: 'BOOLEAN' },
            { key: 'queue_enabled', val: 'true', cat: 'BOOKING', type: 'BOOLEAN' },
            { key: 'maintenance_mode', val: 'false', cat: 'GENERAL', type: 'BOOLEAN' },
            { key: 'portion_size', val: 'Standard', cat: 'GENERAL', type: 'STRING' },
            { key: 'notification_enabled', val: 'true', cat: 'NOTIFICATION', type: 'BOOLEAN' },
            { key: 'surplus_donation_enabled', val: 'false', cat: 'GENERAL', type: 'BOOLEAN' }
        ];

        for (const s of settingsData) {
            await SystemSetting.create({
                settingKey: s.key,
                settingValue: s.val,
                category: s.cat,
                dataType: s.type
            });
        }

        console.log('\n✅ MISSION ACCOMPLISHED: REALISTIC DATA SEEDED SUCCESSFULLY.');
        process.exit(0);
    } catch (err) {
        console.error('Seed Error:', err);
        process.exit(1);
    }
};

seedRealisticData();
