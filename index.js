import "dotenv/config";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";


const API_URL = `http://localhost:${process.env.PORT || 3000}`;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getOneCustomerSchema = z.object({
    id: z.number().int().describe("O ID único do cliente que o usuário deseja buscar.")
});
const addCustomerSchema = z.object({
    name: z.string(),
    age: z.number().int().positive(),
    uf: z.string().length(2)
});

const getCustomerTool = {
    name: "get_customer",
    description: "Obtém a lista de clientes cadastrados no sistema CRM."
};

const getoneCustomerTool = {
    name: "get_one_customer",
    description: "Busca no banco de dados todas as informações e detalhes de um cliente específico pelo ID, incluindo nome, idade (age), telefone e UF.",
    parameters: {
        type: "OBJECT",
        properties: {
            id: {
                type: "INTEGER",
                description: "O ID único do cliente que o usuário deseja buscar."
            }
        },
        required: ["id"]
    }
};

const AddCustomerTool = {
    name: "add_customer",
    description: "Adiciona um novo cliente ao sistema CRM.",
    parameters: {
        type: "OBJECT",
        properties: {
            name: {
                type: "STRING",
                description: "O nome do cliente."
            },
            age: {
                type: "INTEGER",
                description: "A idade do cliente."
            },
            uf: {
                type: "STRING",
                description: "A unidade federativa do cliente."
            }
        },
        required: ["name", "age", "uf"]
    }
};


const agentConfig = {
    systemInstruction: "Você é um assistente de CRM do sistema. Seja educado, direto e utilize as ferramentas disponíveis para atender a solicitação do usuário. Nunca invente dados.",
    
    tools: [{ functionDeclarations: [getCustomerTool, getoneCustomerTool, AddCustomerTool] }], 
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
        
        switch (call.name) {
            
            case "get_customer":
                console.log("🤖 IA acionou get_customer. Consultando o banco via Axios...");
                try {
                    const apiResponse = await axios.get(`${API_URL}/customers`);
                    const dbData = apiResponse.data; 

                    console.log("📦 Dados recebidos. Devolvendo para a IA formatar...");
                    const finalResponse = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: `O usuário pediu: "${prompt}". \nOs dados brutos são: ${JSON.stringify(dbData)}. \nListe apenas os nomes dos clientes. Não mostre IDs ou UFs.`,
                        config: {
                            systemInstruction: "Você é um assistente CRM. Formate os dados de forma natural.",
                            temperature: 0.1
                        }
                    });
                    return finalResponse.text; 
                } catch (error) {
                    console.error("Erro na API:", error.message);
                    return "Desculpe, não consegui acessar o banco de dados no momento.";
                }

           case "get_one_customer":
                console.log(" IA acionou get_one_customer. Consultando o banco via Axios...");
                
                try {
                   
                    const safeArgs = getOneCustomerSchema.parse(call.args);
                    const customerId = safeArgs.id;
                    
                    
                    const apiResponse = await axios.get(`${API_URL}/customers/${customerId}`);
                    const dbData = apiResponse.data; 

                    console.log("📦 Dados recebidos. Devolvendo para a IA formatar...");
                    const finalResponse = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: `O usuário pediu: "${prompt}". \nOs dados brutos são: ${JSON.stringify(dbData)}. \nResponda ao usuário com os detalhes  do cliente cujo ID é ${customerId}. Mostre o que for solicitado se não estiver especificado mostre nome, idade e UF.`,
                        config: {
                            systemInstruction: "Você é um assistente CRM. Formate os dados de forma natural.",
                            temperature: 0.1
                        }
                    });
                    
                    return finalResponse.text; 
                } catch (error) {
                    console.error("Erro na API ou na validação do Zod:", error.message);
                    return `Desculpe, ocorreu um erro ao buscar o cliente.`;
                }
            case "add_customer":
                console.log(" IA acionou add_customer. Enviando dados para a API via Axios...");
                try {
                    const safeArgs = addCustomerSchema.parse(call.args);
                    const newCustomerData = {
                        name: safeArgs.name,
                        age: safeArgs.age,
                        uf: safeArgs.uf
                    };

                    const apiResponse = await axios.post(`${API_URL}/customers`, newCustomerData);
                    const dbData = apiResponse.data;

                    console.log("📦 Cliente adicionado com sucesso. Devolvendo para a IA formatar...");
                    const finalResponse = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: `O usuário pediu: "${prompt}". \nOs dados brutos são: ${JSON.stringify(dbData)}. \nConfirme a criação do novo cliente.`,
                        config: {
                            systemInstruction: "Você é um assistente CRM. Formate os dados de forma natural.",
                            temperature: 0.1
                        }
                    });
                    return finalResponse.text;
                } catch (error) {
                    console.error("Erro na API ou na validação do Zod:", error.message);
                    return `Desculpe, ocorreu um erro ao adicionar o cliente.`;
                }
            default:
                console.warn(`A IA tentou chamar uma ferramenta não mapeada: ${call.name}`);
                return "Houve um erro na execução da tarefa. Ferramenta desconhecida.";
        }
    }

    
    return response.text;
}

const result = await runAgent("Quero cadastrar um cliente");
console.log("Resposta do agente:", result);