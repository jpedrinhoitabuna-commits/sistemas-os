/* TechOS Pro - Sistema de Autenticação, 2FA e Tokens de Acesso */

const AUTH = {
    currentUser: null,
    pendingAuth: null, // Guarda estado temporário do login durante a validação do token
    tokenTimerInterval: null,

    init() {
        // Tenta recuperar sessão existente
        const sessionData = sessionStorage.getItem(DB_KEYS.CURRENT_USER) || localStorage.getItem(DB_KEYS.CURRENT_USER);
        if (sessionData) {
            try {
                this.currentUser = JSON.parse(sessionData);
            } catch (e) {
                this.currentUser = null;
            }
        }
    },

    getCurrentUser() {
        return this.currentUser;
    },

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'ADMIN';
    },

    isColaborador() {
        return this.currentUser && this.currentUser.role === 'COLABORADOR';
    },

    // Passo 1: Validação de Usuário e Senha
    submitCredentials(username, password) {
        const user = DB.getUserByUsername(username);

        if (!user) {
            return {
                success: false,
                message: 'Usuário não encontrado. Verifique o login digitado.'
            };
        }

        if (!user.active) {
            return {
                success: false,
                message: 'Esta conta de usuário está desativada. Contate o Administrador.'
            };
        }

        if (user.password !== password) {
            return {
                success: false,
                message: 'Senha incorreta. Tente novamente.'
            };
        }

        // Verifica se o usuário possui token de acesso confiável previamente salvo ("LEMBRA-ME")
        const hasSavedToken = DB.hasTrustedToken(user.id);

        if (hasSavedToken) {
            // Se o token foi salvo com a opção "LEMBRA-ME", realiza o login direto com bypass de token
            this.finalizeLogin(user, true, 'TOKEN_LEMBRADO');
            DB.addAuditLog(user.name, `Login efetuado com sucesso utilizando Token Confiável Salvo ("Lembrar-me").`, 'LOGIN');
            return {
                success: true,
                requireToken: false,
                bypassed: true,
                user: user,
                message: 'Dispositivo reconhecido via Token Lembrado! Entrando...'
            };
        }

        // Se NÃO tem token salvo, gera um novo token de acesso temporário
        const generatedToken = this.generateToken();
        const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutos de validade

        this.pendingAuth = {
            userId: user.id,
            user: user,
            token: generatedToken,
            expiresAt: expiresAt
        };

        DB.addAuditLog(user.name, `Solicitação de Token de Acesso (2FA) gerada. Token emitido.`, 'SECURITY');

        return {
            success: true,
            requireToken: true,
            bypassed: false,
            user: user,
            generatedToken: generatedToken, // Retornado para exibição no simulador
            expiresInSeconds: 300,
            message: 'Credenciais aceitas. Digite o token de acesso enviado para seu e-mail/celular.'
        };
    },

    // Gera token de 6 dígitos numéricos
    generateToken() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    },

    // Reenvia/regenera novo token caso expire
    resendToken() {
        if (!this.pendingAuth) {
            return { success: false, message: 'Nenhuma autenticação pendente encontrada.' };
        }
        const newToken = this.generateToken();
        this.pendingAuth.token = newToken;
        this.pendingAuth.expiresAt = Date.now() + (5 * 60 * 1000);

        DB.addAuditLog(this.pendingAuth.user.name, `Novo token de acesso solicitado e reenviado.`, 'SECURITY');

        return {
            success: true,
            token: newToken,
            expiresInSeconds: 300,
            message: 'Novo código de segurança gerado com sucesso.'
        };
    },

    // Passo 2: Validação do Token de Acesso + Tratamento da Opção "LEMBRA-ME"
    verifyTokenAndLogin(enteredToken, rememberMe) {
        if (!this.pendingAuth) {
            return {
                success: false,
                message: 'Sessão expirada. Por favor, volte e digite seu usuário e senha novamente.'
            };
        }

        // Checa expiração
        if (Date.now() > this.pendingAuth.expiresAt) {
            return {
                success: false,
                message: 'Este token de acesso expirou. Clique em "Reenviar Token" para gerar um novo.'
            };
        }

        // Normaliza tokens (remove espaços)
        const cleanEntered = (enteredToken || '').trim().replace(/\s+/g, '');
        const cleanActual = (this.pendingAuth.token || '').trim();

        if (cleanEntered !== cleanActual) {
            return {
                success: false,
                message: 'Token de acesso inválido. Verifique o código recebido e tente novamente.'
            };
        }

        const user = this.pendingAuth.user;

        // REGRA CRÍTICA: Salvando o token SOMENTE na opção "LEMBRA-ME"
        if (rememberMe) {
            DB.saveTrustedToken(user.id, cleanActual);
            // Salva também no localStorage para persistir na próxima inicialização do navegador
            localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
            DB.addAuditLog(user.name, `Token de acesso SALVO neste dispositivo ("Lembrar-me" ativado). Futuros logins não exigirão token manual.`, 'SECURITY');
        } else {
            // Se NÃO marcou lembra-me, remove qualquer token salvo anteriormente para garantir que sempre peça
            DB.removeTrustedToken(user.id);
            localStorage.removeItem(DB_KEYS.CURRENT_USER);
            DB.addAuditLog(user.name, `Token de acesso validado para sessão única ("Lembrar-me" desmarcado). Próximo login exigirá novo token.`, 'SECURITY');
        }

        // Finaliza sessão
        this.finalizeLogin(user, rememberMe, 'TOKEN_VALIDADO');
        this.pendingAuth = null;

        return {
            success: true,
            user: user,
            savedOnDevice: !!rememberMe,
            message: user.role === 'ADMIN'
                ? 'Autenticado com sucesso! Acesso PRIORITÁRIO de Administrador ativado.'
                : 'Autenticado com sucesso! Acesso técnico padrão liberado.'
        };
    },

    finalizeLogin(user, isPersistent, method) {
        this.currentUser = user;
        const serialized = JSON.stringify(user);
        
        // Sempre salva na sessão do navegador
        sessionStorage.setItem(DB_KEYS.CURRENT_USER, serialized);
        
        if (isPersistent) {
            localStorage.setItem(DB_KEYS.CURRENT_USER, serialized);
        } else {
            localStorage.removeItem(DB_KEYS.CURRENT_USER);
        }

        DB.addAuditLog(user.name, `Sessão ativa estabelecida (${method}). Nível de Acesso: ${user.role} (Prioridade: ${user.priorityLevel || 10})`, 'LOGIN');
    },

    logout() {
        const user = this.currentUser;
        if (user) {
            DB.addAuditLog(user.name, `Usuário encerrou a sessão (Logout).`, 'LOGOUT');
        }
        this.currentUser = null;
        this.pendingAuth = null;
        sessionStorage.removeItem(DB_KEYS.CURRENT_USER);
        localStorage.removeItem(DB_KEYS.CURRENT_USER);
    },

    // Revoga a confiança do dispositivo (forçar solicitação de token no próximo login)
    forgetDevice(userId) {
        DB.removeTrustedToken(userId || (this.currentUser && this.currentUser.id));
        DB.addAuditLog(this.currentUser ? this.currentUser.name : 'Sistema', `Confiança do dispositivo revogada. Próximo login exigirá token obrigatoriamente.`, 'SECURITY');
    }
};

AUTH.init();
