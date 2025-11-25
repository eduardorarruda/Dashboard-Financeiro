let editingPartnerId = null;

const API_REST =
  window.API_REST ||
  window.API_BASE_URL + "/api" ||
  "http://localhost:3000/api";

// Carregar opções de parceiros no select
function loadPartnerOptions() {
  const select = document.getElementById("recordPartner");
  select.innerHTML = '<option value="">Selecione um parceiro...</option>';

  partners.forEach((partner) => {
    const option = document.createElement("option");
    option.value = partner.razaoSocial;
    option.textContent = `${partner.razaoSocial} - ${partner.cgc}`;
    select.appendChild(option);
  });
}

//Carregar cidades baseadas no estado selecionado
function loadCitiesByState(selectedState) {
  const cidadeSelect = document.getElementById("partnerCidade");

  // Limpar opções anteriores
  cidadeSelect.innerHTML = '<option value="">Selecione a cidade...</option>';

  if (!selectedState) return;

  // Filtrar cidades do estado selecionado
  const cidadesDoEstado = CidadeEstadoRecords.filter(
    (item) => item.nomeestado === selectedState
  )
    .map((item) => item.nomecidade)
    .filter((cidade, index, self) => self.indexOf(cidade) === index)
    .sort();

  // Adicionar opções de cidades
  cidadesDoEstado.forEach((cidade) => {
    const option = document.createElement("option");
    option.value = cidade;
    option.textContent = cidade;
    cidadeSelect.appendChild(option);
  });
}

//Buscar parceiro por CGC no backend
async function searchPartnerByCgc(cgc) {
  const cleanCgc = cgc.replace(/\D/g, "");
  if (cleanCgc.length < 11) return;

  try {
    const response = await fetch(`${API_REST}/partners/cgc/${cleanCgc}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.partner) {
        const partner = data.data.partner;

        document.getElementById("partnerRazaoSocial").value =
          partner.razaosocial || "";
        document.getElementById("partnerNomeFantasia").value =
          partner.nomefantasia || "";
        document.getElementById("partnerPhone").value =
          formatPhone(partner.numerocel) || "";
        document.getElementById("partnerEmail").value = partner.email || "";
        document.getElementById("partnerNumero").value =
          partner.numeroend || "";
        document.getElementById("partnerCep").value =
          formatCep(partner.cep) || "";
        document.getElementById("partnerRua").value = partner.rua || "";
        document.getElementById("partnerBairro").value = partner.bairro || "";

        if (partner.nomeestado) {
          document.getElementById("partnerEstado").value = partner.nomeestado;
          loadCitiesByState(partner.nomeestado);
          setTimeout(() => {
            document.getElementById("partnerCidade").value =
              partner.nomecidade || "";
          }, 100);
        }

        editingPartnerId = partner.id;

        document.getElementById("deletePartnerBtn").style.display = "block";

        document.getElementById("partnerModalTitle").textContent =
          "✏️ Editando Parceiro Existente";

        showPartnerMessage(
          "✅ Parceiro encontrado! Dados carregados para edição.",
          "success"
        );

        return true;
      }
    }

    document.getElementById("deletePartnerBtn").style.display = "none";
    return false;
  } catch (error) {
    console.error("Erro ao buscar parceiro:", error);
    document.getElementById("deletePartnerBtn").style.display = "none";
    return false;
  }
}

//Mostrar mensagens no modal do parceiro
function showPartnerMessage(message, type = "info") {
  const existingMessage = document.querySelector(".partner-message");
  if (existingMessage) {
    existingMessage.remove();
  }

  const messageDiv = document.createElement("div");
  messageDiv.className = `partner-message partner-message-${type}`;
  messageDiv.style.cssText = `
    padding: 10px;
    margin: 10px 0;
    border-radius: 4px;
    font-size: 14px;
    ${
      type === "success"
        ? "background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;"
        : ""
    }
    ${
      type === "error"
        ? "background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;"
        : ""
    }
    ${
      type === "info"
        ? "background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;"
        : ""
    }
  `;
  messageDiv.textContent = message;

  const form = document.getElementById("partnerForm");
  form.insertBefore(messageDiv, form.firstChild);

  setTimeout(() => {
    if (messageDiv && messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 5000);
}

//Formatar telefone para exibição
function formatPhone(phone) {
  if (!phone) return "";
  const cleanPhone = phone.toString().replace(/\D/g, "");
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  } else if (cleanPhone.length === 10) {
    return cleanPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return phone;
}

//Formatar CEP para exibição
function formatCep(cep) {
  if (!cep) return "";
  const cleanCep = cep.toString().replace(/\D/g, "");
  if (cleanCep.length === 8) {
    return cleanCep.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  }
  return cep;
}

//Obter ID da cidade/estado
function getCidadeEstadoId(cidade, estado) {
  const cidadeEstado = CidadeEstadoRecords.find(
    (item) => item.nomecidade === cidade && item.nomeestado === estado
  );
  return cidadeEstado ? cidadeEstado.id : null;
}

// Configurar máscaras nos campos
function setupFormMasks() {
  const cgcField = document.getElementById("partnerCgc");
  cgcField.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 14) value = value.slice(0, 14);

    if (value.length <= 11) {
      // CPF
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      // CNPJ
      value = value.replace(/^(\d{2})(\d)/, "$1.$2");
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
      value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
      value = value.replace(/(\d{4})(\d)/, "$1-$2");
    }
    e.target.value = value;
  });

  cgcField.addEventListener("blur", async function (e) {
    const cgc = e.target.value.replace(/\D/g, "");
    if (cgc.length === 11 || cgc.length === 14) {
      const found = await searchPartnerByCgc(cgc);
      if (!found) {
        showPartnerMessage(
          "ℹ️ CGC não encontrado. Você pode cadastrar um novo parceiro.",
          "info"
        );
        document.getElementById("deletePartnerBtn").style.display = "none";
      }
    }
  });

  document
    .getElementById("partnerPhone")
    .addEventListener("input", function (e) {
      e.target.value = formatPhone(e.target.value);
    });

  document.getElementById("partnerCep").addEventListener("input", function (e) {
    e.target.value = formatCep(e.target.value);
  });
}

// Abrir modal do parceiro
function openPartnerModal(partnerId = null) {
  editingPartnerId = partnerId;
  const modal = document.getElementById("partnerModal");
  const title = document.getElementById("partnerModalTitle");
  const form = document.getElementById("partnerForm");
  const estadoSelect = document.getElementById("partnerEstado");
  const deleteBtn = document.getElementById("deletePartnerBtn");

  const existingMessage = document.querySelector(".partner-message");
  if (existingMessage) {
    existingMessage.remove();
  }

  estadoSelect.innerHTML = '<option value="">Selecione o estado...</option>';

  const uniqueEstados = [
    ...new Set(CidadeEstadoRecords.map((item) => item.nomeestado)),
  ].sort();

  uniqueEstados.forEach((estado) => {
    const option = document.createElement("option");
    option.value = estado;
    option.textContent = estado;
    estadoSelect.appendChild(option);
  });

  estadoSelect.addEventListener("change", function () {
    const selectedState = this.value;
    loadCitiesByState(selectedState);
  });

  if (partnerId) {
    title.textContent = "✏️ Editar Parceiro";
    const partner = partners.find((p) => p.id === partnerId);
    if (partner) {
      document.getElementById("partnerCgc").value = partner.cgc;
      document.getElementById("partnerRazaoSocial").value = partner.razaoSocial;
      document.getElementById("partnerNomeFantasia").value =
        partner.nomeFantasia || "";
      document.getElementById("partnerPhone").value = partner.celular;
      document.getElementById("partnerEmail").value = partner.email;
      document.getElementById("partnerNumero").value = partner.numero;
      document.getElementById("partnerCep").value = partner.cep;
      document.getElementById("partnerRua").value = partner.rua;
      document.getElementById("partnerBairro").value = partner.bairro;

      document.getElementById("partnerEstado").value = partner.estado;

      if (partner.estado) {
        loadCitiesByState(partner.estado);
        setTimeout(() => {
          document.getElementById("partnerCidade").value = partner.cidade;
        }, 100);
      }
    }
    deleteBtn.style.display = "block";
  } else {
    title.textContent = "🏢 Novo Parceiro";
    form.reset();
    editingPartnerId = null;
    document.getElementById("partnerCidade").innerHTML =
      '<option value="">Selecione a cidade...</option>';
    deleteBtn.style.display = "none";
  }

  modal.classList.add("show");
}

// Fechar modal do parceiro
function closePartnerModal() {
  const modal = document.getElementById("partnerModal");
  modal.classList.remove("show");
  editingPartnerId = null;
  document.getElementById("deletePartnerBtn").style.display = "none";

  const existingMessage = document.querySelector(".partner-message");
  if (existingMessage) {
    existingMessage.remove();
  }
}

// Salvar parceiro
document
  .getElementById("partnerForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const cidade = document.getElementById("partnerCidade").value;
    const estado = document.getElementById("partnerEstado").value;
    const cidadeEstadoId = getCidadeEstadoId(cidade, estado);

    if (!cidadeEstadoId) {
      showPartnerMessage(
        "❌ Por favor, selecione uma cidade e estado válidos.",
        "error"
      );
      return;
    }

    const partnerData = {
      cgc: document.getElementById("partnerCgc").value.replace(/\D/g, ""),
      razaoSocial: document.getElementById("partnerRazaoSocial").value,
      nomeFantasia: document.getElementById("partnerNomeFantasia").value,
      celular: document.getElementById("partnerPhone").value,
      email: document.getElementById("partnerEmail").value,
      numero: document.getElementById("partnerNumero").value,
      cep: document.getElementById("partnerCep").value.replace(/\D/g, ""),
      rua: document.getElementById("partnerRua").value,
      bairro: document.getElementById("partnerBairro").value,
      cidadeEstado: cidadeEstadoId,
    };

    try {
      let response;
      let method;
      let url;

      if (editingPartnerId) {
        method = "PUT";
        url = `${API_REST}/partners/${editingPartnerId}`;
      } else {
        method = "POST";
        url = `${API_REST}/partners`;
      }

      response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify(partnerData),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message || "Operação realizada com sucesso!");

        // Recarregar todos os dados para garantir consistência
        await loadInitialData();
        refreshUI();
        closePartnerModal();
      } else {
        showPartnerMessage(
          `❌ ${result.message || "Erro ao salvar parceiro"}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao salvar parceiro:", error);
      showPartnerMessage("❌ Erro de conexão com o servidor.", "error");
    }
  });

function refreshUI() {
  try {
    if (typeof loadPartnerOptions === "function") {
      loadPartnerOptions();
    }
    if (typeof loadPartnerFilterOptions === "function") {
      loadPartnerFilterOptions();
    }
    if (typeof updateStats === "function") {
      updateStats();
    }
    if (typeof financialRecords !== "undefined") {
      filteredRecords = [...financialRecords];
      currentPage = 1;

      if (typeof renderTable === "function") {
        renderTable();
      }
    }
  } catch (error) {
    console.error("Erro ao atualizar UI:", error);
  }
}

// Função deletar parceiro
async function deleteCurrentPartner() {
  if (!editingPartnerId) {
    alert("Nenhum parceiro selecionado para exclusão.");
    return;
  }

  const partnerToDelete = partners.find((p) => p.id === editingPartnerId);

  const confirmation = confirm(
    `Deseja realmente excluir o parceiro "${
      partnerToDelete?.razaoSocial || "selecionado"
    }"?\n\nATENÇÃO: Esta ação não pode ser desfeita.`
  );

  if (!confirmation) {
    return;
  }

  const deleteButton = document.getElementById("deletePartnerBtn");
  const saveButton = document.querySelector("#partnerForm .btn-save");

  if (!deleteButton || !saveButton) {
    console.error("Botões não encontrados no DOM");
    return;
  }

  const originalDeleteText = deleteButton.innerHTML;

  deleteButton.disabled = true;
  saveButton.disabled = true;
  deleteButton.innerHTML = "🗑️ Excluindo...";

  try {
    const response = await fetch(`${API_REST}/partners/${editingPartnerId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const result = await response.json();

    if (result.success) {
      alert(result.message || "Parceiro excluído com sucesso!");

      closePartnerModal();

      // Recarrega todos os dados para refletir a exclusão
      await loadInitialData();
      refreshUI();
    } else {
      alert(`Erro ao excluir: ${result.message}`);
    }
  } catch (error) {
    console.error("Erro ao deletar parceiro:", error);
    alert("Erro de conexão ao tentar excluir o parceiro. Tente novamente.");
  } finally {
    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.innerHTML = originalDeleteText;
    }
    if (saveButton) {
      saveButton.disabled = false;
    }
  }
}
