const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
    console.log('🔄 Testing MongoDB Connection...');
    
    if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI is missing in .env file');
        process.exit(1);
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
        
        // Optional: Check if we can list collections or insert a dummy doc to be 100% sure
        // For now, a successful connection is good enough proof of credentials
        
        await mongoose.connection.close();
        console.log('👋 Connection closed.');
        process.exit(0);
    } catch (error) {
        console.error(`❌ Connection Failed: ${error.message}`);
        process.exit(1);
    }
};

testConnection();
