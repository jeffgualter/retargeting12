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

// 🔹 Corrige Content-Type dos scripts para evitar erro "nosniff"
app.use('/scripts', (req, res, next) => {
    res.setHeader("Content-Type", "application/javascript");
    next();
}, express.static(path.join(__dirname, 'public/scripts')));

// 🔹 Criar diretório `public/scripts` se não existir
const scriptsDir = path.join(__dirname, 'public/scripts');
if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
}

// 🔹 Criar diretório `public/campanha` se não existir
const campaignsDir = path.join(__dirname, 'public/campanha');
if (!fs.existsSync(campaignsDir)) {
    fs.mkdirSync(campaignsDir, { recursive: true });
}

// 🔹 Página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

// 🔹 Conectar ao banco de dados SQLite
const db = new sqlite3.Database('./campaigns.db', (err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco de dados', err);
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

                // 🔹 Criar script encurtado da campanha com lógica de porcentagem
                const campaignScript = `
                    if (Math.random() * 100 < ${percentage}) {
                        window.location.href = "${trackingLink}";
                    }
                `;
                const scriptPath = path.join(scriptsDir, `${slug}.js`);

                fs.writeFile(scriptPath, campaignScript, (err) => {
                    if (err) {
                        console.error("❌ Erro ao criar script da campanha:", err);
                    } else {
                        console.log("✅ Script de redirecionamento criado:", scriptPath);
                    }
                });

                res.json({ id: campaignId, name, trackingLink, percentage, slug });
            }
        }
    );
});

// 🔹 Rota para excluir campanha
app.delete('/campaigns/:id', (req, res) => {
    const campaignId = req.params.id;

    db.get("SELECT name FROM campaigns WHERE id = ?", [campaignId], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: "Campanha não encontrada!" });
        }

        const slug = row.name.toLowerCase().replace(/\s+/g, '-');
        const scriptPath = path.join(scriptsDir, `${slug}.js`);

        // 🔹 Deleta a campanha do banco de dados
        db.run("DELETE FROM campaigns WHERE id = ?", [campaignId], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            console.log(`❌ Campanha "${row.name}" removida do banco de dados.`);

            // 🔹 Deleta o script associado, se existir
            if (fs.existsSync(scriptPath)) {
                fs.unlinkSync(scriptPath);
                console.log(`✅ Script removido: ${scriptPath}`);
            }

            res.json({ success: true, message: "Campanha excluída com sucesso!" });
        });
    });
});

// 🔹 Iniciar o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
