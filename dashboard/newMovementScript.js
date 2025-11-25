let editingId = null;
let paymentTypes = [];

const API_REST =
  window.API_REST ||
  window.API_BASE_URL + "/api" ||
  "http://localhost:3000/api";

// Abrir modal de movimentação
function openModalMovement(recordId = null) {
  editingId = recordId;
  const modal = document.getElementById("recordModal");
  const title = document.getElementById("modalTitle");
  const form = document.getElementById("recordForm");

  if (partners.length === 0) {
    setTimeout(() => openModalMovement(recordId), 100);
    return;
  }

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
    const response = await fetch(`${API_REST}/financial/tipo-pagamento`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });
    if (!response.ok) {
      throw new Error("Falha ao carregar tipos de pagamento");
    }

    const data = await response.json();
    paymentTypes = data.data.records || [];

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
      select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
  }
}

// Carregar opções de parceiros no modal
function loadPartnerOptions() {
  const select = document.getElementById("recordPartner");
  if (!select) return;

  select.innerHTML = '<option value="">Selecione um parceiro</option>';

  partners.forEach((partner) => {
    const option = document.createElement("option");
    option.value = partner.razaoSocial;
    option.textContent = partner.razaoSocial;
    select.appendChild(option);
  });
}

// Função para salvar ou atualizar movimentação
async function saveOrUpdateMovement(movementData, id = null) {
  try {
    const partner = partners.find(
      (p) => p.razaoSocial === movementData.partner
    );
    if (!partner) {
      throw new Error("Parceiro não encontrado");
    }

    // CORREÇÃO: Ajuste no body para corresponder à API.
    const apiData = {
      descricao: movementData.description,
      idtipopag: parseInt(movementData.paymentType) || null,
      datavencimento: movementData.dueDate,
      valor: parseFloat(movementData.value),
      tipo: movementData.type === "receber" ? "R" : "D", // 'D' para despesa/pagar
      numero: movementData.document,
      id_clifornec: partner.id,
      situacao: movementData.status === "pago" ? "P" : "A",
    };

    // CORREÇÃO: URLs dinâmicas para criar (POST) ou editar (PUT).
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_REST}/financial/${id}` : `${API_REST}/financial`;

    console.log(`Enviando dados para ${url}:`, apiData);

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify(apiData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Erro ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao salvar movimentação:", error);
    throw error;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    loadPartnerOptions();
    loadPaymentTypes();
  }, 500);

  const recordForm = document.getElementById("recordForm");
  if (recordForm) {
    recordForm.addEventListener("submit", async function (e) {
      e.preventDefault();

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
          status: "pendente", // Status padrão para novos/editados
        };

        const result = await saveOrUpdateMovement(recordData, editingId);

        if (result.success) {
          alert(
            `Movimentação ${
              editingId ? "atualizada" : "cadastrada"
            } com sucesso!`
          );

          await loadInitialData(); // Recarrega todos os dados para consistência
          updateStats();
          renderTable();
          applyFilters();
          closeModalMovement();
        } else {
          throw new Error(result.message || "Erro ao salvar movimentação");
        }
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
  return paymentType ? paymentType.nome : "ID " + paymentTypeId;
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
