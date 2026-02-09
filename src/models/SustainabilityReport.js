const mongoose = require('mongoose');

const sustainabilityReportSchema = new mongoose.Schema({
    report_id: {
        type: Number,
        required: true,
        unique: true
    },
    user_id: {
        type: Number,
        required: true,
        ref: 'User'
    },
    meal_type: {
        type: String,
        required: true,
        enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner', 'Other']
    },
    reason_for_waste: {
        type: String,
        required: true
    },
    impact_score: {
        type: Number,
        default: 0
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SustainabilityReport', sustainabilityReportSchema);
