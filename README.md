# Stitched.to.style website

A responsive custom-stitching storefront with categories, editable style cards, price management, image uploads, customer measurement form that opens WhatsApp to **+91 73405 89459**, Instagram link **@stitched.to.style**, and Terms & Conditions.

## Important: make it a real live website
This project is ready to configure and deploy, but a public domain and online hosting are not automatically created by downloading these files. You need to connect Firebase and deploy the site. The domain `Stitched.to.style.com` must be purchased/available and connected through your domain provider; note that this is a subdomain under `style.com`, not a domain you automatically own by naming it. If you meant `stitched.to.style`, check its availability and register it if available.

## 1. Create Firebase backend
1. Open https://console.firebase.google.com/ and create a project.
2. Add a Web App in Project settings and copy its config.
3. In `app.js` and `admin.js`, replace every `PASTE_...` placeholder with the exact Firebase web-app config values.
4. In Firebase Console > Authentication > Sign-in method, enable **Email/Password**.
5. In Authentication > Users, create your own admin account with an email/password. Do not share the password.
6. In Firestore Database, create the database.
7. In Storage, enable a bucket for product photo uploads.

## 2. Firestore security rules (do not skip)
For a simple owner-only admin, create a Firestore collection called `admins`. Add a document whose document ID is the **Firebase Authentication UID** of your own admin account. Keep the document empty. Then publish these rules:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    match /admins/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
    match /products/{productId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
  }
}
```

Only put your own UID in `admins`. Never use rules that allow all users to write.

## 3. Storage rules (photo upload security)
Publish these Storage rules. Replace `YOUR_ADMIN_UID` with your own Firebase Authentication UID:

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /product-photos/{uid}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null &&
                   request.auth.uid == "YOUR_ADMIN_UID" &&
                   request.resource.size < 10 * 1024 * 1024 &&
                   request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 4. Host the website
For the easiest path, use Firebase Hosting:
1. Install Node.js on a computer.
2. In a terminal, install Firebase CLI: `npm install -g firebase-tools`
3. Run `firebase login`.
4. In this project folder run `firebase init hosting`, choose your Firebase project, use the current directory as public directory, configure as a single-page app: **No**, do not overwrite the existing files.
5. Run `firebase deploy --only hosting`.
6. In Firebase Console > Hosting, add your custom domain and follow the DNS instructions from your domain registrar. HTTPS may take time to activate.

You can also upload these files to another static host that supports HTTPS. Keep `index.html`, `style.css`, `app.js`, `admin.html`, and `admin.js` together.

## Owner workflow
- Public site: `index.html`
- Private owner panel: `admin.html`
- Sign in using the admin account you created.
- Add a style: name, category, price, photo from device, and description.
- Edit prices or details using the Edit button. Delete styles you no longer offer.
- Upload product photos from your device/gallery when using the admin page on your phone.
- Customers select a style, fill measurements, then WhatsApp opens with the booking details. They must press **Send** in WhatsApp; the website cannot send messages silently.
- Instagram: `@stitched.to.style`

## Notes
- Demo cards are shown before Firebase is configured. Replace them with your own designs once your database is connected.
- The measurement form currently asks for bust/chest, waist, hip, shoulder, sleeve and outfit length. Add/remove measurement fields to match your workflow.
- Update Terms & Conditions to reflect your real advance payment, cancellation, alteration, delivery, and refund policies before launch.
- Do not collect customer measurements on a shared/public device. Measurements are sent through WhatsApp only after the customer reviews and presses Send.


## Firebase configuration
The Firebase web app configuration has been inserted into `app.js` and `admin.js` for project `stitched-to-style`. You still need to enable Email/Password Authentication, create the owner user, create Firestore and Storage, configure secure rules, and deploy the site. Do not share passwords or service-account/private keys.


## Gallery photo uploads (Cloudinary)
The admin panel uploads selected device photos to Cloudinary using the unsigned upload preset configured in `admin.js`. Current settings: cloud name `mqizferj`, preset `stitched_gallery`. In Cloudinary, make sure this preset exists and its Signing Mode is **Unsigned**. Never place your Cloudinary API Secret in browser code. For safety, configure upload restrictions in Cloudinary (image-only formats and a reasonable maximum file size). Product details remain in Firestore.
