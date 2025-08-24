
document.addEventListener('DOMContentLoaded', () => {
    let tariffsDataMap = {};

    const loadJSON = async (url) => {
        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    const modal = document.getElementById('pricing-modal');
    const mainContent = document.getElementById('main-content');
    const modalTitle = document.getElementById('modal-title');
    const modalSubtitle = document.getElementById('modal-subtitle');
    const modalGrid = document.getElementById('modal-grid');
    const closeModalBtn = document.getElementById('modal-close-btn');
    const fullCheckTrigger = document.getElementById('full-check-trigger');
    const singleCamTrigger = document.getElementById('single-cam-trigger');
    
    const createCardHTML = (plan) => {
        const featuresHTML = plan.features.map(feature => `
            <li class="flex items-start text-gray-400">
                <svg class="w-5 h-5 text-green-500 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span>${feature}</span>
            </li>
        `).join('');
        return `
            <div class="modal-card p-6">
                <h3 class="text-2xl font-bold text-center text-white">${plan.name}</h3>
                <div class="my-6 flex-grow">
                    <ul class="space-y-3">${featuresHTML}</ul>
                </div>
                <div class="text-4xl font-bold text-white text-center accent-color">${plan.price}</div>
                <p class="text-gray-500 text-center mt-1">в месяц</p>
            </div>
        `;
    };
    
    const openModal = (type) => {
        const data = tariffsDataMap && tariffsDataMap[type];
        if (!data) return;
        modalTitle.textContent = data.title;
        modalSubtitle.textContent = data.subtitle;
        modalGrid.innerHTML = '';
        data.plans.forEach(plan => modalGrid.innerHTML += createCardHTML(plan));
        mainContent.setAttribute('aria-hidden', 'true');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        modal.classList.add('active');
        document.getElementById('modal-close-btn').focus();
    };

    const closeModal = () => {
        modal.setAttribute('aria-hidden', 'true');
        mainContent.setAttribute('aria-hidden', 'false');
        document.body.classList.remove('modal-open');
        modal.classList.remove('active');
    };

    fullCheckTrigger.addEventListener('click', () => openModal('full'));
    singleCamTrigger.addEventListener('click', () => openModal('single'));
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape" && modal.classList.contains('active')) closeModal();
    });

    // ИЗМЕНЕНИЕ: Скрипт для скролла удален, так как кнопка была удалена.

    // Загрузка данных и инициализация графика
    const ctx = document.getElementById('healthScoreChart');
    const normalizeTariffsData = (raw) => {
        if (!raw) return {};
        // If array of tariffs with id
        if (Array.isArray(raw)) {
            return raw.reduce((acc, t) => {
                if (t && t.id) acc[t.id] = t;
                return acc;
            }, {});
        }
        // If object map (legacy full/single)
        if (typeof raw === 'object') return raw;
        return {};
    };

    (async () => {
        // Тарифы
        const rawTariffs = await loadJSON('data/tariffs.json');
        tariffsDataMap = normalizeTariffsData(rawTariffs);

        // График
        if (ctx) {
            const scoresJson = await loadJSON('data/healthScores.json');
            if (scoresJson && Array.isArray(scoresJson.labels) && Array.isArray(scoresJson.values)) {
                const healthScoreData = {
                    labels: scoresJson.labels,
                    datasets: [{
                        label: scoresJson.datasetLabel || 'Доля оценок А и В',
                        data: scoresJson.values,
                        borderColor: '#ffd700',
                        backgroundColor: 'rgba(255, 215, 0, 0.1)',
                        fill: true, tension: 0.4, borderWidth: 3,
                        pointBackgroundColor: '#ffd700', pointRadius: 5, pointHoverRadius: 7
                    }]
                };
                Chart.defaults.font.family = "'Inter', sans-serif";
                Chart.defaults.color = '#A3A3A3';
                new Chart(ctx, {
                    type: 'line', data: healthScoreData,
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: '#111111', titleFont: { weight: 'bold' }, bodyFont: { size: 14 },
                                callbacks: { label: (c) => (c.dataset.label||'') + ': ' + (c.parsed.y !== null ? c.parsed.y + '%' : '') }
                            }
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { font: { size: 12 }}},
                            y: {
                                min: 70, max: 100, grid: { color: '#333333', borderDash: [2, 4], },
                                ticks: { color: '#ffd700', stepSize: 5, callback: (value) => value + '%', font: { size: 12, weight: '600' } }
                            }
                        }
                    }
                });
            }
        }
    })();

    // DEV MODE: ?dev=tariffs (динамическое подключение отдельного скрипта)
    const urlParams = new URLSearchParams(window.location.search);
    const devMode = urlParams.get('dev');
    if (devMode === 'tariffs') {
        const devScript = document.createElement('script');
        devScript.src = 'js/dev-tariffs.js';
        devScript.defer = true;
        document.body.appendChild(devScript);
    }
});
