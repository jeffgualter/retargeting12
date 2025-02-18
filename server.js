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

app.use('/scripts', express.static(__dirname + '/public/scripts'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});

// Conectar ao banco de dados SQLite
const db = new sqlite3.Database('./campaigns.db', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados', err);
  } else {
    console.log('Conectado ao banco de dados SQLite');
    db.run(`CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
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

        const campaignPath = path.join(__dirname, 'public/campanha', `${slug}.html`);

        fs.writeFile(campaignPath, campaignHtml, (err) => {
          if (err) {
            console.error("❌ Erro ao criar página de campanha:", err);
          } else {
            console.log("✅ Página de campanha criada:", campaignPath);
          }
        });

        res.json({ id: campaignId, name, trackingLink, percentage, slug });
      }
    }
  );
});

// 🔹 Iniciar o servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
