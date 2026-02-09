const SustainabilityReport = require('../models/SustainabilityReport');
const User = require('../models/User');

const sustainabilityController = {
    // Submit a food waste report
    submitReport: async (req, res, next) => {
        try {
            const { meal_type, reason_for_waste } = req.body;
            const userId = req.user.userId;

            // Generate next report_id
            const lastReport = await SustainabilityReport.findOne().sort({ report_id: -1 });
            const nextReportId = lastReport ? lastReport.report_id + 1 : 1;

            // Calculate impact score (simple scoring: reporting waste = +5 points)
            const impactScore = 5;

            const report = await SustainabilityReport.create({
                report_id: nextReportId,
                user_id: userId,
                meal_type,
                reason_for_waste,
                impact_score: impactScore
            });

            res.status(201).json({
                success: true,
                message: 'Food waste report submitted successfully',
                data: {
                    reportId: report.report_id,
                    impactScore: report.impact_score
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // Get user's sustainability stats
    getUserStats: async (req, res, next) => {
        try {
            const userId = req.user.userId;

            // Get total reports count
            const totalReports = await SustainabilityReport.countDocuments({ user_id: userId });

            // Calculate total impact score
            const reports = await SustainabilityReport.find({ user_id: userId });
            const totalImpact = reports.reduce((sum, report) => sum + report.impact_score, 0);

            // Calculate percentage (assuming max impact is 1000 for 100%)
            const impactPercentage = Math.min(Math.round((totalImpact / 1000) * 100), 100);

            res.json({
                success: true,
                data: {
                    totalReports,
                    totalImpact,
                    impactPercentage,
                    daysActive: totalReports // Simplified: 1 report = 1 day
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // Get all reports (for admin/analytics)
    getAllReports: async (req, res, next) => {
        try {
            const { startDate, endDate } = req.query;

            let query = {};
            if (startDate || endDate) {
                query.created_at = {};
                if (startDate) query.created_at.$gte = new Date(startDate);
                if (endDate) query.created_at.$lte = new Date(endDate);
            }

            const reports = await SustainabilityReport.find(query)
                .sort({ created_at: -1 })
                .populate('user_id', 'name email');

            res.json({
                success: true,
                data: {
                    count: reports.length,
                    reports: reports.map(r => ({
                        reportId: r.report_id,
                        userId: r.user_id?.user_id,
                        userName: r.user_id?.name,
                        mealType: r.meal_type,
                        reason: r.reason_for_waste,
                        impactScore: r.impact_score,
                        createdAt: r.created_at
                    }))
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = sustainabilityController;
