// ===================== [CONFIG & ESTADO GLOBAL] =====================
const firebaseConfig = {
  apiKey: "AIzaSyBNsTcLawc8VaILryw36F5Iv6tIK0N41Og",
  authDomain: "flexa-app-41205.firebaseapp.com",
  projectId: "flexa-app-41205",
  storageBucket: "flexa-app-41205.firebasestorage.app",
  messagingSenderId: "1008393678489",
  appId: "1:1008393678489:web:8b9df090ef4695d6d6d208"
};
// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Variável para controle do usuário logado
let usuarioLogado = null;
let envioStepAtual = 1;
let clientes = [];
let clienteEmEdicaoId = null;
let clienteSelecionadoId = null;
let editRevealTimeout = null;

function getUsuarioIdAtual() {
    return usuarioLogado?.id || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : null);
}

async function loadClientes() {
    const uid = getUsuarioIdAtual();
    if (uid) {
        const snap = await db.ref(`usuarios/${uid}/clientes`).once('value');
        const data = snap.val();
        if (data) {
            return Object.keys(data).map((id) => ({ id, ...data[id] }));
        }
    }
    return [
        {
            id: 'maria-silva',
            nome: 'Maria Silva',
            endereco: 'Rua das Flores, 123 - Aldeota',
            whatsapp: '(85) 99876-5432',
            frequente: true,
            envios: 5
        }
    ];
}

async function saveClientes() {
    const uid = getUsuarioIdAtual();
    if (!uid) return;
    const map = clientes.reduce((acc, c) => {
        const { id, ...rest } = c;
        acc[id] = rest;
        return acc;
    }, {});
    await db.ref(`usuarios/${uid}/clientes`).set(map);
}

function normalizarTexto(valor) {
    return (valor || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function renderClientes(filtro = '') {
    const container = document.getElementById('clientes-list');
    if (!container) return;

    const filtroTexto = normalizarTexto(filtro);
    const filtroNumero = (filtro || '').replace(/\D/g, '');

    const lista = clientes.filter((c) => {
        const texto = normalizarTexto(`${c.nome} ${c.endereco} ${c.whatsapp}`);
        if (!filtroTexto) return true;
        if (filtroNumero && c.whatsapp) {
            return c.whatsapp.replace(/\D/g, '').includes(filtroNumero);
        }
        return texto.includes(filtroTexto);
    }).sort((a, b) => {
        const fa = a.frequente ? 1 : 0;
        const fb = b.frequente ? 1 : 0;
        if (fb !== fa) return fb - fa;
        return (a.nome || '').localeCompare(b.nome || '');
    });

    if (!lista.length) {
        container.innerHTML = `<div style="text-align:center; color: var(--text-sub); font-size: 13px; padding: 10px 0;">Nenhum cliente encontrado.</div>`;
        return;
    }

    container.innerHTML = lista.map((c) => {
        const badge = c.frequente ? '<span class="badge-freq">Frequente</span>' : '';
        return `
        <div class="swipe-container" id="container-${c.id}">
            <div class="swipe-action-delete">
                <i data-lucide="trash-2" size="20"></i>
                <span>Excluir</span>
            </div>

            <div class="cliente-card-simples"
                 id="card-${c.id}"
                 data-client-id="${c.id}"
                 onclick="irParaPasso2('${c.id}', '${c.nome.replace(/'/g, "\\'")}', '${c.endereco.replace(/'/g, "\\'")}', '${c.whatsapp.replace(/'/g, "\\'")}'); revealEditButton(this);"
                 ontouchstart="handleTouchStart(event)"
                 ontouchmove="handleTouchMove(event)"
                 ontouchend="handleTouchEnd(event)"
                 style="position: relative; z-index: 2; margin-bottom: 0 !important;">

                ${badge}
                <button class="cliente-edit-btn" onclick="abrirEditarCliente('${c.id}'); event.stopPropagation();">
                    <i data-lucide="pencil" size="14"></i>
                </button>
                <button class="cliente-history-btn" onclick="verHistoricoCliente('${c.id}'); event.stopPropagation();">Ver histórico</button>
                <strong style="font-size: 17px; font-weight: 800; display: block; margin-bottom: 2px;">${c.nome}</strong>
                <span class="cliente-endereco">${formatEnderecoDisplay(c.endereco)}</span>

                <span style="color: var(--brand-orange); font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; margin-top: 6px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512" fill="currentColor"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.1 0-65.6-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.2-3.2-5.6-.3-8.6 2.5-11.3 2.5-2.5 5.6-6.5 8.3-9.7 2.8-3.3 3.7-5.6 5.6-9.3 1.9-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.5 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
                    ${c.whatsapp}
                </span>
            </div>
        </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function formatEnderecoDisplay(endereco) {
    if (!endereco) return '';
    const parts = endereco.split(' - ');
    const ruaNum = parts[0] || endereco;
    const resto = parts[1] || '';

    const cidadeUf = resto.split(',').pop() || '';
    if (cidadeUf.includes('/')) {
        const [cidade] = cidadeUf.split('/');
        return `${ruaNum} - ${cidade.trim()}`;
    }
    return ruaNum;
}

function revealEditButton(cardEl) {
    if (!cardEl) return;
    document.querySelectorAll('.cliente-card-simples.show-edit').forEach(el => el.classList.remove('show-edit'));
    cardEl.classList.add('show-edit');
    if (editRevealTimeout) clearTimeout(editRevealTimeout);
    editRevealTimeout = setTimeout(() => {
        cardEl.classList.remove('show-edit');
    }, 2200);
}

async function initClientes() {
    clientes = await loadClientes();
    renderClientes(document.getElementById('buscar-cliente')?.value || '');
}

        lucide.createIcons();

        // ===================== [NAVEGA - fO & UI GLOBAL] =====================
function navegar(idTela) {
		if (idTela === 'view-perfil' && window.usuarioLogado) {
        const dados = window.usuarioLogado;
        if (document.getElementById('perfil-nome-display')) {
            document.getElementById('perfil-nome-display').innerText = dados.nome || 'Usuário';
            document.getElementById('perfil-insta-display').innerText = dados.instagram || '@seuinsta';
            document.getElementById('perfil-foto-display').src = dados.foto || 'https://via.placeholder.com/110';
        }
    }
    // --------------------------------
    
    
    // 1. Troca de telas
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(idTela);
    if(target) target.classList.add('active');
    
    // 2. Limpeza do formulário de envio (Regra do Flexa)
    if (idTela !== 'view-novo-envio') {
        const passos = ['envio-p1', 'envio-p2', 'envio-p3', 'envio-p4', 'envio-p5', 'envio-v-veiculo'];
        passos.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('hidden');
        });
        const p1 = document.getElementById('envio-p1');
        if(p1) p1.classList.remove('hidden');
        // Fecha sheets de envio se estiverem abertos
        fecharModalEnvioDetalhes();
        fecharModalNovoCliente();
    }
    if (idTela === 'view-novo-envio') {
        initClienteSearch();
        initClientes();
    }

    // 3. Controle do Menu Inferior
    // MUDANÇA: Use o ID exato que está no seu HTML (ex: main-nav)
    const nav = document.getElementById('main-nav'); 
    const telasComMenu = ['view-dash-loja', 'view-novo-envio', 'view-rotas', 'view-perfil'];
    
    if(nav) {
        nav.style.display = telasComMenu.includes(idTela) ? 'flex' : 'none';
    }

    // 4. Marcar Ícone Ativo
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    // Mapeamento simples
    const menuMap = {
        'view-dash-loja': 1,
        'view-rotas': 2,
        'view-chat': 4,
        'view-perfil': 5
    };

    if(menuMap[idTela]) {
        const activeItem = document.querySelector(`.nav-item:nth-child(${menuMap[idTela]})`);
        if(activeItem) activeItem.classList.add('active');
    }
    
    window.scrollTo(0,0);
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

// Função de Preview da Foto (Ponto 1)
function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function() {
        document.getElementById('preview-foto').src = reader.result;
    }
    reader.readAsDataURL(event.target.files[0]);
}

async function buscarEndereco() {
    const cepField = document.getElementById('new-cli-cep');
    const cep = cepField.value.replace(/\D/g, '');

    if (cep.length === 8) {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (!data.erro) {
                document.getElementById('new-cli-rua').value = data.logradouro || '';
                document.getElementById('new-cli-bairro').value = data.bairro || '';
                document.getElementById('new-cli-cidade').value = data.localidade || '';
                document.getElementById('new-cli-estado').value = data.uf || '';
                // Foca no número automaticamente para agilizar
                document.getElementById('new-cli-num').focus();
            } else {
                alert("CEP não encontrado.");
            }
        } catch (error) {
            console.error("Erro na busca:", error);
        }
    }
}




        function irParaCadastro(tipo) {
            navegar('view-auth');
            const groupCNH = document.getElementById('group-cnh');
            const inputNome = document.getElementById('input-nome');
            document.getElementById('label-nome').innerText = tipo === 'loja' ? "Nome da loja" : "Nome completo";
            inputNome.placeholder = tipo === 'loja' ? "Digite o nome da loja" : "Seu nome completo";
            tipo === 'loja' ? groupCNH.classList.add('hidden') : groupCNH.classList.remove('hidden');
            alternarAuth('entrar');
}

function initClienteSearch() {
    const input = document.getElementById('buscar-cliente');
    if (!input || input.dataset.bound === 'true') return;
    input.dataset.bound = 'true';
    input.addEventListener('input', (e) => {
        renderClientes(e.target.value || '');
    });
}

// --- MODAIS (SHEETS) DO ENVIO ---
function abrirModalEnvioDetalhes() {
    const modal = document.getElementById('modal-envio-detalhes');
    if (!modal) return;
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('is-open'));
    setModalEnvioStep(1);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function fecharModalEnvioDetalhes() {
    const modal = document.getElementById('modal-envio-detalhes');
    if (!modal) return;
    modal.classList.remove('is-open');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 250);
    setModalEnvioStep(1);
}

function abrirModalNovoCliente() {
    const modal = document.getElementById('modal-novo-cliente');
    if (!modal) return;
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('is-open'));
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function fecharModalNovoCliente() {
    const modal = document.getElementById('modal-novo-cliente');
    if (!modal) return;
    modal.classList.remove('is-open');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 250);
}

function abrirEditarCliente(id) {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    clienteEmEdicaoId = id;
    document.getElementById('new-cli-nome').value = cliente.nome || '';
    document.getElementById('new-cli-tel').value = cliente.whatsapp || '';

    const parts = (cliente.endereco || '').split(' - ');
    const ruaNum = parts[0] || '';
    const bairroCidade = parts[1] || '';
    const [rua, num] = ruaNum.split(',').map(s => s.trim());
    document.getElementById('new-cli-rua').value = rua || '';
    document.getElementById('new-cli-num').value = num || '';

    const bairroParts = bairroCidade.split(',');
    document.getElementById('new-cli-bairro').value = (bairroParts[0] || '').trim();

    const cidadeUf = (bairroParts[1] || '').trim();
    if (cidadeUf.includes('/')) {
        const [cidade, uf] = cidadeUf.split('/');
        document.getElementById('new-cli-cidade').value = (cidade || '').trim();
        document.getElementById('new-cli-estado').value = (uf || '').trim();
    }

    document.getElementById('novo-cliente-title').innerText = 'Editar Cliente';
    document.getElementById('btn-salvar-cliente').innerText = 'Salvar Alterações';
    abrirModalNovoCliente();
}

function resetClienteForm() {
    document.querySelectorAll('#modal-novo-cliente input').forEach(input => input.value = '');
    clienteEmEdicaoId = null;
    document.getElementById('novo-cliente-title').innerText = 'Novo Cliente';
    document.getElementById('btn-salvar-cliente').innerText = 'Salvar e Continuar';
}

function verHistoricoCliente(id) {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    const historico = Array.isArray(cliente.historico) ? cliente.historico : [];
    document.getElementById('historico-title').innerText = `Histórico  -  ${cliente.nome}`;
    const list = document.getElementById('historico-list');
    if (!historico.length) {
        list.innerHTML = `<div style="text-align:center; color: var(--text-sub); font-size: 13px; padding: 20px 0;">Este cliente ainda não possui envios.</div>`;
    } else {
        list.innerHTML = historico.map((h) => {
            const data = new Date(h.criadoEm || Date.now()).toLocaleDateString('pt-BR');
            return `
                <div class="historico-item">
                    <h4>${h.descricao ? h.descricao : 'Envio'}</h4>
                    <p>${data}  -  ${h.servico || '-'}  -  ${h.tamanho || '-'}</p>
                    <div class="historico-meta">
                        <span>${h.veiculo || '-'}</span>
                        <span>R$ ${h.valor || '-'}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    abrirModalHistorico();
}

function abrirModalHistorico() {
    const modal = document.getElementById('modal-historico');
    if (!modal) return;
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('is-open'));
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function fecharModalHistorico() {
    const modal = document.getElementById('modal-historico');
    if (!modal) return;
    modal.classList.remove('is-open');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 250);
}

function setModalEnvioStep(step) {
    envioStepAtual = step;
    const steps = [
        document.getElementById('modal-envio-step-1'),
        document.getElementById('modal-envio-step-2'),
        document.getElementById('modal-envio-step-3'),
        document.getElementById('modal-envio-step-4')
    ];
    const footerStep1 = document.getElementById('modal-envio-footer-step-1');
    steps.forEach((el, idx) => {
        if (!el) return;
        if (idx === step - 1) {
            el.classList.remove('hidden');
            el.classList.add('fade-step');
            setTimeout(() => el.classList.remove('fade-step'), 400);
        } else {
            el.classList.add('hidden');
        }
    });
    if (footerStep1) {
        footerStep1.style.display = step === 1 ? 'block' : 'none';
    }

    const titles = {
        1: 'Detalhes do Envio',
        2: 'Escolha o transporte',
        3: 'Revisar Envio',
        4: 'Pedido solicitado'
    };
    const titleEl = document.getElementById('envio-sheet-title');
    if (titleEl) titleEl.innerText = titles[step] || 'Detalhes do Envio';

    const dots = document.querySelectorAll('#envio-progress-dots .dot');
    dots.forEach((dot) => {
        const dotStep = Number(dot.getAttribute('data-step'));
        if (dotStep === step) {
            dot.classList.add('active');
            dot.classList.remove('pulse');
            void dot.offsetWidth;
            dot.classList.add('pulse');
        } else {
            dot.classList.remove('active');
            dot.classList.remove('pulse');
        }
    });

    if (navigator.vibrate && step > 1) {
        navigator.vibrate(6);
    }
}

function handleEnvioBack() {
    if (envioStepAtual > 1) {
        setModalEnvioStep(envioStepAtual - 1);
    } else {
        fecharModalEnvioDetalhes();
    }
}

        /* L?"GICA DE PASSOS DO ENVIO */
        function irParaPasso2(id, nome, endereco, whats) {
    clienteSelecionadoId = id;
    // Preenche os dados
    document.getElementById('card-nome').innerText = nome;
    document.getElementById('card-endereco').innerText = endereco;
    document.getElementById('card-whatsapp').innerText = whats;

    // Abre o modal sheet de detalhes (passo 1)
    abrirModalEnvioDetalhes();
}

function voltarParaPasso(p) {
    // Esconde absolutamente todos os passos de envio para não encavalar
    const todosPassos = ['envio-p1', 'envio-p2', 'envio-p3', 'envio-p4', 'envio-p5', 'envio-v-veiculo'];
    todosPassos.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    // Mostra apenas o destino solicitado
    const destino = document.getElementById('envio-p' + p);
    if(destino) {
        destino.classList.remove('hidden');
        destino.classList.add('fade-step'); 
        setTimeout(() => destino.classList.remove('fade-step'), 400);
    }
    window.scrollTo(0,0);
}

        function selecionarServico(tipo) {
            document.getElementById('srv-std').classList.remove('active');
            document.getElementById('srv-flash').classList.remove('active');
            const id = tipo === 'Standard' ? 'srv-std' : 'srv-flash';
            document.getElementById(id).classList.add('active');

            const bloqueadosNoFlash = ['v-patinete', 'v-bike'];
            const isFlash = tipo === 'Flash';

            bloqueadosNoFlash.forEach((vid) => {
                const el = document.getElementById(vid);
                if (!el) return;
                el.classList.toggle('disabled', isFlash);
            });

            if (isFlash && (veiculoSelecionado === 'Patinete' || veiculoSelecionado === 'Bicicleta')) {
                selecionarVeiculo('Moto', null);
            } else {
                atualizarPrecoEstimadoAtual();
            }
        }

        function selecionarTamanho(tam) {
            document.getElementById('sz-p').classList.remove('active');
            document.getElementById('sz-m').classList.remove('active');
            document.getElementById('sz-g').classList.remove('active');
            document.getElementById('sz-' + tam.toLowerCase()).classList.add('active');
        }

        /* L?"GICA AUTH ORIGINAL */
        function togglePass(id) {
            const input = document.getElementById(id);
            input.type = input.type === 'password' ? 'text' : 'password';
        }
        function alternarAuth(modo) {
            const fCad = document.getElementById('form-cadastrar'), fEnt = document.getElementById('form-entrar');
            const tCad = document.getElementById('tab-cadastrar'), tEnt = document.getElementById('tab-entrar');
            if (modo === 'cadastrar') {
                fCad.classList.remove('hidden'); fEnt.classList.add('hidden');
                tCad.classList.add('active'); tEnt.classList.remove('active');
            } else {
                fEnt.classList.remove('hidden'); fCad.classList.add('hidden');
                tEnt.classList.add('active'); tCad.classList.remove('active');
            }
        }

function confirmarEnvioFinal() {
    setModalEnvioStep(4);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    if (clienteSelecionadoId) {
        const idx = clientes.findIndex(c => c.id === clienteSelecionadoId);
        if (idx >= 0) {
            const enviosAtual = Number(clientes[idx].envios || 0) + 1;
            clientes[idx].envios = enviosAtual;
            if (enviosAtual >= 5) clientes[idx].frequente = true;

            const historico = Array.isArray(clientes[idx].historico) ? clientes[idx].historico : [];
            const desc = document.getElementById('input-desc')?.value || '';
            const servico = resumoRevisaoAtual.servico || getServicoSelecionadoAtual();
            const tamanho = document.querySelector('#modal-envio-detalhes .selection-grid-3 .select-box.active strong')?.innerText || '';
            const totalFrete = Number.isFinite(resumoRevisaoAtual.totalFrete)
                ? resumoRevisaoAtual.totalFrete
                : parseMoedaParaNumero(document.getElementById('input-valor')?.value || 0);

            historico.unshift({
                id: `envio-${Date.now()}` ,
                criadoEm: Date.now(),
                descricao: desc,
                valorFrete: Number(totalFrete.toFixed(2)),
                servico,
                tamanho,
                veiculo: resumoRevisaoAtual.veiculo || veiculoSelecionado,
                distanciaKm: Number.isFinite(resumoRevisaoAtual.distanciaKm) ? Number(resumoRevisaoAtual.distanciaKm.toFixed(2)) : null,
                duracaoMin: Number.isFinite(resumoRevisaoAtual.duracaoMin) ? Math.round(resumoRevisaoAtual.duracaoMin) : null,
                origemEndereco: resumoRevisaoAtual.origem || obterEnderecoLojaTexto(),
                destinoEndereco: resumoRevisaoAtual.destino || document.getElementById('card-endereco')?.innerText || ''
            });

            clientes[idx].historico = historico.slice(0, 50);
            saveClientes();
            renderClientes(document.getElementById('buscar-cliente')?.value || '');
        }
    }
}

function abrirNovoCliente() {
    resetClienteForm();
    abrirModalNovoCliente();
}

// --- MÁSCARAS DE INPUT ---
document.getElementById('new-cli-tel').addEventListener('input', function (e) {
    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
    e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
});

document.getElementById('new-cli-cep').addEventListener('input', function (e) {
    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,5})(\d{0,3})/);
    e.target.value = !x[2] ? x[1] : x[1] + '-' + x[2];
});

// --- FUN - fO SALVAR ?sNICA E CORRIGIDA ---
function salvarNovoCliente() {
    const nome = document.getElementById('new-cli-nome').value;
    const tel = document.getElementById('new-cli-tel').value;
    const rua = document.getElementById('new-cli-rua').value;
    const num = document.getElementById('new-cli-num').value;
    const bairro = document.getElementById('new-cli-bairro').value;
    const cidade = document.getElementById('new-cli-cidade').value;
    const estado = document.getElementById('new-cli-estado').value;
    const comp = document.getElementById('new-cli-comp').value;

    if(nome && tel && rua && num) {
        // Formata o endereço para a tela de detalhes
        const enderecoCompleto = `${rua}, ${num} - ${bairro}, ${cidade}/${estado}${comp ? ' ('+comp+')' : ''}`;

        if (clienteEmEdicaoId) {
            const idx = clientes.findIndex(c => c.id === clienteEmEdicaoId);
            if (idx >= 0) {
                clientes[idx] = {
                    ...clientes[idx],
                    nome: nome.trim(),
                    endereco: enderecoCompleto,
                    whatsapp: tel.trim()
                };
            }
            saveClientes();
            renderClientes(document.getElementById('buscar-cliente')?.value || '');
            clienteSelecionadoId = clienteEmEdicaoId;
        } else {
            const novoCliente = {
                id: `cli-${Date.now()}`,
                nome: nome.trim(),
                endereco: enderecoCompleto,
                whatsapp: tel.trim(),
                frequente: false,
                envios: 0
            };
            clientes.unshift(novoCliente);
            saveClientes();
            renderClientes(document.getElementById('buscar-cliente')?.value || '');
            clienteSelecionadoId = novoCliente.id;
        }
        
        // Abre o modal de detalhes com os dados
        irParaPasso2(clienteSelecionadoId, nome, enderecoCompleto, tel);
        
        // Fecha o modal de novo cliente
        fecharModalNovoCliente();
        
        // Limpa os campos
        resetClienteForm();
    } else {
        alert("Por favor, preencha Nome, WhatsApp, Rua e Número.");
    }
}


        function simularLogin() {
            navegar('view-dash-loja');
                        setTimeout(() => {
                document.getElementById('dash-loader-content').innerHTML = `
                    <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 25px;">Olá, Express Imports! </h2>
                    <div class="promo-banner"><h3>Está com pressa?</h3><p>Experimente o envio <b>Flash</b>.</p></div>
                    
                    <div class="grid-stats">
                        <div class="stat-card"><span>Entregas hoje</span><h4>12</h4></div>
                        <div class="stat-card"><span>Em trânsito</span><h4>4</h4></div>
                    </div>

                    <div class="filter-container">
                        <div class="chip active">Todas</div>
                        <div class="chip">Em rota</div>
                        <div class="chip">Pendentes</div>
                    </div>

                    <div class="rota-card">
                        <div class="rota-icon"><i data-lucide="package" size="22"></i></div>
                        <div class="rota-info">
                            <h5>Rota #8829</h5>
                            <p>4 pacotes  -  Fortaleza</p>
                        </div>
                        <span class="status-pill pill-em-rota">Em rota</span>
                    </div>
                `;
                lucide.createIcons();
            }, 1200);
        }
        // --- C?"DIGO DO SWIPE (DESLIZAR) ---
        let touchStartX = 0;
        let activeCard = null;
        let pendingDeleteClientId = null;

        function handleTouchStart(e) {
            // Se o toque for no card da Maria, vamos rastrear
            touchStartX = e.touches[0].clientX;
            activeCard = e.currentTarget;
            activeCard.style.transition = 'none'; // Tira a animação enquanto o dedo move
            revealEditButton(activeCard);
        }

        function handleTouchMove(e) {
            if (!activeCard) return;
            let touchX = e.touches[0].clientX;
            let diff = touchX - touchStartX;
            
            // Só deixa arrastar para a esquerda (diff negativo)
            // Limitamos em -150px para o card não sair da tela totalmente sem querer
            if (diff < 0 && diff > -150) {
                activeCard.style.transform = `translateX(${diff}px)`;
            }
        }

                function handleTouchEnd(e) {
            if (!activeCard) return;
            activeCard.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            
            let touchX = e.changedTouches[0].clientX;
            let diff = touchX - touchStartX;

            // Se deslizou mais de 70px para a esquerda
            if (diff < -70) {
                // Faz o card sair da tela
                activeCard.style.transform = 'translateX(-120%)';
                
                // Guarda o ID para saber quem excluir
                const idParaDeletar = activeCard.id;
                
                // Chama a confirmação após o movimento de saída
                setTimeout(() => {
                    confirmarExclusao(idParaDeletar);
                }, 300);
            } else {
                // Volta para o lugar se deslizou pouco
                activeCard.style.transform = 'translateX(0)';
            }
            activeCard = null;
        }


        function confirmarExclusao(cardId) {
            const card = document.getElementById(cardId);
            const container = card.parentElement;
            container.style.display = 'none';
            pendingDeleteClientId = card.dataset?.clientId || null;

            const toastAntigo = document.getElementById('toast-desfazer');
            if (toastAntigo) toastAntigo.remove();

            const toast = document.createElement('div');
            toast.className = 'undo-toast';
            toast.id = 'toast-desfazer';
            
            // Agora o clique funciona em qualquer lugar do toast
            toast.onclick = () => desfazerExclusao(cardId);

            let segundosRestantes = 10;

            toast.innerHTML = `
                <div class="undo-content">
                    <div class="undo-timer" id="timer-count">${segundosRestantes}</div>
                    <span style="font-size: 14px;">Cliente removido</span>
                </div>
                <div class="undo-btn">Desfazer</div>
            `;
            
            document.body.appendChild(toast);

            // Lógica do contador visual
            const interval = setInterval(() => {
                segundosRestantes--;
                const timerElement = document.getElementById('timer-count');
                if (timerElement) {
                    timerElement.innerText = segundosRestantes;
                }
                
                if (segundosRestantes <= 0) {
                    clearInterval(interval);
                    fecharToastSuave(toast);
                    if (pendingDeleteClientId) {
                        clientes = clientes.filter(c => c.id !== pendingDeleteClientId);
                        saveClientes();
                        renderClientes(document.getElementById('buscar-cliente')?.value || '');
                        pendingDeleteClientId = null;
                    }
                }
            }, 1000);

            // Guardamos o intervalo no elemento para limpar se o usuário clicar antes
            toast.dataset.intervalId = interval;
        }

        function fecharToastSuave(elemento) {
            if (elemento) {
                elemento.style.opacity = '0';
                elemento.style.transition = 'opacity 0.5s ease-out';
                setTimeout(() => elemento.remove(), 1000);
            }
        }

        // Ajuste na função de desfazer para limpar o contador
        function desfazerExclusao(cardId) {
            const toast = document.getElementById('toast-desfazer');
            if (toast) {
                clearInterval(toast.dataset.intervalId);
                toast.remove();
            }

            const card = document.getElementById(cardId);
            const container = card.parentElement;
            container.style.display = 'block';
            card.style.transform = 'translateX(0)';
            pendingDeleteClientId = null;
        }



        // VERSÃO LEGADA: mantida para comparação de comportamento.
        // A versão ativa de `desfazerExclusao` é a primeira (com limpeza de intervalo do timer).
        function desfazerExclusao_legacy(cardId) {
            const card = document.getElementById(cardId);
            const container = card.parentElement;
            
            // Traz o container de volta e reseta o card para a posição original
            container.style.display = 'block';
            card.style.transform = 'translateX(0)';
            
            // Remove o aviso preto da tela imediatamente
            const aviso = document.getElementById('toast-desfazer');
            if (aviso) aviso.remove();
        }

let veiculoSelecionado = "Moto";
let veiculoPrecoSelecionado = "R$ 12,50";
let resumoRevisaoAtual = {
    origem: '',
    destino: '',
    distanciaKm: null,
    duracaoMin: null,
    totalFrete: null,
    servico: 'Standard',
    veiculo: 'Moto'
};

const TARIFA_POR_KM = {
    Standard: { Patinete: 1.05, Bicicleta: 1.10, Moto: 1.20, Carro: 1.25, Van: 1.35 },
    Flash: { Moto: 1.45, Carro: 1.65, Van: 1.95 }
};

const TAXA_MINIMA = { Standard: 5.0, Flash: 9.0 };

function getServicoSelecionadoAtual() {
    return document.querySelector('#modal-envio-detalhes .selection-grid .select-box.active strong')?.innerText || 'Standard';
}

function parseMoedaParaNumero(valor) {
    if (valor === null || valor === undefined) return 0;
    if (typeof valor === 'number') return valor;
    const limpo = valor.toString().replace('R$', '').trim().replace(/\./g, '').replace(',','.');
    const numero = Number(limpo);
    return Number.isFinite(numero) ? numero : 0;
}

function precoParaInput(preco) {
    const numero = parseMoedaParaNumero(preco);
    return numero ? numero.toFixed(2) : '';
}

function precoParaMoeda(preco) {
    const numero = parseMoedaParaNumero(preco);
    return 'R$ ' + numero.toFixed(2).replace('.', ',');
}

const ROUTING_CONFIG = {
    mode: 'production',
    proxyBaseUrl: (window.FLEXA_ROUTING_PROXY_URL || '').trim(),
    timeoutMs: 10000,
    allowPublicFallback: true
};

function formatarEnderecoEstruturado(end) {
    if (!end) return '';
    const ruaNum = [end.rua, end.num].filter(Boolean).join(', ');
    const cidadeUf = [end.cidade, end.uf].filter(Boolean).join('/');
    const bairro = end.bairro ? ` - ${end.bairro}` : '';
    return `${ruaNum}${bairro}${cidadeUf ? ` - ${cidadeUf}` : ''}`.trim();
}


function obterEnderecoLojaTexto() {
    return formatarEnderecoEstruturado(window.usuarioLogado?.endereco);
}

async function obterEnderecoLojaAtual() {
    const uid = getUsuarioIdAtual();
    if (!uid) return '';

    try {
        const snap = await db.ref(`usuarios/${uid}/endereco`).once('value');
        const enderecoDb = snap.val();
        if (enderecoDb) {
            if (!window.usuarioLogado) window.usuarioLogado = { id: uid };
            window.usuarioLogado.endereco = enderecoDb;
            return formatarEnderecoEstruturado(enderecoDb);
        }
    } catch (erro) {
        console.warn('Falha ao carregar endereco do lojista no BD:', erro);
    }

    return formatarEnderecoEstruturado(window.usuarioLogado?.endereco);
}
function obterTarifaKm(servico, veiculo) {
    const tabela = TARIFA_POR_KM[servico] || TARIFA_POR_KM.Standard;
    return tabela[veiculo] || tabela.Moto || 1.2;
}

function calcularFreteEstimado({ servico, veiculo, distanciaKm }) {
    const minimo = TAXA_MINIMA[servico] || TAXA_MINIMA.Standard;
    const tarifaKm = obterTarifaKm(servico, veiculo);
    const distancia = Number.isFinite(distanciaKm) ? Math.max(0, distanciaKm) : 0;
    return Math.max(minimo, distancia * tarifaKm);
}

function formatarDistancia(distanciaKm) {
    if (!Number.isFinite(distanciaKm)) return '--';
    return `${distanciaKm.toFixed(1).replace('.', ',')} km`;
}

function formatarDuracao(duracaoMin) {
    if (!Number.isFinite(duracaoMin)) return '--';
    if (duracaoMin < 60) return `${Math.max(1, Math.round(duracaoMin))} min`;
    const horas = Math.floor(duracaoMin / 60);
    const mins = Math.round(duracaoMin % 60);
    return mins ? `${horas}h ${mins}min` : `${horas}h`;
}

async function geocodificarEndereco(endereco) {
    if (!endereco) return null;
    const q = encodeURIComponent(`${endereco}, Brasil`);
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${q}`;
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error('Falha ao geocodificar endereco');
    const dados = await resposta.json();
    if (!Array.isArray(dados) || !dados.length) return null;
    return { lat: Number(dados[0].lat), lon: Number(dados[0].lon) };
}

async function fetchJsonComTimeout(url, options = {}, timeoutMs = ROUTING_CONFIG.timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const resp = await fetch(url, { ...options, signal: controller.signal });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function estimarRotaPublica(origemEndereco, destinoEndereco) {
    const [origem, destino] = await Promise.all([
        geocodificarEndereco(origemEndereco),
        geocodificarEndereco(destinoEndereco)
    ]);
    if (!origem || !destino) return null;
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origem.lon},${origem.lat};${destino.lon},${destino.lat}?overview=false`;
    const rota = (await fetchJsonComTimeout(osrmUrl))?.routes?.[0];
    if (!rota) return null;
    return { distanciaKm: rota.distance / 1000, duracaoMin: rota.duration / 60 };
}

async function estimarRotaEntrega(origemEndereco, destinoEndereco) {
    try {
        const uid = getUsuarioIdAtual();
        if (ROUTING_CONFIG.proxyBaseUrl) {
            const base = ROUTING_CONFIG.proxyBaseUrl.replace(/\/$/, '');
            const json = await fetchJsonComTimeout(`${base}/estimate-route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId: uid || null,
                    tenantType: 'lojista',
                    origemEndereco,
                    destinoEndereco
                })
            });
            if (Number.isFinite(Number(json?.distanciaKm)) && Number.isFinite(Number(json?.duracaoMin))) {
                return {
                    distanciaKm: Number(json.distanciaKm),
                    duracaoMin: Number(json.duracaoMin)
                };
            }
        }

        if (ROUTING_CONFIG.allowPublicFallback) {
            return await estimarRotaPublica(origemEndereco, destinoEndereco);
        }
        return null;
    } catch (erro) {
        console.warn('Nao foi possivel estimar rota (modo producao/fallback):', erro);
        if (ROUTING_CONFIG.allowPublicFallback) {
            try { return await estimarRotaPublica(origemEndereco, destinoEndereco); } catch (_) { return null; }
        }
        return null;
    }
}
function atualizarPrecoEstimadoAtual() {
    const servico = getServicoSelecionadoAtual();
    const distanciaKm = Number.isFinite(resumoRevisaoAtual.distanciaKm) ? resumoRevisaoAtual.distanciaKm : 0;
    const total = calcularFreteEstimado({ servico, veiculo: veiculoSelecionado, distanciaKm });
    resumoRevisaoAtual.servico = servico;
    resumoRevisaoAtual.veiculo = veiculoSelecionado;
    resumoRevisaoAtual.totalFrete = total;
    const inputValor = document.getElementById('input-valor');
    if (inputValor) inputValor.value = total.toFixed(2);
    const revTotal = document.getElementById('rev-total');
    if (revTotal) revTotal.innerText = precoParaMoeda(total);
}

function selecionarVeiculo(tipo, preco) {
    const mapaIds = { Patinete: 'v-patinete', Bicicleta: 'v-bike', Moto: 'v-moto', Carro: 'v-carro', Van: 'v-van' };
    const alvo = document.getElementById(mapaIds[tipo]);
    if (alvo?.classList.contains('disabled')) return;
    ['v-patinete', 'v-bike', 'v-moto', 'v-carro', 'v-van'].forEach((id) => document.getElementById(id)?.classList.remove('active'));
    if (alvo) alvo.classList.add('active');
    veiculoSelecionado = tipo;
    if (preco) veiculoPrecoSelecionado = preco;
    atualizarPrecoEstimadoAtual();
}

function irParaVeiculos() {
    setModalEnvioStep(2);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function voltarParaDetalhes() {
    setModalEnvioStep(1);
}

// Revisao com distancia/tempo e valor estimado
async function irParaRevisao() {
    const nome = document.getElementById('card-nome').innerText;
    const enderecoDestino = document.getElementById('card-endereco').innerText;
    const enderecoOrigem = await obterEnderecoLojaAtual();
    const servico = document.querySelector('#modal-envio-detalhes .selection-grid .select-box.active strong')?.innerText || 'Standard';
    const tamanho = document.querySelector('#modal-envio-detalhes .selection-grid-3 .select-box.active strong')?.innerText || 'P';
    let distanciaKm = null;
    let duracaoMin = null;
    if (enderecoOrigem && enderecoDestino) {
        const estimativa = await estimarRotaEntrega(enderecoOrigem, enderecoDestino);
        if (estimativa) { distanciaKm = estimativa.distanciaKm; duracaoMin = estimativa.duracaoMin; }
    }
    const totalFrete = calcularFreteEstimado({ servico, veiculo: veiculoSelecionado, distanciaKm: Number.isFinite(distanciaKm) ? distanciaKm : 0 });
    resumoRevisaoAtual = { origem: enderecoOrigem, destino: enderecoDestino, distanciaKm, duracaoMin, totalFrete, servico, veiculo: veiculoSelecionado };
    document.getElementById('rev-nome').innerText = nome;
    document.getElementById('rev-end').innerText = enderecoDestino;
    document.getElementById('rev-servico').innerText = servico;
    document.getElementById('rev-tamanho').innerText = `Pacote ${tamanho} - ${veiculoSelecionado}`;
    document.getElementById('rev-total').innerText = precoParaMoeda(totalFrete);
    const revDist = document.getElementById('rev-distancia'); if (revDist) revDist.innerText = formatarDistancia(distanciaKm);
    const revTempo = document.getElementById('rev-tempo'); if (revTempo) revTempo.innerText = formatarDuracao(duracaoMin);
    const revOrigem = document.getElementById('rev-origem'); if (revOrigem) revOrigem.innerText = enderecoOrigem || 'Defina o endereco da loja no Perfil';
    const inputValor = document.getElementById('input-valor'); if (inputValor) inputValor.value = totalFrete.toFixed(2);
    setModalEnvioStep(3);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Ativa o link de Rotas no menu inferior
document.querySelector('.nav-item:nth-child(2)').onclick = () => navegar('view-rotas');

function abrirCriarRota() {
    // Aqui simulamos que existem 3 envios pendentes no seu banco/memória
    const pendentes = [
        { id: 1, cliente: "Maria Silva", preco: 12.50, flash: false },
        { id: 2, cliente: "João Paulo", preco: 25.00, flash: true }, // Regra do Flash
        { id: 3, cliente: "Ana Beatriz", preco: 12.50, flash: false }
    ];

    const container = document.getElementById('selecao-envios');
    container.innerHTML = '';

    pendentes.forEach(envio => {
        const div = document.createElement('div');
        div.className = 'checkbox-envio';
        div.onclick = function() { 
            this.classList.toggle('selected');
            atualizarResumoRota();
        };
        div.innerHTML = `
            <div style="flex:1">
                <strong style="display:block">${envio.cliente}</strong>
                <span style="font-size:12px; color:var(--text-sub)">R$ ${envio.preco.toFixed(2)}</span>
                ${envio.flash ? '<span class="badge-flash">FLASH</span>' : ''}
            </div>
            <i data-lucide="circle"></i>
        `;
        container.appendChild(div);
    });
    
    document.getElementById('modal-criar-rota').classList.add('active');
    lucide.createIcons();
}

function fecharModalRota() {
    document.getElementById('modal-criar-rota').classList.remove('active');
}

function pagarComPix() {
    // Passo 3: Simulação de Sucesso
    alert("Simulando Pagamento PIX...");
    setTimeout(() => {
        alert("Pagamento Confirmado!");
        fecharModalRota();
        navegar('view-rotas');
        // Aqui você adicionaria a lógica de inserir na lista de rotas reais
    }, 1500);
}

function atualizarResumoRota() {
    const selecionados = document.querySelectorAll('.checkbox-envio.selected').length;
    document.getElementById('rota-qtd').innerText = selecionados;
    document.getElementById('rota-total').innerText = "R$ " + (selecionados * 12.50).toFixed(2); // Simulação de preço
}

async function cadastrarReal() {
    const nome = document.getElementById('input-nome').value;
    const email = document.querySelector('#form-cadastrar input[type="email"]').value;
    const senha = document.getElementById('pass-cad').value;

    if (!nome || !email || !senha) return alert("Preencha todos os campos!");

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, senha);
        
        // Salva os dados extras no Realtime Database
        await db.ref('usuarios/' + cred.user.uid).set({
            nome: nome,
            email: email,
            tipo: 'loja',
            criadoEm: Date.now()
        });

        alert("Conta criada com sucesso!");
        alternarAuth('entrar');
    } catch (error) {
        alert("Erro ao cadastrar: " + error.message);
    }
}    
// ===================== [AUTENTICA - fO - VERSÃO ATIVA] =====================
async function loginReal() {
    const email = document.getElementById('email-login').value;
    const senha = document.getElementById('pass-login').value;

    if (!email || !senha) return alert("Preencha e-mail e senha!");

    try {
        const cred = await auth.signInWithEmailAndPassword(email, senha);
        const snapshot = await db.ref('usuarios/' + cred.user.uid).once('value');
        const dadosUser = snapshot.val();

        if (dadosUser) {
            usuarioLogado = { id: cred.user.uid, ...dadosUser };
            localStorage.setItem('flexa_session', JSON.stringify(usuarioLogado));
            
            // 1. Muda para a tela de Dash
            navegar('view-dash-loja');
            
            // 2. Preenche o Dashboard IMEDIATAMENTE (Parando o efeito de carregar)
            renderizarDashboard(usuarioLogado);
        }
    } catch (error) {
        alert("Erro ao entrar: " + error.message);
    }
}
// --- FUN - fO PARA IR AO PERFIL E CARREGAR DADOS ---
function irParaPerfil() {
    // 1. Ativa a visualização
    navegar('view-perfil');
    
    // 2. Preenche os dados se o usuário estiver logado
    if (usuarioLogado) {
        document.getElementById('perfil-nome-loja').innerText = usuarioLogado.nome || "Minha Loja";
        document.getElementById('perfil-email-loja').innerText = usuarioLogado.email || "";
        
        if (usuarioLogado.logo) {
            document.getElementById('img-perfil-display').src = usuarioLogado.logo;
        }
    }
    
    // 3. Renderiza os Ícones da Lucide que acabaram de aparecer
    lucide.createIcons();
}
// --- FUN - fO DE LOGOUT ---
// 1. FUN - fO PARA LOGOUT
function logoutReal() {
    if (confirm("Tem certeza que deseja sair?")) {
        firebase.auth().signOut().then(() => {
            alert("Sessão encerrada!");
            // Limpa dados locais se houver e volta para a tela inicial
            localStorage.removeItem('flexa_user_data'); 
            window.location.reload(); // Recarrega para limpar o estado da aplicação
        }).catch((error) => {
            alert("Erro ao sair: " + error.message);
        });
    }
}

// 2. MONITOR DE ESTADO DE AUTENTICA - fO (Persistência)
// Esta função roda automaticamente sempre que a página abre ou o estado muda
// MONITOR DE ESTADO DE AUTENTICA - fO
firebase.auth().onAuthStateChanged((user) => {
    const tabbar = document.getElementById('main-nav');
    const splash = document.getElementById('splash-screen');

    if (user) {
        // Usuário Logado
        firebase.database().ref('usuarios/' + user.uid).once('value')
            .then((snapshot) => {
                const userData = snapshot.val();
                if (userData) {
                    window.usuarioLogado = { id: user.uid, ...userData };
                    renderizarDashboard(userData);
                    navegar('view-dash-loja');
                    if (tabbar) tabbar.style.display = 'flex';
                    initClientes();
                }
                finalizarSplash(splash);
            }).catch(() => finalizarSplash(splash));
    } else {
        // Usuário Deslogado
        navegar('view-inicio');
        if (tabbar) tabbar.style.display = 'none';
        initClientes();
        finalizarSplash(splash);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initClienteSearch();
    initClientes();
});

// ===================== [BLOCO LEGADO - N?fO REMOVER SEM VALIDAR] =====================
// Função suave para esconder o splash
// VERSÃO LEGADA DUPLICADA: mantida para histórico. A versão ativa está na definição logo abaixo.
function finalizarSplash_legacy(elemento) {
    if (elemento) {
        elemento.style.opacity = '0';
        setTimeout(() => {
            elemento.style.display = 'none';
        }, 500); // Tempo da transição CSS
    }
}

// Função suave para esconder o splash
function finalizarSplash(elemento) {
    if (elemento) {
        elemento.style.opacity = '0';
        setTimeout(() => {
            elemento.style.display = 'none';
        }, 500); // Tempo da transição CSS
    }
}

// 3. ATUALIZA - fO DA FUN - fO DE LOGIN EXISTENTE
// Certifique-se que sua função loginReal() use o Firebase Auth corretamente
// O Firebase por padrão já usa 'local' persistence no browser.
// VERSÃO LEGADA: mantida para auditoria. A versão ativa é a implementação assíncrona acima.
function loginReal_legacy() {
    const email = document.getElementById('email-login').value;
    const senha = document.querySelector('#pass-login').value;

    if (!email || !senha) {
        alert("Preencha todos os campos!");
        return;
    }

    firebase.auth().signInWithEmailAndPassword(email, senha)
        .then((userCredential) => {
            // O onAuthStateChanged acima cuidará do redirecionamento
           
        })
        .catch((error) => {
            alert("Erro no login: " + error.message);
        });
}


// --- UPLOAD DE LOGO (BASE64) ---
function uploadLogo(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Image = e.target.result;
            document.getElementById('logo-perfil-display').src = base64Image;
            
            try {
                await db.ref('usuarios/' + usuarioLogado.id).update({ logo: base64Image });
                // Atualiza também no Dashboard
                const logoDash = document.querySelector('.profile-img');
                if(logoDash) logoDash.src = base64Image;
                alert("Logo atualizada!");
            } catch (err) {
                alert("Erro ao salvar: " + err.message);
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function renderizarDashboard(user) {
    // 1. Define o container onde o conteúdo será injetado
    const container = document.getElementById('dash-loader-content');
    if (!container) return;

    // 2. Define a foto (Prioriza 'foto', depois 'logo', e por fim o placeholder)
    const fotoUrl = user.foto || user.logo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
    

    // 4. Monta o HTML dinâmico
    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 25px;">
            <img src="${fotoUrl}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid var(--brand-orange);">
            <div>
                <p style="color: var(--text-sub); font-size: 12px; margin: 0;">Bem-vindo,</p>
                <h2 style="font-size: 20px; font-weight: 800; margin: 0;">${user.nome || 'Usuário'}! </h2>
            </div>
        </div>

        <div class="promo-banner">
            <h3>Está com pressa?</h3>
            <p>Experimente o envio <b>Flash</b>.</p>
        </div>
        
        <div class="grid-stats">
            <div class="stat-card"><span>Entregas hoje</span><h4>0</h4></div>
            <div class="stat-card"><span>Em trânsito</span><h4>0</h4></div>
        </div>

        <div class="filter-container">
            <div style="background: var(--brand-orange)" class="chip active">Todas</div>
            <div class="chip">Em rota</div>
            <div class="chip">Pendentes</div>
        </div>

        <div id="lista-vazia-dash" style="text-align:center; padding:20px; color:var(--text-sub);">
            <p>Nenhuma atividade recente.</p>
        </div>
    `;
    
    // 5. Renderiza os Ícones do Lucide
    if(typeof lucide !== 'undefined') lucide.createIcons();
}
function buscarDadosDoBanco(uid) {
    // Usamos .on para que qualquer alteração no banco reflita no app em tempo real
    db.ref('usuarios/' + uid).on('value', (snapshot) => {
        const dados = snapshot.val();
        if (dados) {
            // Salva os dados na memória global do app
            window.usuarioLogado = { id: uid, ...dados }; 
            
            // Atualiza os elementos da tela de Perfil se eles existirem na página
            const nomeDisplay = document.getElementById('perfil-nome-display');
            const instaDisplay = document.getElementById('perfil-insta-display');
            const fotoDisplay = document.getElementById('perfil-foto-display');

            if (nomeDisplay) nomeDisplay.innerText = dados.nome || 'Usuário';
            if (instaDisplay) instaDisplay.innerText = dados.instagram || '@seuinsta';
            if (fotoDisplay) fotoDisplay.src = dados.foto || 'https://via.placeholder.com/110';
            
            // Renderiza o dash e navega (apenas na primeira carga)
            renderizarDashboard(dados); 
            // Se estiver na tela de login, manda para o dash
            if(document.getElementById('view-auth').classList.contains('active')) {
                navegar('view-dash-loja');
            }
        } else {
            navegar('view-auth'); 
        }
    });
}
// Adicione ou substitua no seu <script>
const overlayRota = document.getElementById('overlay-rota');
const sheetRota = document.getElementById('sheet-rota');

function openModal() {
    overlayRota.style.display = 'flex';
    // Pequeno delay para permitir a transição CSS
    setTimeout(() => {
        sheetRota.classList.add('show');
    }, 10);
}

function closeModal() {
    sheetRota.classList.remove('show');
    setTimeout(() => {
        overlayRota.style.display = 'none';
    }, 400); // Tempo igual à transição CSS
}

// Atualize a inicialização dos Ícones caso necessário
lucide.createIcons();

// Abrir Modal de Perfil e carregar dados atuais
function abrirModalPerfil() {
    const user = window.usuarioLogado;
    if (user) {
        document.getElementById('edit-nome').value = user.nome || '';
        document.getElementById('edit-instagram').value = user.instagram || '';
        document.getElementById('edit-whatsapp').value = user.whatsapp || '';
        if (user.foto) document.getElementById('edit-preview-img').src = user.foto;
    }
    
    const overlay = document.getElementById('overlay-perfil');
    const sheet = document.getElementById('sheet-perfil');
    overlay.style.display = 'flex';
    setTimeout(() => sheet.style.transform = 'translateY(0)', 10);
}

function fecharModalPerfil() {
    const sheet = document.getElementById('sheet-perfil');
    sheet.style.transform = 'translateY(100%)';
    setTimeout(() => document.getElementById('overlay-perfil').style.display = 'none', 400);
}

// Preview da imagem selecionada
function previewImagem(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('edit-preview-img').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Salvar no Firebase
function salvarPerfil() {
    // 1. Verifica se temos o ID do usuário
    const uid = window.usuarioLogado ? window.usuarioLogado.id : (firebase.auth().currentUser ? firebase.auth().currentUser.uid : null);
    
    if (!uid) {
        alert("Erro: Usuário não identificado. Tente fazer login novamente.");
        return;
    }

    const novosDados = {
        nome: document.getElementById('edit-nome').value,
        instagram: document.getElementById('edit-instagram').value,
        whatsapp: document.getElementById('edit-whatsapp').value,
        foto: document.getElementById('edit-preview-img').src // Imagem em Base64
    };

    // 2. Salva no Firebase
    db.ref('usuarios/' + uid).update(novosDados)
        .then(() => {
            // 3. Atualiza o objeto na memória do app
            window.usuarioLogado = { ...window.usuarioLogado, ...novosDados };
            
            // 4. Atualiza os textos na tela de perfil usando os IDs corretos
            const nomeDisp = document.getElementById('perfil-nome-display');
            const instaDisp = document.getElementById('perfil-insta-display');
            const fotoDisp = document.getElementById('perfil-foto-display');

            if (nomeDisp) nomeDisp.innerText = novosDados.nome;
            if (instaDisp) instaDisp.innerText = novosDados.instagram;
            if (fotoDisp) fotoDisp.src = novosDados.foto;
            
            fecharModalPerfil();
            
            // 5. Renderiza novamente os Ícones (importante para o Ícone do Insta)
            if(typeof lucide !== 'undefined') lucide.createIcons();
            
            alert("Perfil atualizado com sucesso!");
        })
        .catch(error => {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar: " + error.message);
        });
}

// 1. ABRE O MODAL E PREENCHE OS DADOS SE EXISTIREM
function abrirModalEndereco() {
    const modal = document.getElementById('modal-endereco');
    if (!modal) return;
    
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('is-open'));
    
    // Atualiza Ícones Lucide (como o Ícone de fechar e map-pin)
    if(typeof lucide !== 'undefined') lucide.createIcons();
    
    // Tenta pegar os dados salvos no objeto global
    const end = window.usuarioLogado?.endereco;
    if (end) {
        document.getElementById('end-cep').value = end.cep || '';
        document.getElementById('end-rua').value = end.rua || '';
        document.getElementById('end-num').value = end.num || '';
        document.getElementById('end-bairro').value = end.bairro || '';
        document.getElementById('end-cidade').value = end.cidade || '';
        document.getElementById('end-uf').value = end.uf || '';
        document.getElementById('end-comp').value = end.comp || '';
    }
}

// 2. FECHA O MODAL
function fecharModalEndereco() {
    const modal = document.getElementById('modal-endereco');
    if (!modal) return;
    modal.classList.remove('is-open');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 250);
}

// 3. BUSCA CEP (VERSÃO ?sNICA E COMPLETA)
function buscarCEP(valor) {
    const cep = valor.replace(/\D/g, '');
    if (cep.length !== 8) return;

    // Feedback visual nos campos
    const campoRua = document.getElementById('end-rua');
    campoRua.placeholder = "Buscando endereço...";

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(res => res.json())
        .then(dados => {
            if (!dados.erro) {
                document.getElementById('end-rua').value = dados.logradouro;
                document.getElementById('end-bairro').value = dados.bairro;
                document.getElementById('end-cidade').value = dados.localidade;
                document.getElementById('end-uf').value = dados.uf;
                document.getElementById('end-num').focus(); // Foca no número para agilizar
            } else {
                alert("CEP não encontrado.");
                campoRua.placeholder = "Nome da rua";
            }
        })
        .catch(() => {
            alert("Erro ao buscar CEP. Verifique sua conexão.");
            campoRua.placeholder = "Nome da rua";
        });
}

// 4. SALVA NO FIREBASE
function salvarEndereco() {
    // Identifica o UID de forma segura
    const uid = window.usuarioLogado?.id || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : null);
    
    if (!uid) {
        alert("Erro: Usuário não identificado.");
        return;
    }

    const endereco = {
        cep: document.getElementById('end-cep').value,
        rua: document.getElementById('end-rua').value,
        num: document.getElementById('end-num').value,
        bairro: document.getElementById('end-bairro').value,
        cidade: document.getElementById('end-cidade').value,
        uf: document.getElementById('end-uf').value,
        comp: document.getElementById('end-comp').value
    };

    // Salva no nó 'endereco' dentro do perfil do usuário
    db.ref('usuarios/' + uid + '/endereco').update(endereco)
        .then(() => {
            // Atualiza o objeto local para refletir as mudanças sem recarregar
            if (!window.usuarioLogado) window.usuarioLogado = {};
            window.usuarioLogado.endereco = endereco;
            
            fecharModalEndereco();
            alert("Endereço atualizado com sucesso!");
        })
        .catch(error => {
            console.error("Erro ao salvar endereço:", error);
            alert("Erro ao salvar: " + error.message);
        });
}







/* ===== New Envio Home + Client Sheet ===== */
function abrirSeletorCliente() {
    const modal = document.getElementById('modal-seletor-cliente');
    if (!modal) return;
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('is-open'));
    renderClientesSelector(document.getElementById('buscar-cliente')?.value || '');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function fecharSeletorCliente() {
    const modal = document.getElementById('modal-seletor-cliente');
    if (!modal) return;
    modal.classList.remove('is-open');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 220);
}

function abrirNovoClientePeloSeletor() {
    fecharSeletorCliente();
    setTimeout(() => abrirNovoCliente(), 180);
}

function renderClientesSelector(filtro = '') {
    const container = document.getElementById('clientes-sheet-list');
    if (!container) return;

    const filtroTexto = normalizarTexto(filtro);
    const filtroNumero = (filtro || '').replace(/\D/g, '');

    const lista = clientes.filter((c) => {
        const texto = normalizarTexto(`${c.nome} ${c.endereco} ${c.whatsapp}`);
        if (!filtroTexto) return true;
        if (filtroNumero && c.whatsapp) {
            return c.whatsapp.replace(/\D/g, '').includes(filtroNumero);
        }
        return texto.includes(filtroTexto);
    }).sort((a, b) => {
        const fa = a.frequente ? 1 : 0;
        const fb = b.frequente ? 1 : 0;
        if (fb !== fa) return fb - fa;
        return (a.nome || '').localeCompare(b.nome || '');
    });

    if (!lista.length) {
        container.innerHTML = '<div class="selector-empty">Nenhum cliente encontrado.</div>';
        return;
    }

    container.innerHTML = lista.map((c) => {
        const badge = c.frequente ? '<span class="badge-freq selector-freq-badge">Frequente</span>' : '';
        const iniciais = (c.nome || 'C').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
        const foto = c.foto || c.avatar || '';
        const avatar = foto
            ? `<img class="selector-avatar-img" src="${foto}" alt="${c.nome || 'Cliente'}">`
            : `<span class="selector-avatar-iniciais">${iniciais}</span>`;

        return `
            <button type="button" class="selector-cliente-card" onclick="selecionarClienteNoSheet('${c.id}', '${c.nome.replace(/'/g, "\\'")}', '${c.endereco.replace(/'/g, "\\'")}', '${c.whatsapp.replace(/'/g, "\\'")}')">
                ${badge}
                <div class="selector-avatar">${avatar}</div>
                <div class="selector-info">
                    <strong class="selector-nome">${c.nome}</strong>
                    <span class="selector-endereco">${formatEnderecoDisplay(c.endereco)}</span>
                    <span class="selector-whatsapp">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512" fill="currentColor"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.1 0-65.6-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.2-3.2-5.6-.3-8.6 2.5-11.3 2.5-2.5 5.6-6.5 8.3-9.7 2.8-3.3 3.7-5.6 5.6-9.3 1.9-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.5 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
                        ${c.whatsapp}
                    </span>
                </div>
            </button>
        `;
    }).join('');
}
function selecionarClienteNoSheet(id, nome, endereco, whats) {
    fecharSeletorCliente();
    setTimeout(() => {
        irParaPasso2(id, nome, endereco, whats);
    }, 200);
}

function coletarEnviosDaBase() {
    const envios = [];
    clientes.forEach((c) => {
        const historico = Array.isArray(c.historico) ? c.historico : [];
        historico.forEach((h, idx) => {
            envios.push({
                id: h.id || `envio-${c.id}-${idx}`,
                codigo: h.id ? h.id.replace('envio-', '').slice(-4) : String(idx + 1).padStart(4, '0'),
                destinatario: c.nome || 'Cliente',
                endereco: formatEnderecoDisplay(c.endereco || ''),
                status: (h.servico || '').toLowerCase().includes('flash') ? 'Expresso' : 'Pendente',
                valor: Number.isFinite(Number(h.valorFrete)) ? Number(h.valorFrete) : parseMoedaParaNumero(h.valor || 0),
                servico: h.servico || 'Standard',
                veiculo: h.veiculo || 'Moto',
                distanciaKm: Number.isFinite(Number(h.distanciaKm)) ? Number(h.distanciaKm) : null,
                duracaoMin: Number.isFinite(Number(h.duracaoMin)) ? Number(h.duracaoMin) : null,
                criadoEm: h.criadoEm || Date.now()
            });
        });
    });

    if (!envios.length) return [];

    return envios.sort((a, b) => b.criadoEm - a.criadoEm);
}

function renderEnviosHome() {
    const container = document.getElementById('envios-list');
    if (!container) return;

    const envios = coletarEnviosDaBase();
    if (!envios.length) {
        container.innerHTML = `
            <div class="envios-empty">
                <h3>Voce ainda nao tem pacotes para enviar</h3>
                <button type="button" class="envios-empty-btn" onclick="abrirSeletorCliente()">Criar envio</button>
            </div>
        `;
        return;
    }

    container.innerHTML = envios.map((envio) => {
        const data = new Date(envio.criadoEm || Date.now()).toLocaleDateString('pt-BR');
        const valor = Number(envio.valor || 0).toFixed(2).replace('.', ',');
        const distanciaTxt = Number.isFinite(envio.distanciaKm) ? `${envio.distanciaKm.toFixed(1).replace('.', ',')} km` : '--';
        const tempoTxt = Number.isFinite(envio.duracaoMin) ? `${Math.max(1, Math.round(envio.duracaoMin))} min` : '--';
        return `
            <div class="envio-swipe-container" id="envio-wrap-${envio.id}">
                <div class="envio-swipe-delete">
                    <button type="button" onclick="confirmarExclusaoEnvio('${envio.id}')">Excluir</button>
                </div>
                <article class="envio-item-card envio-swipe-content"
                         id="envio-card-${envio.id}"
                         data-envio-id="${envio.id}"
                         ontouchstart="handleEnvioTouchStart(event)"
                         ontouchmove="handleEnvioTouchMove(event)"
                         ontouchend="handleEnvioTouchEnd(event)">
                    <button class="envio-delete-btn" type="button" onclick="confirmarExclusaoEnvio('${envio.id}'); event.stopPropagation();">
                        <i data-lucide="trash-2" size="14"></i>
                    </button>
                    <div class="envio-item-top">
                        <div>
                            <div class="envio-item-kicker">Pedido #${envio.codigo}</div>
                            <div class="envio-item-name">${envio.destinatario}</div>
                        </div>
                        <div>
                            <div class="envio-item-status">${envio.status}</div>
                        </div>
                    </div>
                    <div class="envio-item-meta">${envio.endereco}</div>
                    <div class="envio-item-route">${envio.servico} • ${envio.veiculo} • ${distanciaTxt} • ${tempoTxt}</div>
                    <div class="envio-item-top" style="margin-bottom:0; align-items:flex-end; margin-top:8px;">
                        <div class="envio-item-meta">Atualizado ${data}</div>
                        <div>
                            <div class="envio-item-price">R$ ${valor}</div>
                        </div>
                    </div>
                </article>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function excluirEnvioPorId(envioId) {
    for (const cliente of clientes) {
        const historico = Array.isArray(cliente.historico) ? cliente.historico : [];
        const idx = historico.findIndex((h) => h.id === envioId);
        if (idx >= 0) {
            historico.splice(idx, 1);
            cliente.historico = historico;
            cliente.envios = Math.max(0, Number(cliente.envios || 0) - 1);
            return true;
        }
    }
    return false;
}

function confirmarExclusaoEnvio(envioId) {
    if (!envioId) return;
    const ok = window.confirm('Deseja excluir este envio?');
    if (!ok) return;
    const removido = excluirEnvioPorId(envioId);
    if (!removido) {
        alert('Não foi possível excluir este envio.');
        return;
    }
    saveClientes();
    renderEnviosHome();
}

let envioTouchStartX = 0;
let envioCardAtivo = null;

function handleEnvioTouchStart(e) {
    envioCardAtivo = e.currentTarget;
    envioTouchStartX = e.touches[0].clientX;
    fecharSwipesEnvio(envioCardAtivo.id);
}

function handleEnvioTouchMove(e) {
    if (!envioCardAtivo) return;
    const diff = e.touches[0].clientX - envioTouchStartX;
    if (diff > 0) {
        envioCardAtivo.style.transform = 'translateX(0)';
        return;
    }
    const limitado = Math.max(diff, -92);
    envioCardAtivo.style.transform = `translateX(${limitado}px)`;
}

function handleEnvioTouchEnd(e) {
    if (!envioCardAtivo) return;
    const diff = e.changedTouches[0].clientX - envioTouchStartX;
    envioCardAtivo.style.transition = 'transform 0.22s ease';
    envioCardAtivo.style.transform = diff < -52 ? 'translateX(-92px)' : 'translateX(0)';
    setTimeout(() => {
        if (envioCardAtivo) envioCardAtivo.style.transition = '';
    }, 220);
    envioCardAtivo = null;
}

function fecharSwipesEnvio(exceptId = null) {
    document.querySelectorAll('.envio-swipe-content').forEach((el) => {
        if (exceptId && el.id === exceptId) return;
        el.style.transform = 'translateX(0)';
        el.style.transition = 'transform 0.2s ease';
        setTimeout(() => { el.style.transition = ''; }, 220);
    });
}

const _initClientesOriginal = initClientes;
initClientes = async function initClientesNovaHome() {
    await _initClientesOriginal();
    renderClientesSelector(document.getElementById('buscar-cliente')?.value || '');
    renderEnviosHome();
};

const _confirmarEnvioFinalOriginal = confirmarEnvioFinal;
confirmarEnvioFinal = function confirmarEnvioFinalNovaHome() {
    _confirmarEnvioFinalOriginal();
    renderEnviosHome();
};

const _abrirNovoClienteOriginal = abrirNovoCliente;
abrirNovoCliente = function abrirNovoClienteComSheet() {
    fecharSeletorCliente();
    _abrirNovoClienteOriginal();
};

renderClientes = function renderClientesRedirect(filtro = '') {
    renderClientesSelector(filtro);
};



