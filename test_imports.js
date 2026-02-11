const modules = [
    './src/middleware/errorHandler',
    './src/config/database',
    './src/services/socketService',
    './src/utils/cronJobs',
    './src/routers/authRoutes',
    './src/routers/menuRoutes',
    './src/routers/systemRoutes',
    './src/routers/bookingRoutes',
    './src/routers/staffRoutes',
    './src/routers/adminRoutes',
    './src/routers/slotRoutes',
    './src/routers/notificationRoutes',
    './src/routers/sustainabilityRoutes'
];

console.log('Testing modules...');

modules.forEach(m => {
    try {
        require(m);
        console.log(`✅ ${m} loaded`);
    } catch (e) {
        console.error(`❌ ${m} failed:`);
        console.error(e);
    }
});
