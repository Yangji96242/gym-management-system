import mongoose from 'mongoose';

const checkinSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    checkinDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// 复合唯一索引，确保同一客户同一天只能打卡一次
checkinSchema.index({ customerId: 1, checkinDate: 1 }, { unique: true });

// 防止模型重复定义
export default mongoose.models.Checkin || mongoose.model('Checkin', checkinSchema); 