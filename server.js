const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 🔹 Página principal
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});

// 🔹 Conectar ao banco de dados SQLite
const db = new sqlite3.Database('./campaigns.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados', err);
    } else {
        console.log('✅ Conectado ao banco de dados SQLite');
        db.run(`CREATE TABLE IF NOT EXISTS campaigns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            trackingLink TEXT NOT NULL,
            percentage INTEGER NOT NULL
        )`);
    }
});

// 🔹 Rota para listar campanhas
app.get('/campaigns', (req, res) => {
    db.all('SELECT * FROM campaigns', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// 🔹 Rota para adicionar uma nova campanha
app.post('/campaigns', (req, res) => {
    const { name, trackingLink, percentage } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-'); // Criar slug

    db.run(
        "INSERT INTO campaigns (name, trackingLink, percentage) VALUES (?, ?, ?)",
        [name, trackingLink, percentage],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                const campaignId = this.lastID;
                console.log(`✅ Campanha "${name}" cadastrada com sucesso!`);
                res.json({ id: campaignId, name, trackingLink, percentage, slug });
            }
        }
    );
});

// 🔹 Rota para gerar scripts dinamicamente
app.get('/scripts/:scriptName', (req, res) => {
    const campaignSlug = path.basename(req.params.scriptName, '.js'); // Remove .js para pegar o nome real da campanha

    db.get("SELECT trackingLink FROM campaigns WHERE name = ?", [campaignSlug], (err, row) => {
        if (err || !row) {
            return res.status(404).send("// Script não encontrado");
        }

        // Gera um script dinâmico para redirecionamento
        const scriptContent = `
            (function() {
                setTimeout(function() {
                    window.location.href = "${row.trackingLink}";
                }, 2000); // Delay de 2 segundos antes do redirecionamento
            })();
        `;

        res.setHeader("Content-Type", "application/javascript");
        res.send(scriptContent);
    });
});

// 🔹 Iniciar o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
