# AdPlatform 🚀
> **نظام إدارة وتوزيع إعلانات مفتوح المصدر وخفيف، بديل لـ WP Kads مع دعم كامل لـ PostgreSQL والنشر على Coolify.**
> **High-performance ad management system & WordPress WP Kads replacement with native PostgreSQL database and Coolify deployment.**

---

## 🚀 Coolify Deployment Guide (دليل النشر على Coolify)

### 🇲🇦 خطوات النشر على Coolify (بالدارجة / بالعربية)

يمكنك نشر **AdPlatform** على خادم VPS الخاص بك باستخدام لوحة **Coolify** في دقيقتين:

#### 1. إنشاء قاعدة بيانات PostgreSQL
1. في لوحة تحكم Coolify، اضغط على **+ New Resource**.
2. اختر **Databases** > **PostgreSQL**.
3. حدد اسم قاعدة البيانات (مثلاً `adplatform_db`) واضغط **Start**.

#### 2. نشر تطبيق AdPlatform
1. اضغط على **+ New Resource** > **Application**.
2. اختر **Public Repository** أو **Private Repository**، وضع رابط المشروع الخاص بك.
3. في إعدادات التطبيق (Build Pack):
   - اختر **Dockerfile** أو **Nixpacks**.
   - تأكد من تعيين المنفذ (Port) إلى `3000`.

#### 3. إعداد متغيرات البيئة (Environment Variables)
في تبويب **Environment Variables** داخل التطبيق في Coolify، أضف التالي:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@adplatform_db:5432/adplatform_db
JWT_SECRET=your_super_secret_key_minimum_32_characters_random
```

> **ملاحظة:** السيرفر يقوم بإنشاء الجداول والفهارس تلقائياً (**Auto-Migration**) عند التشغيل الأول بدون الحاجة لتشغيل أي أوامر SQL يدوية!

#### 4. تفعيل النطاق وشهادة SSL
- ضع الدومين الخاص بك (مثلاً `ads.yourdomain.com`) في خانة **Domains** داخل Coolify.
- سيقوم Coolify بتوليد شهادة SSL (Let's Encrypt) مجاناً وبشكل تلقائي.

---

### 🇬🇧 English Coolify Deployment Steps

#### Step 1: Create a PostgreSQL Database in Coolify
1. In your Coolify dashboard, navigate to your Project/Environment.
2. Click **+ New Resource** > **Databases** > **PostgreSQL**.
3. Set the database name (e.g. `adplatform_db`) and start the container.

#### Step 2: Add AdPlatform Application
1. Click **+ New Resource** > **Application** > **Git Repository**.
2. Select your repository.
3. Configure Build Pack as **Dockerfile** (Port `3000`).

#### Step 3: Configure Environment Variables
Add the following in the **Environment Variables** tab:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:PASSWORD@postgresql:5432/adplatform_db
JWT_SECRET=your_32_character_random_jwt_secret_key
```

*AdPlatform runs automatic schema migrations on startup.*

#### Step 4: Deploy & Attach Custom Domain
1. Enter your custom domain in the **Domains** field (e.g., `https://ads.example.com`).
2. Click **Deploy**. Coolify provisions the SSL certificate automatically.

---

## 🛠️ Local Running with Docker Compose

```bash
# 1. Clone repository
git clone <repo-url>
cd adplatform

# 2. Run application + PostgreSQL with one command
docker compose up -d

# 3. Open Admin Dashboard
http://localhost:3000
```

Default Admin Credentials:
- **Email**: `admin@adplatform.local`
- **Password**: `admin123`

---

## 🔌 WordPress Integration (WP Kads Bridge)

1. Download `wp-kads-bridge.php` directly from the **WordPress Bridge** tab in the admin dashboard.
2. Upload it to `wp-content/plugins/wp-kads-bridge.php`.
3. Activate the plugin in WordPress Admin.
4. Set your AdPlatform server URL under **Settings > AdPlatform (WP Kads)**.
5. All legacy `[WP_KADS id=1]` shortcodes in your existing posts will automatically render without modifying any content.

---

## 🌐 Embed Tag & Snippets

### Header Tag
```html
<script src="https://your-adplatform.com/adslot.js" data-platform-key="pk_YOUR_KEY" async></script>
```

### HTML Placement
```html
<div data-ad-slot="slot_abc123"></div>
```

---

## 📄 License
Released under the **MIT License**. Free for personal and commercial use.
