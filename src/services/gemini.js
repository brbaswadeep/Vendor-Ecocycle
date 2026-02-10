import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash", // Using a faster/cheaper model for chat
    generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
    }
});

export async function chatWithEcoBot(userMessage, chatHistory = []) {
    try {
        // Construct conversation history for context
        const historyPrompt = chatHistory.map(msg =>
            `${msg.isUser ? 'Vendor' : 'EcoBot'}: ${msg.text}`
        ).join('\n');

        const prompt = `
      You are **EcoBot**, the AI assistant for the **EcoCycle Vendor Panel**.
      
      **YOUR ROLE:**
      Assist recycling vendors with:
      1. **Managing Requests**: Understanding customer pickup requests.
      2. **Pricing**: Guidance on scrap rates (refer to general market trends or platform rates).
      3. **Platform Usage**: How to use the vendor dashboard, update status, etc.
      4. **Sustainability**: Tips on handling different waste types (e-waste, batteries, etc.) safely.

      **STRICT SCOPE:**
      - Answer ONLY questions related to the EcoCycle Vendor Platform and Recycling Business.
      - Refuse off-topic questions (e.g., general news, coding, entertainment).
      - Standard Refusal: "I specialize only in the EcoCycle Vendor Panel and recycling business operations."

      **TONE & STYLE:**
      - Professional yet friendly.
      - Concise (max 2-3 sentences).
      - Helpful and business-oriented.
      - Use emojis occasionally (🚛, 💼, ♻️).

      **Conversation History:**
      ${historyPrompt}

      **Vendor**: ${userMessage}
      **EcoBot**:
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("EcoBot Chat Error:", error);
        return "I'm having trouble connecting right now. Please check your internet or try again later.";
    }
}
