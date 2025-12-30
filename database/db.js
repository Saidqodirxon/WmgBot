const mongoose = require("mongoose");

// MongoDB ulanish
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/wmg_bot"
    );
    console.log("✅ MongoDB ga ulanildi");

    // Boshlang'ich ma'lumotlarni yaratish
    await initializeData();
  } catch (error) {
    console.error("❌ MongoDB ulanishda xatolik:", error);
    process.exit(1);
  }
};

// Mongoose Schemas va Models

// User Schema
const userSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  username: String,
  first_name: String,
  last_name: String,
  phone: String,
  language: { type: String, default: "uz" }, // uz or ru
  interested_courses: [String],
  subscription: { type: [String], default: [] }, // Array of subscriptions
  registration_completed: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

// News Schema
const newsSchema = new mongoose.Schema({
  title_latin: String,
  title_cyrillic: String,
  content_latin: String,
  content_cyrillic: String,
  image_url: String,
  created_at: { type: Date, default: Date.now },
});

const News = mongoose.model("News", newsSchema);

// FAQ Schema
const faqSchema = new mongoose.Schema({
  question_latin: String,
  question_cyrillic: String,
  answer_latin: String,
  answer_cyrillic: String,
  created_at: { type: Date, default: Date.now },
});

const FAQ = mongoose.model("FAQ", faqSchema);

// Settings Schema
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value_latin: { type: String, required: true },
  value_cyrillic: { type: String, required: true },
  updated_at: { type: Date, default: Date.now },
});

const Setting = mongoose.model("Setting", settingSchema);

// Chat Session Schema
const chatSessionSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  thread_id: Number,
  last_message_at: { type: Date, default: Date.now },
});

const ChatSession = mongoose.model("ChatSession", chatSessionSchema);

// Subscription Schema
const subscriptionSchema = new mongoose.Schema({
  name_latin: { type: String, required: true },
  name_cyrillic: { type: String, required: true },
  description_latin: String,
  description_cyrillic: String,
  created_at: { type: Date, default: Date.now },
});

const Subscription = mongoose.model("Subscription", subscriptionSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const Admin = mongoose.model("Admin", adminSchema);

// Message Thread Schema - Admin guruh xabarlari uchun mapping
const messageThreadSchema = new mongoose.Schema({
  message_id: { type: Number, required: true, unique: true },
  user_id: { type: Number, required: true },
  chat_id: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
});

const MessageThread = mongoose.model("MessageThread", messageThreadSchema);

// Boshlang'ich ma'lumotlarni yaratish
async function initializeData() {
  try {
    // Standart sozlamalarni qo'shish
    const settingsCount = await Setting.countDocuments();
    if (settingsCount === 0) {
      await Setting.insertMany([
        {
          key: "discount_text",
          value_latin:
            "Chegirma olish uchun quyidagi manzilga murojaat qiling...",
          value_cyrillic:
            "Чегирма олиш учун қуйидаги манзилга мурожаат қилинг...",
        },
        {
          key: "payment_text",
          value_latin:
            "💳 To'lov turlari:\n\n🔹 Click\n🔹 Payme\n🔹 Uzum\n🔹 Naqd pul",
          value_cyrillic:
            "💳 Тўлов турлари:\n\n🔹 Click\n🔹 Payme\n🔹 Uzum\n🔹 Нақд пул",
        },
      ]);
      console.log("✅ Standart sozlamalar yaratildi");
    }

    // Standart obuna yo'nalishlarini qo'shish
    const subscriptionsCount = await Subscription.countDocuments();
    if (subscriptionsCount === 0) {
      await Subscription.insertMany([
        {
          name_latin: "Frontend",
          name_cyrillic: "Фронтенд",
          description_latin: "HTML, CSS, JavaScript, React",
          description_cyrillic: "HTML, CSS, JavaScript, React",
        },
        {
          name_latin: "Backend",
          name_cyrillic: "Бэкенд",
          description_latin: "Node.js, Python, Databases",
          description_cyrillic: "Node.js, Python, Databases",
        },
        {
          name_latin: "Mobile",
          name_cyrillic: "Мобил",
          description_latin: "React Native, Flutter",
          description_cyrillic: "React Native, Flutter",
        },
        {
          name_latin: "Design",
          name_cyrillic: "Дизайн",
          description_latin: "UI/UX, Figma, Adobe",
          description_cyrillic: "UI/UX, Figma, Adobe",
        },
      ]);
      console.log("✅ Standart obuna yo'nalishlari yaratildi");
    }
  } catch (error) {
    console.error("Boshlang'ich ma'lumotlar yaratishda xatolik:", error);
  }
}

// Database funksiyalari
const DB = {
  // Foydalanuvchi qo'shish yoki yangilash
  async upsertUser(userId, userData) {
    const { username, first_name, last_name } = userData;
    await User.findOneAndUpdate(
      { user_id: userId },
      {
        user_id: userId,
        username,
        first_name,
        last_name,
      },
      { upsert: true, new: true }
    );
  },

  // Foydalanuvchi obunasini yangilash
  async updateUserSubscription(userId, subscriptions) {
    await User.findOneAndUpdate(
      { user_id: userId },
      { subscription: subscriptions }
    );
  },

  // Foydalanuvchi obunalarini olish
  async getUserSubscriptions(userId) {
    const user = await User.findOne({ user_id: userId }).lean();
    return user ? user.subscription : [];
  },

  // Foydalanuvchini olish
  async getUser(userId) {
    return await User.findOne({ user_id: userId }).lean();
  },

  // Foydalanuvchi tilini yangilash
  async updateUserLanguage(userId, language) {
    await User.findOneAndUpdate({ user_id: userId }, { language });
  },

  // Foydalanuvchi telefonini yangilash
  async updateUserPhone(userId, phone) {
    await User.findOneAndUpdate({ user_id: userId }, { phone });
  },

  // Foydalanuvchi qiziqtirgan kurslarini yangilash
  async updateUserCourses(userId, courses) {
    await User.findOneAndUpdate(
      { user_id: userId },
      { interested_courses: courses }
    );
  },

  // Ro'yxatdan o'tishni yakunlash
  async completeRegistration(userId) {
    await User.findOneAndUpdate(
      { user_id: userId },
      { registration_completed: true }
    );
  },

  // Barcha foydalanuvchilarni olish
  async getAllUsers() {
    return await User.find().sort({ created_at: -1 }).lean();
  },

  // Obuna bo'yicha foydalanuvchilarni olish
  async getUsersBySubscription(subscription) {
    return await User.find({ subscription: subscription }).lean();
  },

  // News CRUD
  async addNews(
    titleLatin,
    contentLatin,
    titleCyrillic,
    contentCyrillic,
    imageUrl = null
  ) {
    const news = await News.create({
      title_latin: titleLatin,
      content_latin: contentLatin,
      title_cyrillic: titleCyrillic,
      content_cyrillic: contentCyrillic,
      image_url: imageUrl,
    });
    return news._id;
  },

  async getAllNews() {
    return await News.find().sort({ created_at: -1 }).lean();
  },

  async getNewsById(id) {
    return await News.findById(id).lean();
  },

  async deleteNews(id) {
    await News.findByIdAndDelete(id);
  },

  // FAQ CRUD
  async addFaq(questionLatin, answerLatin, questionCyrillic, answerCyrillic) {
    const faq = await FAQ.create({
      question_latin: questionLatin,
      answer_latin: answerLatin,
      question_cyrillic: questionCyrillic,
      answer_cyrillic: answerCyrillic,
    });
    return faq._id;
  },

  async getAllFaq() {
    return await FAQ.find().sort({ created_at: -1 }).lean();
  },

  async deleteFaq(id) {
    await FAQ.findByIdAndDelete(id);
  },

  // Sozlamalar
  async getSetting(key, language = "uz_cyrillic") {
    const setting = await Setting.findOne({ key }).lean();
    if (!setting) return null;
    return language === "uz_latin"
      ? setting.value_latin
      : setting.value_cyrillic;
  },

  async getSettingBoth(key) {
    const setting = await Setting.findOne({ key }).lean();
    return setting
      ? { latin: setting.value_latin, cyrillic: setting.value_cyrillic }
      : null;
  },

  async updateSetting(key, valueLatin, valueCyrillic) {
    await Setting.findOneAndUpdate(
      { key },
      {
        key,
        value_latin: valueLatin,
        value_cyrillic: valueCyrillic,
        updated_at: Date.now(),
      },
      { upsert: true }
    );
  },

  // Chat sessiyalari
  async saveChatSession(userId, threadId) {
    await ChatSession.findOneAndUpdate(
      { user_id: userId },
      {
        user_id: userId,
        thread_id: threadId,
        last_message_at: Date.now(),
      },
      { upsert: true }
    );
  },

  async getChatSession(userId) {
    return await ChatSession.findOne({ user_id: userId }).lean();
  },

  async findUserByThreadId(threadId) {
    return await ChatSession.findOne({ thread_id: threadId }).lean();
  },

  // Obuna yo'nalishlari
  async getAllSubscriptions() {
    return await Subscription.find().sort({ created_at: 1 }).lean();
  },

  async addSubscription(
    nameLatin,
    nameCyrillic,
    descriptionLatin,
    descriptionCyrillic
  ) {
    const subscription = await Subscription.create({
      name_latin: nameLatin,
      name_cyrillic: nameCyrillic,
      description_latin: descriptionLatin,
      description_cyrillic: descriptionCyrillic,
    });
    return subscription._id;
  },

  async deleteSubscription(id) {
    await Subscription.findByIdAndDelete(id);
  },

  // Admin CRUD
  async getAdminByUsername(username) {
    return await Admin.findOne({ username }).lean();
  },

  async createAdmin(username, hashedPassword) {
    const admin = await Admin.create({
      username,
      password: hashedPassword,
    });
    return admin._id;
  },

  // Message Thread (Admin guruh mapping)
  async saveMessageThread(messageId, userId, chatId) {
    await MessageThread.findOneAndUpdate(
      { message_id: messageId },
      { message_id: messageId, user_id: userId, chat_id: chatId },
      { upsert: true }
    );
  },

  async findUserByMessageId(messageId) {
    return await MessageThread.findOne({ message_id: messageId }).lean();
  },

  // Statistika
  async getStats() {
    const totalUsers = await User.countDocuments();
    const totalNews = await News.countDocuments();
    const totalFaq = await FAQ.countDocuments();

    // Obuna statistikasi
    const subscriptionStats = await User.aggregate([
      { $match: { subscription: { $exists: true, $ne: [] } } },
      { $unwind: "$subscription" },
      { $group: { _id: "$subscription", count: { $sum: 1 } } },
      { $project: { subscription: "$_id", count: 1, _id: 0 } },
    ]);

    return {
      totalUsers,
      totalNews,
      totalFaq,
      subscriptionStats,
    };
  },
};

module.exports = { connectDB, DB };
