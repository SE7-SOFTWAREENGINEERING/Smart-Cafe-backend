const { authService } = require('./src/services');
const mongoose = require('mongoose');
const http = require('http');

async function test() {
    await mongoose.connect('mongodb://127.0.0.1:27017/smart-cafe');
    try {
        const res = await authService.login({ email: 'admin@smartcafe.com', password: 'admin123' });
        const token = res.token;
        console.log('Got token:', token.substring(0, 10) + '...');

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/users',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log('Status code:', res.statusCode);
                console.log('Response body:', data);
                mongoose.disconnect();
            });
        });

        req.on('error', (error) => {
            console.error('Request error:', error);
            mongoose.disconnect();
        });

        req.end();
    } catch (error) {
        console.error('Test Failed:', error);
        await mongoose.disconnect();
    }
}

test();
