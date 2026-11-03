STITCHED.TO.STYLE — UPDATED WEBSITE FILES
=========================================

इस ZIP में ये फाइलें हैं:
- index.html
- style.css
- app.js
- admin.html
- admin.js
- firestore.rules

महत्वपूर्ण:
1) यह पैकेज आपकी मौजूदा वेबसाइट के public/admin pages को replace करने के लिए तैयार किया गया है।
2) अभी वेबसाइट को आपकी तरफ से GitHub या Vercel पर publish नहीं किया गया है।
3) पहले अपने GitHub repository की backup copy रखें।
4) Firebase Firestore में fabrics और offers collections अब इस्तेमाल होंगे। Admin से पहली बार item/offer save करने पर ये collections बन जाएंगे।
5) Firebase Firestore Rules में firestore.rules की सामग्री publish करनी होगी। Existing admins collection का UID-based authorization बनाए रखें।
6) Admin login तभी काम करेगा जब Firebase Authentication में Email/Password provider enabled हो और आपके Firebase Auth UID का document admins/{UID} में मौजूद हो। इस document को Firebase Console में owner स्वयं बनाता है।
7) Cloudinary image upload existing settings (cloud name mqizferj, upload preset stitched_gallery) इस्तेमाल करता है। Upload preset unsigned uploads के लिए configured होना चाहिए।
8) WhatsApp number app.js में 917340589459 रखा गया है, जैसा आपके पुराने app.js में था। अगर यह आपका सही business WhatsApp नहीं है, तो app.js में WHATSAPP value बदलें।
9) WhatsApp checkout सिर्फ message तैयार करके WhatsApp खोलता है। ग्राहक को message Send करना होगा; वेबसाइट को message भेजे जाने या order confirmed होने की automatic सूचना नहीं मिलती।
10) Discount offer estimate में सबसे बड़ा eligible active discount लगाया जाता है; discounts stack नहीं होते। Final price WhatsApp पर confirm करें।
11) Demo fabrics/styles केवल तब दिखेंगे जब संबंधित Firestore collection खाली हो। Firestore में कोई item मौजूद होते ही demo items नहीं दिखेंगे।
12) वर्तमान code में online payment gateway नहीं है, जैसा चुना गया था। Payment WhatsApp पर तय किया जाएगा।

Deploy करने से पहले:
- सभी files की backup रखें।
- Firebase Rules update करें और Publish करें।
- GitHub में फाइलें upload/replace करें।
- Vercel deployment सफल होने के बाद website और admin login test करें।

13) BRAND LOGO: Admin Panel में नया “Brand Logo” tab मिलेगा। वहाँ PNG/JPG file चुनकर Save website logo दबाएँ। Logo Cloudinary पर upload होकर Firestore siteSettings/branding document में save होगा और public site header/footer पर brand name के साथ दिखेगा। Remove logo से default S mark वापस आएगा।
14) Firestore rules में siteSettings collection के लिए public read और admin-only write rule शामिल है।
