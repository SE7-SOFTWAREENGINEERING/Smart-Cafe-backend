require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { User, Menu, MenuItem, Slot, SystemSetting, Canteen } = require('../models');

const seedData = async () => {
  try {
    // Connect to database
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out in production)
    await User.deleteMany({});
    await Menu.deleteMany({});
    await MenuItem.deleteMany({});
    await Slot.deleteMany({});
    await Canteen.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin@smartcafe.com',
      password: 'admin123',
      role: 'admin',
      status: 'active',
    });
    console.log('Created admin user:', admin.email);

    // Create manager
    const manager = await User.create({
      fullName: 'Manager User',
      email: 'manager@smartcafe.com',
      password: 'manager123',
      role: 'manager',
      status: 'active',
    });
    console.log('Created manager user:', manager.email);

    // Create staff users
    await User.create([
      {
        fullName: 'Canteen Staff',
        email: 'canteen@smartcafe.com',
        password: 'staff123',
        role: 'canteen_staff',
        status: 'active',
      },
      {
        fullName: 'Kitchen Staff',
        email: 'kitchen@smartcafe.com',
        password: 'staff123',
        role: 'kitchen_staff',
        status: 'active',
      },
      {
        fullName: 'Counter Staff',
        email: 'counter@smartcafe.com',
        password: 'staff123',
        role: 'counter_staff',
        status: 'active',
      },
    ]);
    console.log('Created staff users');

    // Create student user
    await User.create({
      fullName: 'John Student',
      email: 'student@college.edu',
      password: 'student123',
      role: 'user',
      status: 'active',
    });
    console.log('Created student user');

    // Create sample menu items
    const menuItems = await MenuItem.create([
      {
        itemName: 'Butter Chicken',
        description: 'Creamy tomato-based curry with tender chicken',
        price: 150,
        isVeg: false,
        category: 'LUNCH',
        allergens: ['dairy', 'nuts'],
        ecoScore: 'C',
        portionSize: 'Regular',
        nutritionalInfo: { calories: 450, protein: 25, carbs: 20, fat: 28 },
        isAvailable: true,
      },
      {
        itemName: 'Paneer Tikka',
        description: 'Grilled cottage cheese with spices',
        price: 120,
        isVeg: true,
        category: 'LUNCH',
        allergens: ['dairy'],
        ecoScore: 'B',
        portionSize: 'Regular',
        nutritionalInfo: { calories: 320, protein: 18, carbs: 12, fat: 22 },
        isAvailable: true,
      },
      {
        itemName: 'Dal Makhani',
        description: 'Creamy black lentils slow-cooked overnight',
        price: 80,
        isVeg: true,
        category: 'LUNCH',
        allergens: ['dairy'],
        ecoScore: 'A',
        portionSize: 'Regular',
        nutritionalInfo: { calories: 280, protein: 12, carbs: 35, fat: 10 },
        isAvailable: true,
      },
      {
        itemName: 'Biryani',
        description: 'Fragrant rice with vegetables and spices',
        price: 100,
        isVeg: true,
        category: 'LUNCH',
        allergens: ['nuts'],
        ecoScore: 'B',
        portionSize: 'Large',
        nutritionalInfo: { calories: 450, protein: 10, carbs: 65, fat: 15 },
        isAvailable: true,
      },
      {
        itemName: 'Masala Dosa',
        description: 'Crispy crepe with spiced potato filling',
        price: 60,
        isVeg: true,
        category: 'LUNCH',
        allergens: [],
        ecoScore: 'A',
        portionSize: 'Regular',
        nutritionalInfo: { calories: 350, protein: 8, carbs: 55, fat: 10 },
        isAvailable: true,
      },
    ]);
    console.log('Created menu items');

    // Create Canteens
    const canteenNames = ["Sopanam", "Prasada", "Samudra"];
    const createdCanteens = [];
    for (const name of canteenNames) {
      const c = await Canteen.create({
        name,
        capacity: 150,
        status: 'Open',
        crowd: 'Low',
        description: `${name} dining area.`,
      });
      createdCanteens.push(c);
    }
    console.log('Created canteens');

    // Create today's menu
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Menu.create({
      menuDate: today,
      mealType: 'LUNCH',
      isActive: true,
      items: menuItems.map((item) => item._id),
      createdBy: admin._id,
    });
    console.log('Created today\'s lunch menu');

    // Create time slots for today across canteens
    const slots = [
      { time: '12:00 PM', capacity: 50 },
      { time: '12:30 PM', capacity: 50 },
      { time: '1:00 PM', capacity: 60 },
      { time: '1:30 PM', capacity: 60 },
      { time: '2:00 PM', capacity: 40 },
    ];

    for (const c of createdCanteens) {
      for (const slotData of slots) {
        await Slot.create({
          date: today,
          time: slotData.time,
          capacity: slotData.capacity,
          mealType: 'LUNCH',
          status: 'Open',
          canteenId: c._id.toString(),
        });
      }
    }
    console.log('Created time slots for all canteens');

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('Admin: admin@smartcafe.com / admin123');
    console.log('Manager: manager@smartcafe.com / manager123');
    console.log('Staff: canteen@smartcafe.com / staff123');
    console.log('Student: student@college.edu / student123');

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedData();
