const mongoose = require('mongoose');
require('dotenv').config();

const Customer = require('./models/Customer');

async function migrateDatabase() {
    try {
        // 连接到MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('已连接到MongoDB Atlas');

        // 查找所有没有projectType字段的客户记录
        const customersWithoutProjectType = await Customer.find({
            projectType: { $exists: false }
        });

        console.log(`找到 ${customersWithoutProjectType.length} 条需要更新的记录`);

        if (customersWithoutProjectType.length > 0) {
            // 批量更新，为所有现有记录设置默认项目类型
            const result = await Customer.updateMany(
                { projectType: { $exists: false } },
                { 
                    $set: { 
                        projectType: '自助健身卡',
                        notes: '',
                        renewalIntent: '中',
                        comments: ''
                    }
                }
            );

            console.log(`成功更新了 ${result.modifiedCount} 条记录`);
        } else {
            console.log('所有记录都已包含projectType字段');
        }

        // 为没有renewalIntent字段的记录添加默认值
        const customersWithoutRenewalIntent = await Customer.find({
            renewalIntent: { $exists: false }
        });

        if (customersWithoutRenewalIntent.length > 0) {
            const result2 = await Customer.updateMany(
                { renewalIntent: { $exists: false } },
                { $set: { renewalIntent: '中' } }
            );
            console.log(`为 ${result2.modifiedCount} 条记录添加了续费意向字段`);
        }

        // 为没有comments字段的记录添加默认值
        const customersWithoutComments = await Customer.find({
            comments: { $exists: false }
        });

        if (customersWithoutComments.length > 0) {
            const result3 = await Customer.updateMany(
                { comments: { $exists: false } },
                { $set: { comments: '' } }
            );
            console.log(`为 ${result3.modifiedCount} 条记录添加了评论字段`);
        }

        // 验证更新结果
        const allCustomers = await Customer.find();
        console.log(`数据库中共有 ${allCustomers.length} 条客户记录`);
        
        // 显示前几条记录的结构
        if (allCustomers.length > 0) {
            console.log('示例记录结构:');
            console.log(JSON.stringify(allCustomers[0].toObject(), null, 2));
        }

    } catch (error) {
        console.error('迁移失败:', error);
    } finally {
        await mongoose.disconnect();
        console.log('已断开MongoDB连接');
    }
}

migrateDatabase(); 