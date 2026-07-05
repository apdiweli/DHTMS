const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const User = require('./src/models/User');

async function fixAdmin() {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Fixing Super Admin status...');
    const result = await User.updateMany(
        { role: 'Super Admin' },
        { $set: { status: 'Active' } }
    );

    console.log(`Updated ${result.modifiedCount} admins to Active status.`);

    await mongoose.connection.close();
}

fixAdmin();
