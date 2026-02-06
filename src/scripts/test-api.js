const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

const runTests = async () => {
  try {
    console.log('🧪 Starting API Tests...');

    // 1. Health Check
    try {
      const health = await axios.get('http://localhost:3000/health');
      console.log('✅ Health Check:', health.data.message);
    } catch (e) {
      console.error('❌ Health Check Failed:', e.message);
      process.exit(1); // Server likely not running
    }

    // 2. Register User
    const uniqueEmail = `testuser_${Date.now()}@example.com`;
    let token = '';
    let userId = '';

    try {
      const register = await axios.post(`${API_URL}/auth/register`, {
        name: 'Test User',
        email: uniqueEmail,
        password: 'password123'
      });
      console.log('✅ Register User:', register.data.message);
      token = register.data.data.token;
      userId = register.data.data.user.userId;
    } catch (e) {
      console.error('❌ Register Failed:', e.response?.data || e.message);
    }

    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    // 3. Login User
    try {
      const login = await axios.post(`${API_URL}/auth/login`, {
        email: uniqueEmail,
        password: 'password123'
      });
      console.log('✅ Login User:', login.data.message);
    } catch (e) {
      console.error('❌ Login Failed:', e.response?.data || e.message);
    }

    // 4. Create Capacity (Admin) - Need strict admin flow or assume pre-setup? 
    // I can't act as admin easily without modifying role manually in DB or registering as admin.
    // I'll try to book a slot. If no capacity, it will fail.
    // The previous implementation of `setSlotCapacity` in admin can set it.
    // I'll try to register an admin first.
    
    let adminToken = '';
    try {
       // Register admin
       const adminEmail = `admin_${Date.now()}@example.com`;
       const regAdmin = await axios.post(`${API_URL}/auth/register`, {
         name: 'Admin User',
         email: adminEmail,
         password: 'adminpassword',
         role: 'Admin'
       });
       adminToken = regAdmin.data.data.token;
       console.log('✅ Register Admin:', regAdmin.data.message);
    } catch (e) {
       console.error('❌ Register Admin Failed:', e.response?.data || e.message);
    }
    
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0); // Noon tomorrow

    if (adminToken) {
       // Set Capacity
       try {
         const cap = await axios.post(`${API_URL}/admin/capacity`, {
           slot_time: tomorrow.toISOString(),
           meal_type: 'Lunch', // Using meal_type even if ignored by schema, logic might use it? Logic uses slot_time.
           max_capacity: 10,
           priority_capacity: 5
         }, { headers: adminHeaders });
         console.log('✅ Set Capacity:', cap.data.message);
       } catch (e) {
         console.error('❌ Set Capacity Failed:', e.response?.data || e.message);
       }
    }

    // 5. Create Booking
    let bookingId = '';
    try {
      const booking = await axios.post(`${API_URL}/bookings`, {
        slot_time: tomorrow.toISOString(),
        meal_type: 'Lunch'
      }, { headers });
      console.log('✅ Create Booking:', booking.data.message);
      bookingId = booking.data.data.booking.bookingId;
    } catch (e) {
      console.error('❌ Create Booking Failed:', e.response?.data || e.message);
    }

    // 6. Get My Bookings
    try {
      const myBookings = await axios.get(`${API_URL}/bookings/my-bookings`, { headers });
      console.log(`✅ Get My Bookings: Found ${myBookings.data.data.count} bookings`);
    } catch (e) {
      console.error('❌ Get My Bookings Failed:', e.response?.data || e.message);
    }

    console.log('\n🎉 All basic flow tests completed!');

  } catch (error) {
    console.error('❌ Unexpected Error:', error.message);
  }
};

runTests();
