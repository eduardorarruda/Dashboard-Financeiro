let editingId = null;

let paymentTypes = [];

// Abrir modal de movimentação
function openModalMovement(recordId = null) {
  editingId = recordId;
  const modal = document.getElementById("recordModal");
  const title = document.getElementById("modalTitle");
  const form = document.getElementById("recordForm");

  // Garante que as listas estejam carregadas antes de abrir o modal
  if (partners.length === 0) {
    setTimeout(() => openModalMovement(recordId), 100);
    return;
  }

  // Carrega as opções sempre que abrir o modal
  loadPartnerOptions();
  loadPaymentTypes();

  if (recordId) {
    title.textContent = "Editar Movimentação";
    const record = financialRecords.find((r) => r.id === recordId);
    if (record) {
      document.getElementById("recordType").value = record.type;
      document.getElementById("recordDocument").value = record.document;
      document.getElementById("recordPartner").value = record.partner;
      document.getElementById("recordPaymentType").value =
        record.paymentType || "";
      document.getElementById("recordDescription").value = record.description;
      document.getElementById("recordValue").value = record.value;
      document.getElementById("recordDueDate").value = record.dueDate;
    }
  } else {
    title.textContent = "Nova Movimentação";
    form.reset();
  }

  modal.classList.add("show");
}

// Fechar modal
function closeModalMovement() {
  const modal = document.getElementById("recordModal");
  modal.classList.remove("show");
  editingId = null;
}

// Carregar tipos de pagamento da API
async function loadPaymentTypes() {
  try {
    const response = await fetch("http://localhost:3000/api/tipo-pagamento");
    if (!response.ok) {
      throw new Error("Falha ao carregar tipos de pagamento");
    }

    const data = await response.json();
    paymentTypes = data.records || []; // Usa a estrutura records da API

    // Popula o select de tipos de pagamento
    const select = document.getElementById("recordPaymentType");
    if (select) {
      select.innerHTML =
        '<option value="">Selecione o tipo de pagamento...</option>';

      paymentTypes.forEach((paymentType) => {
        const option = document.createElement("option");
        option.value = paymentType.id;
        option.textContent = paymentType.nome;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Erro ao carregar tipos de pagamento:", error);
    const select = document.getElementById("recordPaymentType");
    if (select) {
      select.innerHTML =
        '<option value="">Erro ao carregar tipos de pagamento</option>';
    }
  }
}

// Carregar opções de parceiros no modal
function loadPartnerOptions() {
  const select = document.getElementById("recordPartner");
  if (!select) return;

  select.innerHTML = '<option value="">Selecione um parceiro</option>';

  // Pega a lista de parceiros já carregada e cria as opções
  partners.forEach((partner) => {
    const option = document.createElement("option");
    option.value = partner.razaoSocial;
    option.textContent = partner.razaoSocial;
    select.appendChild(option);
  });
}

// Função para salvar movimentação no backend
async function saveMovementToAPI(movementData) {
  try {
    // Buscar o ID do parceiro pela razão social
    const partner = partners.find(
      (p) => p.razaoSocial === movementData.partner
    );
    if (!partner) {
      throw new Error("Parceiro não encontrado");
    }

    // Preparar dados para o backend conforme esperado pela API
    const apiData = {
      descricao: movementData.description,
      idtipopag: parseInt(movementData.paymentType),
      datavencimento: movementData.dueDate,
      valor: parseFloat(movementData.value),
      tipo: movementData.type === "receber" ? "R" : "P",
      numero: movementData.document,
      id_clifornec: partner.id,
    };

    console.log("Enviando dados para API:", apiData);

    const response = await fetch(
      "http://localhost:3000/api/financeiro-records-post",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da API:", errorText);
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Erro ao salvar movimentação:", error);
    throw error;
  }
}

// Função para atualizar movimentação via API PUT - CORRIGIDA
async function updateMovementToAPI(id, movementData) {
  try {
    const partner = partners.find(
      (p) => p.razaoSocial === movementData.partner
    );
    if (!partner) {
      throw new Error("Parceiro não encontrado");
    }

    // Preparar dados para o backend conforme esperado pela API
    const apiData = {
      descricao: movementData.description,
      idtipopag: parseInt(movementData.paymentType),
      datavencimento: movementData.dueDate,
      valor: parseFloat(movementData.value),
      tipo: movementData.type === "receber" ? "R" : "P",
      numero: movementData.document,
      id_clifornec: partner.id,
      situacao: movementData.status === "pago" ? "P" : "A",
    };

    console.log("Atualizando dados na API:", apiData);

    const response = await fetch(
      `http://localhost:3000/api/financeiro-records-edit/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da API:", errorText);
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Erro ao atualizar movimentação:", error);
    throw error;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Aguarda um pouco para garantir que os dados foram carregados
  setTimeout(() => {
    loadPartnerOptions();
    loadPaymentTypes();
  }, 500);

  const recordForm = document.getElementById("recordForm");
  if (recordForm) {
    recordForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Desabilita o botão de salvar para evitar duplo clique
      const saveButton = document.querySelector("#recordForm .btn-save");
      const originalText = saveButton.textContent;
      saveButton.disabled = true;
      saveButton.textContent = "Salvando...";

      try {
        const recordData = {
          type: document.getElementById("recordType").value,
          document: document.getElementById("recordDocument").value,
          partner: document.getElementById("recordPartner").value,
          paymentType: document.getElementById("recordPaymentType").value,
          description: document.getElementById("recordDescription").value,
          value: parseFloat(document.getElementById("recordValue").value),
          dueDate: document.getElementById("recordDueDate").value,
          status: "pendente",
        };

        console.log("Dados do formulário:", recordData);

        if (editingId) {
          // Atualizar movimentação existente no backend
          const result = await updateMovementToAPI(editingId, recordData);

          if (result.success) {
            alert("Movimentação atualizada com sucesso!");

            const recordIndex = financialRecords.findIndex(
              (r) => r.id === editingId
            );
            if (recordIndex !== -1) {
              financialRecords[recordIndex] = {
                ...recordData,
                id: editingId,
                partner: recordData.partner,
                paymentType: recordData.paymentType,
              };
            }

            const filteredIndex = filteredRecords.findIndex(
              (r) => r.id === editingId
            );
            if (filteredIndex !== -1) {
              filteredRecords[filteredIndex] = {
                ...recordData,
                id: editingId,
                partner: recordData.partner,
                paymentType: recordData.paymentType,
              };
            }

            // Recarregar os dados para garantir consistência
            await loadInitialData();
            updateStats();
            renderTable();
            applyFilters();
          } else {
            throw new Error(result.message || "Erro ao atualizar movimentação");
          }
        } else {
          // Salvar nova movimentação no backend
          const result = await saveMovementToAPI(recordData);

          if (result.success) {
            alert("Movimentação cadastrada com sucesso!");

            // Recarregar os dados da tabela para mostrar o novo registro
            await loadInitialData();
            updateStats();
            renderTable();
          } else {
            throw new Error(result.message || "Erro ao salvar movimentação");
          }
        }

        closeModalMovement();
        applyFilters();
      } catch (error) {
        console.error("Erro ao salvar movimentação:", error);
        alert("Erro ao salvar movimentação: " + error.message);
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = originalText;
      }
    });
  }
});

// Função auxiliar para obter o nome do tipo de pagamento por ID
function getPaymentTypeName(paymentTypeId) {
  if (!paymentTypeId || paymentTypes.length === 0) {
    return "Não especificado";
  }

  const paymentType = paymentTypes.find((pt) => pt.id == paymentTypeId);
  return paymentType ? paymentType.nome : paymentTypeId;
}

// Função para recarregar as opções quando necessário
function refreshModalOptions() {
  loadPartnerOptions();
  loadPaymentTypes();
}

// Fechar modal clicando fora
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("modal")) {
    e.target.classList.remove("show");
  }
});

console.log("📝 Script de movimentações carregado");
