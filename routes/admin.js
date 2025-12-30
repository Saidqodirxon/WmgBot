const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const { DB } = require("../database/db");
const { generateToken, authenticateToken } = require("../middleware/auth");
const router = express.Router();

// Multer setup - image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "news-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Faqat rasm fayllari yuklash mumkin!"));
    }
  },
});

// GET: Login sahifasi
router.get("/login", (req, res) => {
  const token = req.cookies?.token || req.session?.token;
  if (token) {
    return res.redirect("/admin/dashboard");
  }
  res.render("login", { error: null });
});

// POST: Login (JWT bilan)
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Agar admin mavjud bo'lmasa, default admin yaratish
    let admin = await DB.getAdminByUsername(username || "admin");

    if (!admin && username === "admin") {
      // Birinchi marta kirishda default admin yaratish
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await DB.createAdmin("admin", hashedPassword);
      admin = await DB.getAdminByUsername("admin");
    }

    if (!admin) {
      return res.render("login", { error: "Foydalanuvchi topilmadi!" });
    }

    // Parolni tekshirish
    const isValid = await bcrypt.compare(password, admin.password);

    if (isValid) {
      const token = generateToken(admin);

      // Token ni cookie va session ga saqlash
      res.cookie("token", token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      req.session.token = token;
      req.session.isAuthenticated = true;

      return res.redirect("/admin/dashboard");
    }

    res.render("login", { error: "Parol noto'g'ri!" });
  } catch (error) {
    console.error("Login xatosi:", error);
    res.render("login", { error: "Xatolik yuz berdi!" });
  }
});

// GET: Logout
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  req.session.destroy();
  res.redirect("/admin/login");
});

// GET: Dashboard
router.get("/dashboard", authenticateToken, async (req, res) => {
  try {
    const stats = await DB.getStats();

    res.render("dashboard", {
      stats,
      user: req.user,
    });
  } catch (error) {
    console.error("Dashboard xatosi:", error);
    res.status(500).send("Xatolik yuz berdi");
  }
});

// ========== NEWS ==========

router.get("/news", authenticateToken, async (req, res) => {
  try {
    const allNews = await DB.getAllNews();
    res.render("news", {
      news: allNews,
      success: null,
      error: null,
      user: req.user,
    });
  } catch (error) {
    console.error("News olishda xato:", error);
    res.status(500).send("Xatolik yuz berdi");
  }
});

router.post(
  "/news/add",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    const { title_latin, content_latin, title_cyrillic, content_cyrillic } =
      req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      await DB.addNews(
        title_latin,
        content_latin,
        title_cyrillic,
        content_cyrillic,
        imageUrl
      );
      const allNews = await DB.getAllNews();
      res.render("news", {
        news: allNews,
        success: "News muvaffaqiyatli qo'shildi!",
        error: null,
        user: req.user,
      });
    } catch (error) {
      console.error("News qo'shishda xato:", error);
      const allNews = await DB.getAllNews();
      res.render("news", {
        news: allNews,
        success: null,
        error: "News qo'shishda xatolik!",
        user: req.user,
      });
    }
  }
);

router.post("/news/delete/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await DB.deleteNews(id);
    const allNews = await DB.getAllNews();
    res.render("news", {
      news: allNews,
      success: "News o'chirildi!",
      error: null,
      user: req.user,
    });
  } catch (error) {
    console.error("News o'chirishda xato:", error);
    const allNews = await DB.getAllNews();
    res.render("news", {
      news: allNews,
      success: null,
      error: "News o'chirishda xatolik!",
      user: req.user,
    });
  }
});

// ========== FAQ ==========

router.get("/faq", authenticateToken, async (req, res) => {
  try {
    const allFaq = await DB.getAllFaq();
    res.render("faq", {
      faq: allFaq,
      success: null,
      error: null,
      user: req.user,
    });
  } catch (error) {
    console.error("FAQ olishda xato:", error);
    res.status(500).send("Xatolik yuz berdi");
  }
});

router.post("/faq/add", authenticateToken, async (req, res) => {
  const { question_latin, answer_latin, question_cyrillic, answer_cyrillic } =
    req.body;

  try {
    await DB.addFaq(
      question_latin,
      answer_latin,
      question_cyrillic,
      answer_cyrillic
    );
    const allFaq = await DB.getAllFaq();
    res.render("faq", {
      faq: allFaq,
      success: "FAQ muvaffaqiyatli qo'shildi!",
      error: null,
      user: req.user,
    });
  } catch (error) {
    console.error("FAQ qo'shishda xato:", error);
    const allFaq = await DB.getAllFaq();
    res.render("faq", {
      faq: allFaq,
      success: null,
      error: "FAQ qo'shishda xatolik!",
      user: req.user,
    });
  }
});

router.post("/faq/delete/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await DB.deleteFaq(id);
    const allFaq = await DB.getAllFaq();
    res.render("faq", {
      faq: allFaq,
      success: "FAQ o'chirildi!",
      error: null,
      user: req.user,
    });
  } catch (error) {
    console.error("FAQ o'chirishda xato:", error);
    const allFaq = await DB.getAllFaq();
    res.render("faq", {
      faq: allFaq,
      success: null,
      error: "FAQ o'chirishda xatolik!",
      user: req.user,
    });
  }
});

// ========== SUBSCRIPTIONS ==========

router.get("/subscriptions", authenticateToken, async (req, res) => {
  try {
    const subscriptions = await DB.getAllSubscriptions();
    res.render("subscriptions", {
      subscriptions,
      success: null,
      error: null,
      user: req.user,
    });
  } catch (error) {
    console.error("Kategoriyalar olishda xato:", error);
    res.status(500).send("Xatolik yuz berdi");
  }
});

router.post("/subscriptions/add", authenticateToken, async (req, res) => {
  const { name_latin, name_cyrillic, description_latin, description_cyrillic } =
    req.body;

  try {
    await DB.addSubscription(
      name_latin,
      name_cyrillic,
      description_latin,
      description_cyrillic
    );
    const subscriptions = await DB.getAllSubscriptions();
    res.render("subscriptions", {
      subscriptions,
      success: "Kategoriya qo'shildi!",
      error: null,
      user: req.user,
    });
  } catch (error) {
    console.error("Kategoriya qo'shishda xato:", error);
    const subscriptions = await DB.getAllSubscriptions();
    res.render("subscriptions", {
      subscriptions,
      success: null,
      error: "Kategoriya qo'shishda xatolik!",
      user: req.user,
    });
  }
});

router.post(
  "/subscriptions/delete/:id",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;

    try {
      await DB.deleteSubscription(id);
      const subscriptions = await DB.getAllSubscriptions();
      res.render("subscriptions", {
        subscriptions,
        success: "Kategoriya o'chirildi!",
        error: null,
        user: req.user,
      });
    } catch (error) {
      console.error("Kategoriya o'chirishda xato:", error);
      const subscriptions = await DB.getAllSubscriptions();
      res.render("subscriptions", {
        subscriptions,
        success: null,
        error: "Kategoriya o'chirishda xatolik!",
        user: req.user,
      });
    }
  }
);

// ========== SETTINGS ==========

router.get("/settings", authenticateToken, async (req, res) => {
  try {
    const discountText = await DB.getSettingBoth("discount_text");
    const paymentText = await DB.getSettingBoth("payment_text");

    res.render("settings", {
      discountTextLatin: discountText?.latin || "",
      discountTextCyrillic: discountText?.cyrillic || "",
      paymentTextLatin: paymentText?.latin || "",
      paymentTextCyrillic: paymentText?.cyrillic || "",
      success: null,
      error: null,
      user: req.user,
    });
  } catch (error) {
    console.error("Sozlamalar olishda xato:", error);
    res.status(500).send("Xatolik yuz berdi");
  }
});

router.post("/settings/update", authenticateToken, async (req, res) => {
  const {
    discount_text_latin,
    discount_text_cyrillic,
    payment_text_latin,
    payment_text_cyrillic,
  } = req.body;

  try {
    await DB.updateSetting(
      "discount_text",
      discount_text_latin,
      discount_text_cyrillic
    );
    await DB.updateSetting(
      "payment_text",
      payment_text_latin,
      payment_text_cyrillic
    );

    const discountText = await DB.getSettingBoth("discount_text");
    const paymentText = await DB.getSettingBoth("payment_text");

    res.render("settings", {
      discountTextLatin: discountText?.latin || "",
      discountTextCyrillic: discountText?.cyrillic || "",
      paymentTextLatin: paymentText?.latin || "",
      paymentTextCyrillic: paymentText?.cyrillic || "",
      success: "Sozlamalar yangilandi!",
      error: null,
      user: req.user,
    });
  } catch (error) {
    console.error("Sozlamalarni yangilashda xato:", error);
    const discountText = await DB.getSettingBoth("discount_text");
    const paymentText = await DB.getSettingBoth("payment_text");

    res.render("settings", {
      discountTextLatin: discountText?.latin || "",
      discountTextCyrillic: discountText?.cyrillic || "",
      paymentTextLatin: paymentText?.latin || "",
      paymentTextCyrillic: paymentText?.cyrillic || "",
      success: null,
      error: "Sozlamalarni yangilashda xatolik!",
      user: req.user,
    });
  }
});

// ========== BROADCAST ==========

router.get("/broadcast", authenticateToken, async (req, res) => {
  try {
    const subscriptions = await DB.getAllSubscriptions();
    res.render("broadcast", {
      subscriptions,
      success: null,
      error: null,
      user: req.user,
    });
  } catch (error) {
    console.error("Broadcast sahifasi xatosi:", error);
    res.status(500).send("Xatolik yuz berdi");
  }
});

router.post("/broadcast/send", authenticateToken, async (req, res) => {
  const {
    message_latin,
    message_cyrillic,
    subscription,
    button_text,
    button_url,
  } = req.body;

  try {
    let users;

    if (subscription === "all") {
      users = await DB.getAllUsers();
    } else {
      users = await DB.getUsersBySubscription(subscription);
    }

    if (!users || users.length === 0) {
      const subscriptions = await DB.getAllSubscriptions();
      return res.render("broadcast", {
        subscriptions,
        success: null,
        error: "Foydalanuvchilar topilmadi!",
        user: req.user,
      });
    }

    const userBot = req.app.locals.userBot;
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        // User tiliga qarab xabar tanlash
        const message =
          user.language === "uz_latin" ? message_latin : message_cyrillic;

        const keyboard =
          button_text && button_url
            ? {
                reply_markup: {
                  inline_keyboard: [[{ text: button_text, url: button_url }]],
                },
              }
            : {};

        await userBot.telegram.sendMessage(user.user_id, message, {
          parse_mode: "Markdown",
          ...keyboard,
        });

        successCount++;
      } catch (error) {
        console.error(`User ${user.user_id} ga yuborishda xato:`, error);
        failCount++;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const subscriptions = await DB.getAllSubscriptions();
    res.render("broadcast", {
      subscriptions,
      success: `✅ ${successCount} ta userga yuborildi! ❌ ${failCount} ta xatolik.`,
      error: null,
      user: req.user,
    });
  } catch (error) {
    console.error("Broadcast yuborishda xato:", error);
    const subscriptions = await DB.getAllSubscriptions();
    res.render("broadcast", {
      subscriptions,
      success: null,
      error: "Broadcast yuborishda xatolik!",
      user: req.user,
    });
  }
});

module.exports = router;
