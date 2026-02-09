const mongoose = require('mongoose');
const SystemSettings = require('../models/SystemSettings');
const connectDB = require('../config/database');
require('dotenv').config();

const seedSystemSettings = async () => {
    try {
        await connectDB();

        const defaultSettings = [
            {
                settingKey: 'CAPACITY_CONFIG',
                settingValue: JSON.stringify({
                    maxCapacity: 100,
                    reservationLimit: 80,
                    buffer: 10
                }),
                dataType: 'JSON',
                category: 'CAPACITY',
                description: 'Global capacity configuration',
                isEditable: true
            },
            {
                settingKey: 'TIMING_CONFIG',
                settingValue: JSON.stringify({
                    breakfast: { start: '07:30', end: '10:30' },
                    lunch: { start: '12:30', end: '14:30' },
                    dinner: { start: '19:30', end: '21:30' }
                }),
                dataType: 'JSON',
                category: 'GENERAL',
                description: 'Standard operational timings',
                isEditable: true
            },
            {
                settingKey: 'SERVICE_MODES',
                settingValue: JSON.stringify({
                    dineIn: true,
                    takeaway: true,
                    delivery: false
                }),
                dataType: 'JSON',
                category: 'GENERAL',
                description: 'Active service modes',
                isEditable: true
            },
            {
                settingKey: 'SYSTEM_STATUS',
                settingValue: 'ACTIVE',
                dataType: 'STRING',
                category: 'GENERAL',
                description: 'Master system status (ACTIVE/LOCKDOWN)',
                isEditable: true
            }
        ];

        console.log('🌱 Seeding System Settings...');

        for (const setting of defaultSettings) {
            await SystemSettings.findOneAndUpdate(
                { settingKey: setting.settingKey },
                setting,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`✅ Processed: ${setting.settingKey}`);
        }

        console.log('✨ System Settings seeding completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding system settings:', error);
        process.exit(1);
    }
};

seedSystemSettings();
