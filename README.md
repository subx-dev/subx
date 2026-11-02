# subx >_ | Developer Portfolio

<div align="center">

![subx logo](https://img.shields.io/badge/subx-%3E__-8A2BE2?style=for-the-badge&labelColor=06050f)
![Arabic RTL](https://img.shields.io/badge/Arabic-RTL%20Support-c084fc?style=for-the-badge)
![Three.js](https://img.shields.io/badge/Three.js-WebGL%203D-9b51e0?style=for-the-badge)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Ready-22c55e?style=for-the-badge)

**بوابة المطور — موقع احترافي باللغة العربية مع رسوميات ثلاثية الأبعاد**

</div>

---

## 🚀 المميزات

- **🌐 RTL كامل** — `dir="rtl"` + خط Cairo العربي
- **🎮 WebGL تفاعلي** — جسيمات ثلاثية الأبعاد تستجيب للماوس والنقر والتمرير (Three.js)
- **📦 تحميل ديناميكي** — التطبيقات تُحمَّل من `update/apps.json`
- **🔮 Glassmorphism** — بطاقات زجاجية مضيئة بتأثيرات Neon
- **⚡ أداء عالي** — CSS Variables، IntersectionObserver، Shader material

---

## 📁 هيكل الملفات

```
subx/
├── index.html          # الصفحة الرئيسية (RTL + Arabic + CDN links)
├── style.css           # التصميم المتقدم (Glassmorphism + Cyberpunk)
├── main.js             # Three.js WebGL + منطق التحميل الديناميكي
├── update/
│   └── apps.json       # ← عدّل هذا الملف لإضافة تطبيقاتك
└── README.md
```

---

## ✏️ إضافة تطبيق جديد

عدّل `update/apps.json` فقط — لا تحتاج لمس الكود الأساسي:

```json
{
  "id": 7,
  "name": "اسم تطبيقك",
  "description": "وصف قصير للتطبيق باللغة العربية",
  "icon": "🔥",
  "category": "أدوات",
  "version": "1.0.0",
  "downloads": "١,٠٠٠",
  "stars": 4.8,
  "badge": "جديد",
  "badgeColor": "#8A2BE2",
  "link": "https://github.com/yourrepo",
  "downloadLink": "https://github.com/yourrepo/releases",
  "tags": ["تاغ١", "تاغ٢"],
  "gradient": "linear-gradient(135deg, #8A2BE2, #c084fc)"
}
```

---

## 🌐 النشر على GitHub Pages

```bash
git init
git add .
git commit -m "init: subx portfolio"
git remote add origin https://github.com/USERNAME/subx.git
git push -u origin main
```

ثم في **Settings → Pages → Source**: اختر `main` branch → `/root`.

> **ملاحظة:** يجب أن يعمل الموقع من خادم (localhost أو GitHub Pages) بسبب `fetch()`.
> لا يعمل بفتح `index.html` مباشرة كملف محلي.

---

## 🎨 الألوان والتصميم

| المتغير | القيمة | الوصف |
|---------|--------|-------|
| `--clr-primary` | `#8A2BE2` | البنفسجي الأساسي |
| `--clr-secondary` | `#9b51e0` | بنفسجي ثانوي |
| `--clr-accent` | `#c084fc` | لهجة مضيئة |
| `--clr-bright` | `#e879f9` | وردي مضيء |
| `--clr-bg` | `#06050f` | خلفية داكنة |

---

<div align="center">

صُنع بـ ❤️ بواسطة **subx >_**

</div>
