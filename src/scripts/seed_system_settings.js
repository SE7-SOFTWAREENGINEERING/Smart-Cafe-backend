const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const API_URL = 'http://127.0.0.1:3000/api';
// We need admin token. We can register/login a temp admin.

async function seedSystemControl() {
    try {
        console.log('1. Authenticating as Admin...');
        // Register or Login as Admin
        const adminUser = {
            email: 'admin@cafeteria.com',
            password: 'password123'
        };

        let token;
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, adminUser);
            token = loginRes.data.data.token;
            console.log('Login successful.');
        } catch (e) {
            console.log('Login failed, trying to register temp admin...');
            const TEST_EMAIL = `sysadmin_${Date.now()}@test.com`;
            const TEST_PASS = 'password123';
            await axios.post(`${API_URL}/auth/register`, {
                fullName: 'System Admin',
                email: TEST_EMAIL,
                password: TEST_PASS,
                role: 'Admin'
            });
            const loginRes = await axios.post(`${API_URL}/auth/login`, { email: TEST_EMAIL, password: TEST_PASS });
            token = loginRes.data.data.token;
            console.log('Temp admin registered and logged in.');
        }

        console.log('2. Checking SYSTEM_CONTROL setting...');
        try {
            const checkRes = await axios.get(`${API_URL}/system/SYSTEM_CONTROL`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Setting exists:', checkRes.data.data);
        } catch (e) {
            if (e.response && e.response.status === 404) {
                console.log('Setting not found in DB. Creating it...');

                const defaultSettings = {
                    settingKey: 'SYSTEM_CONTROL',
                    settingValue: JSON.stringify({ systemActive: true, autoBackupEnabled: true }),
                    dataType: 'JSON',
                    description: 'Master system controls',
                    category: 'SECURITY',
                    isEditable: true
                };

                const createRes = await axios.post(`${API_URL}/system`, defaultSettings, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Setting created successfully:', createRes.data.success);
            } else {
                console.error('Error checking setting:', e.message);
            }
        }

    } catch (error) {
        console.error('Script failed:', error.message);
    }
}

seedSystemControl();
