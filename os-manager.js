/* TechOS Pro - Gerenciador de Ordens de Serviço de Informática */

const OSManager = {
    // Retorna lista filtrada conforme perfil de acesso e filtros da UI
    getFilteredOrders(filters = {}) {
        const user = AUTH.getCurrentUser();
        let orders = DB.getOrders();

        // Se for COLABORADOR: vê suas ordens atribuídas (ou ordens livres se configurado)
        if (AUTH.isColaborador()) {
            if (filters.viewScope === 'assigned_to_me' || !filters.viewScope) {
                orders = orders.filter(o => o.assignedTo === user.id);
            }
        }

        // Filtro por Status
        if (filters.status && filters.status !== 'ALL') {
            orders = orders.filter(o => o.status === filters.status);
        }

        // Filtro por Técnico (para Admin)
        if (filters.technicianId && filters.technicianId !== 'ALL') {
            orders = orders.filter(o => o.assignedTo === filters.technicianId);
        }

        // Filtro por Prioridade
        if (filters.priority && filters.priority !== 'ALL') {
            orders = orders.filter(o => o.priority === filters.priority);
        }

        // Busca textual (Cliente, Equipamento, Número da OS, Descrição)
        if (filters.search && filters.search.trim() !== '') {
            const q = filters.search.toLowerCase().trim();
            orders = orders.filter(o =>
                o.id.toLowerCase().includes(q) ||
                o.clientName.toLowerCase().includes(q) ||
                o.deviceBrand.toLowerCase().includes(q) ||
                o.deviceType.toLowerCase().includes(q) ||
                o.description.toLowerCase().includes(q) ||
                (o.deviceSerial && o.deviceSerial.toLowerCase().includes(q))
            );
        }

        // Ordenação inteligente:
        // 1. Ordens de Prioridade CRITICA_ADMIN no topo absoluto
        // 2. Prioridade ALTA
        // 3. Status não-concluídos antes dos concluídos
        // 4. Data de criação mais recente
        const priorityWeight = {
            'CRITICA_ADMIN': 100,
            'ALTA': 75,
            'MEDIA': 50,
            'BAIXA': 25
        };

        orders.sort((a, b) => {
            // Concluídas vão para o final se comparadas a pendentes
            if (a.status === 'CONCLUIDA' && b.status !== 'CONCLUIDA') return 1;
            if (a.status !== 'CONCLUIDA' && b.status === 'CONCLUIDA') return -1;

            const weightA = priorityWeight[a.priority] || 0;
            const weightB = priorityWeight[b.priority] || 0;

            if (weightB !== weightA) {
                return weightB - weightA;
            }

            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        return orders;
    },

    // Gera próximo ID de OS
    getNextId() {
        const orders = DB.getOrders();
        let maxNum = 100;
        orders.forEach(o => {
            const match = o.id.match(/\d+$/);
            if (match) {
                const num = parseInt(match[0], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        return `OS-2026-${maxNum + 1}`;
    },

    // Cria nova Ordem de Serviço (Ação típica do Administrador ao despachar)
    createOrder(data) {
        const user = AUTH.getCurrentUser();
        const newId = this.getNextId();

        const assignedUser = data.assignedTo ? DB.getUserById(data.assignedTo) : null;
        const assignedName = assignedUser ? assignedUser.name : 'Aguardando Despacho';

        const nowStr = new Date().toLocaleString('pt-BR');

        const newOrder = {
            id: newId,
            clientName: data.clientName.trim(),
            clientPhone: data.clientPhone.trim(),
            clientEmail: data.clientEmail ? data.clientEmail.trim() : '',
            deviceType: data.deviceType || 'Computador Desktop',
            deviceBrand: data.deviceBrand.trim(),
            deviceSerial: data.deviceSerial ? data.deviceSerial.trim() : 'S/N Não informado',
            devicePassword: data.devicePassword ? data.devicePassword.trim() : 'Sem senha',
            accessories: data.accessories ? data.accessories.trim() : 'Nenhum acessório adicional',
            category: data.category || 'Manutenção Geral',
            description: data.description.trim(),
            preliminaryDiagnosis: data.preliminaryDiagnosis ? data.preliminaryDiagnosis.trim() : 'Avaliação em bancada pendente.',
            technicalSolution: '',
            partsUsed: [],
            status: data.status || 'PENDENTE',
            priority: data.priority || 'MEDIA',
            assignedTo: data.assignedTo || '',
            assignedByName: user ? user.name : 'Administrador',
            assignedAt: data.assignedTo ? nowStr : null,
            createdAt: nowStr,
            completedAt: null,
            laborCost: parseFloat(data.laborCost) || 0,
            partsCost: parseFloat(data.partsCost) || 0,
            estimatedCost: (parseFloat(data.laborCost) || 0) + (parseFloat(data.partsCost) || 0),
            checklist: data.checklist || {
                screenOk: true,
                chargerTested: true,
                keyboardOk: true,
                backupConfirmed: false,
                internalCleaned: false,
                thermalPasteReplaced: false,
                stressTestPassed: false
            },
            logs: [
                {
                    date: nowStr,
                    user: user ? `${user.name} (${user.role})` : 'Sistema',
                    action: data.assignedTo 
                        ? `Ordem de Serviço criada e despachada diretamente para ${assignedName}.`
                        : `Ordem de Serviço criada e inserida na fila geral de espera.`
                }
            ]
        };

        DB.saveOrder(newOrder);
        DB.addAuditLog(user ? user.name : 'Admin', `Criou a ${newId} para o cliente "${newOrder.clientName}" (${newOrder.priority}).`, 'ORDER');

        return newOrder;
    },

    // Despacho ou Reatribuição de OS para outro Colaborador (Exclusivo ADM)
    dispatchOrder(orderId, technicianId, priorityNote = '') {
        const user = AUTH.getCurrentUser();
        const order = DB.getOrderById(orderId);
        if (!order) return { success: false, message: 'Ordem de serviço não encontrada.' };

        const tech = DB.getUserById(technicianId);
        if (!tech) return { success: false, message: 'Colaborador selecionado não existe.' };

        const nowStr = new Date().toLocaleString('pt-BR');
        const oldTech = order.assignedTo ? (DB.getUserById(order.assignedTo)?.name || 'Anterior') : 'Ninguém';

        order.assignedTo = tech.id;
        order.assignedByName = user.name;
        order.assignedAt = nowStr;

        if (order.status === 'PENDENTE') {
            order.status = 'EM_ANDAMENTO';
        }

        order.logs.unshift({
            date: nowStr,
            user: `${user.name} (Administrador - Despacho Prioritário)`,
            action: `OS despachada para o colaborador ${tech.name}. ${priorityNote ? 'Obs: ' + priorityNote : ''}`
        });

        DB.saveOrder(order);
        DB.addAuditLog(user.name, `Despachou a ${order.id} de "${oldTech}" para o técnico "${tech.name}".`, 'ORDER');

        return { success: true, message: `Ordem ${order.id} despachada com sucesso para ${tech.name}!` };
    },

    // Atualização de Status e Apontamento Técnico pelo Colaborador
    updateTechnicianProgress(orderId, updateData) {
        const user = AUTH.getCurrentUser();
        const order = DB.getOrderById(orderId);
        if (!order) return { success: false, message: 'Ordem não encontrada.' };

        // Colaborador só pode mexer na sua própria OS (a não ser que seja Admin)
        if (AUTH.isColaborador() && order.assignedTo !== user.id) {
            return { success: false, message: 'Permissão negada. Esta OS não está atribuída a você.' };
        }

        const nowStr = new Date().toLocaleString('pt-BR');

        if (updateData.status && updateData.status !== order.status) {
            const oldStatus = order.status;
            order.status = updateData.status;

            if (updateData.status === 'CONCLUIDA') {
                order.completedAt = nowStr;
            }

            order.logs.unshift({
                date: nowStr,
                user: `${user.name} (${user.role})`,
                action: `Status alterado de [${oldStatus}] para [${updateData.status}].`
            });
        }

        if (updateData.note && updateData.note.trim() !== '') {
            order.logs.unshift({
                date: nowStr,
                user: `${user.name} (${user.role})`,
                action: `Apontamento Técnico: ${updateData.note.trim()}`
            });
        }

        if (updateData.technicalSolution !== undefined) {
            order.technicalSolution = updateData.technicalSolution.trim();
        }

        if (updateData.checklist) {
            order.checklist = { ...order.checklist, ...updateData.checklist };
        }

        if (updateData.laborCost !== undefined) {
            order.laborCost = parseFloat(updateData.laborCost) || 0;
        }

        // Recalcula totais com peças
        let partsTotal = 0;
        if (Array.isArray(order.partsUsed)) {
            partsTotal = order.partsUsed.reduce((acc, p) => acc + ((p.price || 0) * (p.qty || 1)), 0);
        }
        order.partsCost = partsTotal;
        order.estimatedCost = order.laborCost + order.partsCost;

        DB.saveOrder(order);
        DB.addAuditLog(user.name, `Atualizou o andamento da ${order.id} (${order.status}).`, 'ORDER');

        return { success: true, message: 'Progresso da OS atualizado com sucesso!' };
    },

    // Adiciona peça utilizada à OS
    addPartToOrder(orderId, partName, price, qty = 1) {
        const user = AUTH.getCurrentUser();
        const order = DB.getOrderById(orderId);
        if (!order) return { success: false, message: 'Ordem não encontrada.' };

        if (!Array.isArray(order.partsUsed)) order.partsUsed = [];

        const cleanPrice = parseFloat(price) || 0;
        const cleanQty = parseInt(qty, 10) || 1;

        order.partsUsed.push({
            name: partName.trim(),
            price: cleanPrice,
            qty: cleanQty
        });

        // Atualiza custos
        const partsTotal = order.partsUsed.reduce((acc, p) => acc + (p.price * p.qty), 0);
        order.partsCost = partsTotal;
        order.estimatedCost = order.laborCost + order.partsCost;

        const nowStr = new Date().toLocaleString('pt-BR');
        order.logs.unshift({
            date: nowStr,
            user: `${user.name} (${user.role})`,
            action: `Peça/Componente adicionado: "${partName}" (Qtd: ${cleanQty}, Unit: R$ ${cleanPrice.toFixed(2)})`
        });

        DB.saveOrder(order);
        DB.addAuditLog(user.name, `Adicionou peça à ${order.id}: ${partName}`, 'ORDER');

        return { success: true, message: 'Peça adicionada ao orçamento da OS!' };
    },

    // Remove peça da OS
    removePartFromOrder(orderId, partIndex) {
        const user = AUTH.getCurrentUser();
        const order = DB.getOrderById(orderId);
        if (!order || !order.partsUsed) return { success: false };

        const removed = order.partsUsed.splice(partIndex, 1)[0];
        const partsTotal = order.partsUsed.reduce((acc, p) => acc + (p.price * p.qty), 0);
        order.partsCost = partsTotal;
        order.estimatedCost = order.laborCost + order.partsCost;

        const nowStr = new Date().toLocaleString('pt-BR');
        order.logs.unshift({
            date: nowStr,
            user: `${user.name} (${user.role})`,
            action: `Peça removida: "${removed ? removed.name : 'Item'}"`
        });

        DB.saveOrder(order);
        return { success: true };
    },

    // Exclusão de OS (Restrito a ADMIN)
    deleteOrder(orderId) {
        if (!AUTH.isAdmin()) {
            return { success: false, message: 'Apenas Administradores possuem permissão para excluir Ordens de Serviço.' };
        }
        const user = AUTH.getCurrentUser();
        DB.deleteOrder(orderId);
        DB.addAuditLog(user.name, `EXCLUIU a Ordem de Serviço ${orderId} permanentemente.`, 'SECURITY');
        return { success: true, message: `Ordem de Serviço ${orderId} excluída!` };
    },

    // Métricas para o Dashboard Executivo do Admin
    getDashboardMetrics() {
        const orders = DB.getOrders();
        const users = DB.getUsers();

        const total = orders.length;
        const pendentes = orders.filter(o => o.status === 'PENDENTE').length;
        const emAndamento = orders.filter(o => o.status === 'EM_ANDAMENTO').length;
        const concluidas = orders.filter(o => o.status === 'CONCLUIDA').length;
        const criticas = orders.filter(o => o.priority === 'CRITICA_ADMIN').length;

        const faturamentoConcluido = orders
            .filter(o => o.status === 'CONCLUIDA')
            .reduce((acc, o) => acc + (o.estimatedCost || 0), 0);

        const faturamentoPrevisto = orders
            .reduce((acc, o) => acc + (o.estimatedCost || 0), 0);

        // Desempenho por técnico
        const techStats = users.filter(u => u.role === 'COLABORADOR').map(tech => {
            const techOrders = orders.filter(o => o.assignedTo === tech.id);
            return {
                id: tech.id,
                name: tech.name,
                specialty: tech.specialty,
                avatar: tech.avatar,
                activeCount: techOrders.filter(o => o.status !== 'CONCLUIDA' && o.status !== 'CANCELADA').length,
                completedCount: techOrders.filter(o => o.status === 'CONCLUIDA').length,
                totalCount: techOrders.length
            };
        });

        return {
            total,
            pendentes,
            emAndamento,
            concluidas,
            criticas,
            faturamentoConcluido,
            faturamentoPrevisto,
            techStats
        };
    }
};
