// MongoDB migration script
const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wmg_bot');
    console.log('✅ MongoDB connected');

    // Update Settings to have bilingual fields
    const Setting = mongoose.model('Setting', new mongoose.Schema({
      key: String,
      value: String,
      value_latin: String,
      value_cyrillic: String,
    }));

    const settings = await Setting.find({ value: { $exists: true }, value_latin: { $exists: false } });
    
    for (const setting of settings) {
      await Setting.updateOne(
        { _id: setting._id },
        {
          $set: {
            value_latin: setting.value,
            value_cyrillic: setting.value
          }
        }
      );
      console.log(`✅ Updated setting: ${setting.key}`);
    }

    // Update Subscriptions to have bilingual fields
    const Subscription = mongoose.model('Subscription', new mongoose.Schema({
      name: String,
      name_latin: String,
      name_cyrillic: String,
      icon: String,
      description: String,
      description_latin: String,
      description_cyrillic: String,
    }));

    const subscriptions = await Subscription.find({ name: { $exists: true }, name_latin: { $exists: false } });
    
    for (const sub of subscriptions) {
      await Subscription.updateOne(
        { _id: sub._id },
        {
          $set: {
            name_latin: sub.name,
            name_cyrillic: sub.name,
            description_latin: sub.description || '',
            description_cyrillic: sub.description || ''
          }
        }
      );
      console.log(`✅ Updated subscription: ${sub.name}`);
    }

    console.log('✅ Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrate();
