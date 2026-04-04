import "dotenv/config";
import express from "express";
import morgan from "morgan";
import fs from "fs";

const app = express();
const DB_PATH = './banco.json';


function loadDatabase() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Erro ao ler o banco:", error);
    }
    return []; 
}


let customers = loadDatabase();


let nextId = customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1;

app.use(express.json());
app.use(morgan("tiny"));

app.post("/customers", (req, res) => {
    const newCustomer = {
        id: nextId++,
        name: req.body.name,
        age: parseInt(req.body.age),
        uf: req.body.uf
    };

    customers.push(newCustomer);
    
    
    fs.writeFileSync(DB_PATH, JSON.stringify(customers, null, 2));
    
    res.status(201).json(newCustomer);
});

app.delete("/customers/:id", (req, res) => {
    const id = parseInt(req.params.id);
    

    const index = customers.findIndex(c => c.id === id);

    
    if (index === -1) {
        return res.status(404).json({ error: "Cliente não encontrado." });
    }

   
    customers.splice(index, 1);

    
    fs.writeFileSync(DB_PATH, JSON.stringify(customers, null, 2));

    
    res.status(200).json({ message: `Cliente ID ${id} excluído com sucesso.` });
});


app.get("/customers/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const customer = customers.find(c => c.id === id);
    res.json(customer);
});

app.get("/customers", (req, res) => {
    res.json(customers);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening at ${PORT}`));