const mongoose = require('mongoose');

const checkinSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    checkinDate: {
        type: String,
        required: true
    },
    checkinTime: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// 复合唯一索引，确保同一客户同一天只能打卡一次
checkinSchema.index({ customerId: 1, checkinDate: 1 }, { unique: true });

// 防止模型重复定义
module.exports = mongoose.models.Checkin || mongoose.model('Checkin', checkinSchema); 