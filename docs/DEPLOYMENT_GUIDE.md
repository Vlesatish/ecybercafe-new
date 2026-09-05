# 🚀 eCyberCafe Portal - Complete VPS Deployment, Fresh Setup & Admin Guide

*(VPS सर्वर सेटअप, डोमेन लिंक, SSL सर्टिफिकेट, फ्रेश डेटाबेस रीस्टार्ट, डेटा बैकअप और एडमिन सेटिंग्स की पूरी गाइड)*

---

## ⚡ 0. समस्या समाधान (TROUBLESHOOTING: अगर साइट पर Design / CSS नहीं दिख रहा)

अगर आपकी वेबसाइट अपलोड/डिप्लॉय करने के बाद **बिना CSS / बिना डिज़ाइन के सिर्फ सिंपल टेक्स्ट (Plain HTML)** दिख रही है, तो इसका मतलब है कि VPS पर **`npm run build`** कमांड नहीं चलाई गई है या `PM2` पुराने कोड को चला रहा है।

### 🛠️ इसको सही करने के लिए अपने VPS Terminal में ये 3 कमांड चलाएं:

```bash
# 1. अपने प्रोजेक्ट फोल्डर में जाएं
cd /var/www/ecybercafe

# 2. प्रोजेक्ट का नया बिल्ड (Build CSS & JS) बनाएं
npm run build

# 3. PM2 सर्वर को नए बिल्ड के साथ रीस्टार्ट करें
NODE_ENV=production pm2 restart ecybercafe || NODE_ENV=production pm2 start dist/server.cjs --name "ecybercafe"
```
*(कमांड चलाने के बाद अपने ब्राउज़र में `Ctrl + Shift + R` दबाकर पेज रिफ्रेश करें। आपकी वेबसाइट बिल्कुल परफेक्ट डिज़ाइन और कलर के साथ खुल जाएगी!)*

---

## 📌 विषय सूची (Table of Contents)
1. [सर्वर आवश्यकताएँ (Server Requirements)](#1-सर्वर-आवश्यकताएँ-server-requirements)
2. [VPS सर्वर की प्रारंभिक तैयारी (Initial VPS Setup)](#2-vps-सर्वर-की-प्रारंभिक-तैयारी-initial-vps-setup)
3. [Node.js और PM2 इनस्टॉल करना](#3-nodejs-और-pm2-इनस्टॉल-करना)
4. [प्रोजेक्ट कोड अपलोड और बिल्ड (Code Upload & Build)](#4-प्रोजेक्ट-कोड-अपलोड-और-बिल्ड-code-upload--build)
5. [PM2 के साथ सर्वर स्टार्ट करना (Running with PM2)](#5-pm2-के-साथ-सर्वर-स्टार्ट-करना-running-with-pm2)
6. [Nginx और SSL (HTTPS) कॉन्फ़िगरेशन](#6-nginx-और-ssl-https-कॉन्फ़िगरेशन)
7. [डेटाबेस सुरक्षा और बैकअप (Database Persistence & Backup)](#7-डेटाबेस-सुरक्षा-और-बैकअप-database-persistence--backup)
8. [नया शुरुआत (Fresh Restart Procedure)](#8-नया-शुरुआत-fresh-restart-procedure)
9. [एडमिन पैनल से सेटिंग्स बदलना (Admin Control Guide)](#9-एडमिन-पैनल-से-सेटिंग्स-बदलना-admin-control-guide)
10. [भविष्य में अपडेट कैसे करें (Future Updates without Data Loss)](#10-भविष्य-में-अपडेट-कैसे-करें-future-updates-without-data-loss)

---

## 1. सर्वर आवश्यकताएँ (Server Requirements)

- **OS**: Ubuntu 20.04 LTS या Ubuntu 22.04 LTS (64-bit)
- **RAM**: कम से कम 1 GB (2 GB सुझाई गई है)
- **CPU**: 1 vCPU
- **Disk Space**: 10 GB+ SSD
- **Domain Name**: आपकी वेबसाइट का डोमेन (जैसे `ecybercafe.in`) का A-Record अपने VPS IP पर पॉइंट होना चाहिए।

---

## 2. VPS सर्वर की प्रारंभिक तैयारी (Initial VPS Setup)

अपने कम्प्यूटर के Terminal या Putty से VPS में लॉगिन करें:
```bash
ssh root@YOUR_SERVER_IP
```

सर्वर पैकेजेस को अपडेट करें:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip build-essential
```

---

## 3. Node.js और PM2 इनस्टॉल करना

Node.js LTS (v20) और PM2 (Process Manager) इनस्टॉल करें:
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Confirm Installation
node -v   # Output: v20.x.x
npm -v    # Output: 10.x.x

# Install PM2 globally
sudo npm install -g pm2
```

---

## 4. प्रोजेक्ट कोड अपलोड और बिल्ड (Code Upload & Build)

### **Step 4.1: प्रोजेक्ट डायरेक्टरी बनाएं**
```bash
mkdir -p /var/www/ecybercafe
cd /var/www/ecybercafe
```

### **Step 4.2: अपने प्रोजेक्ट फाइल्स अपलोड करें**
(आप Git repo से `git clone` कर सकते हैं या ZIP/SFTP के ज़रिए फाइल्स ले आएं)

### **Step 4.3: Dependencies इनस्टॉल करें और बिल्ड बनाएं**
```bash
npm install
npm run build
```

---

## 5. PM2 के साथ सर्वर स्टार्ट करना (Running with PM2)

सर्वर को 24/7 चालू रखने और VPS रीबूट होने पर ऑटो-स्टार्ट करने के लिए:

```bash
# Production Mode में स्टार्ट करें
NODE_ENV=production pm2 start dist/server.cjs --name "ecybercafe"

# PM2 स्टेटस चेक करें
pm2 status

# सर्वर रीबूट होने पर ऑटोमैटिक स्टार्ट के लिए:
pm2 startup
# (ऊपर दिए कमांड के बाद जो कमांड स्क्रीन पर आए, उसे कॉपी करके चलाएं)
pm2 save
```

---

## 6. Nginx और SSL (HTTPS) कॉन्फ़िगरेशन

### **Step 6.1: Nginx इनस्टॉल करें**
```bash
sudo apt install -y nginx
```

### **Step 6.2: Nginx Config फ़ाइल बनाएं**
`/etc/nginx/sites-available/ecybercafe` फ़ाइल बनाएं:
```bash
sudo nano /etc/nginx/sites-available/ecybercafe
```

निम्नलिखित कोड पेस्ट करें (अपना डोमेन नाम बदलें):
```nginx
server {
    listen 80;
    server_name ecybercafe.in www.ecybercafe.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

साइट इनेबल करें और Nginx टेस्ट करें:
```bash
sudo ln -s /etc/nginx/sites-available/ecybercafe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### **Step 6.3: निःशुल्क SSL Certificate (HTTPS) इनस्टॉल करें**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ecybercafe.in -d www.ecybercafe.in
```

---

## 7. डेटाबेस सुरक्षा और बैकअप (Database Persistence & Backup)

- पोर्टल का पूरा डेटा **`storage/database.json`** फ़ाइल में सुरक्षित रहता है।
- **बैकअप कैसे लें:**
  1. **Admin Panel से:** Admin Dashboard -> **Database Backup & Export** -> **Download Full Database (JSON)** पर क्लिक करें।
  2. **VPS Terminal से:**
     ```bash
     cp /var/www/ecybercafe/storage/database.json ~/database_backup_$(date +%F).json
     ```

---

## 8. नया शुरुआत (Fresh Restart Procedure)

अगर आप कभी भी पूरे डेटा को डिलीट करके **बिल्कुल नए सिरे से शुरुआत (Fresh Start)** करना चाहते हैं:

1. **पुराने डेटा का बैकअप लें** (ताकि बाद में ज़रूरत पड़े तो वापस ला सकें)।
2. **`database.json` हटाएं:**
   ```bash
   rm -f /var/www/ecybercafe/database.json
   rm -f /var/www/ecybercafe/storage/database.json
   ```
3. **PM2 रीस्टार्ट करें:**
   ```bash
   pm2 restart ecybercafe
   ```
4. सर्वर ऑटोमैटिक नया डिफ़ॉल्ट डेटाबेस जनरेट कर देगा!

### **डिफ़ॉल्ट लॉगिन क्रेडेंशियल्स:**
- **Admin**: Username/Mobile: `admin` या `6200687014` | Password: `admin123`
- **Retailer Demo**: Mobile: `0000000000` | Password: `123456`

---

## 9. एडमिन पैनल से सेटिंग्स बदलना (Admin Control Guide)

**आपको किसी भी बदलाव के लिए कोड एडिट करने की आवश्यकता नहीं है!**

1. **पोर्टल नाम, हेल्पलाइन नंबर, WhatsApp नंबर बदलना:**
   - Admin Panel में लॉगिन करें -> **Portal Settings** टैब।
   - नया नाम, नंबर दर्ज करें और **Save** पर क्लिक करें।

2. **Payment Gateway, QR Code, UPI ID बदलना:**
   - Admin Panel -> **Payment Gateway Settings** टैब।
   - UPI ID, QR Code इमेज अपडेट करें।

3. **WhatsApp Notification API बदलना:**
   - Admin Panel -> **WhatsApp API Settings** टैब।
   - नई Instance ID / Session Key अपडेट करें।

---

## 10. भविष्य में अपडेट कैसे करें (Future Updates without Data Loss)

जब भी आप भविष्य में नया कोड अपडेट करें:

```bash
cd /var/www/ecybercafe

# 1. डेटाबेस का सुरक्षा बैकअप लें
cp storage/database.json ~/database_backup_before_update.json

# 2. नया कोड खींचें/अपलोड करें
git pull  # या नए फाइल्स अपलोड करें

# 3. बिल्ड करें
npm install
npm run build

# 4. सर्वर रीस्टार्ट करें
pm2 restart ecybercafe
```

आपका डेटा पूरी तरह से सुरक्षित रहेगा और नया कोड लागू हो जाएगा! 🎉
