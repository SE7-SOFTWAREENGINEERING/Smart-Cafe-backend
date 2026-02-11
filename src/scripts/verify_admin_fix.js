const axios = require('axios');
const fs = require('fs');
const API_URL = 'http://127.0.0.1:3000/api';

function log(msg) {
    console.log(msg);
    fs.appendFileSync('debug_verify.log', msg + '\n');
}

// Admin credentials (from seedData or known admin)
const ADMIN_EMAIL = 'admin@cafeteria.com';
const ADMIN_PASSWORD = 'password123';

async function testMenuCreation() {
    fs.writeFileSync('debug_verify.log', ''); // Clear log
    const TEST_EMAIL = `testadmin_${Date.now()}@test.com`;
    const TEST_PASS = 'password123';

    try {
        log('1. Registering new Admin user...');
        try {
            await axios.post(`${API_URL}/auth/register`, {
                fullName: 'Test Admin',
                email: TEST_EMAIL,
                password: TEST_PASS,
                role: 'Admin'
            });
            log('Registration successful.');
        } catch (e) {
            const errorDetails = {
                message: e.message,
                code: e.code,
                stack: e.stack
            };
            if (e.response) {
                errorDetails.responseStatus = e.response.status;
                errorDetails.responseData = e.response.data;
            }
            log('Registration failed: ' + JSON.stringify(errorDetails, null, 2));

            // If already exists (unlikely with timestamp), try login
            log('User might exist or error occurred, proceeding to login.');
        }

        log('2. Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASS
        });

        const token = loginRes.data.data.token;
        log('Login successful. Token obtained.');

        log('3. Creating Menu Item...');
        const newItem = {
            itemName: 'Test Setup Item', // Backend expects itemName (or mapped from name)
            price: 50,
            category: 'Lunch', // Backend expects category (or mapped from mealType)
            mealType: 'Lunch', // Sending both to test mapping if needed, or just standard
            dietaryType: 'Veg',
            description: 'Test item for verification',
            isAvailable: true,
            date: new Date().toISOString()
        };
        log('Sending payload: ' + JSON.stringify(newItem, null, 2));
        const createRes = await axios.post(`${API_URL}/menu/items`, newItem, {
            headers: { Authorization: `Bearer ${token}` }
        });

        log('Menu Item Created Successfully: ' + createRes.data.success);

        // Clean up
        if (createRes.data.data && (createRes.data.data.id || createRes.data.data._id)) {
            const itemId = createRes.data.data.id || createRes.data.data._id;
            log('4. Cleaning up test item: ' + itemId);
            await axios.delete(`${API_URL}/menu/items/${itemId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            log('Cleanup successful.');
        }

    } catch (error) {
        const errorDetails = {
            message: error.message,
            code: error.code
        };
        if (error.response) {
            errorDetails.responseStatus = error.response.status;
            errorDetails.responseData = error.response.data;
        }
        log('Test Failed: ' + JSON.stringify(errorDetails, null, 2));
        process.exit(1);
    }
}

testMenuCreation();
