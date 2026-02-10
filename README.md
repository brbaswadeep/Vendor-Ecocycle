<div align="center">
  <img src="public/favicon.png" alt="EcoCycle Logo" width="120" />
  <h1>EcoCycle Vendor Panel</h1>
  <p><strong>Professional Waste Monetization & Operations Hub</strong></p>
  
  [![NVIDIA](https://img.shields.io/badge/NVIDIA-76B900?style=for-the-badge&logo=nvidia&logoColor=white)](https://www.nvidia.com/en-us/ai-data-science/)
  [![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
  [![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
</div>

---

## 🏢 Overview

**EcoCycle Vendor Panel** is the command center for authorized recyclers and upcyclers. It provides a robust suite of tools to manage incoming waste streams, optimize logistics, and maximize earnings through an AI-integrated workflow.

## 🤝 The Vendor AI Lifecycle

We empower vendors with cutting-edge AI to streamline operations:

1.  **NVIDIA (Pre-Verification)**: Incoming customer requests are pre-scanned by NVIDIA's vision models. Vendors receive high-accuracy identification reports, reducing the need for manual inspection.
2.  **OpenAI (Smart Valuation)**: OpenAI's models analyze market trends and material quality to suggest optimal "Buy" and "Sell" pricing, ensuring vendors maintain healthy margins.
3.  **Gemini (Vendor Assistant)**: Integrated EcoBot helps vendors navigate request complexites, manage inventory questions, and provides real-time support.

## ✨ Key Features

- 📑 **Request Hub**: Manage the full lifecycle of pickup and purchase requests (Accepted -> Arrived -> Processing -> Completed).
- 💰 **Earnings Tracking**: Detailed financial reports and real-time revenue analytics.
- 📦 **Inventory Management**: Track "Buy" leads and manage your processed recycled products.
- 💬 **Direct Messaging**: Connect with customers instantly to coordinate logistics.
- 🌍 **Multi-language Support**: Fully localized interface powered by `i18next`.
- 📍 **Maps Integration**: Efficiently locate pickups and optimize service routes.

## 🛠 Tech Stack

- **Frontend**: React 19.2 + Vite
- **AI Infrastructure**: NVIDIA NIM, OpenAI API, Google Gemini
- **Internationalization**: i18next
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Firebase (Firestore, Auth, Storage)

## 🚀 Setup & Installation

1.  **Clone & Install**:
    ```bash
    git clone <repository-url>
    cd vendor-panel
    npm install
    ```

2.  **Environment Configuration**:
    Create a `.env` file:
    ```env
    VITE_FIREBASE_API_KEY=your_key
    VITE_GOOGLE_MAPS_API_KEY=your_maps_key
    VITE_GEMINI_API_KEY=your_gemini_key
    VITE_UNSPLASH_ACCESS_KEY=your_unsplash_key
    # ... other operational keys
    ```

3.  **Launch**:
    ```bash
    npm run dev
    ```

---

<div align="center">
  <p>Empowering the Circular Economy</p>
</div>
