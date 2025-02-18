document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById('campaignForm');
    const tableBody = document.querySelector('#campaignTable tbody');

    async function fetchCampaigns() {
        try {
            const response = await fetch('/campaigns');
            const campaigns = await response.json();

            tableBody.innerHTML = '';

            campaigns.forEach(campaign => {
                const row = document.createElement('tr');

                row.innerHTML = `
                    <td>${campaign.id}</td>
                    <td>${campaign.name}</td>
                    <td><a href="${campaign.trackingLink}" target="_blank">${campaign.trackingLink}</a></td>
                    <td>${campaign.percentage}%</td>
                    <td>
                        <input type="checkbox" ${campaign.active ? 'checked' : ''} 
                            onchange="toggleCampaign(${campaign.id}, this.checked)">
                    </td>
                    <td>${campaign.startDate || 'Não definido'}</td>
                    <td>${campaign.endDate || 'Não definido'}</td>
                    <td>
                        <button onclick="editCampaign(${campaign.id}, '${campaign.name}', 
                            '${campaign.trackingLink}', ${campaign.percentage}, 
                            ${campaign.active}, '${campaign.startDate || ''}', 
                            '${campaign.endDate || ''}')">Editar</button>
                    </td>
                `;

                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Erro ao carregar campanhas:", error);
        }
    }

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const id = document.getElementById('campaignId').value;
        const name = document.getElementById('campaignName').value;
        const trackingLink = document.getElementById('trackingLink').value;
        const percentage = document.getElementById('percentage').value;
        const active = document.getElementById('active').checked ? 1 : 0;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        const method = id ? 'PUT' : 'POST';
        const endpoint = id ? `/campaigns/${id}` : '/campaigns';

        await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, trackingLink, percentage, active, startDate, endDate })
        });

        form.reset();
        fetchCampaigns();
    });

    window.editCampaign = function(id, name, trackingLink, percentage, active, startDate, endDate) {
        document.getElementById('campaignId').value = id;
        document.getElementById('campaignName').value = name;
        document.getElementById('trackingLink').value = trackingLink;
        document.getElementById('percentage').value = percentage;
        document.getElementById('active').checked = active;
        document.getElementById('startDate').value = startDate;
        document.getElementById('endDate').value = endDate;
    };

    window.toggleCampaign = async function(id, isActive) {
        await fetch(`/campaigns/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: isActive ? 1 : 0 })
        });

        fetchCampaigns();
    };

    fetchCampaigns();
});
