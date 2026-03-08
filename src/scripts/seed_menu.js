require('dotenv').config();
const mongoose = require('mongoose');
const { Canteen, Menu, MenuItem } = require('../models');

// ─── Configuration ─────────────────────────────────────────────────────────────
const DAYS_AHEAD = 7; // seed menus for today + 7 future days

// ─── Menu Item Catalogue ───────────────────────────────────────────────────────
// Items are shared across all canteens. Each entry maps to one category.
const CATALOGUE = {
    BREAKFAST: [
        { itemName: 'Idli Sambar', price: 30, isVeg: true, dietaryType: 'Veg', ecoScore: 'A', nutritionalInfo: { calories: 200, protein: 6, carbs: 38, fat: 2 }, description: 'Soft steamed rice cakes served with sambar and coconut chutney' },
        { itemName: 'Masala Dosa', price: 45, isVeg: true, dietaryType: 'Veg', ecoScore: 'B', nutritionalInfo: { calories: 300, protein: 7, carbs: 48, fat: 9 }, description: 'Crispy rice crepe filled with spiced potato masala' },
        { itemName: 'Poha', price: 25, isVeg: true, dietaryType: 'Veg', ecoScore: 'A', nutritionalInfo: { calories: 180, protein: 4, carbs: 34, fat: 4 }, description: 'Flattened rice with mustard seeds, turmeric and fresh coriander' },
        { itemName: 'Upma', price: 25, isVeg: true, dietaryType: 'Veg', ecoScore: 'A', nutritionalInfo: { calories: 170, protein: 5, carbs: 30, fat: 4 }, description: 'Semolina porridge with vegetables and tempered spices' },
        { itemName: 'Bread Omelette', price: 35, isVeg: false, dietaryType: 'Egg', ecoScore: 'C', nutritionalInfo: { calories: 280, protein: 14, carbs: 24, fat: 12 }, description: 'Fluffy egg omelette served with toasted bread' },
        { itemName: 'Vada Sambar', price: 35, isVeg: true, dietaryType: 'Veg', ecoScore: 'B', nutritionalInfo: { calories: 220, protein: 7, carbs: 28, fat: 9 }, description: 'Crispy lentil fritters dunked in tangy sambar' },
        { itemName: 'Pongal', price: 30, isVeg: true, dietaryType: 'Veg', ecoScore: 'A', nutritionalInfo: { calories: 210, protein: 6, carbs: 36, fat: 5 }, description: 'Rice and lentil porridge tempered with pepper and ghee' },
        { itemName: 'Paratha with Curd', price: 40, isVeg: true, dietaryType: 'Veg', ecoScore: 'B', nutritionalInfo: { calories: 310, protein: 8, carbs: 45, fat: 10 }, description: 'Whole wheat flatbread served with fresh curd' },
    ],
    LUNCH: [
        { itemName: 'Veg Thali', price: 80, isVeg: true, dietaryType: 'Veg', ecoScore: 'A', nutritionalInfo: { calories: 650, protein: 18, carbs: 110, fat: 14 }, description: 'Complete meal with dal, sabzi, rice, roti, salad and pickle' },
        { itemName: 'Chicken Biryani', price: 110, isVeg: false, dietaryType: 'Non-Veg', ecoScore: 'C', nutritionalInfo: { calories: 580, protein: 32, carbs: 70, fat: 18 }, description: 'Fragrant basmati rice cooked with spiced chicken and saffron' },
        { itemName: 'Dal Rice', price: 55, isVeg: true, dietaryType: 'Veg', ecoScore: 'A', nutritionalInfo: { calories: 400, protein: 14, carbs: 75, fat: 6 }, description: 'Slow-cooked lentil curry served with steamed rice' },
        { itemName: 'Paneer Butter Masala + Roti', price: 90, isVeg: true, dietaryType: 'Veg', ecoScore: 'B', nutritionalInfo: { calories: 520, protein: 20, carbs: 60, fat: 22 }, description: 'Cottage cheese in rich tomato butter gravy with soft rotis' },
        { itemName: 'Chole Bhature', price: 70, isVeg: true, dietaryType: 'Veg', ecoScore: 'C', nutritionalInfo: { calories: 560, protein: 15, carbs: 80, fat: 20 }, description: 'Spiced chickpeas with deep-fried fluffy bread' },
        { itemName: 'Fish Curry Rice', price: 100, isVeg: false, dietaryType: 'Non-Veg', ecoScore: 'B', nutritionalInfo: { calories: 480, protein: 28, carbs: 65, fat: 12 }, description: 'Coastal fish curry with steamed rice' },
        { itemName: 'Rajma Chawal', price: 60, isVeg: true, dietaryType: 'Veg', ecoScore: 'A', nutritionalInfo: { calories: 430, protein: 16, carbs: 78, fat: 7 }, description: 'Kidney bean curry with steamed basmati rice' },
        { itemName: 'Egg Curry Rice', price: 75, isVeg: false, dietaryType: 'Egg', ecoScore: 'B', nutritionalInfo: { calories: 450, protein: 22, carbs: 68, fat: 13 }, description: 'Boiled egg in spiced onion-tomato gravy with rice' },
        { itemName: 'Veg Pulao', price: 65, isVeg: true, dietaryType: 'Veg', ecoScore: 'A', nutritionalInfo: { calories: 370, protein: 9, carbs: 68, fat: 8 }, description: 'Fragrant vegetable rice with whole spices' },
        { itemName: 'Mutton Curry Rice', price: 130, isVeg: false, dietaryType: 'Non-Veg', ecoScore: 'D', nutritionalInfo: { calories: 620, protein: 38, carbs: 62, fat: 24 }, description: 'Slow-cooked mutton in aromatic spices with rice' },
    ],
    SNACKS: [
        { itemName: 'Samosa (2 pcs)', price: 20, isVeg: true, dietaryType: 'Veg', ecoScore: 'C', nutritionalInfo: { calories: 180, protein: 4, carbs: 24, fat: 8 }, description: 'Crispy pastry filled with spiced potatoes and peas' },
        { itemName: 'Veg Sandwich', price: 35, isVeg: true, dietaryType: 'Veg', ecoScore: 'B', nutritionalInfo: { calories: 220, protein: 7, carbs: 34, fat: 6 }, description: 'Toasted sandwich with fresh vegetables and green chutney' },
        { itemName: 'Masala Chai', price: 15, isVeg: true, dietaryType: 'Veg', ecoScore: 'A', nutritionalInfo: { calories: 60, protein: 2, carbs: 10, fat: 1 }, description: 'Spiced milk tea with ginger and cardamom' },
        { itemName: 'Biscuit Packet', price: 10, isVeg: true, dietaryType: 'Veg', ecoScore: 'C', nutritionalInfo: { calories: 120, protein: 2, carbs: 20, fat: 4 }, description: 'Assorted cream biscuits' },
        { itemName: 'Pakoda Plate', price: 30, isVeg: true, dietaryType: 'Veg', ecoScore: 'C', nutritionalInfo: { calories: 210, protein: 5, carbs: 26, fat: 10 }, description: 'Crispy battered vegetable fritters with mint chutney' },
        { itemName: 'Cold Coffee', price: 40, isVeg: true, dietaryType: 'Veg', ecoScore: 'B', nutritionalInfo: { calories: 150, protein: 4, carbs: 22, fat: 5 }, description: 'Chilled blended coffee with milk and sugar' },
        { itemName: 'Bread Butter', price: 20, isVeg: true, dietaryType: 'Veg', ecoScore: 'B', nutritionalInfo: { calories: 160, protein: 4, carbs: 24, fat: 6 }, description: 'Sliced white bread with butter' },
    ],
    DINNER: [
        { itemName: 'Chapati + Dal Fry', price: 60, isVeg: true, dietaryType: 'Veg', ecoScore: 'A', nutritionalInfo: { calories: 420, protein: 14, carbs: 72, fat: 8 }, description: 'Soft whole wheat rotis with tempered yellow lentils' },
        { itemName: 'Chicken Curry Rice', price: 105, isVeg: false, dietaryType: 'Non-Veg', ecoScore: 'C', nutritionalInfo: { calories: 530, protein: 30, carbs: 68, fat: 16 }, description: 'Home-style chicken curry served with steamed rice' },
        { itemName: 'Mixed Veg Curry + Roti', price: 70, isVeg: true, dietaryType: 'Veg', ecoScore: 'A', nutritionalInfo: { calories: 380, protein: 10, carbs: 62, fat: 9 }, description: 'Seasonal vegetables in a mildly spiced gravy with rotis' },
        { itemName: 'Egg Bhurji + Roti', price: 65, isVeg: false, dietaryType: 'Egg', ecoScore: 'B', nutritionalInfo: { calories: 390, protein: 20, carbs: 50, fat: 14 }, description: 'Scrambled spiced eggs with onions and tomatoes and rotis' },
        { itemName: 'Palak Paneer + Rice', price: 85, isVeg: true, dietaryType: 'Veg', ecoScore: 'A', nutritionalInfo: { calories: 460, protein: 18, carbs: 65, fat: 16 }, description: 'Cottage cheese in creamy spinach gravy with steamed rice' },
        { itemName: 'Fried Rice', price: 70, isVeg: true, dietaryType: 'Veg', ecoScore: 'B', nutritionalInfo: { calories: 400, protein: 9, carbs: 72, fat: 10 }, description: 'Wok-tossed rice with vegetables and soy sauce' },
        { itemName: 'Noodles', price: 60, isVeg: true, dietaryType: 'Veg', ecoScore: 'C', nutritionalInfo: { calories: 350, protein: 8, carbs: 62, fat: 8 }, description: 'Hakka-style stir-fried noodles with vegetables' },
    ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateOnly(d) {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seedMenu() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-cafe';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const canteens = await Canteen.find({ isActive: true });
    if (!canteens.length) {
        console.error('❌ No active canteens found. Run migrate_canteens.js first.');
        process.exit(1);
    }
    console.log(`📋 Found ${canteens.length} canteen(s): ${canteens.map(c => c.name).join(', ')}`);

    const canteenIds = canteens.map(c => c._id);

    // ── Step 1: Upsert MenuItem catalogue (shared across all canteens) ──────────
    console.log('\n📦 Upserting menu items catalogue...');
    const itemIdsByCategory = { BREAKFAST: [], LUNCH: [], SNACKS: [], DINNER: [], BEVERAGES: [] };
    let itemsCreated = 0, itemsUpdated = 0;

    for (const [category, items] of Object.entries(CATALOGUE)) {
        for (const itemData of items) {
            const existing = await MenuItem.findOne({ itemName: itemData.itemName });
            if (existing) {
                // Update canteens reference
                existing.canteens = canteenIds;
                await existing.save();
                itemIdsByCategory[category].push(existing._id);
                itemsUpdated++;
            } else {
                const newItem = await MenuItem.create({
                    ...itemData,
                    category,
                    canteens: canteenIds,
                    isAvailable: true,
                    portionSize: 'Regular',
                });
                itemIdsByCategory[category].push(newItem._id);
                itemsCreated++;
            }
        }
    }
    console.log(`  ✔ Items — Created: ${itemsCreated}, Updated: ${itemsUpdated}`);

    // ── Step 2: Upsert daily Menus for next DAYS_AHEAD days ────────────────────
    console.log('\n📅 Upserting daily menus...');
    const today = dateOnly(new Date());
    const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
    let menusCreated = 0, menusUpdated = 0;

    for (let i = 0; i <= DAYS_AHEAD; i++) {
        const menuDate = new Date(today);
        menuDate.setDate(today.getDate() + i);

        for (const mealType of mealTypes) {
            const itemIds = itemIdsByCategory[mealType];
            const existing = await Menu.findOne({ menuDate, mealType });
            if (existing) {
                existing.items = itemIds;
                existing.isActive = true;
                await existing.save();
                menusUpdated++;
            } else {
                await Menu.create({ menuDate, mealType, items: itemIds, isActive: true });
                menusCreated++;
            }
        }
    }
    console.log(`  ✔ Menus — Created: ${menusCreated}, Updated: ${menusUpdated}`);

    const totalItems = itemsCreated + itemsUpdated;
    const totalMenus = menusCreated + menusUpdated;
    console.log(`\n🎉 Done! ${totalItems} menu items, ${totalMenus} daily menus across ${DAYS_AHEAD + 1} days.`);

    await mongoose.disconnect();
    process.exit(0);
}

seedMenu().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
