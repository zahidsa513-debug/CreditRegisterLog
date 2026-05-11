# Credit Register - Smart Shop Ledger

A modern, cloud-synced shop ledger application designed for managing credit sales, collections, and customer relationships. Built with React, Vite, Dexie.js, and Firebase.

## 🚀 Features

- **Offline-First**: Works without internet using IndexedDB (Dexie.js).
- **Auto-Sync**: Seamlessly synchronizes data to Firebase Cloud Firestore when online.
- **AI Corner**: Use Gemini-powered insights for business strategy and automated reporting.
- **Reporting**: Generate professional PDF receipts, Excel exports, and daily sales summaries.
- **Multi-Currency & Multi-Language**: Built-in support for multiple currencies and languages (English/Bengali).
- **Secure**: Google Authentication for data privacy and multi-device access.
- **PWA Ready**: Can be installed on Android/iOS as a native-like application.

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Database (Local)**: Dexie.js (IndexedDB)
- **Database (Cloud)**: Firebase Firestore
- **Auth**: Firebase Authentication (Google)
- **AI**: Google Gemini API
- **Animations**: Framer Motion

## 📦 Installation

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Configure your Firebase credentials in `src/lib/firebase.ts`.
4. Run `npm run dev` for the development server.
5. Run `npm run build` for production build.

## 📱 Mobile App Experience

Since this is a PWA, you can open it in your mobile browser and select **"Add to Home Screen"** to use it as a native Android or iOS application.

## 📄 License

MIT
