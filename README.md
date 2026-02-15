# EcoCycle Vendor Panel

<div align="center">
  <img src="public/favicon.png" alt="EcoCycle Logo" width="120" />
  <p><strong>Professional Waste Monetization & Operations Hub</strong></p>
  
  [![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
  [![Firebase](https://img.shields.io/badge/Firebase-12.7-FFCA28?style=flat&logo=firebase)](https://firebase.google.com/)
  [![Gemini](https://img.shields.io/badge/Google_Gemini-2.0-8E75B2?style=flat&logo=googlegemini)](https://deepmind.google/technologies/gemini/)
  [![i18next](https://img.shields.io/badge/i18next-25.7-26A69A?style=flat&logo=i18next)](https://www.i18next.com/)
</div>

---

## 🏢 Technical Architecture

**EcoCycle Vendor Panel** is a specialized dashboard built for recycling professionals. Unlike the consumer app, it focuses on high-efficiency data management, multi-language support, and real-time request tracking.

### Core Stack
*   **Framework**: React 19.2 with Vite (Fast HMR).
*   **Localization**: `i18next` + `react-i18next` for seamless language switching (critical for diverse vendor demographics).
*   **Styling**: Tailwind CSS + Lucide React icons.
*   **State**: Context API for Auth and Theme management.

---

## ⚙️ Key Mechanisms & Services

### 1. Vendor AI Lifecycle
1.  **NVIDIA (Pre-Verification)**: Incoming customer requests are pre-scanned by specialized vision models. Validators receive high-accuracy identification reports, reducing the need for manual inspection.
2.  **OpenAI (Core Valuation Engine)**: The platform's main intelligence layer. It analyzes global market trends and local scrap rates to generate precise "Buy" and "Sell" pricing, ensuring vendors maintain healthy margins.
3.  **Gemini (Support Bot)**: A supplementary assistant (EcoBot) that helps vendors navigate the dashboard and answer operational questions.
    *   **Model**: Gemini 2.0 Flash (Optimized for speed/cost).
    *   **Mechanism**: Uses specialized prompts to restrict scope strictly to "Recycling Business" and "Platform Usage", ensuring verified business advice.

### 2. Request Management System
*   **Data Source**: Listens to the `requests` Firestore collection where `vendorIds` array contains the current vendor's UID.
*   **Status Workflow**:
    1.  `pending`: Request created by customer using `requestService` (from customer app).
    2.  `accepted`: Vendor claims the request.
    3.  `completed`: Transaction finalized.
*   **Real-time Updates**: Uses Firestore `onSnapshot` listeners to instantly reflect new requests without page reloads.

### 3. Internationalization (`src/i18n.js`)
*   **Library**: `i18next`.
*   **Configuration**:
    *   Resources defined in JSON structure within `i18n.js` (or separate locale files).
    *   Detects user language or falls back to English (`en`).
    *   **Usage**: Components use the `useTranslation` hook (`t('key')`) to render text.

### 4. Authentication & Security
*   **Context**: `AuthContext.jsx` (similar to customer app).
*   **Guard**: Checks `vendors` collection in Firestore.
    *   If a user logs in but their UID is not found in `vendors`, access is denied. This prevents customers from accessing the professional dashboard.

---

## 🗄️ Database Relationships

The vendor panel interacts primarily with:

| Collection | Interaction Type | Purpose |
| :--- | :--- | :--- |
| `vendors` | **Read/Write** | Functions as the "User Profile". Stores business name, verified coordinates (`lat`, `lng`), and service radius. |
| `requests` | **Read/Write** | The core work queue. Vendors query for requests where `vendorIds` includes their own UID. |
| `customers` | **Read Only** | To display customer contact info and location for pickup coordination. |

---

## 🚀 Setup & Installation

### Prerequisites
*   Node.js v18+
*   Firebase Project (Same project as the customer app)
*   Google Maps API Key (for location picker)

### 1. Installation
```bash
git clone <repository-url>
cd vendor-panel
npm install
```

### 2. Environment Variables (.env)
Create a `.env` file in the root:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_id

# AI & Maps
VITE_GEMINI_API_KEY=your_gemini_key
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
VITE_UNSPLASH_ACCESS_KEY=your_unsplash_key
```

### 3. Run Development Server
```bash
npm run dev
```
