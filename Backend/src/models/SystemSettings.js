const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
    // General Settings
    entityName: {
        type: String,
        default: 'Benadir Regional Administration Tax Office'
    },
    contactEmail: {
        type: String,
        default: 'contact@bra.gov.so'
    },

    // Security Settings
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    minimumPasswordLength: {
        type: Number,
        default: 8,
        min: 4,
        max: 16,
        validate: {
            validator: function (v) {
                return v >= 4 && v <= 16;
            },
            message: 'Minimum password length must be between 4 and 16 characters'
        }
    },

    // Integration Settings
    mobileMoneyApiEndpoint: {
        type: String,
        default: 'https://api.mobilemoney.so/v1'
    },
    mobileMoneyApiKey: {
        type: String,
        select: false // Hidden by default for security
    },

    // Localization Settings
    timezone: {
        type: String,
        default: 'UTC+3 (East Africa Time)'
    },
    defaultCurrency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'SOS']
    },

    // Metadata
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
