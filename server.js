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

// 🔹 Criar diretório `public/scripts` se não existir
const scriptsDir = path.join(__dirname, 'public/scripts');
if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
}

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
            percentage INTEGER NOT NULL,
            active INTEGER DEFAULT 1,
            startDate TEXT DEFAULT NULL,
            endDate TEXT DEFAULT NULL
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

// 🔹 Rota para adicionar nova campanha
app.post('/campaigns', (req, res) => {
    const { name, trackingLink, percentage, active = 1, startDate, endDate } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-');

    db.run(
        "INSERT INTO campaigns (name, trackingLink, percentage, active, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?)",
        [name, trackingLink, percentage, active, startDate, endDate],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                const campaignId = this.lastID;
                const campaignScript = `
                    (function() {
                        const now = new Date();
                        const start = ${startDate ? `new Date('${startDate}')` : 'null'};
                        const end = ${endDate ? `new Date('${endDate}')` : 'null'};
                        
                        if (${active} && (!start || now >= start) && (!end || now <= end)) {
                            setTimeout(() => {
                                window.location.href = "${trackingLink}";
                            }, 2000);
                        }
                    })();
                `;

                const scriptPath = path.join(scriptsDir, `${slug}.js`);

                fs.writeFile(scriptPath, campaignScript, (err) => {
                    if (err) {
                        console.error("❌ Erro ao criar script da campanha:", err);
                    } else {
                        console.log("✅ Script de redirecionamento criado:", scriptPath);
                    }
                });

                res.json({ id: campaignId, name, trackingLink, percentage, slug, active, startDate, endDate });
            }
        }
    );
});

// 🔹 Rota para atualizar uma campanha existente
app.put('/campaigns/:id', (req, res) => {
    const { name, trackingLink, percentage, active, startDate, endDate } = req.body;
    const { id } = req.params;
    const slug = name.toLowerCase().replace(/\s+/g, '-');

    db.run(
        "UPDATE campaigns SET name = ?, trackingLink = ?, percentage = ?, active = ?, startDate = ?, endDate = ? WHERE id = ?",
        [name, trackingLink, percentage, active, startDate, endDate, id],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                const campaignScript = `
                    (function() {
                        const now = new Date();
                        const start = ${startDate ? `new Date('${startDate}')` : 'null'};
                        const end = ${endDate ? `new Date('${endDate}')` : 'null'};
                        
                        if (${active} && (!start || now >= start) && (!end || now <= end)) {
                            setTimeout(() => {
                                window.location.href = "${trackingLink}";
                            }, 2000);
                        }
                    })();
                `;

                const scriptPath = path.join(scriptsDir, `${slug}.js`);

                fs.writeFile(scriptPath, campaignScript, (err) => {
                    if (err) {
                        console.error("❌ Erro ao atualizar script da campanha:", err);
                    } else {
                        console.log("✅ Script atualizado:", scriptPath);
                    }
                });

                res.json({ success: true });
            }
        }
    );
});

// 🔹 Iniciar o servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});
