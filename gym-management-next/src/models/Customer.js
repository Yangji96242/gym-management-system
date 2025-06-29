import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['男', '女']
    },
    projectType: {
        type: String,
        required: true,
        enum: ['自助健身卡', '包月私教卡', '课包私教卡', '体验课', '体验卡']
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    renewalIntent: {
        type: String,
        enum: ['高意向', '中意向', '低意向', '放弃'],
        default: '中意向',
    },
    comments: {
        type: String,
        trim: true,
        default: ''
    },
    lastCheckinDate: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// 防止模型重复定义
export default mongoose.models.Customer || mongoose.model('Customer', customerSchema); 