/* TechOS Pro - Controlador da Interface do Usuário (UI Orchestration) */

const App = {
    currentTab: 'orders',
    activeOrderId: null,
    tokenCountdown: null,
    generatedDemoToken: null,

    init() {
        // Inicializa estado de autenticação
        const user = AUTH.getCurrentUser();
        if (user) {
            this.showMainApp();
        } else {
            this.showLogin();
        }

        // Listener de teclas de atalho (Esc para fechar modais)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    },

    // ==========================================
    // CONTROLE DE TELAS PRINCIPAIS (LOGIN / APP)
    // ==========================================
    showLogin() {
        document.getElementById('view-login').classList.remove('hidden');
        document.getElementById('view-app').classList.add('hidden');
        this.resetLoginForm();
    },

    showMainApp() {
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-app').classList.remove('hidden');

        this.updateHeaderUserInfo();
        this.applyRolePermissions();
        this.populateTechnicianSelects();
        this.switchTab('orders');
        this.renderOrders();
        this.updateNotificationBadge();
    },

    updateHeaderUserInfo() {
        const user = AUTH.getCurrentUser();
        if (!user) return;

        document.getElementById('header-user-name').innerText = user.name;
        document.getElementById('header-user-role').innerText = user.roleTitle || user.role;
        document.getElementById('header-user-avatar').src = user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

        const isTrusted = DB.hasTrustedToken(user.id);
        const trustedBadge = document.getElementById('header-trusted-device-badge');
        const forgetBtn = document.getElementById('btn-forget-token');

        if (isTrusted) {
            trustedBadge.classList.remove('hidden');
            forgetBtn.classList.remove('hidden');
            forgetBtn.style.display = 'inline-flex';
        } else {
            trustedBadge.classList.add('hidden');
            forgetBtn.classList.add('hidden');
            forgetBtn.style.display = 'none';
        }
    },

    // Aplica Regras de Acesso e Prioridade ADM
    applyRolePermissions() {
        const user = AUTH.getCurrentUser();
        const isAdmin = AUTH.isAdmin();

        const badgeAdmin = document.getElementById('badge-admin-priority');
        const badgeTech = document.getElementById('badge-tech-standard');
        const bannerAdmin = document.getElementById('role-banner-admin');
        const bannerColab = document.getElementById('role-banner-colab');
        const priorityStatus = document.getElementById('header-priority-status');

        if (isAdmin) {
            badgeAdmin.classList.remove('hidden');
            badgeTech.classList.add('hidden');
            bannerAdmin.classList.remove('hidden');
            bannerColab.classList.add('hidden');
            priorityStatus.innerHTML = '<span class="text-amber-600 font-bold"><i class="fa-solid fa-crown"></i> Prioridade Máxima (Nível 0)</span>';
        } else {
            badgeAdmin.classList.add('hidden');
            badgeTech.classList.remove('hidden');
            bannerAdmin.classList.add('hidden');
            bannerColab.classList.remove('hidden');
            priorityStatus.innerHTML = '<span class="text-slate-600">Acesso Operacional de Colaborador</span>';
        }

        // Elementos restritos a Administrador
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            if (isAdmin) {
                el.classList.remove('hidden');
                if (el.tagName === 'BUTTON' || el.tagName === 'SELECT') {
                    el.style.display = '';
                }
            } else {
                el.classList.add('hidden');
                el.style.display = 'none';
            }
        });
    },

    // ==========================================
    // FLUXO DE LOGIN E REQUISIÇÃO DE TOKEN (2FA)
    // ==========================================
    fillDemoCredentials(username, password) {
        document.getElementById('login-username').value = username;
        document.getElementById('login-password').value = password;
        this.showToast(`Credenciais de [${username}] preenchidas!`, 'info');
    },

    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        input.type = input.type === 'password' ? 'text' : 'password';
    },

    handleStep1Submit(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        const result = AUTH.submitCredentials(username, password);

        if (!result.success) {
            this.showToast(result.message, 'error');
            return;
        }

        // Se o token foi salvo previamente com "LEMBRA-ME", login direto!
        if (result.bypassed) {
            this.showToast(result.message, 'success');
            this.showMainApp();
            return;
        }

        // Caso contrário, transiciona para o Passo 2 (Solicitar Token de Acesso)
        this.generatedDemoToken = result.generatedToken;
        document.getElementById('form-step1').classList.add('hidden');
        document.getElementById('form-step2').classList.remove('hidden');

        document.getElementById('token-user-email').innerText = result.user.email;
        document.getElementById('display-generated-token').innerText = result.generatedToken;
        document.getElementById('input-token').value = '';
        document.getElementById('check-remember-token').checked = false; // Padrão desmarcado conforme especificação

        this.startTokenCountdown(result.expiresInSeconds);
        this.showToast(result.message, 'info');
    },

    startTokenCountdown(durationSeconds) {
        if (this.tokenCountdown) clearInterval(this.tokenCountdown);
        let remaining = durationSeconds;

        const timerDisplay = document.getElementById('token-timer');

        this.tokenCountdown = setInterval(() => {
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            timerDisplay.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            if (remaining <= 0) {
                clearInterval(this.tokenCountdown);
                timerDisplay.innerText = 'EXPIRADO';
                this.showToast('O token de acesso expirou. Solicite um novo código.', 'warning');
            }
            remaining--;
        }, 1000);
    },

    autoFillToken() {
        if (this.generatedDemoToken) {
            document.getElementById('input-token').value = this.generatedDemoToken;
            this.showToast('Código copiado para o campo de validação!', 'success');
        }
    },

    resendToken() {
        const result = AUTH.resendToken();
        if (result.success) {
            this.generatedDemoToken = result.token;
            document.getElementById('display-generated-token').innerText = result.token;
            this.startTokenCountdown(result.expiresInSeconds);
            this.showToast('Novo token gerado e enviado com sucesso!', 'info');
        }
    },

    cancelTokenStep() {
        if (this.tokenCountdown) clearInterval(this.tokenCountdown);
        document.getElementById('form-step2').classList.add('hidden');
        document.getElementById('form-step1').classList.remove('hidden');
    },

    handleStep2Submit(e) {
        e.preventDefault();
        const enteredToken = document.getElementById('input-token').value;
        const rememberMe = document.getElementById('check-remember-token').checked;

        const result = AUTH.verifyTokenAndLogin(enteredToken, rememberMe);

        if (!result.success) {
            this.showToast(result.message, 'error');
            return;
        }

        if (this.tokenCountdown) clearInterval(this.tokenCountdown);

        if (result.savedOnDevice) {
            this.showToast('Token SALVO neste dispositivo ("Lembrar-me" ativado). Próximos logins não exigirão token manual!', 'success');
        } else {
            this.showToast('Login efetuado com sessão única (Token NÃO salvo no dispositivo).', 'info');
        }

        this.showMainApp();
    },

    resetLoginForm() {
        if (this.tokenCountdown) clearInterval(this.tokenCountdown);
        document.getElementById('form-step1').classList.remove('hidden');
        document.getElementById('form-step2').classList.add('hidden');
        document.getElementById('login-password').value = '';
        document.getElementById('input-token').value = '';
    },

    logout() {
        AUTH.logout();
        this.showToast('Sessão encerrada com sucesso.', 'info');
        this.showLogin();
    },

    forgetThisDevice() {
        if (confirm('Deseja revogar o Token Salvo neste dispositivo? No próximo login, o sistema exigirá a validação de token novamente.')) {
            AUTH.forgetDevice();
            this.updateHeaderUserInfo();
            this.showToast('Token removido deste dispositivo! Próximo login exigirá novo token.', 'warning');
        }
    },

    // ==========================================
    // NAVEGAÇÃO DE ABAS DO DASHBOARD
    // ==========================================
    switchTab(tabName) {
        this.currentTab = tabName;

        const tabs = ['orders', 'collaborators', 'metrics', 'security'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-${t}`);
            const content = document.getElementById(`tab-content-${t}`);

            if (!btn || !content) return;

            if (t === tabName) {
                btn.className = 'px-3.5 py-2 rounded-lg bg-blue-50 text-blue-700 flex items-center gap-1.5 transition font-bold shadow-sm';
                content.classList.remove('hidden');
            } else {
                btn.className = `${t !== 'orders' ? 'admin-only ' : ''}px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition font-medium`;
                content.classList.add('hidden');
            }
        });

        // Re-aplica visibilidade das abas administrativas
        this.applyRolePermissions();

        if (tabName === 'orders') {
            this.renderOrders();
        } else if (tabName === 'collaborators') {
            this.renderCollaborators();
        } else if (tabName === 'metrics') {
            this.renderMetrics();
        } else if (tabName === 'security') {
            this.renderSecurityTab();
        }
    },

    // ==========================================
    // RENDERIZAÇÃO DE ORDENS DE SERVIÇO
    // ==========================================
    applyFilters() {
        this.renderOrders();
    },

    renderOrders() {
        const filters = {
            search: document.getElementById('filter-search')?.value || '',
            status: document.getElementById('filter-status')?.value || 'ALL',
            priority: document.getElementById('filter-priority')?.value || 'ALL',
            technicianId: document.getElementById('filter-technician')?.value || 'ALL'
        };

        const orders = OSManager.getFilteredOrders(filters);
        const container = document.getElementById('orders-container');
        const emptyState = document.getElementById('orders-empty');
        const tabCount = document.getElementById('tab-orders-count');

        if (tabCount) tabCount.innerText = orders.length;

        if (orders.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        container.innerHTML = orders.map(order => {
            const isCritical = order.priority === 'CRITICA_ADMIN';
            const tech = order.assignedTo ? DB.getUserById(order.assignedTo) : null;
            const techName = tech ? tech.name : 'Aguardando Despacho';
            const techAvatar = tech ? tech.avatar : 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

            // Badges
            let priorityClass = 'priority-baixa';
            let priorityLabel = 'Baixa';
            if (order.priority === 'CRITICA_ADMIN') {
                priorityClass = 'priority-critica';
                priorityLabel = '👑 CRÍTICA (ADMIN)';
            } else if (order.priority === 'ALTA') {
                priorityClass = 'priority-alta';
                priorityLabel = 'Alta';
            } else if (order.priority === 'MEDIA') {
                priorityClass = 'priority-media';
                priorityLabel = 'Média';
            }

            let statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Pendente</span>';
            if (order.status === 'EM_ANDAMENTO') {
                statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Em Andamento</span>';
            } else if (order.status === 'AGUARDANDO_PECA') {
                statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">Aguardando Peça</span>';
            } else if (order.status === 'CONCLUIDA') {
                statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Concluída</span>';
            } else if (order.status === 'CANCELADA') {
                statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">Cancelada</span>';
            }

            const isAdmin = AUTH.isAdmin();

            return `
                <div class="os-card bg-white rounded-2xl border ${isCritical ? 'border-red-400 ring-2 ring-red-300/40 shadow-lg' : 'border-slate-200 shadow-sm'} p-4 flex flex-col justify-between">
                    <div>
                        <!-- Cabeçalho do Card -->
                        <div class="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                            <div class="flex items-center gap-2">
                                <span class="font-black text-xs font-mono text-slate-900">${order.id}</span>
                                ${isCritical ? '<span class="text-xs text-red-600 animate-bounce" title="Despacho com Prioridade Crítica do Administrador"><i class="fa-solid fa-crown"></i></span>' : ''}
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="px-2 py-0.5 rounded-full text-[10px] ${priorityClass}">${priorityLabel}</span>
                                ${statusBadge}
                            </div>
                        </div>

                        <!-- Cliente & Equipamento -->
                        <div class="space-y-1 mb-3">
                            <h4 class="font-bold text-slate-900 text-sm leading-snug line-clamp-1">${order.clientName}</h4>
                            <div class="text-xs text-slate-600 flex items-center gap-1 font-medium">
                                <i class="fa-solid fa-laptop text-slate-400"></i>
                                <span>${order.deviceType}: ${order.deviceBrand}</span>
                            </div>
                            <div class="text-[11px] text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                                <strong class="text-slate-700 font-semibold">Problema:</strong> ${order.description}
                            </div>
                        </div>

                        <!-- Técnico Atribuído -->
                        <div class="flex items-center justify-between text-xs py-2 px-2.5 bg-slate-50 rounded-xl border border-slate-100 mb-3">
                            <div class="flex items-center gap-2">
                                <img src="${techAvatar}" class="w-6 h-6 rounded-full object-cover border border-slate-300">
                                <div>
                                    <div class="text-[10px] text-slate-400 uppercase font-bold">Colaborador</div>
                                    <div class="font-bold text-slate-800 text-[11px]">${techName}</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-[10px] text-slate-400 uppercase font-bold">Orçamento</div>
                                <div class="font-black text-emerald-700 text-xs">R$ ${(order.estimatedCost || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Rodapé com Ações -->
                    <div class="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5">
                        <div class="text-[10px] text-slate-400">
                            <i class="fa-regular fa-calendar-days mr-0.5"></i> ${order.createdAt}
                        </div>

                        <div class="flex items-center gap-1">
                            ${isAdmin ? `
                                <button type="button" onclick="App.openQuickDispatchModal('${order.id}')" title="Despachar / Reatribuir OS"
                                    class="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold transition">
                                    <i class="fa-solid fa-paper-plane"></i>
                                </button>
                                <button type="button" onclick="App.deleteOrder('${order.id}')" title="Excluir OS (Admin)"
                                    class="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            ` : ''}

                            <button type="button" onclick="App.openPrintModal('${order.id}')" title="Imprimir Folha de Serviço"
                                class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition">
                                <i class="fa-solid fa-print"></i>
                            </button>

                            <button type="button" onclick="App.openViewOrderModal('${order.id}')"
                                class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm">
                                <span>Ver Detalhes</span>
                                <i class="fa-solid fa-chevron-right text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ==========================================
    // CRIAÇÃO E DESPACHO DE NOVA OS (ADMIN)
    // ==========================================
    openCreateOrderModal() {
        this.populateTechnicianSelects();
        document.getElementById('modal-create-order').classList.remove('hidden');
    },

    handleCreateOrderSubmit(e) {
        e.preventDefault();

        const orderData = {
            clientName: document.getElementById('new-os-client-name').value,
            clientPhone: document.getElementById('new-os-client-phone').value,
            clientEmail: document.getElementById('new-os-client-email').value,
            deviceType: document.getElementById('new-os-device-type').value,
            deviceBrand: document.getElementById('new-os-device-brand').value,
            deviceSerial: document.getElementById('new-os-device-serial').value,
            devicePassword: document.getElementById('new-os-device-password').value,
            accessories: document.getElementById('new-os-accessories').value,
            description: document.getElementById('new-os-description').value,
            preliminaryDiagnosis: document.getElementById('new-os-preliminary').value,
            assignedTo: document.getElementById('new-os-assigned-to').value,
            priority: document.getElementById('new-os-priority').value,
            status: document.getElementById('new-os-assigned-to').value ? 'EM_ANDAMENTO' : 'PENDENTE',
            laborCost: 150.00,
            partsCost: 0.00
        };

        const newOrder = OSManager.createOrder(orderData);

        this.closeModal('modal-create-order');
        this.renderOrders();
        this.showToast(`Ordem ${newOrder.id} criada e despachada com sucesso!`, 'success');

        // Se despachada para alguém, toca um som suave de notificação
        if (newOrder.assignedTo) {
            this.playNotificationSound();
        }
    },

    // ==========================================
    // MODAL DE DETALHES DA OS / BANCADA TÉCNICA
    // ==========================================
    openViewOrderModal(orderId) {
        this.activeOrderId = orderId;
        const order = DB.getOrderById(orderId);
        if (!order) return;

        document.getElementById('modal-os-id').innerText = order.id;

        // Badges
        const priorityBadge = document.getElementById('modal-os-priority-badge');
        priorityBadge.className = `px-2.5 py-0.5 rounded-full text-xs font-bold ${
            order.priority === 'CRITICA_ADMIN' ? 'priority-critica' :
            order.priority === 'ALTA' ? 'priority-alta' :
            order.priority === 'MEDIA' ? 'priority-media' : 'priority-baixa'
        }`;
        priorityBadge.innerText = order.priority === 'CRITICA_ADMIN' ? '👑 CRÍTICA (ADMIN)' : order.priority;

        const statusBadge = document.getElementById('modal-os-status-badge');
        statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800';
        statusBadge.innerText = order.status;

        document.getElementById('modal-os-client').innerText = order.clientName;
        document.getElementById('modal-os-contact').innerText = `Tel: ${order.clientPhone} • E-mail: ${order.clientEmail || 'Não informado'}`;
        document.getElementById('modal-os-device').innerText = `${order.deviceType} - ${order.deviceBrand}`;
        document.getElementById('modal-os-serial').innerText = `Nº Série: ${order.deviceSerial} | Acessórios: ${order.accessories}`;
        document.getElementById('modal-os-password').innerText = `Senha de Acesso: ${order.devicePassword}`;
        document.getElementById('modal-os-desc').innerText = order.description;

        // Responsável
        const tech = order.assignedTo ? DB.getUserById(order.assignedTo) : null;
        document.getElementById('modal-os-assigned-tech-badge').innerHTML = `
            Responsável: <span class="font-bold text-blue-800">${tech ? tech.name : 'Não Atribuído'}</span>
        `;

        // Campos editáveis da bancada
        document.getElementById('modal-update-status').value = order.status;
        document.getElementById('modal-update-labor').value = order.laborCost || 0;
        document.getElementById('modal-technical-solution').value = order.technicalSolution || '';
        document.getElementById('modal-new-tech-note').value = '';

        // Checklist
        const chk = order.checklist || {};
        document.getElementById('chk-clean').checked = !!chk.internalCleaned;
        document.getElementById('chk-paste').checked = !!chk.thermalPasteReplaced;
        document.getElementById('chk-stress').checked = !!chk.stressTestPassed;
        document.getElementById('chk-backup').checked = !!chk.backupConfirmed;
        document.getElementById('chk-screen').checked = !!chk.screenOk;
        document.getElementById('chk-charger').checked = !!chk.chargerTested;

        // Peças
        this.renderPartsList(order);

        // Logs
        this.renderOrderLogs(order);

        document.getElementById('modal-view-order').classList.remove('hidden');
    },

    renderPartsList(order) {
        const listEl = document.getElementById('modal-parts-list');
        const totalEl = document.getElementById('modal-parts-total-cost');

        const parts = order.partsUsed || [];
        const total = parts.reduce((acc, p) => acc + (p.price * (p.qty || 1)), 0);

        totalEl.innerText = `Total Peças: R$ ${total.toFixed(2)}`;

        if (parts.length === 0) {
            listEl.innerHTML = '<div class="text-[11px] text-slate-400 italic">Nenhuma peça ou componente adicionado.</div>';
            return;
        }

        listEl.innerHTML = parts.map((part, index) => `
            <div class="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs">
                <div>
                    <span class="font-bold text-slate-800">${part.name}</span>
                    <span class="text-slate-400 ml-2">(Qtd: ${part.qty || 1})</span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-bold text-emerald-700">R$ ${(part.price * (part.qty || 1)).toFixed(2)}</span>
                    <button type="button" onclick="App.removePart(${index})" class="text-red-500 hover:text-red-700 text-xs">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    renderOrderLogs(order) {
        const logsEl = document.getElementById('modal-os-logs');
        const logs = order.logs || [];

        logsEl.innerHTML = logs.map(log => `
            <div class="relative pb-2">
                <div class="text-[10px] text-slate-400 font-bold">${log.date} — <span class="text-blue-700">${log.user}</span></div>
                <div class="text-slate-700 text-xs font-sans mt-0.5">${log.action}</div>
            </div>
        `).join('');
    },

    addPart() {
        const nameInput = document.getElementById('part-name');
        const priceInput = document.getElementById('part-price');

        const name = nameInput.value;
        const price = priceInput.value;

        if (!name.trim()) {
            this.showToast('Informe o nome da peça.', 'warning');
            return;
        }

        OSManager.addPartToOrder(this.activeOrderId, name, price, 1);
        nameInput.value = '';
        priceInput.value = '';

        const updatedOrder = DB.getOrderById(this.activeOrderId);
        this.renderPartsList(updatedOrder);
        this.renderOrderLogs(updatedOrder);
        this.renderOrders();
        this.showToast('Peça adicionada ao orçamento!', 'success');
    },

    removePart(index) {
        OSManager.removePartFromOrder(this.activeOrderId, index);
        const updatedOrder = DB.getOrderById(this.activeOrderId);
        this.renderPartsList(updatedOrder);
        this.renderOrderLogs(updatedOrder);
        this.renderOrders();
    },

    addTechnicianNote() {
        const noteInput = document.getElementById('modal-new-tech-note');
        const note = noteInput.value;

        if (!note.trim()) {
            this.showToast('Digite a nota técnica antes de adicionar.', 'warning');
            return;
        }

        OSManager.updateTechnicianProgress(this.activeOrderId, { note });
        noteInput.value = '';

        const updatedOrder = DB.getOrderById(this.activeOrderId);
        this.renderOrderLogs(updatedOrder);
        this.showToast('Apontamento técnico registrado!', 'info');
    },

    saveOrderProgress() {
        const status = document.getElementById('modal-update-status').value;
        const laborCost = document.getElementById('modal-update-labor').value;
        const technicalSolution = document.getElementById('modal-technical-solution').value;

        const checklist = {
            internalCleaned: document.getElementById('chk-clean').checked,
            thermalPasteReplaced: document.getElementById('chk-paste').checked,
            stressTestPassed: document.getElementById('chk-stress').checked,
            backupConfirmed: document.getElementById('chk-backup').checked,
            screenOk: document.getElementById('chk-screen').checked,
            chargerTested: document.getElementById('chk-charger').checked,
        };

        const result = OSManager.updateTechnicianProgress(this.activeOrderId, {
            status,
            laborCost,
            technicalSolution,
            checklist
        });

        if (result.success) {
            this.showToast(result.message, 'success');
            this.closeModal('modal-view-order');
            this.renderOrders();
        } else {
            this.showToast(result.message, 'error');
        }
    },

    // ==========================================
    // DESPACHO RÁPIDO DO ADMINISTRADOR
    // ==========================================
    openQuickDispatchModal(orderId) {
        this.activeOrderId = orderId;
        const order = DB.getOrderById(orderId);
        if (!order) return;

        document.getElementById('dispatch-target-os-title').innerText = `${order.id} - ${order.clientName} (${order.deviceBrand})`;
        document.getElementById('dispatch-note').value = '';

        const select = document.getElementById('dispatch-select-tech');
        const users = DB.getUsers().filter(u => u.role === 'COLABORADOR');
        select.innerHTML = users.map(u => `
            <option value="${u.id}" ${order.assignedTo === u.id ? 'selected' : ''}>
                ${u.name} — Especialidade: ${u.specialty}
            </option>
        `).join('');

        document.getElementById('modal-quick-dispatch').classList.remove('hidden');
    },

    confirmDispatch() {
        const techId = document.getElementById('dispatch-select-tech').value;
        const note = document.getElementById('dispatch-note').value;

        const result = OSManager.dispatchOrder(this.activeOrderId, techId, note);
        if (result.success) {
            this.closeModal('modal-quick-dispatch');
            this.renderOrders();
            this.playNotificationSound();
            this.showToast(result.message, 'success');
        } else {
            this.showToast(result.message, 'error');
        }
    },

    // ==========================================
    // IMPRESSÃO OFICIAL DA ORDEM DE SERVIÇO
    // ==========================================
    openPrintModal(orderId) {
        const order = DB.getOrderById(orderId);
        if (!order) return;

        document.getElementById('print-os-id').innerText = order.id;
        document.getElementById('print-os-date').innerText = `Data de Abertura: ${order.createdAt}`;
        document.getElementById('print-os-status').innerText = `STATUS: ${order.status}`;
        document.getElementById('print-client-name').innerText = order.clientName;
        document.getElementById('print-client-phone').innerText = `Telefone: ${order.clientPhone}`;
        document.getElementById('print-client-email').innerText = `E-mail: ${order.clientEmail || 'Não cadastrado'}`;
        document.getElementById('print-device-info').innerText = `${order.deviceType} • ${order.deviceBrand}`;
        document.getElementById('print-device-serial').innerText = `Nº de Série: ${order.deviceSerial || 'S/N'}`;
        document.getElementById('print-device-accessories').innerText = `Acessórios Recebidos: ${order.accessories || 'Nenhum'}`;
        document.getElementById('print-problem-desc').innerText = order.description;
        document.getElementById('print-solution-desc').innerText = order.technicalSolution || order.preliminaryDiagnosis || 'Em análise técnica.';

        const tech = order.assignedTo ? DB.getUserById(order.assignedTo) : null;
        document.getElementById('print-tech-sign').innerText = tech ? `${tech.name} (Técnico Responsável)` : 'Técnico Responsável';

        // Tabela de Peças e Serviços
        const partsContainer = document.getElementById('print-parts-table');
        let partsHtml = `
            <div class="flex justify-between text-slate-700">
                <span>Mão de Obra e Diagnóstico Técnico de Bancada</span>
                <span class="font-bold">R$ ${(order.laborCost || 0).toFixed(2)}</span>
            </div>
        `;

        if (order.partsUsed && order.partsUsed.length > 0) {
            order.partsUsed.forEach(p => {
                partsHtml += `
                    <div class="flex justify-between text-slate-700">
                        <span>${p.name} (x${p.qty || 1})</span>
                        <span class="font-bold">R$ ${(p.price * (p.qty || 1)).toFixed(2)}</span>
                    </div>
                `;
            });
        }

        partsContainer.innerHTML = partsHtml;
        document.getElementById('print-total-amount').innerText = `R$ ${(order.estimatedCost || 0).toFixed(2)}`;

        document.getElementById('modal-print-os').classList.remove('hidden');
    },

    printCurrentOrder() {
        if (this.activeOrderId) {
            this.openPrintModal(this.activeOrderId);
        }
    },

    deleteOrder(orderId) {
        if (confirm(`Confirma a exclusão definitiva da Ordem de Serviço ${orderId}? Esta ação é restrita a administradores.`)) {
            const res = OSManager.deleteOrder(orderId);
            if (res.success) {
                this.renderOrders();
                this.showToast(res.message, 'warning');
            } else {
                this.showToast(res.message, 'error');
            }
        }
    },

    // ==========================================
    // GESTÃO DE COLABORADORES (ADMIN)
    // ==========================================
    renderCollaborators() {
        const users = DB.getUsers();
        const orders = DB.getOrders();
        const grid = document.getElementById('collaborators-grid');

        grid.innerHTML = users.map(user => {
            const isAdmin = user.role === 'ADMIN';
            const userOrders = orders.filter(o => o.assignedTo === user.id && o.status !== 'CONCLUIDA' && o.status !== 'CANCELADA');
            const hasTrustedToken = DB.hasTrustedToken(user.id);

            return `
                <div class="bg-white rounded-2xl border ${isAdmin ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'} p-5 shadow-sm flex flex-col justify-between">
                    <div>
                        <div class="flex items-center gap-3 mb-3">
                            <img src="${user.avatar}" class="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-sm">
                            <div>
                                <div class="flex items-center gap-1.5">
                                    <h4 class="font-bold text-slate-900 text-sm">${user.name}</h4>
                                    ${isAdmin ? '<span class="text-amber-500 text-xs"><i class="fa-solid fa-crown"></i></span>' : ''}
                                </div>
                                <div class="text-[11px] font-semibold text-slate-500">${user.roleTitle || user.role}</div>
                                <div class="text-[10px] text-blue-600 font-mono">@${user.username} • ${user.email}</div>
                            </div>
                        </div>

                        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600 mb-3">
                            <strong>Especialidade:</strong> ${user.specialty || 'Informática Geral'}
                        </div>

                        <div class="grid grid-cols-2 gap-2 text-center text-xs mb-3">
                            <div class="bg-blue-50 p-2 rounded-xl text-blue-900">
                                <div class="font-black text-sm">${userOrders.length}</div>
                                <div class="text-[10px] text-blue-600 font-bold uppercase">OS em Aberto</div>
                            </div>
                            <div class="bg-emerald-50 p-2 rounded-xl text-emerald-900">
                                <div class="font-black text-sm">${orders.filter(o => o.assignedTo === user.id && o.status === 'CONCLUIDA').length}</div>
                                <div class="text-[10px] text-emerald-600 font-bold uppercase">Concluídas</div>
                            </div>
                        </div>

                        <div class="text-[11px] flex items-center justify-between py-1.5 px-2 rounded-lg ${hasTrustedToken ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500'}">
                            <span class="flex items-center gap-1">
                                <i class="fa-solid ${hasTrustedToken ? 'fa-shield-check text-emerald-600' : 'fa-clock'}"></i>
                                ${hasTrustedToken ? 'Token Salvo ("Lembrar-me")' : 'Sem Token Salvo'}
                            </span>
                            ${hasTrustedToken ? `
                                <button type="button" onclick="App.revokeUserToken('${user.id}')" title="Revogar Token Salvo" class="text-xs text-red-600 hover:underline">
                                    Revogar
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    ${!isAdmin ? `
                        <div class="pt-3 border-t border-slate-100 flex justify-end gap-2 mt-3">
                            <button type="button" onclick="App.deleteUser('${user.id}')" class="text-xs text-red-500 hover:text-red-700 font-bold">
                                Excluir Técnico
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    openCreateUserModal() {
        document.getElementById('modal-create-user').classList.remove('hidden');
    },

    handleCreateUserSubmit(e) {
        e.preventDefault();

        const name = document.getElementById('new-user-name').value;
        const username = document.getElementById('new-user-username').value.toLowerCase().trim();
        const password = document.getElementById('new-user-password').value;
        const email = document.getElementById('new-user-email').value;
        const specialty = document.getElementById('new-user-specialty').value;

        if (DB.getUserByUsername(username)) {
            this.showToast('Este nome de usuário já está cadastrado.', 'error');
            return;
        }

        const newUser = {
            id: `usr-tec-${Date.now()}`,
            username,
            password,
            name,
            email,
            role: 'COLABORADOR',
            roleTitle: 'Técnico de Informática (Acesso Restrito)',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            phone: '(11) 90000-0000',
            specialty: specialty || 'Suporte e Manutenção de Informática',
            active: true,
            priorityLevel: 10
        };

        DB.saveUser(newUser);
        DB.addAuditLog(AUTH.getCurrentUser().name, `Cadastrou novo colaborador: "${newUser.name}" (@${newUser.username}).`, 'SECURITY');

        this.closeModal('modal-create-user');
        this.renderCollaborators();
        this.populateTechnicianSelects();
        this.showToast(`Colaborador ${newUser.name} cadastrado com sucesso!`, 'success');
    },

    deleteUser(userId) {
        const u = DB.getUserById(userId);
        if (!u) return;

        if (confirm(`Deseja remover o acesso do técnico ${u.name}?`)) {
            DB.deleteUser(userId);
            DB.removeTrustedToken(userId);
            DB.addAuditLog(AUTH.getCurrentUser().name, `Removeu o colaborador "${u.name}".`, 'SECURITY');
            this.renderCollaborators();
            this.populateTechnicianSelects();
            this.showToast('Colaborador removido.', 'warning');
        }
    },

    revokeUserToken(userId) {
        DB.removeTrustedToken(userId);
        this.renderCollaborators();
        this.showToast('Token de acesso deste usuário foi revogado. O próximo login exigirá autenticação por token.', 'info');
    },

    // ==========================================
    // ABA DE MÉTRICAS EXECUTIVAS (ADMIN)
    // ==========================================
    renderMetrics() {
        const m = OSManager.getDashboardMetrics();

        document.getElementById('metric-total-orders').innerText = m.total;
        document.getElementById('metric-active-orders').innerText = m.emAndamento + m.pendentes;
        document.getElementById('metric-completed-orders').innerText = m.concluidas;
        document.getElementById('metric-revenue').innerText = `R$ ${m.faturamentoConcluido.toFixed(2)}`;

        const techTable = document.getElementById('tech-productivity-table');
        techTable.innerHTML = m.techStats.map(tech => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div class="flex items-center gap-3">
                    <img src="${tech.avatar}" class="w-8 h-8 rounded-xl object-cover border border-slate-300">
                    <div>
                        <div class="font-bold text-slate-800">${tech.name}</div>
                        <div class="text-[10px] text-slate-500">${tech.specialty}</div>
                    </div>
                </div>
                <div class="flex items-center gap-4 text-right">
                    <div>
                        <div class="font-black text-amber-600">${tech.activeCount}</div>
                        <div class="text-[10px] text-slate-400">Ativas</div>
                    </div>
                    <div>
                        <div class="font-black text-emerald-600">${tech.completedCount}</div>
                        <div class="text-[10px] text-slate-400">Concluídas</div>
                    </div>
                    <div>
                        <div class="font-black text-slate-800">${tech.totalCount}</div>
                        <div class="text-[10px] text-slate-400">Total</div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // ==========================================
    // ABA DE SEGURANÇA E TOKENS (ADMIN)
    // ==========================================
    renderSecurityTab() {
        const tokensObj = DB.getSavedTokens();
        const listContainer = document.getElementById('trusted-tokens-list');
        const userKeys = Object.keys(tokensObj);

        if (userKeys.length === 0) {
            listContainer.innerHTML = '<div class="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl italic">Nenhum dispositivo possui token salvo com "LEMBRA-ME" no momento. Todos os logins exigirão token.</div>';
        } else {
            listContainer.innerHTML = userKeys.map(uid => {
                const u = DB.getUserById(uid);
                const info = tokensObj[uid];
                return `
                    <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                            <div class="font-bold text-slate-800 flex items-center gap-1.5">
                                <i class="fa-solid fa-laptop text-blue-600"></i>
                                ${u ? u.name : 'Usuário Desconhecido'} (${u ? u.role : ''})
                            </div>
                            <div class="text-[10px] text-slate-500 mt-0.5">
                                Salvo em: ${new Date(info.savedAt).toLocaleString('pt-BR')} • Vence em: ${new Date(info.expiresAt).toLocaleDateString('pt-BR')}
                            </div>
                        </div>
                        <button type="button" onclick="App.revokeUserToken('${uid}'); App.renderSecurityTab();" class="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition">
                            Revogar Token
                        </button>
                    </div>
                `;
            }).join('');
        }

        // Tabela de Auditoria
        const logs = DB.getAuditLogs();
        const tbody = document.getElementById('audit-table-body');
        tbody.innerHTML = logs.slice(0, 30).map(log => {
            let typeBadge = 'bg-blue-100 text-blue-800';
            if (log.type === 'SECURITY') typeBadge = 'bg-amber-100 text-amber-800 font-bold';
            if (log.type === 'LOGIN') typeBadge = 'bg-emerald-100 text-emerald-800';
            if (log.type === 'LOGOUT') typeBadge = 'bg-slate-200 text-slate-700';

            return `
                <tr class="hover:bg-slate-50">
                    <td class="py-2 px-3 text-slate-500 text-[10px]">${log.timestamp}</td>
                    <td class="py-2 px-3 font-bold text-slate-800">${log.user}</td>
                    <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded text-[10px] ${typeBadge}">${log.type}</span></td>
                    <td class="py-2 px-3 text-slate-700 text-xs">${log.action}</td>
                </tr>
            `;
        }).join('');
    },

    revokeAllTokens() {
        if (confirm('Revogar todos os tokens salvos com "Lembrar-me"? Todos os colaboradores e administradores precisarão de token 2FA para entrar novamente.')) {
            DB.clearAllTrustedTokens();
            this.renderSecurityTab();
            this.updateHeaderUserInfo();
            this.showToast('Todos os tokens salvos foram revogados!', 'warning');
        }
    },

    clearAuditLogs() {
        localStorage.setItem(DB_KEYS.AUDIT, JSON.stringify([]));
        this.renderSecurityTab();
        this.showToast('Registros de auditoria limpos.', 'info');
    },

    // ==========================================
    // NOTIFICAÇÕES E UTILITÁRIOS
    // ==========================================
    updateNotificationBadge() {
        const user = AUTH.getCurrentUser();
        const badge = document.getElementById('notif-badge');
        if (!user || !badge) return;

        const orders = DB.getOrders();
        const myActive = orders.filter(o => o.assignedTo === user.id && o.status === 'EM_ANDAMENTO');

        if (myActive.length > 0) {
            badge.innerText = myActive.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    },

    showNotifications() {
        const user = AUTH.getCurrentUser();
        if (!user) return;

        const orders = DB.getOrders().filter(o => o.assignedTo === user.id && o.status !== 'CONCLUIDA');
        if (orders.length === 0) {
            this.showToast('Você não possui ordens pendentes no momento.', 'info');
        } else {
            this.showToast(`Você possui ${orders.length} ordem(ns) de serviço em andamento na sua bancada.`, 'info');
        }
    },

    populateTechnicianSelects() {
        const users = DB.getUsers().filter(u => u.role === 'COLABORADOR');

        // Select de nova OS
        const assignSelect = document.getElementById('new-os-assigned-to');
        if (assignSelect) {
            assignSelect.innerHTML = '<option value="">-- Não atribuir agora (Fila Geral) --</option>' +
                users.map(u => `<option value="${u.id}">${u.name} (${u.specialty})</option>`).join('');
        }

        // Filtro de técnicos na barra de ferramentas
        const filterTech = document.getElementById('filter-technician');
        if (filterTech) {
            filterTech.innerHTML = '<option value="ALL">Técnico: Todos</option>' +
                users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
        }
    },

    closeModal(modalId) {
        document.getElementById(modalId)?.classList.add('hidden');
    },

    closeAllModals() {
        const modals = ['modal-create-order', 'modal-view-order', 'modal-quick-dispatch', 'modal-print-os', 'modal-create-user'];
        modals.forEach(id => this.closeModal(id));
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-triangle-exclamation';
        if (type === 'warning') icon = 'fa-bell';

        toast.innerHTML = `
            <i class="fa-solid ${icon} text-lg"></i>
            <div class="text-xs leading-snug">${message}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    playNotificationSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) {
            // Audio context bloqueado antes de interação do usuário
        }
    }
};

// Inicializa a aplicação ao carregar
window.addEventListener('DOMContentLoaded', () => {
    App.init();
});
