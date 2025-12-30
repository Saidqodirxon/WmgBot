const { Telegraf, Markup } = require("telegraf");
const { DB } = require("../database/db");
const { t } = require("../locales");
const {
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
} = require("./handlers/userHandlers");

const {
  handleLanguageSelection,
  handlePhoneNumber,
  handleCourseSelection,
  handleCoursesText,
} = require("./handlers/registrationHandlers");

// Markdown escape helper
function escapeMarkdown(text) {
  if (!text) return "";
  return text.toString().replace(/[_*\[\]()~`>#+=|{}.!-]/g, "\\$&");
}

function createUserBot(token, adminGroupId) {
  const bot = new Telegraf(token);

  // Start komandasi
  bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const userData = {
      username: ctx.from.username,
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name,
    };

    try {
      await DB.upsertUser(userId, userData);

      // Check if registration completed
      const user = await DB.getUser(userId);

      if (!user.registration_completed) {
        // Send a single bilingual greeting with inline language buttons
        const greeting =
          `👋 Assalomu alaykum! — 👋 Салом!\n\n` +
          `🎓 WMG Academy'ga xush kelibsiz! — WMG Academy'га хуш келибсиз!\n\n` +
          `🌐 Тилни танланг:`;

        return await ctx.reply(
          greeting,
          Markup.inlineKeyboard([
            [Markup.button.callback("🇺🇿 Ўзбекча (Кирилл)", "lang_cyrillic")],
            [Markup.button.callback("🇺🇿 O'zbekcha (Lotin)", "lang_latin")],
          ])
        );
      }

      // User already registered, show main menu
      const lang = user.language || "uz";
      await ctx.reply(
        `${t("welcome", lang)}, ${ctx.from.first_name}! 👋\n\n` +
          `🎓 WMG Academy ${
            lang === "uz_latin" ? "botiga xush kelibsiz" : "ботига хуш келибсиз"
          }!`,
        mainMenu(lang)
      );
    } catch (error) {
      console.error("User saqlashda xato:", error);
    }
  });

  // Help komandasi
  bot.help(async (ctx) => {
    const userId = ctx.from.id;
    const user = await DB.getUser(userId);
    const lang = user?.language || "uz_cyrillic";

    ctx.reply(
      lang === "uz_latin"
        ? "📚 *Yordam*\n\n" +
            "Bot funksiyalari:\n\n" +
            "📰 Yangiliklar - Eng so'ngi yangiliklar\n" +
            "🎓 Kurslar - Kurslar haqida ma'lumot\n" +
            "💸 Chegirma - Chegirma bilan olish\n" +
            "💳 To'lov - To'lov turlari\n" +
            "🔔 Obuna - Yo'nalish tanlash\n" +
            "❓ FAQ - Tez-tez beriladigan savollar\n" +
            "👨‍💼 Konsultatsiya - Savol berish\n" +
            "🏆 Reyting - Top o'quvchilar\n\n" +
            "/start - Botni qayta ishga tushirish"
        : "📚 *Ёрдам*\n\n" +
            "Бот функциялари:\n\n" +
            "📰 Янгиликлар - Енг сўнгги янгиликлар\n" +
            "🎓 Курслар - Курслар ҳақида маълумот\n" +
            "💸 Чегирма - Чегирма билан олиш\n" +
            "💳 Тўлов - Тўлов турлари\n" +
            "🔔 Обуна - Ёўналиш танлаш\n" +
            "❓ FAQ - Тез-тез бериладиган саволлар\n" +
            "👨‍💼 Консултация - Савол бериш\n" +
            "🏆 Рейтинг - Топ ўқувчилар\n\n" +
            "/start - Ботни қайта ишга тушириш",
      { parse_mode: "Markdown", ...mainMenu(lang) }
    );
  });

  // Keyboard button handlers (multi-language: Lotin va Kirill)
  bot.hears([/📰.*[Yy]angilik/, /Янгилик/], handleNewsCommand);
  bot.hears([/🎓.*[Kk]urs/, /Курс/], handleCoursesCommand);
  bot.hears([/💸.*[Cc]hegirma/, /Чегирма/], handleDiscountCommand);
  bot.hears([/💳.*[Tt]o'lov/, /Тўлов/], handlePaymentCommand);
  bot.hears([/🔔.*[Oo]buna/, /Обуна/], handleSubscriptionCommand);
  bot.hears([/❓.*FAQ/], handleFaqCommand);
  bot.hears([/🏆.*[Rr]eyting/, /Рейтинг/], handleRatingCommand);
  bot.hears([/👨‍💼.*[Kk]onsultatsiya/, /Консултация/], handleConsultationCommand);

  // Callback query handlers
  bot.action(/news_(prev|next)_\d+/, handleNewsNavigation);
  bot.action(/sub_toggle_[a-f0-9]+_.+/, handleSubscriptionSelection);
  bot.action("sub_confirm", handleSubscriptionSelection);
  bot.action(/faq_next_\d+/, handleFaqNavigation);
  bot.action("main_menu", handleMainMenuCallback);

  // Registration handlers
  bot.action(/lang_(cyrillic|latin)/, handleLanguageSelection);
  bot.action(/reg_course_[a-f0-9]+_.+/, handleCourseSelection);
  bot.action("reg_courses_confirm", handleCourseSelection);

  // Contact handler for phone number
  bot.on("contact", handlePhoneNumber);

  // Admin guruhdan reply larni va konsultatsiya xabarlarini handle qilish
  bot.on("message", async (ctx) => {
    // Check if this is during registration course selection
    const handled = await handleCoursesText(ctx);
    if (handled) return;

    // 1. Admin guruhda reply qilingan xabarlarga javob berish
    if (
      ctx.chat.id.toString() === adminGroupId &&
      ctx.message.reply_to_message
    ) {
      const replyToMessageId = ctx.message.reply_to_message.message_id;

      try {
        // Message ID orqali userni topish
        const messageThread = await DB.findUserByMessageId(replyToMessageId);

        if (!messageThread) {
          return ctx.reply("❌ Bu xabar uchun user topilmadi.");
        }

        const userId = messageThread.user_id;

        // Message type bo'yicha javob yuborish
        let sentMessage;
        if (ctx.message.text) {
          // Text xabar - escape markdown characters
          sentMessage = await bot.telegram.sendMessage(
            userId,
            `👨‍💼 *Admin javobi:*\n\n${escapeMarkdown(ctx.message.text)}`,
            { parse_mode: "Markdown" }
          );
        } else if (ctx.message.photo) {
          // Rasm
          const photo = ctx.message.photo[ctx.message.photo.length - 1];
          sentMessage = await bot.telegram.sendPhoto(userId, photo.file_id, {
            caption: ctx.message.caption
              ? `👨‍💼 *Admin javobi:*\n\n${escapeMarkdown(ctx.message.caption)}`
              : "👨‍💼 Admin dan rasm",
            parse_mode: "Markdown",
          });
        } else if (ctx.message.video) {
          // Video
          sentMessage = await bot.telegram.sendVideo(
            userId,
            ctx.message.video.file_id,
            {
              caption: ctx.message.caption
                ? `👨‍💼 *Admin javobi:*\n\n${escapeMarkdown(ctx.message.caption)}`
                : "👨‍💼 Admin dan video",
              parse_mode: "Markdown",
            }
          );
        } else if (ctx.message.document) {
          // File/Document
          sentMessage = await bot.telegram.sendDocument(
            userId,
            ctx.message.document.file_id,
            {
              caption: ctx.message.caption
                ? `👨‍💼 *Admin javobi:*\n\n${ctx.message.caption}`
                : "👨‍💼 Admin dan fayl",
              parse_mode: "Markdown",
            }
          );
        } else if (ctx.message.voice) {
          // Voice
          sentMessage = await bot.telegram.sendVoice(
            userId,
            ctx.message.voice.file_id,
            {
              caption: "👨‍💼 Admin dan ovozli xabar",
            }
          );
        } else if (ctx.message.audio) {
          // Audio
          sentMessage = await bot.telegram.sendAudio(
            userId,
            ctx.message.audio.file_id,
            {
              caption: ctx.message.caption
                ? `👨‍💼 *Admin javobi:*\n\n${escapeMarkdown(ctx.message.caption)}`
                : "👨‍💼 Admin dan audio",
              parse_mode: "Markdown",
            }
          );
        } else if (ctx.message.sticker) {
          // Sticker
          sentMessage = await bot.telegram.sendSticker(
            userId,
            ctx.message.sticker.file_id
          );
        } else {
          return ctx.reply("❌ Bu xabar turi qo'llab-quvvatlanmaydi.");
        }

        // Admin javob message_id ni ham saqlash (keyingi reply uchun)
        await DB.saveMessageThread(ctx.message.message_id, userId, ctx.chat.id);

        // User ga yuborilgan xabar ID ni ham saqlash (user reply qilsa kerak bo'ladi)
        if (sentMessage) {
          await DB.saveMessageThread(
            sentMessage.message_id,
            userId,
            adminGroupId
          );
        }

        await ctx.reply("✅ Javob yuborildi!");
      } catch (error) {
        console.error("Admin javob yuborishda xato:", error);
        await ctx.reply("❌ Xatolik yuz berdi: " + error.message);
      }
      return;
    }

    // 2. User admin javobiga reply qilsa - admin guruhga yuborish
    const userId = ctx.from?.id;
    if (userId && ctx.message.reply_to_message && ctx.chat.type === "private") {
      const replyToMessageId = ctx.message.reply_to_message.message_id;

      try {
        // User reply qilgan xabar admin javobimi?
        const messageThread = await DB.findUserByMessageId(replyToMessageId);

        if (messageThread && messageThread.user_id === userId) {
          // Bu admin javobi edi, user yana reply qilmoqda
          const userInfo = ctx.from;

          // Chat session dan original thread topish
          const session = await DB.getChatSession(userId);

          if (session && session.thread_id) {
            // Admin guruhga reply sifatida yuborish
            const forwardedMsg = await bot.telegram.sendMessage(
              adminGroupId,
              `👤 *User:* ${escapeMarkdown(
                userInfo.first_name
              )} ${escapeMarkdown(userInfo.last_name || "")}\n` +
                `🆔 ID: \`${userId}\`\n` +
                `📱 Username: ${
                  userInfo.username
                    ? escapeMarkdown("@" + userInfo.username)
                    : "Yo'q"
                }\n\n` +
                `💬 *Xabar:*\n${escapeMarkdown(
                  ctx.message.text || "[Media fayl]"
                )}`,
              {
                parse_mode: "Markdown",
                reply_to_message_id: session.thread_id,
              }
            );

            // Yangi message thread mapping saqlash
            await DB.saveMessageThread(
              forwardedMsg.message_id,
              userId,
              adminGroupId
            );

            await ctx.reply(
              "✅ Xabaringiz yuborildi! Tez orada javob beramiz."
            );
            return;
          }
        }
      } catch (error) {
        console.error("User reply handle qilishda xato:", error);
      }
    }

    // 3. Oddiy userlar uchun konsultatsiya xabarlarini handle qilish
    if (userId && userConsultationMode[userId] && ctx.message.text) {
      await handleConsultationMessage(ctx, adminGroupId);
    }
  });

  // Error handler
  bot.catch((err, ctx) => {
    console.error("Bot xatosi:", err);
    ctx.reply("❌ Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
  });

  return bot;
}

module.exports = { createUserBot };
