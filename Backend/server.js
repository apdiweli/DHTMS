const express = require('express');

const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

console.log('Starting server...');
const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
console.log('Configuring middleware...');
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Database Connection
console.log('Connecting to MongoDB Atlas...');

// Build URI with properly encoded password to handle special characters
const mongoPassword = process.env.MONGODB_PASSWORD;
const MONGODB_URI = mongoPassword
    ? process.env.MONGODB_URI_BASE.replace('PASSWORD', encodeURIComponent(mongoPassword))
    : process.env.MONGODB_URI || process.env.MONGODB_URI_BASE;

console.log('URI:', MONGODB_URI ? 'URI loaded ✓' : '⚠ MONGODB_URI is missing!');

mongoose.set('bufferCommands', false); // Fail fast instead of buffering queries

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000, // Give Atlas 10s to respond
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
})
.then(() => {
    console.log('✅ MongoDB Atlas connected successfully!');
})
.catch(err => {
    console.error('❌ MongoDB Atlas connection FAILED:', err.message);
    console.error('');
    console.error('🔧 FIX: Go to MongoDB Atlas → Network Access → Add IP Address');
    console.error('   Add your current IP or use 0.0.0.0/0 to allow all IPs');
    console.error('   https://cloud.mongodb.com → Security → Network Access');
    // Don't exit — keep server running so routes respond with proper errors
});

// Routes
console.log('Loading routes...');
const authRoutes = require('./src/routes/authRoutes');
const ownerRoutes = require('./src/routes/ownerRoutes');
const propertyRoutes = require('./src/routes/propertyRoutes');
const taxRoutes = require('./src/routes/taxRoutes');
const userRoutes = require('./src/routes/userRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const searchRoutes = require('./src/routes/searchRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const supportRoutes = require('./src/routes/supportRoutes');
const propertyTransferRoutes = require('./src/routes/propertyTransferRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/property-transfers', propertyTransferRoutes);

app.get('/', (req, res) => {
    res.send('House Taxation Management System API');
});

console.log('Starting listener...');
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
