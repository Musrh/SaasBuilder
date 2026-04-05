rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ───────────────── USERS ─────────────────
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /config/{doc} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }

      match /contacts/{contactId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }

    // ───────────────── ORDERS (GLOBAL) ─────────────────
    match /orders/{orderId} {

      // 👇 admin / owner / client connecté
      allow read: if request.auth != null;

      // 👇 création depuis checkout (Stripe / frontend)
      allow create: if true;

      // 👇 update (status payé / livré)
      allow update: if request.auth != null;

      allow delete: if false;
    }

    // ───────────────── SLUGS PUBLICS ─────────────────
    match /slugs/{slug} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // ───────────────── CONTACTS GLOBAL ─────────────────
    match /contacts/{contactId} {
      allow read: if request.auth != null;
      allow create: if true;
      allow update: if request.auth != null;
      allow delete: if false;
    }

    // ───────────────── Fallback ─────────────────
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
