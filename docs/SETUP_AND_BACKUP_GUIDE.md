# 📘 eCyberCafe Portal - Complete Fresh Setup, Backup & Admin Guide
**(नया शुरुआत, डाटा बैकअप, और सेटिंग्स बदलने की पूरी जानकारी)**

---

## 📌 1. शुरुआत (Overview)

अगर आपने `database.json` डिलीट कर दिया है, तो घबराने की बात नहीं है!  
पोर्टल का सर्वर (`server.ts`) ऐसा बनाया गया है कि अगर `database.json` नहीं मिलता है, तो सर्वर ऑटोमैटिकली डिफ़ॉल्ट डाटा (Fresh Database) जनरेट कर देता है।

इस गाइड में आपको:
1. **Fresh Restart (नया शुरुआत)** कैसे करें।
2. **Data Lost होने से कैसे बचाएं (Backup & Restore)**।
3. **भविष्य में बिना कोड बदले Admin Panel से सेटिंग्स कैसे बदलें**।

---

## 🚀 2. Fresh Restart (बिल्कुल नए सिरे से शुरुआत कैसे करें)

यदि आप पोर्टल को बिल्कुल फ्रेश/क्लीन करना चाहते हैं:

### **Step 1: पुराने डाटा का बैकअप लें (Data Loss से बचने के लिए)**
- Admin Panel में लॉगिन करें।
- **"Database Backup & Export"** टैब पर जाएं।
- **"Download Full Database (JSON)"** बटन पर क्लिक करके अपने कम्प्यूटर या मोबाइल में डाटा सेव कर लें।

### **Step 2: Database File हटाएं**
- प्रोजेक्ट फोल्डर में मौजूद `database.json` और `storage/database.json` को डिलीट करें।

### **Step 3: Server Restart करें**
- Dev Server restart होने पर सर्वर ऑटोमैटिक नया डिफ़ॉल्ट `database.json` क्रिएट कर देगा।

---

## 🔑 3. Default Login Credentials (डिफ़ॉल्ट यूजर लॉगिन)

नया डाटाबेस बनने के बाद ये डिफ़ॉल्ट अकाउंट्स एक्टिव रहेंगे:

| Role (रोल) | Mobile / Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Admin (एडमिन)** | `admin` / `6200687014` | `admin123` | पोर्टल का फुल कंट्रोल |
| **Retailer (रिटेलर)** | `0000000000` | `123456` | Pankaj Kumar (Demo Retailer) |

> ⚠️ **सुरक्षा सलाह:** एडमिन लॉगिन करने के बाद तुरंत एडमिन पासवर्ड बदल लें या नया एडमिन यूजर बना लें।

---

## 🛠️ 4. Admin Dashboard से Portal Settings कैसे बदलें? (बिना कोड छुए)

भविष्य में जब भी आपको नंबर, नाम या रेट बदलना हो, आपको कोड एडिट करने की ज़रूरत नहीं है! आप Admin Panel से सब कुछ बदल सकते हैं:

### **A. पोर्टल का नाम, हेल्पलाइन और WhatsApp सपोर्ट नंबर बदलना:**
1. **Admin Dashboard** में लॉगिन करें।
2. **"Portal Settings"** (पोर्टल सेटिंग्स) टैब खोलें।
3. वहाँ आपको मिलेगा:
   - **Portal Name**: जैसे `eCyberCafe.in` या अपना नया नाम।
   - **Support Helpline Number**: अपना नया कॉलिंग नंबर दर्ज करें।
   - **Support WhatsApp Number**: अपना नया व्हाट्सएप नंबर दर्ज करें।
4. **"Save Portal Settings"** पर क्लिक करें। यह तुरंत पूरे पोर्टल में अपडेट हो जाएगा!

### **B. Payment / QR Code / UPI ID बदलना:**
1. **Admin Dashboard** -> **"Payment Gateway Settings"** पर जाएं।
2. अपना **UPI ID** और **Bank Details** अपडेट करें।
3. नया **QR Code Image** अपलोड करें।

### **C. WhatsApp Notification API (ऑटोमैटिक व्हाट्सएप मैसेज):**
1. **Admin Dashboard** -> **"WhatsApp API Settings"** पर जाएं।
2. अपनी **Instance / Session ID** और **Portal API URL** सेट करें।
3. **"Test Message"** भेजकर चेक करें।

---

## 💾 5. Data Backup & Safety Rules (डाटा कैसे सुरक्षित रखें)

1. **Daily / Weekly Backup**:
   - हफ्ते में एक बार Admin Dashboard से JSON Backup फ़ाइल डाउनलोड कर के अपने पास सुरक्षित रखें।
2. **Active Requests Backup**:
   - यदि कोई सर्विस रिक्वेस्ट Pending/In-Process है, तो Admin Dashboard के **Export Active Requests** विकल्प से सिर्फ एक्टिव ऑर्डर्स का भी बैकअप लिया जा सकता है।
3. **Restore (डाटा वापस लाना)**:
   - अगर कभी गलती से डाटा उड़ जाए या सर्वर रीसेट हो जाए, तो बैकअप की हुई `database.json` फ़ाइल को दोबारा प्रोजेक्ट के रूट (Root) तथा `storage/` फोल्डर में डालकर सर्वर रीस्टार्ट कर दें। आपका पूरा पुराना डाटा वापस आ जाएगा!

---

## 📞 6. Quick Support & Helpdesk

- पोर्टल में रिटेलर्स के लिए **Retailer Support Chat Manager (हेल्पडेस्क)** सेट किया गया है।
- एडमिन सीधे **"💬 Support Chat Manager"** टैब से सभी रिटेलर्स के मैसेजेस का रियल-टाइम जवाब दे सकते हैं।
