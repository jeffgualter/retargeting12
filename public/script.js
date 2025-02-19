console.log("✅ O script.js foi carregado corretamente!");

document.addEventListener("DOMContentLoaded", function () {
    fetchCampaigns();

    const form = document.getElementById('campaignForm');
    if (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();

            const id = document.getElementById('campaignId').value;
            const name = document.getElementById('campaignName').value.trim();
            const trackingLink = document.getElementById('trackingLink').value.trim();
            const percentage = document.getElementById('percentage').value.trim();

            if (!name || !trackingLink || !percentage) {
                console.error("❌ Erro: Todos os campos devem ser preenchidos.");
                return;
            }

            const method = id ? 'PUT' : 'POST';
            const endpoint = id ? `/campaigns/${id}` : '/campaigns';

            try {
                await fetch(endpoint, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, trackingLink, percentage })
                });
                fetchCampaigns();
                form.reset();
            } catch (error) {
                console.error("❌ Erro ao salvar campanha:", error);
            }
        });
    } else {
        console.error("❌ Erro: Formulário não encontrado!");
    }
});

async function fetchCampaigns() {
    console.log("🔄 Chamando fetchCampaigns() para atualizar a tabela...");

    try {
        const response = await fetch('/campaigns');
        const campaigns = await response.json();
        console.log("📩 Dados recebidos da API:", campaigns);

        const tableBody = document.querySelector('#campaignTable tbody');
        if (!tableBody) {
            console.error("❌ Erro: Elemento da tabela não encontrado!");
            return;
        }

        tableBody.innerHTML = '';

        if (!Array.isArray(campaigns)) {
            console.error("❌ Erro: A resposta da API não é um array:", campaigns);
            return;
        }

        campaigns.forEach(campaign => {
            console.log("🔹 Adicionando campanha na tabela:", campaign);
            const slug = campaign.name.toLowerCase().replace(/\s+/g, '-');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${campaign.id}</td>
                <td>${campaign.name}</td>
                <td><a href="${campaign.trackingLink}" target="_blank">${campaign.trackingLink}</a></td>
                <td>${campaign.percentage}%</td>
                <td>
                    <button onclick="toggleCampaignScripts('${slug}', '${campaign.trackingLink}')">Ver Scripts</button>
                    <button onclick="deleteCampaign(${campaign.id})" style="background-color: red; color: white;">Excluir</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("❌ Erro ao carregar campanhas:", error);
    }
}

function toggleCampaignScripts(slug, trackingLink) {
    let scriptContainer = document.getElementById(`script-${slug}`);
    if (scriptContainer) {
        scriptContainer.remove();
        return;
    }

    scriptContainer = document.createElement('tr');
    scriptContainer.id = `script-${slug}`;
    scriptContainer.innerHTML = `
        <td colspan="5">
            <p>📌 Script de Redirecionamento:</p>
            <textarea readonly>&lt;script&gt;window.location.href = "${trackingLink}";&lt;/script&gt;</textarea>
            <p>📌 Script Encurtado:</p>
            <textarea readonly>&lt;script src="/scripts/${slug}.js"&gt;&lt;/script&gt;</textarea>
        </td>
    `;
    document.querySelector(`#campaignTable tbody`).appendChild(scriptContainer);
}

// 🔹 Nova função para excluir campanha
async function deleteCampaign(id) {
    if (!confirm("Tem certeza que deseja excluir esta campanha? Essa ação não pode ser desfeita!")) {
        return;
    }

    try {
        const response = await fetch(`/campaigns/${id}`, { method: 'DELETE' });

        if (response.ok) {
            console.log(`✅ Campanha ${id} excluída com sucesso!`);
            fetchCampaigns(); // Atualiza a tabela após exclusão
        } else {
            console.error("❌ Erro ao excluir campanha.");
        }
    } catch (error) {
        console.error("❌ Erro ao excluir campanha:", error);
    }
}
