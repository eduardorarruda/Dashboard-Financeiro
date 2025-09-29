// Variáveis globais para armazenar os dados do banco
let financialRecords = [];
let CidadeEstadoRecords = [];
let partners = [];
let filteredRecords = [];
let currentPage = 1;
const recordsPerPage = 10;

// Variáveis para controle da migração
let selectedMigration = "complete";
let migrationInProgress = false;
let migrationInterval = null;

// Inicialização
document.addEventListener("DOMContentLoaded", async function () {
  const tbody = document.getElementById("financialTableBody");
  tbody.innerHTML =
    '<tr><td colspan="9" style="text-align:center;">Carregando dados...</td></tr>';

  await loadInitialData();

  loadUserData();
  updateStats();
  renderTable();
  setupFilters();
  setDefaultDates();
  loadPartnerFilterOptions();
  setupFormMasks();
  setupMigrationModal(); // Adicionar configuração do modal

  // Força o carregamento das opções do modal após os dados serem carregados
  setTimeout(() => {
    if (typeof loadPartnerOptions === "function") {
      loadPartnerOptions();
    }
    if (typeof loadPaymentTypes === "function") {
      loadPaymentTypes();
    }
  }, 100);
});

// Função para configurar o modal de migração
function setupMigrationModal() {
  const migrationOptions = document.querySelectorAll(".migration-option");
  migrationOptions.forEach((option) => {
    option.addEventListener("click", function () {
      migrationOptions.forEach((opt) => opt.classList.remove("active"));
      this.classList.add("active");
      selectedMigration = this.dataset.migration;
      addLogEntry(
        `📌 Selecionado: ${this.querySelector("h4").textContent}`,
        "info"
      );
    });
  });

  // Fechar modal ao clicar fora dele
  const migrationModal = document.getElementById("migrationModal");
  if (migrationModal) {
    migrationModal.addEventListener("click", function (event) {
      if (event.target === migrationModal) {
        closeMigrationModal();
      }
    });
  }
}

// Função para abrir o modal de migração
function openMigrationModal() {
  console.log("Tentando abrir modal de migração...");
  const modal = document.getElementById("migrationModal");
  if (modal) {
    modal.classList.add("show");
    clearLog();
    addLogEntry(
      "📋 Modal de migração aberto. Selecione o tipo de migração desejado.",
      "info"
    );
    console.log("Modal de migração aberto com sucesso");
  } else {
    console.error("Modal de migração não encontrado!");
  }
}

// Função para fechar o modal de migração
function closeMigrationModal() {
  if (migrationInProgress) {
    if (confirm("Uma migração está em andamento. Deseja realmente fechar?")) {
      stopMigration();
      document.getElementById("migrationModal").classList.remove("show");
    }
  } else {
    document.getElementById("migrationModal").classList.remove("show");
  }
}

// Função para buscar os dados iniciais da API
async function loadInitialData() {
  try {
    // CORREÇÃO: Ajuste nas URLs das APIs para buscar os dados corretamente.
    const [recordsResponse, partnersResponse, cidadeEstadoResponse] =
      await Promise.all([
        fetch("http://localhost:3000/api/financial"), // URL correta para registros financeiros
        fetch("http://localhost:3000/api/partners"),
        fetch("http://localhost:3000/api/partners/cidade-estado"), // URL correta para cidades/estados
      ]);

    if (
      !recordsResponse.ok ||
      !partnersResponse.ok ||
      !cidadeEstadoResponse.ok
    ) {
      throw new Error("Falha ao carregar dados do servidor.");
    }

    const recordsData = await recordsResponse.json();
    const partnersData = await partnersResponse.json();
    const cidadeEstadoData = await cidadeEstadoResponse.json();

    CidadeEstadoRecords = cidadeEstadoData.data.records; // A API retorna os dados dentro de 'data'

    // CORREÇÃO: Mapeamento completo dos dados dos parceiros.
    partners = partnersData.data.partners.map((p) => ({
      id: p.id,
      cgc: p.cgc,
      razaoSocial: p.razaosocial,
      nomeFantasia: p.nomefantasia,
      celular: p.numerocel,
      email: p.email, // Adicionado email
      numero: p.numeroend,
      cep: p.cep,
      rua: p.rua,
      bairro: p.bairro,
      cidade: "", // Será populado depois se necessário
      estado: "", // Será populado depois se necessário
    }));

    // CORREÇÃO: Mapeamento correto dos dados financeiros.
    financialRecords = recordsData.data.records.map((r) => ({
      id: r.id,
      type: r.tipo.trim() === "D" ? "pagar" : "receber", // 'D' é Despesa (pagar), 'R' é Receita (receber)
      document: r.numero,
      partner: r.parceiro_nome,
      paymentType: r.idtipopag,
      description: r.descricao, // Usar a descrição vinda da API
      value: parseFloat(r.valor),
      dueDate: new Date(r.datavencimento).toISOString().split("T")[0],
      status: r.situacao.trim() === "A" ? "pendente" : "pago",
    }));

    filteredRecords = [...financialRecords];
  } catch (error) {
    console.error("Erro ao carregar dados iniciais:", error);
    const tbody = document.getElementById("financialTableBody");
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: red;">${error.message}</td></tr>`;
  }
}

// Carregar dados do usuário
function loadUserData() {
  try {
    const userData = localStorage.getItem("currentUser");
    if (userData) {
      const user = JSON.parse(userData);
      document.getElementById("userName").textContent = user.name || "Usuário";
      document.getElementById("userEmail").textContent =
        user.email || "user@email.com";
      document.getElementById("userAvatar").textContent = (user.name || "U")
        .charAt(0)
        .toUpperCase();
    }
  } catch (error) {
    console.warn("Erro ao carregar dados do usuário:", error);
  }
}

// Função de logout
function logout() {
  if (confirm("Deseja realmente sair?")) {
    localStorage.removeItem("currentUser");
    sessionStorage.removeItem("isLoggedIn");
    window.location.href = "/";
  }
}

// Atualizar estatísticas
function updateStats() {
  const receivable = financialRecords
    .filter((r) => r.type === "receber" && r.status === "pendente")
    .reduce((sum, r) => sum + r.value, 0);

  const payable = financialRecords
    .filter((r) => r.type === "pagar" && r.status === "pendente")
    .reduce((sum, r) => sum + r.value, 0);

  const overdue = financialRecords.filter((r) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar para o início do dia
    const dueDate = new Date(r.dueDate);
    return dueDate < today && r.status === "pendente";
  });

  const overdueValue = overdue.reduce((sum, r) => sum + r.value, 0);
  const netBalance = receivable - payable;

  document.getElementById("totalReceivable").textContent =
    formatCurrency(receivable);
  document.getElementById("totalPayable").textContent = formatCurrency(payable);
  document.getElementById("totalOverdue").textContent =
    formatCurrency(overdueValue);
  document.getElementById("netBalance").textContent =
    formatCurrency(netBalance);
  document.getElementById(
    "overdueCount"
  ).textContent = `${overdue.length} títulos`;

  const balanceElement = document.getElementById("netBalance");
  const balanceChange = document.getElementById("balanceChange");
  if (netBalance > 0) {
    balanceChange.className = "stat-change positive";
    balanceChange.innerHTML = "<span>📈</span><span>Positivo</span>";
  } else if (netBalance < 0) {
    balanceChange.className = "stat-change negative";
    balanceChange.innerHTML = "<span>📉</span><span>Negativo</span>";
  } else {
    balanceChange.className = "stat-change";
    balanceChange.innerHTML = "<span>📊</span><span>Equilibrado</span>";
  }
}

// Renderizar tabela
function renderTable() {
  const tbody = document.getElementById("financialTableBody");
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const pageRecords = filteredRecords.slice(startIndex, endIndex);

  tbody.innerHTML = "";

  if (pageRecords.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="9" style="text-align:center;">Nenhum registro encontrado.</td></tr>';
    updatePagination();
    return;
  }

  pageRecords.forEach((record) => {
    const tr = document.createElement("tr");

    // Determinar status de vencimento
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar para o início do dia
    const dueDate = new Date(record.dueDate);
    let status = record.status;
    if (status === "pendente" && dueDate < today) {
      status = "vencido";
    }

    tr.innerHTML = `
            <td>
                <span class="type-badge type-${record.type}">
                    ${record.type === "receber" ? "Receber" : "Pagar"}
                </span>
            </td>
            <td><strong>${record.document || "N/A"}</strong></td>
            <td>${record.partner}</td>
            <td>${
              typeof getPaymentTypeName === "function"
                ? getPaymentTypeName(record.paymentType)
                : record.paymentType || "Não especificado"
            }</td>
            <td>${record.description}</td>
            <td class="${
              record.type === "receber" ? "value-positive" : "value-negative"
            }">
                ${formatCurrency(record.value)}
            </td>
            <td>${formatDate(record.dueDate)}</td>
            <td>
                <span class="status-badge status-${status}">
                    ${getStatusText(status)}
                </span>
            </td>
            <td class="action-buttons">
                ${
                  status === "pendente" || status === "vencido"
                    ? `<button class="action-btn pay-btn" onclick="markAsPaid(${record.id})">
                      💰 Pagar
                    </button>`
                    : ""
                }
                ${
                  status === "pago"
                    ? `<button class="action-btn payCancel-btn" onclick="markCancelPayment(${record.id})">
                        ❌ Cancelar
                    </button>`
                    : ""
                }
                <button class="action-btn edit-btn" onclick="editRecord(${
                  record.id
                })">
                    ✏️ Editar
                </button>
                <button class="action-btn delete-btn" onclick="deleteRecord(${
                  record.id
                })">
                    🗑️ Excluir
                </button>
            </td>
        `;

    tbody.appendChild(tr);
  });

  updatePagination();
}

// Configurar filtros
function setupFilters() {
  const filters = [
    "filterType",
    "filterStatus",
    "filterPartner",
    "filterDocument",
    "filterDateFrom",
    "filterDateTo",
  ];

  filters.forEach((filterId) => {
    const element = document.getElementById(filterId);
    if (element) {
      element.addEventListener("input", applyFilters);
    }
  });
}

// Responsável por carregar os parceiros no novo dropdown de filtro.
function loadPartnerFilterOptions() {
  const select = document.getElementById("filterPartner");
  if (select) {
    select.innerHTML = '<option value="">Todos</option>';

    // Pega a lista de parceiros já carregada e cria as opções
    partners.forEach((partner) => {
      const option = document.createElement("option");
      option.value = partner.razaoSocial;
      option.textContent = partner.razaoSocial;
      select.appendChild(option);
    });
  }
}

// Aplicar filtros
function applyFilters() {
  try {
    // Verificar se os elementos existem
    const typeElement = document.getElementById("filterType");
    const statusElement = document.getElementById("filterStatus");
    const partnerElement = document.getElementById("filterPartner");
    const documentElement = document.getElementById("filterDocument");
    const dateFromElement = document.getElementById("filterDateFrom");
    const dateToElement = document.getElementById("filterDateTo");

    if (
      !typeElement ||
      !statusElement ||
      !partnerElement ||
      !documentElement ||
      !dateFromElement ||
      !dateToElement
    ) {
      console.warn("Alguns elementos de filtro não foram encontrados");
      return;
    }

    const type = typeElement.value;
    const status = statusElement.value;
    const partner = partnerElement.value;
    const documentValue = documentElement.value.toLowerCase();
    const dateFrom = dateFromElement.value;
    const dateTo = dateToElement.value;

    if (
      typeof financialRecords === "undefined" ||
      !Array.isArray(financialRecords)
    ) {
      console.warn("financialRecords não está definido ou não é um array");
      return;
    }

    filteredRecords = financialRecords.filter((record) => {
      // Determinar status real considerando vencimento
      let recordStatus = record.status;
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalizar
      const dueDate = new Date(record.dueDate);
      if (recordStatus === "pendente" && dueDate < today) {
        recordStatus = "vencido";
      }

      return (
        (!type || record.type === type) &&
        (!status || recordStatus === status) &&
        (!partner || record.partner === partner) &&
        (!documentValue ||
          (record.document &&
            record.document.toLowerCase().includes(documentValue))) &&
        (!dateFrom || record.dueDate >= dateFrom) &&
        (!dateTo || record.dueDate <= dateTo)
      );
    });

    currentPage = 1;

    if (typeof renderTable === "function") {
      renderTable();
    }
  } catch (error) {
    console.error("Erro ao aplicar filtros:", error);
  }
}

// Limpar filtros
function clearFilters() {
  document.getElementById("filterType").value = "";
  document.getElementById("filterStatus").value = "";
  document.getElementById("filterPartner").value = "";
  document.getElementById("filterDocument").value = "";
  setDefaultDates(); // Volta para as datas padrão

  filteredRecords = [...financialRecords];
  currentPage = 1;
  renderTable();
}

// Definir datas padrão
function setDefaultDates() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  document.getElementById("filterDateFrom").value = formatDateInput(firstDay);
  document.getElementById("filterDateTo").value = formatDateInput(lastDay);
}

async function updatePaymentStatus(id, config) {
  if (!confirm(config.confirmMessage)) {
    return;
  }

  const actionButtons = document.querySelectorAll(
    `[onclick*="${config.originalFunction}(${id})"]`
  );
  actionButtons.forEach((btn) => {
    btn.disabled = true;
    btn.textContent = "Processando...";
  });

  try {
    // CORREÇÃO: URL correta para atualizar o status do pagamento.
    const response = await fetch(
      `http://localhost:3000/api/financial/${id}/payment-status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          // CORREÇÃO: Adicionar token de autenticação
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({ situacao: config.apiStatus }),
      }
    );

    const result = await response.json();

    if (result.success) {
      const updateRecordStatus = (record) => {
        if (record.id === id) {
          record.status = config.localStatus;
        }
      };

      financialRecords.forEach(updateRecordStatus);
      filteredRecords.forEach(updateRecordStatus);

      updateStats();
      renderTable();
      alert(config.successMessage);
    } else {
      throw new Error(result.message || `Erro ao ${config.actionDescription}`);
    }
  } catch (error) {
    console.error(`Erro ao ${config.actionDescription}:`, error);
    alert(`Erro ao ${config.actionDescription}: ${error.message}`);
    // Recarrega a tabela para reverter a mudança visual do botão em caso de erro
    renderTable();
  }
}

async function markAsPaid(id) {
  const config = {
    confirmMessage: "Marcar esta movimentação como paga?",
    apiStatus: "P",
    localStatus: "pago",
    successMessage: "Movimentação marcada como paga com sucesso!",
    actionDescription: "marcar como pago",
    originalFunction: "markAsPaid",
  };
  await updatePaymentStatus(id, config);
}

async function markCancelPayment(id) {
  const config = {
    confirmMessage: "Cancelar o pagamento desta movimentação?",
    apiStatus: "A",
    localStatus: "pendente",
    successMessage: "Pagamento cancelado com sucesso!",
    actionDescription: "cancelar pagamento",
    originalFunction: "markCancelPayment",
  };
  await updatePaymentStatus(id, config);
}

// Editar registro
function editRecord(id) {
  const record = financialRecords.find((r) => r.id === id);
  if (!record) {
    alert("Registro não encontrado!");
    return;
  }
  openModalMovement(id);
}

// Deletar registro
async function deleteRecord(id) {
  const record = financialRecords.find((r) => r.id === id);
  if (!record) {
    alert("Registro não encontrado!");
    return;
  }

  const confirmMessage = `Deseja realmente excluir esta movimentação?\n\nDocumento: ${
    record.document
  }\nParceiro: ${record.partner}\nValor: ${formatCurrency(record.value)}`;

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    const deleteButtons = document.querySelectorAll(
      `[onclick*="deleteRecord(${id})"]`
    );
    deleteButtons.forEach((btn) => {
      btn.disabled = true;
      btn.textContent = "Excluindo...";
    });

    // CORREÇÃO: URL correta para deletar um registro financeiro.
    const response = await fetch(`http://localhost:3000/api/financial/${id}`, {
      method: "DELETE",
      headers: {
        // CORREÇÃO: Adicionar token de autenticação
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const result = await response.json();

    if (result.success) {
      financialRecords = financialRecords.filter((r) => r.id !== id);
      filteredRecords = filteredRecords.filter((r) => r.id !== id);

      updateStats();
      renderTable();
      alert("Movimentação excluída com sucesso!");
    } else {
      throw new Error(result.message || "Erro ao excluir movimentação");
    }
  } catch (error) {
    console.error("Erro ao deletar movimentação:", error);
    alert("Erro ao excluir movimentação: " + error.message);
    renderTable(); // Restaura o botão
  }
}

// Atualizar paginação
function updatePagination() {
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage + 1;
  const endIndex = Math.min(currentPage * recordsPerPage, totalRecords);

  if (totalRecords === 0) {
    document.getElementById("paginationInfo").textContent = "Nenhum registro";
    document.getElementById("currentPage").textContent = "Página 0 de 0";
  } else {
    document.getElementById(
      "paginationInfo"
    ).textContent = `Mostrando ${startIndex}-${endIndex} de ${totalRecords} registros`;
    document.getElementById(
      "currentPage"
    ).textContent = `Página ${currentPage} de ${totalPages}`;
  }

  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled =
    currentPage === totalPages || totalPages === 0;
}

// Mudar página
function changePage(direction) {
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  if (direction === -1 && currentPage > 1) {
    currentPage--;
  } else if (direction === 1 && currentPage < totalPages) {
    currentPage++;
  }

  renderTable();
}

// Funções utilitárias
function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const timeZoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + timeZoneOffset).toLocaleDateString("pt-BR");
}

function formatDateInput(date) {
  return date.toISOString().split("T")[0];
}

function getStatusText(status) {
  const statusMap = {
    pendente: "Pendente",
    pago: "Pago",
    vencido: "Vencido",
  };
  return statusMap[status] || status;
}

function setupFormMasks() {
  console.log("Setup de máscaras executado");
}

console.log("💼 Dashboard Financeiro carregado");
