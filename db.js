/* TechOS Pro - Base de Dados e Armazenamento Local */
const DB_KEYS = {
    USERS: 'techos_users_v1',
    ORDERS: 'techos_orders_v1',
    TOKENS: 'techos_tokens_v1',
    AUDIT: 'techos_audit_v1',
    CURRENT_USER: 'techos_current_user_v1',
    SAVED_TOKENS: 'techos_saved_trusted_tokens_v1' // Tokens salvos com "LEMBRA-ME"
};

// Dados padrão iniciais (Seed)
const INITIAL_USERS = [
    {
        id: 'usr-admin-1',
        username: 'admin',
        password: '123',
        name: 'Carlos Silva',
        email: 'carlos.admin@techos.com.br',
        role: 'ADMIN',
        roleTitle: 'Administrador Geral (Acesso Prioritário)',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        phone: '(11) 98765-4321',
        specialty: 'Gestão de Infraestrutura & Segurança',
        active: true,
        priorityLevel: 100 // Máxima prioridade
    },
    {
        id: 'usr-tec-1',
        username: 'lucas',
        password: '123',
        name: 'Lucas Almeida',
        email: 'lucas.almeida@techos.com.br',
        role: 'COLABORADOR',
        roleTitle: 'Técnico de Hardware & Bancada',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        phone: '(11) 97123-1122',
        specialty: 'Manutenção de Notebooks, Solda BGA e Desktops',
        active: true,
        priorityLevel: 10
    },
    {
        id: 'usr-tec-2',
        username: 'mariana',
        password: '123',
        name: 'Mariana Costa',
        email: 'mariana.costa@techos.com.br',
        role: 'COLABORADOR',
        roleTitle: 'Técnica de Redes & Servidores',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        phone: '(11) 98334-4455',
        specialty: 'Roteamento Mikrotik, Cabeamento Estruturado e Windows Server',
        active: true,
        priorityLevel: 10
    },
    {
        id: 'usr-tec-3',
        username: 'roberto',
        password: '123',
        name: 'Roberto Santos',
        email: 'roberto.santos@techos.com.br',
        role: 'COLABORADOR',
        roleTitle: 'Suporte de Software & Segurança',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        phone: '(11) 99112-8899',
        specialty: 'Remoção de Malware, Backup Nuvem e Formatação',
        active: true,
        priorityLevel: 10
    }
];

const INITIAL_ORDERS = [
    {
        id: 'OS-2026-101',
        clientName: 'Dra. Helena Martins - Clínica Saúde Viva',
        clientPhone: '(11) 99887-1122',
        clientEmail: 'helena@clinicasaudeviva.com.br',
        deviceType: 'Notebook',
        deviceBrand: 'Dell Latitude 5420',
        deviceSerial: 'BRD-78291-LK',
        devicePassword: 'clinica2026!#',
        accessories: 'Carregador original Dell e mouse sem fio',
        category: 'Hardware / Aquecimento',
        description: 'Notebook apresentando desligamentos repentinos após 15 minutos de uso e ruído excessivo na ventoinha (cooler). Contém sistema de prontuário eletrônico indispensável.',
        preliminaryDiagnosis: 'Superaquecimento provável por poeira acumulada e ressecamento da pasta térmica.',
        technicalSolution: '',
        partsUsed: [],
        status: 'EM_ANDAMENTO', // PENDENTE, EM_ANDAMENTO, AGUARDANDO_PECA, CONCLUIDA, CANCELADA
        priority: 'ALTA', // BAIXA, MEDIA, ALTA, CRITICA_ADMIN
        assignedTo: 'usr-tec-1', // Lucas Almeida
        assignedByName: 'Carlos Silva (Admin)',
        assignedAt: '2026-10-22 08:30',
        createdAt: '2026-10-22 08:15',
        completedAt: null,
        estimatedCost: 280.00,
        partsCost: 65.00,
        laborCost: 215.00,
        checklist: {
            screenOk: true,
            chargerTested: true,
            keyboardOk: true,
            backupConfirmed: true,
            internalCleaned: false,
            thermalPasteReplaced: false,
            stressTestPassed: false
        },
        logs: [
            {
                date: '2026-10-22 08:15',
                user: 'Carlos Silva (Admin)',
                action: 'Ordem de Serviço criada e registrada no sistema.'
            },
            {
                date: '2026-10-22 08:30',
                user: 'Carlos Silva (Admin)',
                action: 'OS despachada para o técnico Lucas Almeida com prioridade ALTA.'
            },
            {
                date: '2026-10-22 09:10',
                user: 'Lucas Almeida (Técnico)',
                action: 'Aparelho aberto em bancada. Dissipador obstruído por poeira. Iniciando limpeza ultrassônica e troca por pasta térmica Arctic MX-4.'
            }
        ]
    },
    {
        id: 'OS-2026-102',
        clientName: 'Advocacia Toledo & Associados',
        clientPhone: '(11) 97333-5566',
        clientEmail: 'contato@toledoadvogados.com.br',
        deviceType: 'Servidor',
        deviceBrand: 'HP ProLiant ML350 Gen10',
        deviceSerial: 'HP-SVR-99201',
        devicePassword: 'Senha no cofre físico',
        accessories: 'Sem periféricos, apenas cabos de força redundantes',
        category: 'Redes e Servidores',
        description: 'Alerta crítico de degradação no arranjo RAID 1. Um dos discos SAS de 2TB está piscando em âmbar com erro de leitura SMART. Servidor de arquivos corporativo.',
        preliminaryDiagnosis: 'Disco físico com setores defeituosos no slot 2. Necessária substituição imediata antes de perda de redundância.',
        technicalSolution: '',
        partsUsed: [],
        status: 'EM_ANDAMENTO',
        priority: 'CRITICA_ADMIN', // Prioridade máxima concedida pelo Admin
        assignedTo: 'usr-tec-2', // Mariana Costa
        assignedByName: 'Carlos Silva (Admin)',
        assignedAt: '2026-10-22 09:00',
        createdAt: '2026-10-22 08:45',
        completedAt: null,
        estimatedCost: 1850.00,
        partsCost: 1200.00,
        laborCost: 650.00,
        checklist: {
            screenOk: true,
            chargerTested: true,
            keyboardOk: true,
            backupConfirmed: true,
            internalCleaned: true,
            thermalPasteReplaced: false,
            stressTestPassed: false
        },
        logs: [
            {
                date: '2026-10-22 08:45',
                user: 'Carlos Silva (Admin)',
                action: 'Ordem de Serviço criada com Prioridade Crítica Executiva.'
            },
            {
                date: '2026-10-22 09:00',
                user: 'Carlos Silva (Admin)',
                action: 'Despachado com prioridade máxima para a especialista Mariana Costa.'
            },
            {
                date: '2026-10-22 09:40',
                user: 'Mariana Costa (Técnica)',
                action: 'Conexão via iLO realizada. Disco 2 identificado com falha preditiva. Disco reserva novo solicitado ao almoxarifado para hot-swap.'
            }
        ]
    },
    {
        id: 'OS-2026-103',
        clientName: 'Eduardo Farias (Pessoa Física)',
        clientPhone: '(11) 98112-7744',
        clientEmail: 'edu.farias@gmail.com',
        deviceType: 'Desktop Gamer',
        deviceBrand: 'Custom PC (Ryzen 7 5700X / RTX 3070)',
        deviceSerial: 'GAMER-PC-2024',
        devicePassword: 'Sem senha (Windows 11)',
        accessories: 'Gabinete com cabo de energia tripolar',
        category: 'Software e Otimização',
        description: 'Computador infectado por adware e travando em jogos. Cliente solicita formatação limpa, instalação de drivers atualizados e otimização de BIOS com XMP ativo.',
        preliminaryDiagnosis: 'Infecção por múltiplos malwares no diretório AppData. Indicado backup dos dados e formatação com Windows 11 Pro.',
        technicalSolution: '',
        partsUsed: [],
        status: 'PENDENTE',
        priority: 'MEDIA',
        assignedTo: 'usr-tec-3', // Roberto Santos
        assignedByName: 'Carlos Silva (Admin)',
        assignedAt: '2026-10-22 10:00',
        createdAt: '2026-10-22 09:50',
        completedAt: null,
        estimatedCost: 220.00,
        partsCost: 0.00,
        laborCost: 220.00,
        checklist: {
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
                date: '2026-10-22 09:50',
                user: 'Carlos Silva (Admin)',
                action: 'OS cadastrada na recepção técnica.'
            },
            {
                date: '2026-10-22 10:00',
                user: 'Carlos Silva (Admin)',
                action: 'Despachada para Roberto Santos.'
            }
        ]
    },
    {
        id: 'OS-2026-104',
        clientName: 'Contabilidade Santana Ltda',
        clientPhone: '(11) 3214-5500',
        clientEmail: 'financeiro@santana.cnt.br',
        deviceType: 'Notebook',
        deviceBrand: 'Lenovo ThinkPad E14',
        deviceSerial: 'PF-20X91',
        devicePassword: 'santana@2025',
        accessories: 'Fonte USB-C original',
        category: 'Hardware / Armazenamento',
        description: 'Notebook muito lento para inicializar o sistema operacional e carregar planilhas do Excel. Solicita upgrade para SSD NVMe 1TB e clonagem do disco antigo.',
        preliminaryDiagnosis: 'HD mecânico original com tempo de resposta de 100% no Gerenciador de Tarefas. Upgrade para SSD M.2 NVMe aumentará a velocidade em até 8x.',
        technicalSolution: 'Instalado SSD Kingston NV2 1TB M.2 NVMe. Clonagem setor a setor bem-sucedida. Tempo de boot reduzido de 2m30s para 11 segundos.',
        partsUsed: [
            { name: 'SSD Kingston NV2 1TB NVMe', price: 390.00, qty: 1 }
        ],
        status: 'CONCLUIDA',
        priority: 'BAIXA',
        assignedTo: 'usr-tec-1', // Lucas Almeida
        assignedByName: 'Carlos Silva (Admin)',
        assignedAt: '2026-10-21 14:00',
        createdAt: '2026-10-21 13:30',
        completedAt: '2026-10-22 09:15',
        estimatedCost: 550.00,
        partsCost: 390.00,
        laborCost: 160.00,
        checklist: {
            screenOk: true,
            chargerTested: true,
            keyboardOk: true,
            backupConfirmed: true,
            internalCleaned: true,
            thermalPasteReplaced: true,
            stressTestPassed: true
        },
        logs: [
            {
                date: '2026-10-21 13:30',
                user: 'Carlos Silva (Admin)',
                action: 'OS cadastrada.'
            },
            {
                date: '2026-10-21 14:00',
                user: 'Carlos Silva (Admin)',
                action: 'Despachado para Lucas Almeida.'
            },
            {
                date: '2026-10-22 08:30',
                user: 'Lucas Almeida (Técnico)',
                action: 'Clonagem finalizada e testes de benchmark de leitura realizados (3500 MB/s).'
            },
            {
                date: '2026-10-22 09:15',
                user: 'Lucas Almeida (Técnico)',
                action: 'Ordem de serviço finalizada e liberada para entrega ao cliente.'
            }
        ]
    },
    {
        id: 'OS-2026-105',
        clientName: 'Restaurante Sabor Paulista',
        clientPhone: '(11) 98844-3321',
        clientEmail: 'gerencia@saborpaulista.com.br',
        deviceType: 'Impressora Térmica & PDV',
        deviceBrand: 'Epson TM-T20X + Terminal PDV',
        deviceSerial: 'EPS-88127-XP',
        devicePassword: 'admin',
        accessories: 'Fonte de alimentação bivolt e cabo serial',
        category: 'Periféricos e Automação',
        description: 'Impressora não puxa o papel da bobina térmica e acusa LED vermelho de erro de guilhotina. Travou a emissão de cupons de pedidos.',
        preliminaryDiagnosis: 'Guilhotina travada por detritos de papel ou sensor ótico de fim de bobina desalinhado.',
        technicalSolution: '',
        partsUsed: [],
        status: 'PENDENTE',
        priority: 'ALTA',
        assignedTo: '', // Não atribuída ainda
        assignedByName: 'Aguardando Despacho',
        assignedAt: null,
        createdAt: '2026-10-22 10:15',
        completedAt: null,
        estimatedCost: 180.00,
        partsCost: 30.00,
        laborCost: 150.00,
        checklist: {
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
                date: '2026-10-22 10:15',
                user: 'Carlos Silva (Admin)',
                action: 'OS criada na fila geral. Aguardando despacho pelo Administrador.'
            }
        ]
    }
];

// Gerenciador de Banco de Dados Local
const DB = {
    init() {
        if (!localStorage.getItem(DB_KEYS.USERS)) {
            localStorage.setItem(DB_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        }
        if (!localStorage.getItem(DB_KEYS.ORDERS)) {
            localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
        }
        if (!localStorage.getItem(DB_KEYS.AUDIT)) {
            const initialAudit = [
                {
                    timestamp: new Date().toISOString(),
                    user: 'Sistema TechOS',
                    action: 'Base de dados inicializada com sucesso.',
                    type: 'SYSTEM'
                }
            ];
            localStorage.setItem(DB_KEYS.AUDIT, JSON.stringify(initialAudit));
        }
    },

    resetToDefault() {
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
        localStorage.removeItem(DB_KEYS.CURRENT_USER);
        sessionStorage.removeItem(DB_KEYS.CURRENT_USER);
        localStorage.removeItem(DB_KEYS.SAVED_TOKENS);
        localStorage.setItem(DB_KEYS.AUDIT, JSON.stringify([
            {
                timestamp: new Date().toISOString(),
                user: 'Administrador',
                action: 'Sistema restaurado para as configurações e dados de fábrica.',
                type: 'ADMIN'
            }
        ]));
    },

    // Usuários
    getUsers() {
        return JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
    },

    getUserById(id) {
        return this.getUsers().find(u => u.id === id);
    },

    getUserByUsername(username) {
        const u = username.toLowerCase().trim();
        return this.getUsers().find(user => user.username.toLowerCase() === u || user.email.toLowerCase() === u);
    },

    saveUser(user) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === user.id);
        if (index >= 0) {
            users[index] = user;
        } else {
            users.push(user);
        }
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
    },

    deleteUser(id) {
        let users = this.getUsers();
        users = users.filter(u => u.id !== id);
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
    },

    // Ordens de Serviço
    getOrders() {
        return JSON.parse(localStorage.getItem(DB_KEYS.ORDERS) || '[]');
    },

    getOrderById(id) {
        return this.getOrders().find(o => o.id === id);
    },

    saveOrder(order) {
        const orders = this.getOrders();
        const index = orders.findIndex(o => o.id === order.id);
        if (index >= 0) {
            orders[index] = order;
        } else {
            orders.unshift(order); // Novas no topo
        }
        localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
    },

    deleteOrder(id) {
        let orders = this.getOrders();
        orders = orders.filter(o => o.id !== id);
        localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
    },

    // Auditoria
    getAuditLogs() {
        return JSON.parse(localStorage.getItem(DB_KEYS.AUDIT) || '[]');
    },

    addAuditLog(user, action, type = 'INFO') {
        const logs = this.getAuditLogs();
        logs.unshift({
            timestamp: new Date().toLocaleString('pt-BR'),
            user: user || 'Sistema',
            action,
            type
        });
        // Mantém últimos 200 logs
        if (logs.length > 200) logs.pop();
        localStorage.setItem(DB_KEYS.AUDIT, JSON.stringify(logs));
    },

    // Tokens Salvos ("LEMBRA-ME")
    getSavedTokens() {
        return JSON.parse(localStorage.getItem(DB_KEYS.SAVED_TOKENS) || '{}');
    },

    saveTrustedToken(userId, token) {
        const tokens = this.getSavedTokens();
        tokens[userId] = {
            token,
            savedAt: new Date().toISOString(),
            deviceInfo: navigator.userAgent.substring(0, 50),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
        };
        localStorage.setItem(DB_KEYS.SAVED_TOKENS, JSON.stringify(tokens));
    },

    hasTrustedToken(userId) {
        const tokens = this.getSavedTokens();
        const entry = tokens[userId];
        if (!entry) return false;
        // Verifica validade
        if (new Date(entry.expiresAt) < new Date()) {
            delete tokens[userId];
            localStorage.setItem(DB_KEYS.SAVED_TOKENS, JSON.stringify(tokens));
            return false;
        }
        return true;
    },

    removeTrustedToken(userId) {
        const tokens = this.getSavedTokens();
        delete tokens[userId];
        localStorage.setItem(DB_KEYS.SAVED_TOKENS, JSON.stringify(tokens));
    },

    clearAllTrustedTokens() {
        localStorage.removeItem(DB_KEYS.SAVED_TOKENS);
    }
};

// Auto-inicializa na carga
DB.init();
