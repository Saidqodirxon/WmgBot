# 🤖 WMG Telegram Bot va Admin Panel

Professional Telegram bot va web admin panel - bitta portda ishlaydi!

## 🚀 Xususiyatlar

### User Bot

- 📰 **News** - Navigatsiya bilan yangiliklar
- 🎓 **Kurslar** - Telegram Web App integratsiyasi
- 💸 **Chegirma** - Dinamik matn
- 💳 **To'lov turlari** - Sozlanadigan text
- 🔔 **Obuna tizimi** - Yo'nalish bo'yicha filtr
- ❓ **FAQ** - Pagination bilan
- 👨‍💼 **Konsultatsiya** - 2 tomonlama chat
- 🏆 **Reyting** - Web link

### Admin Panel

- 🔐 Parol bilan himoyalangan
- 📊 Dashboard va statistika
- 📰 News CRUD
- ❓ FAQ CRUD
- ⚙️ Sozlamalar (chegirma, to'lov)
- 📢 Broadcast (yo'nalish filtri bilan)

## 📦 O'rnatish

### 1. Paketlarni o'rnatish

```bash
npm install
```

### 2. .env faylini sozlash

`.env` faylini oching va quyidagilarni to'ldiring:

```env
# Bot token (BotFather dan oling)
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Admin guruh ID (guruhga bot qo'shing va ID ni oling)
ADMIN_GROUP_ID=-1001234567890

# Server
PORT=3000
SESSION_SECRET=wmg_secret_key_2024

# Admin panel paroli
ADMIN_PASSWORD=admin123
```

### Bot token olish:

1. Telegram da @BotFather ga yozing
2. `/newbot` buyrug'ini yuboring
3. Bot nomi va username kiriting
4. Token ni `.env` ga qo'shing

### Admin guruh ID olish:

1. Telegram da guruh yarating
2. @RawDataBot ni guruhga qo'shing
3. Guruh ID ni ko'chirib `.env` ga qo'shing
4. **Botni guruhga qo'shing va admin qiling**

## 🎯 Ishga tushirish

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

Server ishga tushgach:

- Web panel: `http://localhost:3000/admin/login`
- Default parol: `.env` faylidagi `ADMIN_PASSWORD`

## 📱 Konsultatsiya tizimi

1. User botda "👨‍💼 Konsultatsiya" ni bosadi
2. Xabar yozadi
3. Xabar admin guruhiga keladi
4. Admin guruhda reply qiladi
5. Bot user ga javobni yuboradi
6. User yana reply qilsa, yana admin guruhiga boradi

**Muhim:** Bot admin guruhda bo'lishi va admin huquqiga ega bo'lishi shart!

## 📢 Broadcast

Admin panel orqali:

1. Xabar matni (Markdown)
2. Yo'nalish tanlash (yoki hammaga)
3. Tugma qo'shish (ixtiyoriy)
4. Yuborish

## 🗂️ Struktura

```
/project
 ├── index.js              # Asosiy entry point
 ├── bot/
 │   ├── userBot.js        # Asosiy bot (user + admin funksiyalari)
 │   └── handlers/
 │       └── userHandlers.js
 ├── routes/
 │   └── admin.js          # Admin panel routes
 ├── views/
 │   ├── login.ejs
 │   ├── dashboard.ejs
 │   ├── news.ejs
 │   ├── faq.ejs
 │   ├── broadcast.ejs
 │   ├── settings.ejs
 │   └── partials/
 │       └── header.ejs
 ├── database/
 │   ├── db.js             # SQLite DB
 │   └── database.db       # Auto-generated
 ├── public/
 │   └── css/
 │       └── style.css
 ├── .env
 └── package.json
```

## 🛠️ Texnologiyalar

- **Backend:** Node.js, Express.js
- **Bot:** TelegrafJS (bitta bot)
- **Database:** SQLite
- **Frontend:** EJS
- **HTTP:** Axios (dependency)

## 🔧 Sozlash

### Obuna yo'nalishlari

Database yaratilganda avtomatik qo'shiladi:

- Frontend
- Backend
- Mobile
- Design

Qo'shimcha yo'nalish qo'shish uchun `database/db.js` ni o'zgartiring.

### Admin parol

`.env` faylidagi `ADMIN_PASSWORD` ni o'zgartiring.

## 📝 Eslatmalar

- Bitta bot user va admin funksiyalarni boshqaradi
- Barcha servislar bitta portda ishlaydi
- Bot admin guruhda bo'lishi va admin huquqiga ega bo'lishi kerak
- Database avtomatik yaratiladi
- Session 24 soat davom etadi
- Broadcast rate limiting bor (100ms pause)

## ⚡ Quick Start

```bash
# 1. Clone/Download
# 2. Install
npm install

# 3. Configure .env (bot token va admin guruh ID)
# 4. Botni admin guruhga qo'shing
# 5. Start
npm run dev

# 5. Open browser
http://localhost:3000/admin/login
```

## 🆘 Yordam

Muammo bo'lsa:

1. `.env` faylini tekshiring
2. Bot token to'g'ri ekanligini tasdiqlang
3. Bot admin guruhga qo'shilganligini va admin huquqiga ega ekanligini tekshiring
4. Console log larni ko'ring

## 📄 License

MIT

## 👨‍💻 Muallif

WMG Academy

---

**Muvaffaqiyatli ishlatish! 🎉**
