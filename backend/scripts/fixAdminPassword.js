const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const fixAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://yusufsmasher:ffrLlbqjcWenskYH@fmbashara1446.c8l53jz.mongodb.net/panache_app?retryWrites=true&w=majority&appName=fmbashara1446');

    // Try to find by email first
    let admin = await User.findOne({ email: 'admin@panache.com' });
    
    // If not found, try by ID
    if (!admin) {
      admin = await User.findById('6907b582b233aa87e83ff5ef');
    }
    
    // If still not found, list all users
    if (!admin) {
      const allUsers = await User.find({});
      console.log('Available users:', allUsers.map(u => ({ id: u._id, email: u.email, role: u.role })));
      console.log('Admin user not found!');
      process.exit(1);
    }

    console.log('Found admin user:', admin.email, admin._id);

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Update directly using findByIdAndUpdate to bypass pre-save hook
    await User.findByIdAndUpdate(admin._id, { 
      password: hashedPassword 
    }, { runValidators: false });
    
    console.log('✅ Admin password has been hashed successfully!');
    console.log('Email: admin@panache.com');
    console.log('Password: admin123 (now hashed)');
    console.log('\nYou can now login with these credentials.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing admin password:', error);
    process.exit(1);
  }
};

fixAdminPassword();

