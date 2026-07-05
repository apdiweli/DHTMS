const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/house_taxation_db';

console.log('Connecting to:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected successfully');
        process.exit(0);
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });
