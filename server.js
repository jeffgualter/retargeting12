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

// 🔹 Rota para gerar scripts dinamicamente
app.get('/scripts/:scriptName', (req, res) => {
    const campaignSlug = path.basename(req.params.scriptName, '.js'); // Remove .js para pegar o nome real da campanha
    console.log(`🔍 Buscando campanha: ${campaignSlug}`); // Debug para ver o nome da campanha sendo buscado

    db.get("SELECT trackingLink FROM campaigns WHERE LOWER(REPLACE(name, ' ', '-')) = LOWER(?)", [campaignSlug], (err, row) => {
        if (err) {
            console.error("❌ Erro ao buscar campanha:", err);
            return res.status(500).send("// Erro no servidor");
        }
        if (!row) {
            console.log("⚠️ Campanha não encontrada:", campaignSlug);
            return res.status(404).send("// Script não encontrado");
        }

        // 🔹 Extração da URL Base para ocultar parâmetros finais
        let trackingURL = row.trackingLink;
        let cleanURL = trackingURL.split(/[?#]/)[0]; // Remove tudo após '?' ou '#'

        // 🔹 Gera um script dinâmico para redirecionamento
        const scriptContent = `
            (function() {
                setTimeout(function() {
                    window.location.href = "${cleanURL}";
                }, 2000);
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
