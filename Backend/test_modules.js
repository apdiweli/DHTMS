try {
    require('./src/routes/authRoutes');
    console.log('authRoutes loaded');
    require('./src/routes/ownerRoutes');
    console.log('ownerRoutes loaded');
    require('./src/routes/propertyRoutes');
    console.log('propertyRoutes loaded');
    console.log('All routes loaded');
} catch (e) {
    console.error(e);
}
