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

// 🔹 Criar diretórios se não existirem
const scriptsDir = path.join(__dirname, 'public/scripts');
const campaignsDir = path.join(__dirname, 'public/campanha');
[scriptsDir, campaignsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

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
            percentage INTEGER NOT NULL,
            active INTEGER DEFAULT 1,         -- 1 = Ativo, 0 = Inativo
            startDate TEXT,                   -- Data de início
            endDate TEXT                      -- Data de término
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
    const { name, trackingLink, percentage, active, startDate, endDate } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-'); // Criar slug

    db.run(
        "INSERT INTO campaigns (name, trackingLink, percentage, active, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?)",
        [name, trackingLink, percentage, active ?? 1, startDate ?? null, endDate ?? null],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                const campaignId = this.lastID;
                console.log(`✅ Campanha "${name}" cadastrada com sucesso!`);

                // 🔹 Criar página HTML da campanha
                const campaignHtml = `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${name}</title>
                </head>
                <body>
                    <h1>Campanha: ${name}</h1>
                    <p>Tracking Link: <a href="${trackingLink}" target="_blank">${trackingLink}</a></p>
                    <p>Porcentagem: ${percentage}%</p>
                    <script>
                        setTimeout(() => {
                            window.location.href = "${trackingLink}";
                        }, 3000);
                    </script>
                </body>
                </html>
                `;

                const campaignPath = path.join(campaignsDir, `${slug}.html`);
                fs.writeFile(campaignPath, campaignHtml, (err) => {
                    if (err) console.error("❌ Erro ao criar página de campanha:", err);
                    else console.log("✅ Página de campanha criada:", campaignPath);
                });

                // 🔹 Criar script encurtado da campanha
                const campaignScript = `
                (function() {
                    const now = new Date();
                    const start = ${startDate ? `new Date("${startDate}")` : 'null'};
                    const end = ${endDate ? `new Date("${endDate}")` : 'null'};
                    
                    if (${active} === 1 && (!start || now >= start) && (!end || now <= end)) {
                        window.location.href = "${trackingLink}";
                    } else {
                        console.log("🔹 Campanha ${name} está desativada ou fora do período válido.");
                    }
                })();
                `;

                const scriptPath = path.join(scriptsDir, `${slug}.js`);
                fs.writeFile(scriptPath, campaignScript, (err) => {
                    if (err) console.error("❌ Erro ao criar script da campanha:", err);
                    else console.log("✅ Script de redirecionamento criado:", scriptPath);
                });

                res.json({ id: campaignId, name, trackingLink, percentage, slug, active, startDate, endDate });
            }
        }
    );
});

// 🔹 Rota para atualizar o status da campanha (Ativar/Desativar)
app.patch('/campaigns/:id', (req, res) => {
    const { active } = req.body;
    const { id } = req.params;

    db.run("UPDATE campaigns SET active = ? WHERE id = ?", [active, id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true, message: `Campanha ${active ? 'ativada' : 'desativada'} com sucesso!` });
        }
    });
});

// 🔹 Iniciar o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
