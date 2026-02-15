import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEYS = [
    import.meta.env.VITE_GEMINI_API_KEY,
    import.meta.env.VITE_GEMINI_API_KEY_BACKUP_1,
    import.meta.env.VITE_GEMINI_API_KEY_BACKUP_2
].filter(Boolean);

let currentKeyIndex = 0;

const getGenAIModel = () => {
    const apiKey = API_KEYS[currentKeyIndex];
    if (!apiKey) throw new Error("No valid Gemini API keys available.");

    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
        model: "gemini-2.0-flash", // Using a faster/cheaper model for chat
        generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7,
        }
    });
};

// Helper to rotate key on failure
const rotateKey = () => {
    if (currentKeyIndex < API_KEYS.length - 1) {
        currentKeyIndex++;
        console.warn(`Switching to Backup Gemini Key #${currentKeyIndex}`);
        return true;
    }
    return false;
};

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

        const model = getGenAIModel();
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("EcoBot Chat Error:", error);
        if (rotateKey()) {
            return chatWithEcoBot(userMessage, chatHistory);
        }
        return "I'm having trouble connecting right now. Please check your internet or try again later.";
    }
}
