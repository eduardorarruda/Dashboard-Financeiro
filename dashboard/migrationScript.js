const API_REST =
  window.API_REST ||
  window.API_BASE_URL + "/api" ||
  "http://localhost:3000/api";

async function startMigration() {
  if (migrationInProgress) return;

  migrationInProgress = true;
  updateMigrationUI(true);
  clearLog();

  addLogEntry("🚀 INICIANDO PROCESSO DE MIGRAÇÃO...", "info");
  addLogEntry(
    `📋 Tipo de migração selecionado: ${getSelectedMigrationName()}`,
    "info"
  );

  const logContainer = document.getElementById("migrationLog");
  if (logContainer) {
    logContainer.classList.add("loading");
  }

  try {
    const response = await fetch(`${API_REST}/migration/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify({
        migrationType: selectedMigration,
      }),
    });

    const result = await response.json();

    if (logContainer) {
      logContainer.classList.remove("loading");
    }

    if (response.ok && result.success) {
      addLogEntry(
        "✅ Requisição de migração enviada com sucesso ao servidor.",
        "success"
      );

      // Processar logs reais da API
      if (result.data && result.data.logs && result.data.logs.length > 0) {
        addLogEntry("📊 PROCESSANDO LOGS DA MIGRAÇÃO...", "info");

        // Processar e exibir os logs exatamente como a API retornou.
        const logs = Array.isArray(result.data.logs)
          ? result.data.logs.slice().sort((a, b) => {
              // Ordena por timestamp se existir
              const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
              const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
              return ta - tb;
            })
          : [];

        let delay = 0;
        logs.forEach((log) => {
          delay += 150; // 150ms entre entradas para efeito de streaming
          setTimeout(() => {
            if (!migrationInProgress) return;

            // Mapear tipos retornados pela API para classes visuais
            const typeMap = {
              log: "info",
              info: "info",
              warning: "warning",
              warn: "warning",
              error: "error",
              success: "success",
            };

            const visualType = typeMap[log.type] || "info";

            // Usar timestamp retornado pela API quando disponível
            addLogEntry(log.message || String(log), visualType, log.timestamp);

            // Se o log trouxer um objeto de status, atualizamos o painel
            if (log.status && typeof log.status === "object") {
              updateMigrationStatus(log.status);
            }
          }, delay);
        });

        // Após exibir todos os logs, mostrar o resumo vindo da API (se houver)
        const totalDelay = delay + 300;
        setTimeout(() => {
          if (!migrationInProgress) return;

          // A API pode retornar `data.summary` ou campos como successCount/errorCount
          if (result.data.summary) {
            displayMigrationSummary(result.data.summary);
          } else {
            // Construir um resumo simples a partir dos campos conhecidos
            const built = {};
            if (typeof result.data.successCount === "number")
              built.successCount = result.data.successCount;
            if (typeof result.data.errorCount === "number")
              built.errorCount = result.data.errorCount;
            if (result.data.migrationType)
              built.migrationType = result.data.migrationType;
            if (result.data.timestamp) built.timestamp = result.data.timestamp;

            if (Object.keys(built).length > 0) {
              displayMigrationSummary(built);
            }
          }

          completeMigration();
        }, totalDelay);
      } else {
        // Não utilizar simulação local — informar erro e encerrar a migração
        addLogEntry(
          "❌ Nenhum log retornado pela API. Verifique o servidor e tente novamente.",
          "error"
        );
        // Encerrar o processo de migração em estado de falha
        failMigration("Nenhum log retornado pela API.");
        return;
      }
    } else {
      throw new Error(result.message || "API retornou um erro.");
    }
  } catch (error) {
    if (logContainer) {
      logContainer.classList.remove("loading");
    }

    console.error("Erro na migração:", error);
    addLogEntry(`❌ Erro ao contatar API: ${error.message}`, "error");
    addLogEntry(
      "⚠️ A migração foi interrompida devido a falha na API.",
      "warning"
    );
    // Encerrar em falha
    failMigration(error.message || "Erro desconhecido ao contatar API.");
  }
}

// Função para encerrar a migração em estado de falha
function failMigration(reason) {
  // Limpar interval com segurança
  if (migrationInterval !== null && migrationInterval !== undefined) {
    clearInterval(migrationInterval);
    migrationInterval = null;
  }

  migrationInProgress = false;
  updateMigrationUI(false);
  addLogEntry(`❌ MIGRAÇÃO FINALIZADA COM ERRO: ${reason}`, "error");
}

// Função para parar a migração
function stopMigration() {
  // Limpar interval com segurança
  if (migrationInterval !== null && migrationInterval !== undefined) {
    clearInterval(migrationInterval);
    migrationInterval = null;
  }

  migrationInProgress = false;
  updateMigrationUI(false);
  addLogEntry("⛔ MIGRAÇÃO INTERROMPIDA PELO USUÁRIO", "warning");
}

// Função para completar a migração
function completeMigration() {
  migrationInProgress = false;
  updateMigrationUI(false);
  addLogEntry("✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!", "success");
  addLogEntry("🎉 Todos os dados foram migrados com sucesso!", "success");
}

// Função para atualizar a UI durante migração
function updateMigrationUI(isRunning) {
  const startBtn = document.getElementById("startMigrationBtn");
  const stopBtn = document.getElementById("stopMigrationBtn");

  if (!startBtn || !stopBtn) {
    console.error("Botões de migração não encontrados!");
    return;
  }

  if (isRunning) {
    startBtn.disabled = true;
    startBtn.innerHTML = "🚀 Migrando...";
    stopBtn.style.display = "inline-flex";
  } else {
    startBtn.disabled = false;
    startBtn.innerHTML = "🚀 Iniciar Migração";
    stopBtn.style.display = "none";
  }
}

// Função para adicionar entrada no log
function addLogEntry(message, type = "info", isoTimestamp) {
  try {
    const logContainer = document.getElementById("migrationLog");
    if (!logContainer) {
      console.warn("Container de log não encontrado! Mensagem:", message);
      return;
    }

    const logEntry = document.createElement("div");
    logEntry.className = `log-entry ${type}`;

    let timestamp = new Date();
    if (isoTimestamp) {
      const parsed = Date.parse(isoTimestamp);
      if (!isNaN(parsed)) timestamp = new Date(parsed);
    }

    const timeStr = timestamp.toLocaleTimeString("pt-BR");
    logEntry.textContent = `[${timeStr}] ${message}`;

    logContainer.appendChild(logEntry);

    // Scroll seguro
    if (logContainer.scrollHeight) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  } catch (err) {
    console.error("Erro ao adicionar log entry:", err);
  }
}

// Função para limpar o log
function clearLog() {
  const logContainer = document.getElementById("migrationLog");
  const statusContainer = document.getElementById("migrationStatus");

  if (logContainer) {
    logContainer.innerHTML = "";
  }

  if (statusContainer) {
    statusContainer.classList.remove("show");
  }
}

// Função para atualizar status da migração
function updateMigrationStatus(status) {
  const statusContainer = document.getElementById("migrationStatus");
  const statusContent = document.getElementById("statusContent");

  if (!statusContainer || !statusContent) {
    console.error("Elementos de status não encontrados!");
    return;
  }

  statusContainer.classList.add("show");

  let html = "";
  for (const [key, data] of Object.entries(status)) {
    html += `
            <div class="status-item">
              <span class="status-label">${getMigrationTypeName(key)}</span>
              <div>
                <span class="status-count success">${
                  data.successCount || 0
                } migrados</span>
                ${
                  data.errorCount > 0
                    ? `<span class="status-count error">${data.errorCount} erros</span>`
                    : ""
                }
              </div>
            </div>
          `;
  }

  statusContent.innerHTML = html;
}

// Função auxiliar para obter nome da migração selecionada
function getSelectedMigrationName() {
  const option = document.querySelector(
    `.migration-option[data-migration="${selectedMigration}"]`
  );
  return option ? option.querySelector("h4").textContent : selectedMigration;
}

// Função auxiliar para obter nome do tipo de migração
function getMigrationTypeName(type) {
  const names = {
    cidadeEstado: "🏙️ Cidades/Estados",
    users: "👥 Usuários",
    cliFornec: "🏢 Clientes/Fornecedores",
    centroCusto: "💰 Centros de Custo",
    planoContas: "📋 Plano de Contas",
    tipoPag: "💳 Tipos de Pagamento",
    financeiro: "💸 Registros Financeiros",
  };
  return names[type] || type;
}

// Função para exibir resumo da migração
function displayMigrationSummary(summary) {
  const statusContainer = document.getElementById("migrationStatus");
  const statusContent = document.getElementById("statusContent");

  if (!statusContainer || !statusContent) return;

  statusContainer.classList.add("show");

  // Aceita tanto o formato antigo (`totalMigrated`/`errors`) quanto o novo
  const successCount =
    typeof summary.successCount === "number"
      ? summary.successCount
      : summary.totalMigrated || 0;
  const errorCount =
    typeof summary.errorCount === "number"
      ? summary.errorCount
      : summary.errors || 0;

  const total = successCount + errorCount;
  const migrationType = summary.migrationType || summary.type || "-";
  const ts = summary.timestamp ? new Date(summary.timestamp) : null;

  let html = '<div style="margin-top: 10px;">';

  html += `
    <div style="padding: 10px; background: #edf2f7; border-radius: 8px; margin-bottom: 10px;">
      <strong style="color: #2d3748;">Tipo:</strong>
      <span style="color: #4a5568; font-weight: bold;"> ${migrationType}</span>
    </div>
  `;

  html += `
    <div style="padding: 10px; background: #f7fafc; border-radius: 8px; margin-bottom: 10px;">
      <strong style="color: #2d3748;">Total (sucesso + erros):</strong>
      <span style="color: #48bb78; font-weight: bold;"> ${total} registros</span>
    </div>
  `;

  html += `
    <div style="display:flex; gap:10px; margin-bottom:10px;">
      <div style="padding: 10px; background: #e6fffa; border-radius: 8px; flex:1;">
        <strong style="color: #2d3748;">Válidos:</strong>
        <span style="color:#2f855a; font-weight:bold;"> ${successCount}</span>
      </div>
      <div style="padding: 10px; background: #fff5f5; border-radius: 8px; flex:1;">
        <strong style="color: #742a2a;">Erros:</strong>
        <span style="color:#c53030; font-weight:bold;"> ${errorCount}</span>
      </div>
    </div>
  `;

  if (ts) {
    html += `
      <div style="padding: 10px; background: #edf2f8; border-radius: 8px;">
        <strong style="color: #2d3748;">Timestamp:</strong>
        <span style="color: #4a5568;"> ${ts.toLocaleString("pt-BR")}</span>
      </div>
    `;
  }

  html += "</div>";
  statusContent.innerHTML = html;
}
