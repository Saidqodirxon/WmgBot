const { Markup } = require("telegraf");
const { Input } = require("telegraf");
const fs = require("fs");
const path = require("path");
const { DB } = require("../../database/db");
const { t } = require("../../locales");

// Markdown belgilarini escape qilish
function escapeMarkdown(text) {
  if (!text) return "";
  return text.toString().replace(/[_*\[\]()~`>#+=|{}.!-]/g, "\\$&");
}

// Asosiy menu
function mainMenu(lang = "uz") {
  return Markup.keyboard([
    [t("menu_news", lang), t("menu_courses", lang)],
    [t("menu_discount", lang), t("menu_payment", lang)],
    [t("menu_subscribe", lang), t("menu_faq", lang)],
    [t("menu_consultation", lang), t("menu_rating", lang)],
  ]).resize();
}

// News handlerlar
let userNewsIndex = {}; // Har bir user uchun current index

async function handleNewsCommand(ctx) {
  const userId = ctx.from.id;
  const user = await DB.getUser(userId);
  const lang = user?.language || "uz_cyrillic";

  const allNews = await DB.getAllNews();

  if (!allNews || allNews.length === 0) {
    return ctx.reply(t("no_news", lang), mainMenu(lang));
  }

  // Userning indexini 0 ga set qilish
  userNewsIndex[userId] = 0;

  const currentNews = allNews[0];
  await sendNewsWithNavigation(ctx, currentNews, 0, allNews.length, lang);
}

async function sendNewsWithNavigation(
  ctx,
  news,
  currentIndex,
  totalCount,
  lang = "uz_cyrillic"
) {
  const title = lang === "uz_latin" ? news.title_latin : news.title_cyrillic;
  const content =
    lang === "uz_latin" ? news.content_latin : news.content_cyrillic;

  const messageText = `📰 *${escapeMarkdown(title)}*\n\n${escapeMarkdown(
    content
  )}\n\n📅 ${new Date(news.created_at).toLocaleDateString("uz-UZ")}`;

  const buttons = [];

  if (currentIndex > 0) {
    buttons.push(
      Markup.button.callback(t("btn_prev", lang), `news_prev_${currentIndex}`)
    );
  }

  if (currentIndex < totalCount - 1) {
    buttons.push(
      Markup.button.callback(t("btn_next", lang), `news_next_${currentIndex}`)
    );
  }

  buttons.push(Markup.button.callback(t("btn_main_menu", lang), "main_menu"));

  const keyboard = Markup.inlineKeyboard(buttons, { columns: 2 });

  if (news.image_url) {
    // Local file path ni to'g'ri formatda yuborish
    const imagePath = path.join(__dirname, "../../public", news.image_url);

    // File mavjudligini tekshirish
    if (fs.existsSync(imagePath)) {
      await ctx.replyWithPhoto(Input.fromLocalFile(imagePath), {
        caption: messageText,
        parse_mode: "Markdown",
        ...keyboard,
      });
    } else {
      // Agar file topilmasa, faqat text yuborish
      await ctx.reply(messageText, {
        parse_mode: "Markdown",
        ...keyboard,
      });
    }
  } else {
    await ctx.reply(messageText, {
      parse_mode: "Markdown",
      ...keyboard,
    });
  }
}

async function handleNewsNavigation(ctx) {
  const userId = ctx.from.id;
  const data = ctx.callbackQuery.data;
  const user = await DB.getUser(userId);
  const lang = user?.language || "uz_cyrillic";

  const allNews = await DB.getAllNews();

  if (!allNews || allNews.length === 0) {
    return ctx.answerCbQuery(t("no_news", lang));
  }

  let currentIndex = userNewsIndex[userId] || 0;

  if (data.includes("news_next")) {
    currentIndex++;
  } else if (data.includes("news_prev")) {
    currentIndex--;
  }

  // Index chegaralarini tekshirish
  if (currentIndex < 0) currentIndex = 0;
  if (currentIndex >= allNews.length) currentIndex = allNews.length - 1;

  userNewsIndex[userId] = currentIndex;

  try {
    await ctx.deleteMessage();
  } catch (e) {
    // Ignore
  }

  await sendNewsWithNavigation(
    ctx,
    allNews[currentIndex],
    currentIndex,
    allNews.length,
    lang
  );
  await ctx.answerCbQuery();
}

// Kurslar handler
async function handleCoursesCommand(ctx) {
  const userId = ctx.from.id;
  const user = await DB.getUser(userId);
  const lang = user?.language || "uz_cyrillic";

  const keyboard = Markup.inlineKeyboard([
    Markup.button.webApp(t("courses_view", lang), "https://wmg.uz"),
  ]);

  await ctx.reply(
    `${t("courses_title", lang)}\n\n${t("courses_description", lang)}`,
    {
      parse_mode: "Markdown",
      ...keyboard,
    }
  );
}

// Chegirma handler
async function handleDiscountCommand(ctx) {
  const userId = ctx.from.id;
  const user = await DB.getUser(userId);
  const lang = user?.language || "uz_cyrillic";

  const discountText = await DB.getSetting("discount_text");

  await ctx.reply(`${t("menu_discount", lang)}\n\n${discountText}`, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      Markup.button.callback(t("btn_main_menu", lang), "main_menu"),
    ]),
  });
}

// To'lov turlari handler
async function handlePaymentCommand(ctx) {
  const userId = ctx.from.id;
  const user = await DB.getUser(userId);
  const lang = user?.language || "uz_cyrillic";

  const paymentText = await DB.getSetting("payment_text");

  await ctx.reply(`${t("menu_payment", lang)}\n\n${paymentText}`, {
    ...Markup.inlineKeyboard([
      Markup.button.callback(t("btn_main_menu", lang), "main_menu"),
    ]),
  });
}

// Obuna handler
let userSubscriptionState = {}; // Har bir user uchun tanlangan kategoriyalar

async function handleSubscriptionCommand(ctx) {
  const userId = ctx.from.id;
  const user = await DB.getUser(userId);
  const lang = user?.language || "uz_cyrillic";

  const subscriptions = await DB.getAllSubscriptions();

  if (!subscriptions || subscriptions.length === 0) {
    return ctx.reply(t("select_min_one", lang), mainMenu(lang));
  }

  // User ning oldingi tanlovlarini olish
  const currentSubs = await DB.getUserSubscriptions(userId);
  userSubscriptionState[userId] = currentSubs || [];

  const buttons = subscriptions.map((sub) => {
    const subName = sub.name_latin || sub.name;
    const displayName =
      lang === "uz_latin"
        ? sub.name_latin || sub.name
        : sub.name_cyrillic || sub.name;
    return [
      Markup.button.callback(
        `${currentSubs.includes(subName) ? "✅ " : ""}${displayName}`,
        `sub_toggle_${sub._id}_${subName}`
      ),
    ];
  });

  buttons.push([
    Markup.button.callback(t("subscribe_confirm", lang), "sub_confirm"),
    Markup.button.callback(t("btn_main_menu", lang), "main_menu"),
  ]);

  await ctx.reply(
    `${t("subscribe_title", lang)}\n\n${t("subscribe_description", lang)}`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons),
    }
  );
}

async function handleSubscriptionSelection(ctx) {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;
  const user = await DB.getUser(userId);
  const lang = user?.language || "uz_cyrillic";

  if (data === "sub_confirm") {
    // Tasdiqlash
    const selectedSubs = userSubscriptionState[userId] || [];

    if (selectedSubs.length === 0) {
      return ctx.answerCbQuery(t("select_min_one", lang), {
        show_alert: true,
      });
    }

    await DB.updateUserSubscription(userId, selectedSubs);

    await ctx.answerCbQuery(t("subscribe_selected", lang));
    await ctx.editMessageText(
      `${t("subscribe_selected", lang)}\n\n${selectedSubs
        .map((s) => `• ${s}`)
        .join("\n")}\n\n${t("subscribe_notification", lang)}`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback(t("btn_main_menu", lang), "main_menu")],
        ]),
      }
    );

    delete userSubscriptionState[userId];
    return;
  }

  // Toggle subscription
  const parts = data.split("_");
  const subName = parts.slice(3).join("_"); // Handle names with underscores

  if (!userSubscriptionState[userId]) {
    userSubscriptionState[userId] = [];
  }

  const index = userSubscriptionState[userId].indexOf(subName);
  let message = "";

  if (index > -1) {
    // Remove
    userSubscriptionState[userId].splice(index, 1);
    message =
      lang === "uz_latin"
        ? `❌ ${subName} o'chirildi`
        : `❌ ${subName} ўчирилди`;
  } else {
    // Add
    userSubscriptionState[userId].push(subName);
    message =
      lang === "uz_latin" ? `✅ ${subName} tanlandi` : `✅ ${subName} танланди`;
  }

  // Update keyboard
  const subscriptions = await DB.getAllSubscriptions();
  const selectedSubs = userSubscriptionState[userId];

  const buttons = subscriptions.map((sub) => {
    const subName = sub.name_latin || sub.name;
    const displayName =
      lang === "uz_latin"
        ? sub.name_latin || sub.name
        : sub.name_cyrillic || sub.name;
    return [
      Markup.button.callback(
        `${selectedSubs.includes(subName) ? "✅ " : ""}${displayName}`,
        `sub_toggle_${sub._id}_${subName}`
      ),
    ];
  });

  buttons.push([
    Markup.button.callback(t("subscribe_confirm", lang), "sub_confirm"),
    Markup.button.callback(t("btn_main_menu", lang), "main_menu"),
  ]);

  try {
    await ctx.editMessageReplyMarkup({
      inline_keyboard: buttons,
    });
    await ctx.answerCbQuery(message);
  } catch (error) {
    console.error("Keyboard yangilashda xato:", error);
    await ctx.answerCbQuery(message);
  }
}

// FAQ handler
let userFaqIndex = {};

async function handleFaqCommand(ctx) {
  const userId = ctx.from.id;
  const user = await DB.getUser(userId);
  const lang = user?.language || "uz_cyrillic";

  const allFaq = await DB.getAllFaq();

  if (!allFaq || allFaq.length === 0) {
    return ctx.reply(t("no_faq", lang), mainMenu(lang));
  }

  userFaqIndex[userId] = 0;
  await sendFaqWithNavigation(ctx, allFaq[0], 0, allFaq.length, lang);
}

async function sendFaqWithNavigation(
  ctx,
  faq,
  currentIndex,
  totalCount,
  lang = "uz_cyrillic"
) {
  const question =
    lang === "uz_latin" ? faq.question_latin : faq.question_cyrillic;
  const answer = lang === "uz_latin" ? faq.answer_latin : faq.answer_cyrillic;

  const messageText = `${t("faq_question", lang)}\n${escapeMarkdown(
    question
  )}\n\n${t("faq_answer", lang)}\n${escapeMarkdown(answer)}`;

  const buttons = [];

  if (currentIndex < totalCount - 1) {
    buttons.push(
      Markup.button.callback(t("btn_next", lang), `faq_next_${currentIndex}`)
    );
  }

  buttons.push(Markup.button.callback(t("btn_main_menu", lang), "main_menu"));

  await ctx.reply(messageText, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard(buttons, { columns: 1 }),
  });
}

async function handleFaqNavigation(ctx) {
  const userId = ctx.from.id;
  const user = await DB.getUser(userId);
  const lang = user?.language || "uz_cyrillic";

  const allFaq = await DB.getAllFaq();

  if (!allFaq || allFaq.length === 0) {
    return ctx.answerCbQuery(t("no_faq", lang));
  }

  let currentIndex = (userFaqIndex[userId] || 0) + 1;

  if (currentIndex >= allFaq.length) {
    currentIndex = 0; // Cycle back
  }

  userFaqIndex[userId] = currentIndex;

  await sendFaqWithNavigation(
    ctx,
    allFaq[currentIndex],
    currentIndex,
    allFaq.length,
    lang
  );
  await ctx.answerCbQuery();
}

// Reyting handler
async function handleRatingCommand(ctx) {
  const userId = ctx.from.id;
  const user = await DB.getUser(userId);
  const lang = user?.language || "uz_cyrillic";

  const keyboard = Markup.inlineKeyboard([
    Markup.button.webApp(t("rating_view", lang), "https://wmg.uz/scoreboards"),
  ]);

  await ctx.reply(
    `${t("rating_title", lang)}\n\n${t("rating_description", lang)}`,
    {
      parse_mode: "Markdown",
      ...keyboard,
    }
  );
}

// Konsultatsiya handler
let userConsultationMode = {}; // Track which users are in consultation mode

async function handleConsultationCommand(ctx) {
  const userId = ctx.from.id;
  const user = await DB.getUser(userId);
  const lang = user?.language || "uz_cyrillic";

  userConsultationMode[userId] = true;

  await ctx.reply(
    `${t("consultation_title", lang)}\n\n${t("consultation_prompt", lang)}`,
    {
      parse_mode: "Markdown",
      ...Markup.keyboard([[t("cancel_button", lang)]]).resize(),
    }
  );
}

async function handleConsultationMessage(ctx, adminGroupId) {
  const userId = ctx.from.id;
  const user = await DB.getUser(userId);
  const lang = user?.language || "uz_cyrillic";

  if (!userConsultationMode[userId]) {
    return; // Not in consultation mode
  }

  const messageText = ctx.message.text;

  // Check for cancel button in both languages
  if (messageText === t("cancel_button", lang)) {
    delete userConsultationMode[userId];
    return ctx.reply(t("consultation_cancel", lang), mainMenu(lang));
  }

  try {
    // Adminlar guruhiga xabar yuborish
    const userInfo = ctx.from;
    const forwardedMsg = await ctx.telegram.sendMessage(
      adminGroupId,
      `👤 *User:* ${escapeMarkdown(userInfo.first_name)} ${escapeMarkdown(
        userInfo.last_name || ""
      )}\n` +
        `🆔 ID: \`${userId}\`\n` +
        `📱 Username: ${
          userInfo.username ? escapeMarkdown("@" + userInfo.username) : "Yo'q"
        }\n\n` +
        `💬 *Xabar:*\n${escapeMarkdown(messageText)}`,
      { parse_mode: "Markdown" }
    );

    // Chat sessiyasini saqlash
    await DB.saveChatSession(userId, forwardedMsg.message_id);

    // Message thread mapping saqlash (keyingi reply uchun)
    await DB.saveMessageThread(forwardedMsg.message_id, userId, adminGroupId);

    await ctx.reply(t("consultation_sent", lang), mainMenu(lang));
    delete userConsultationMode[userId];
  } catch (error) {
    console.error("Xabar yuborishda xato:", error);
    await ctx.reply(t("error_occurred", lang), mainMenu(lang));
  }
}

// Bosh menuga qaytish
async function handleMainMenuCallback(ctx) {
  const userId = ctx.from.id;
  const user = await DB.getUser(userId);
  const lang = user?.language || "uz_cyrillic";

  await ctx.answerCbQuery();
  try {
    await ctx.deleteMessage();
  } catch (e) {
    // Ignore
  }

  await ctx.reply(t("btn_main_menu", lang), mainMenu(lang));
}

module.exports = {
  mainMenu,
  handleNewsCommand,
  handleNewsNavigation,
  handleCoursesCommand,
  handleDiscountCommand,
  handlePaymentCommand,
  handleSubscriptionCommand,
  handleSubscriptionSelection,
  handleFaqCommand,
  handleFaqNavigation,
  handleRatingCommand,
  handleConsultationCommand,
  handleConsultationMessage,
  handleMainMenuCallback,
  userConsultationMode,
};
