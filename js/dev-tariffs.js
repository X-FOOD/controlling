// Dev Tariffs Editor (loaded only with ?dev=tariffs)
(() => {
    class Plan {
        /** @param {{name:string, price:string, features:string[]}} data */
        constructor(data) {
            this.name = data.name || '';
            this.price = data.price || '';
            this.features = Array.isArray(data.features) ? data.features : [];
        }
        static fromForm(name, price, featuresText) {
            return new Plan({
                name,
                price: (price || '').trim(),
                features: (featuresText || '').split('\n').map(s => s.trim()).filter(Boolean)
            });
        }
        toJSON() { return { name: this.name, price: this.price, features: this.features }; }
    }

    class Tariff {
        /** @param {{id?:string, title:string, subtitle:string, plans:Array<Plan|Object>}} data */
        constructor(data) {
            this.id = data.id || '';
            this.title = data.title || '';
            this.subtitle = data.subtitle || '';
            this.plans = Array.isArray(data.plans) ? data.plans.map(p => p instanceof Plan ? p : new Plan(p)) : [];
        }
        /**
         * Supports two formats:
         * 1) Legacy object with keys full/single
         * 2) New array of tariffs [{id,title,subtitle,plans}]
         */
        static listFromJSON(json) {
            if (Array.isArray(json)) {
                return json.map(j => new Tariff(j));
            }
            if (json && typeof json === 'object') {
                const entries = Object.entries(json);
                return entries.map(([id, val]) => new Tariff({ id, ...val }));
            }
            return [];
        }
        toJSON() { return { id: this.id, title: this.title, subtitle: this.subtitle, plans: this.plans.map(p => p.toJSON()) }; }
    }

    class TariffsEditor {
        constructor(rootEl) {
            this.rootEl = rootEl;
            this.tariffs = [];
        }

        setData(json) {
            this.tariffs = Tariff.listFromJSON(json || {});
            const ensureOrder = (plans) => {
                const names = ['M','L','XL'];
                const byName = new Map(plans.map(p => [p.name, p]));
                const ordered = names.map(n => byName.get(n)).filter(Boolean);
                for (const p of plans) { if (!names.includes(p.name)) ordered.push(p); }
                return ordered;
            };
            this.tariffs.forEach(t => { t.plans = ensureOrder(t.plans); });
        }

        render() {
            this.rootEl.innerHTML = '';
            this.rootEl.appendChild(this.#renderTariffsList());
            this.rootEl.appendChild(this.#renderActions());
            this.outputArea = this.#renderOutput();
            this.rootEl.appendChild(this.outputArea.container);
        }

        #renderTariffsList() {
            const container = document.createElement('div');
            container.className = 'space-y-6';

            const header = document.createElement('div');
            header.className = 'flex items-center justify-between';
            header.innerHTML = '<h3 class="text-xl font-bold text-white">Тарифы</h3>';
            const addTariffBtn = document.createElement('button');
            addTariffBtn.className = 'secondary-button';
            addTariffBtn.textContent = 'Добавить тариф';
            addTariffBtn.addEventListener('click', () => {
                const newTariff = new Tariff({ id: 'new-tariff', title: '', subtitle: '', plans: [ new Plan({ name: 'M', price: '', features: [] }) ] });
                this.tariffs.push(newTariff);
                container.appendChild(this.#renderTariffSection(newTariff));
            });
            header.appendChild(addTariffBtn);
            container.appendChild(header);

            this.tariffs.forEach(t => container.appendChild(this.#renderTariffSection(t)));
            return container;
        }

        #renderTariffSection(tariff) {
            const card = document.createElement('div');
            card.className = 'border border-color rounded-xl p-5';
            card.innerHTML = `<h3 class="text-xl font-bold text-white mb-4">Тариф</h3>`;

            const wrapper = document.createElement('div');
            wrapper.className = 'space-y-3';

            const idInput = this.#textField(`tariff-id`, 'Идентификатор (id)', tariff.id || '');
            const titleInput = this.#textField(`tariff-title`, 'Заголовок', tariff.title);
            const subtitleInput = this.#textField(`tariff-subtitle`, 'Подзаголовок', tariff.subtitle);

            wrapper.appendChild(idInput.container);
            wrapper.appendChild(titleInput.container);
            wrapper.appendChild(subtitleInput.container);

            const plansGrid = document.createElement('div');
            plansGrid.className = 'grid grid-cols-1 md:grid-cols-3 gap-4';
            card.appendChild(wrapper);
            card.appendChild(plansGrid);

            // Render existing plans; allow adding/removing plans
            tariff.plans.forEach((plan, idx) => plansGrid.appendChild(this.#renderPlanCard(tariff, plan, idx)));

            const addBtn = document.createElement('button');
            addBtn.className = 'secondary-button mt-4';
            addBtn.textContent = 'Добавить план';
            addBtn.addEventListener('click', () => {
                const newPlan = new Plan({ name: 'NEW', price: '', features: [] });
                tariff.plans.push(newPlan);
                plansGrid.appendChild(this.#renderPlanCard(tariff, newPlan, tariff.plans.length - 1));
            });

            const removeTariffBtn = document.createElement('button');
            removeTariffBtn.className = 'text-gray-400 hover:text-white text-sm ml-4';
            removeTariffBtn.textContent = 'Удалить тариф';
            removeTariffBtn.addEventListener('click', () => {
                const idx = this.tariffs.indexOf(tariff);
                if (idx >= 0) { this.tariffs.splice(idx, 1); card.remove(); }
            });

            const controlsRow = document.createElement('div');
            controlsRow.className = 'mt-4 flex items-center';
            controlsRow.appendChild(addBtn);
            controlsRow.appendChild(removeTariffBtn);
            card.appendChild(controlsRow);

            // Bind
            idInput.input.addEventListener('input', () => { tariff.id = idInput.input.value.trim(); });
            titleInput.input.addEventListener('input', () => { tariff.title = titleInput.input.value.trim(); });
            subtitleInput.input.addEventListener('input', () => { tariff.subtitle = subtitleInput.input.value.trim(); });

            return card;
        }

        #renderPlanCard(tariff, plan, index) {
            const card = document.createElement('div');
            card.className = 'border border-color rounded-lg p-3';

            const header = document.createElement('div');
            header.className = 'flex items-center justify-between mb-2';
            const nameField = this.#textField(`plan-${index}-name`, 'Название плана (например M)', plan.name, true);
            const removeBtn = document.createElement('button');
            removeBtn.className = 'text-gray-400 hover:text-white text-sm';
            removeBtn.textContent = 'Удалить';
            removeBtn.addEventListener('click', () => {
                const plans = tariff.plans;
                const idx = plans.indexOf(plan);
                if (idx >= 0) {
                    plans.splice(idx, 1);
                    card.remove();
                }
            });
            header.appendChild(nameField.container);
            header.appendChild(removeBtn);
            card.appendChild(header);

            const priceField = this.#textField(`plan-${index}-price`, 'Цена', plan.price);
            const featuresField = this.#textareaField(`plan-${index}-features`, 'Фичи (по строке)', plan.features.join('\n'));
            card.appendChild(priceField.container);
            card.appendChild(featuresField.container);

            // Bind updates
            nameField.input.addEventListener('input', () => { plan.name = nameField.input.value.trim(); });
            priceField.input.addEventListener('input', () => { plan.price = priceField.input.value; });
            featuresField.input.addEventListener('input', () => {
                plan.features = featuresField.input.value.split('\n').map(s => s.trim()).filter(Boolean);
            });

            return card;
        }

        #renderActions() {
            const bar = document.createElement('div');
            bar.className = 'flex flex-wrap gap-3';

            const generateBtn = document.createElement('button');
            generateBtn.className = 'cta-button';
            generateBtn.textContent = 'Сформировать JSON';
            generateBtn.addEventListener('click', () => this.generateJSON());

            const copyBtn = document.createElement('button');
            copyBtn.className = 'secondary-button';
            copyBtn.textContent = 'Скопировать';
            copyBtn.addEventListener('click', async () => {
                const text = this.getJSONText();
                await navigator.clipboard.writeText(text);
                this.setStatus('JSON скопирован в буфер обмена.');
            });

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'secondary-button';
            downloadBtn.textContent = 'Скачать tariffs.json';
            downloadBtn.addEventListener('click', () => {
                const text = this.getJSONText();
                const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'tariffs.json';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.setStatus('Файл tariffs.json скачан.');
            });

            bar.appendChild(generateBtn);
            bar.appendChild(copyBtn);
            bar.appendChild(downloadBtn);
            return bar;
        }

        #renderOutput() {
            const container = document.createElement('div');
            const textarea = document.createElement('textarea');
            textarea.id = 'dev-json-output';
            textarea.className = 'w-full h-64 bg-[#0b0b0b] text-gray-200 p-4 rounded-xl border border-color font-mono text-sm';
            textarea.setAttribute('spellcheck', 'false');
            textarea.setAttribute('aria-label', 'Получившийся JSON');

            const status = document.createElement('div');
            status.id = 'dev-status';
            status.className = 'text-sm text-gray-400 mt-2';

            container.appendChild(textarea);
            container.appendChild(status);
            return { container, textarea, status };
        }

        #textField(id, label, value = '', inline = false) {
            const wrap = document.createElement('label');
            wrap.className = 'block text-sm text-gray-400' + (inline ? ' w-full' : '');
            wrap.innerHTML = `${label}`;
            const input = document.createElement('input');
            input.id = id; input.type = 'text'; input.value = value;
            input.className = 'mt-1 w-full bg-[#0b0b0b] text-gray-200 p-3 rounded-lg border border-color';
            wrap.appendChild(input);
            return { container: wrap, input };
        }

        #textareaField(id, label, value = '') {
            const wrap = document.createElement('label');
            wrap.className = 'block text-sm text-gray-400';
            wrap.innerHTML = `${label}`;
            const input = document.createElement('textarea');
            input.id = id; input.value = value;
            input.className = 'mt-1 w-full h-24 bg-[#0b0b0b] text-gray-200 p-2 rounded border border-color';
            wrap.appendChild(input);
            return { container: wrap, input };
        }

        generateJSON() {
            // Sync current inputs
            const text = this.getJSONText();
            this.outputArea.textarea.value = text;
            this.setStatus('JSON сформирован ниже. Скопируйте или скачайте файл.');
        }

        getJSONText() {
            // New format: array of tariffs
            const arr = this.tariffs.map(t => t.toJSON());
            return JSON.stringify(arr, null, 2);
        }

        setStatus(text, isError = false) {
            this.outputArea.status.textContent = text;
            this.outputArea.status.style.color = isError ? '#ef4444' : '#A3A3A3';
        }
    }

    async function loadJSON(url) {
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.json();
        } catch (e) { console.error(e); return null; }
    }

    async function initDevEditor() {
        const modal = document.getElementById('dev-editor-modal');
        const closeBtn = document.getElementById('dev-close-btn');
        const root = document.getElementById('dev-editor-root');

        const editor = new TariffsEditor(root);
        const data = await loadJSON('data/tariffs.json');
        editor.setData(data || {});
        editor.render();

        // Open modal
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        modal.classList.add('active');

        // Close handlers
        const close = () => { modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('modal-open'); modal.classList.remove('active'); };
        closeBtn.addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('active')) close(); });
    }

    // Auto-init
    initDevEditor();
})();


