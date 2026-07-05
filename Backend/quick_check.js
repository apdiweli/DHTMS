const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function quickCheck() {
    await mongoose.connect(process.env.MONGODB_URI);

    const Notification = require('./src/models/Notification');
    const Owner = require('./src/models/Owner');

    const notifCount = await Notification.countDocuments();
    const owners = await Owner.find({}, 'name userId').limit(5);

    console.log('Notifications:', notifCount);
    console.log('\nFirst 5 Owners:');
    for (const owner of owners) {
        console.log(`- ${owner.name}: userId=${owner.userId || 'NOT LINKED'}`);
    }

    await mongoose.connection.close();
}

quickCheck().catch(console.error);
