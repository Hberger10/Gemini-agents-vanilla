import "dotenv/config";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

const API_URL = `http://localhost:${process.env.PORT || 3000}`;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getCustomerTool = {
    name: "get_customer",
    description: "Obtém a lista de clientes cadastrados no sistema CRM."
};

const getoneCustomerTool = {
    name: "get_one_customer",
    description: "Obtém os detalhes de um cliente específico"
};



const agentConfig = {
    systemInstruction: "Você é um assistente de CRM do sistema. Seja educado, direto e utilize as ferramentas disponíveis para atender a solicitação do usuário. Nunca invente dados.",
    
    tools: [{ functionDeclarations: [getCustomerTool] }], 
    temperature: 0.1 
};


async function runAgent(prompt) {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: prompt,
        config: agentConfig
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        
        if (call.name === "get_customer") {
            console.log(" IA acionou a ferramenta. Consultando o banco via Axios...");
            
            try {
                const apiResponse = await axios.get(`${API_URL}/customers`);
                const dbData = apiResponse.data; 

                console.log("📦 Dados recebidos. Devolvendo para a IA formatar o texto...");

                const finalResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    
                    contents: `O usuário pediu: "${prompt}". \nOs dados brutos do sistema são: ${JSON.stringify(dbData)}. \nResponda ao usuário listando apenas os nomes dos clientes. Não mostre IDs ou UFs.`,
                    config: {
                        systemInstruction: "Você é um assistente CRM. Formate os dados de forma natural.",
                        temperature: 0.1
                    }
                });

                return finalResponse.text; 

            } catch (error) {
                console.error("❌ Erro no Axios:", error.message);
                return "Erro ao consultar o banco de dados.";
            }
        }
    }

    return response.text;
}

const result = await runAgent("Me traga a lista de clientes cadastrados no CRM.");
console.log("Resposta do agente:", result);