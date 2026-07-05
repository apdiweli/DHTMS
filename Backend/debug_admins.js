const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const User = require('./src/models/User');

async function checkAdmins() {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Checking Super Admins...');
    const admins = await User.find({ role: 'Super Admin' });

    if (admins.length === 0) {
        console.log('NO SUPER ADMINS FOUND!');
    } else {
        admins.forEach(admin => {
            console.log(`- ${admin.name} (${admin.email}) Role: ${admin.role}, Status: '${admin.status}'`);
        });
    }

    // Check exact string match for status
    const activeAdmins = await User.find({ role: 'Super Admin', status: 'Active' });
    console.log(`\nActive Super Admins (exact match): ${activeAdmins.length}`);

    await mongoose.connection.close();
}

checkAdmins();
