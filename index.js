require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");

// Bot va Database import
const { createUserBot } = require("./bot/userBot");
const { connectDB } = require("./database/db");

// Express app yaratish
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "wmg_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 soat
    },
  })
);

// EJS view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
const adminRoutes = require("./routes/admin");
app.use("/admin", adminRoutes);

// Root redirect
app.get("/", (req, res) => {
  res.redirect("/admin/login");
});

// 404 handler
app.use((req, res) => {
  res.status(404).send("404 - Sahifa topilmadi");
});

// Botlarni yaratish va ishga tushirish
async function startApp() {
  try {
    console.log("🚀 WMG Bot tizimi ishga tushmoqda...\n");

    // MongoDB ga ulanish
    await connectDB();

    // Environment o'zgaruvchilarni tekshirish
    if (!process.env.BOT_TOKEN) {
      throw new Error("BOT_TOKEN .env faylida topilmadi!");
    }
    if (!process.env.ADMIN_GROUP_ID) {
      throw new Error("ADMIN_GROUP_ID .env faylida topilmadi!");
    }

    // Botni yaratish
    const userBot = createUserBot(
      process.env.BOT_TOKEN,
      process.env.ADMIN_GROUP_ID
    );

    // Botni global scope ga qo'shish (broadcast uchun kerak)
    app.locals.userBot = userBot;

    // Express serverni birinchi ishga tushirish (bot xatosi bo'lsa ham web panel ishlaydi)
    app.listen(PORT, () => {
      console.log(`✅ Web server ishga tushdi: http://localhost:${PORT}`);
      console.log(`📝 Admin panel: http://localhost:${PORT}/admin/login`);
      console.log(`🔑 Admin parol: ${process.env.ADMIN_PASSWORD}\n`);
    });

    // Botni ishga tushirish
    try {
      await userBot.launch();
      console.log("✅ Telegram bot ishga tushdi");
      console.log("🎉 Barcha servislar muvaffaqiyatli ishga tushdi!\n");
    } catch (botError) {
      console.error("⚠️ Bot ishga tushmadi:", botError.message);
      console.log("⚠️ Bot token yoki sozlamalarni tekshiring");
      console.log(
        "✅ Web panel ishlayapti, botni keyinroq sozlashingiz mumkin\n"
      );
    }

    // Graceful shutdown
    process.once("SIGINT", () => {
      console.log("\n⚠️ SIGINT signal qabul qilindi, to'xtatilmoqda...");
      userBot.stop("SIGINT");
      process.exit(0);
    });

    process.once("SIGTERM", () => {
      console.log("\n⚠️ SIGTERM signal qabul qilindi, to'xtatilmoqda...");
      userBot.stop("SIGTERM");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Xatolik yuz berdi:", error);
    process.exit(1);
  }
}

// Appni ishga tushirish
startApp();
