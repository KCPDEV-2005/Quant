require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school_head_matcher';

async function seed() {
  try {
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');

    // Create Admin
    const salt1 = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('admin123', salt1);
    await User.updateOne({ username: 'admin' }, { $set: { password: adminPass, role: 'admin' } }, { upsert: true });
    
    // Create User
    const salt2 = await bcrypt.genSalt(10);
    const userPass = await bcrypt.hash('user123', salt2);
    await User.updateOne({ username: 'user' }, { $set: { password: userPass, role: 'user' } }, { upsert: true });

    console.log('Test users created:');
    console.log('Admin: admin / admin123');
    console.log('User: user / user123');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
