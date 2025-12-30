const { Markup } = require("telegraf");
const { DB } = require("../../database/db");
const { t } = require("../../locales");

// Markdown escape helper
function escapeMarkdown(text) {
  if (!text) return "";
  return text.toString().replace(/[_*\[\]()~`>#+=|{}.!-]/g, "\\$&");
}

// Simple sanitizer for course names: remove unusual punctuation, collapse spaces
function sanitizeCourse(text) {
  if (!text) return "";
  return text
    .toString()
    .replace(/[^\p{L}\p{N}\s\-,.]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// User registration state
const userRegistrationState = {};

// Step 1: Language selection
async function handleLanguageSelection(ctx) {
  const userId = ctx.from.id;
  const data = ctx.callbackQuery?.data;

  if (data) {
    const lang = data.split("_")[1]; // lang_cyrillic or lang_latin

    await DB.updateUserLanguage(userId, `uz_${lang}`);
    userRegistrationState[userId] = { step: "phone", language: `uz_${lang}` };

    await ctx.answerCbQuery(t("language_selected", `uz_${lang}`));

    // Delete old message and send new one with contact button
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Ignore if can't delete
    }

    await ctx.reply(t("share_phone", `uz_${lang}`), {
      ...Markup.keyboard([
        [Markup.button.contactRequest(t("phone_button", `uz_${lang}`))],
      ]).resize(),
    });
  } else {
    // Show language selection (explicit bilingual prompt)
    await ctx.reply("🌐 Тилни танланг:", {
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🇺🇿 Ўзбекча (Кирилл)", "lang_cyrillic")],
        [Markup.button.callback("🇺🇿 O'zbekcha (Lotin)", "lang_latin")],
      ]),
    });
  }
}

// Step 2: Phone number
async function handlePhoneNumber(ctx) {
  const userId = ctx.from.id;
  const state = userRegistrationState[userId];

  if (!state || state.step !== "phone") return;

  const phone = ctx.message.contact?.phone_number;
  if (!phone) {
    return ctx.reply(t("share_phone", state.language));
  }

  await DB.updateUserPhone(userId, phone);
  state.step = "courses";
  // Get all subscriptions (courses)
  const subscriptions = await DB.getAllSubscriptions();

  const courseList = subscriptions
    .map((sub, index) => {
      const displayName =
        state.language === "uz_latin"
          ? sub.name_latin || sub.name
          : sub.name_cyrillic || sub.name;
      return `${index + 1}. ${displayName}`;
    })
    .join("\n");

  const message =
    state.language === "uz_latin"
      ? `${t(
          "phone_received",
          state.language
        )}\n\nQiziqtirgan yo'nalishlarni vergul bilan ajratib yozing:\nMasalan: Frontend, Backend`
      : `${t(
          "phone_received",
          state.language
        )}\n\nҚизиқтирган йўналишларни вергул билан ажратиб ёзинг:\nМасалан: Фронтенд, Бэкенд`;

  // Inline skip button (user can press to skip entering courses)
  const skipLabel =
    state.language === "uz_latin" ? "O'tkazib yuborish" : "Ўтказиб юбориш";

  await ctx.reply(
    message,
    Markup.inlineKeyboard([[Markup.button.callback(skipLabel, "reg_skip")]])
  );
}

// Step 3: Course text input handler
async function handleCoursesText(ctx) {
  const userId = ctx.from.id;
  const state = userRegistrationState[userId];

  if (!state || state.step !== "courses") return false;

  const text = ctx.message.text.trim();

  // Check if user wants to finish
  if (text.toLowerCase() === "tugatish" || text.toLowerCase() === "тугатиш") {
    // Complete without courses
    await DB.completeRegistration(userId);

    // Send to admin group
    const user = await DB.getUser(userId);
    const adminGroupId = process.env.ADMIN_GROUP_ID;

    try {
      const langText =
        user.language === "uz_cyrillic"
          ? "Ўзбекча (Кирилл)"
          : "O'zbekcha (Lotin)";
      await ctx.telegram.sendMessage(
        adminGroupId,
        `🎉 *Янги фойдаланувчи рўйхатдан ўтди!*\n\n` +
          `👤 Исм: ${escapeMarkdown(user.first_name)} ${escapeMarkdown(
            user.last_name || ""
          )}\n` +
          `🆔 ID: \`${userId}\`\n` +
          `📱 Телефон: ${escapeMarkdown(user.phone)}\n` +
          `🌐 Тил: ${langText}\n` +
          `🎓 Қизиқтирган курслар: Йўқ`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Admin guruhga xabar yuborishda xato:", error);
    }

    const { mainMenu } = require("./userHandlers");

    await ctx.reply(t("registration_complete", state.language), {
      parse_mode: "Markdown",
      ...mainMenu(state.language),
    });

    delete userRegistrationState[userId];
    return true;
  }

  // Parse entered courses
  // Parse and sanitize entered courses (accept any text)
  const enteredCourses = text
    .split(/,|;/)
    .map((c) => sanitizeCourse(c))
    .filter((c) => c);

  // If user entered nothing meaningful, keep an empty array
  const subscriptions = await DB.getAllSubscriptions();

  // Try to match known subscriptions, but if none matched we'll save raw entered text
  const matched = [];
  for (const course of enteredCourses) {
    const courseLower = course.toLowerCase();
    const found = subscriptions.find(
      (sub) =>
        (sub.name_latin &&
          sub.name_latin.toLowerCase().includes(courseLower)) ||
        (sub.name_cyrillic &&
          sub.name_cyrillic.toLowerCase().includes(courseLower)) ||
        (sub.name && sub.name.toLowerCase().includes(courseLower))
    );
    if (found) matched.push(found.name_latin || found.name);
  }

  const finalCourses = matched.length > 0 ? matched : enteredCourses;

  // Save (may be empty array)
  await DB.updateUserCourses(userId, finalCourses);
  await DB.updateUserSubscription(userId, finalCourses);
  await DB.completeRegistration(userId);

  // Send to admin group
  const user = await DB.getUser(userId);
  const adminGroupId = process.env.ADMIN_GROUP_ID;

  try {
    const langText =
      user.language === "uz_cyrillic"
        ? "Ўзбекча (Кирилл)"
        : "O'zbekcha (Lotin)";
    const coursesText =
      finalCourses && finalCourses.length > 0
        ? finalCourses.map((c) => escapeMarkdown(c)).join(", ")
        : "Йўқ";

    await ctx.telegram.sendMessage(
      adminGroupId,
      `🎉 *Янги фойдаланувчи рўйхатдан ўтди!*\n\n` +
        `👤 Исм: ${escapeMarkdown(user.first_name)} ${escapeMarkdown(
          user.last_name || ""
        )}\n` +
        `🆔 ID: \`${userId}\`\n` +
        `📱 Телефон: ${escapeMarkdown(user.phone)}\n` +
        `🌐 Тил: ${langText}\n` +
        `🎓 Қизиқтирган курслар: ${coursesText}`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Admin guruhga xabar yuborishda xato:", error);
  }

  const { mainMenu } = require("./userHandlers");

  await ctx.reply(t("registration_complete", state.language), {
    parse_mode: "Markdown",
    ...mainMenu(state.language),
  });

  delete userRegistrationState[userId];
  return true;
}

// Step 3: Course selection (old callback handler - remove later)
async function handleCourseSelection(ctx) {
  const userId = ctx.from.id;
  const data = ctx.callbackQuery.data;
  const state = userRegistrationState[userId];

  if (!state || state.step !== "courses") return;

  // If user pressed skip button from the phone message
  if (data === "reg_skip") {
    await DB.completeRegistration(userId);

    // Send to admin group
    const user = await DB.getUser(userId);
    const adminGroupId = process.env.ADMIN_GROUP_ID;

    try {
      const langText =
        user.language === "uz_cyrillic"
          ? "Ўзбекча (Кирилл)"
          : "O'zbekcha (Lotin)";
      await ctx.telegram.sendMessage(
        adminGroupId,
        `🎉 *Янги фойдаланувчи рўйхатдан ўтди!*\n\n` +
          `👤 Исм: ${escapeMarkdown(user.first_name)} ${escapeMarkdown(
            user.last_name || ""
          )}\n` +
          `🆔 ID: \`${userId}\`\n` +
          `📱 Телефон: ${escapeMarkdown(user.phone)}\n` +
          `🌐 Тил: ${langText}\n` +
          `🎓 Қизиқтирган курслар: Йўқ`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Admin guruhga xabar yuborishda xato:", error);
    }

    await ctx.answerCbQuery();

    const { mainMenu } = require("./userHandlers");

    try {
      await ctx.deleteMessage();
    } catch (e) {}

    await ctx.reply(t("registration_complete", state.language), {
      parse_mode: "Markdown",
      ...mainMenu(state.language),
    });

    delete userRegistrationState[userId];
    return;
  }

  if (data === "reg_courses_confirm") {
    const selectedCourses = state.selectedCourses || [];

    if (selectedCourses.length === 0) {
      return ctx.answerCbQuery(t("select_min_one", state.language), {
        show_alert: true,
      });
    }

    // Save courses and complete registration
    await DB.updateUserCourses(userId, selectedCourses);
    await DB.updateUserSubscription(userId, selectedCourses);
    await DB.completeRegistration(userId);

    // Send to admin group
    const user = await DB.getUser(userId);
    const adminGroupId = process.env.ADMIN_GROUP_ID;

    try {
      const langText =
        user.language === "uz_cyrillic"
          ? "Ўзбекча (Кирилл)"
          : "O'zbekcha (Lotin)";
      await ctx.telegram.sendMessage(
        adminGroupId,
        `🎉 *Янги фойдаланувчи рўйхатдан ўтди!*\n\n` +
          `👤 Исм: ${escapeMarkdown(user.first_name)} ${escapeMarkdown(
            user.last_name || ""
          )}\n` +
          `🆔 ID: \`${userId}\`\n` +
          `📱 Телефон: ${escapeMarkdown(user.phone)}\n` +
          `🌐 Тил: ${langText}\n` +
          `🎓 Қизиқтирган курслар: ${selectedCourses
            .map((c) => escapeMarkdown(c))
            .join(", ")}`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Admin guruhga xabar yuborishda xato:", error);
    }

    await ctx.answerCbQuery(t("courses_selected", state.language));

    const { mainMenu } = require("./userHandlers");

    // Delete message and send new one with regular keyboard
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Ignore
    }

    await ctx.reply(t("registration_complete", state.language), {
      parse_mode: "Markdown",
      ...mainMenu(state.language),
    });

    delete userRegistrationState[userId];
    return;
  }

  // Toggle course selection
  const parts = data.split("_");
  const courseName = parts.slice(3).join("_");

  if (!state.selectedCourses) {
    state.selectedCourses = [];
  }

  const index = state.selectedCourses.indexOf(courseName);
  if (index > -1) {
    state.selectedCourses.splice(index, 1);
  } else {
    state.selectedCourses.push(courseName);
  }

  // Update keyboard
  const subscriptions = await DB.getAllSubscriptions();
  const buttons = subscriptions.map((sub) => {
    const subName = sub.name_latin || sub.name;
    const displayName =
      state.language === "uz_latin"
        ? sub.name_latin || sub.name
        : sub.name_cyrillic || sub.name;
    return [
      Markup.button.callback(
        `${state.selectedCourses.includes(subName) ? "✅ " : ""}${displayName}`,
        `reg_course_${sub._id}_${subName}`
      ),
    ];
  });

  buttons.push([
    Markup.button.callback(
      t("subscribe_confirm", state.language),
      "reg_courses_confirm"
    ),
  ]);

  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: buttons });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("Keyboard yangilashda xato:", error);
  }
}

module.exports = {
  handleLanguageSelection,
  handlePhoneNumber,
  handleCourseSelection,
  handleCoursesText,
  userRegistrationState,
};
