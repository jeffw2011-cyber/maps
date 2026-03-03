import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface MapLocation {
  title: string;
  uri: string;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  locations?: MapLocation[];
}

export async function sendMessage(
  message: string,
  history: ChatMessage[]
) {
  const model = "gemini-2.5-flash";
  
  const contents = [
    ...history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    {
      role: "user",
      parts: [{ text: message }],
    },
  ];

  const config: any = {
    systemInstruction: "Você é um assistente de exploração local inteligente. Responda SEMPRE em Português (Brasil). Use a ferramenta Google Maps para encontrar locais reais, restaurantes, hotéis e atrações. Quando encontrar locais, descreva-os brevemente e forneça os links para o Google Maps. Seja amigável e prestativo.",
    tools: [{ googleMaps: {} }, { googleSearch: {} }],
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    const text = response.text || "Desculpe, não consegui processar sua solicitação.";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    const locations: MapLocation[] = [];
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.maps) {
          locations.push({
            title: chunk.maps.title || "Localização",
            uri: chunk.maps.uri,
          });
        }
      });
    }

    return { text, locations };
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return {
      text: "Ocorreu um erro ao falar com o assistente. Por favor, tente novamente.",
      locations: [],
    };
  }
}
