function processMigrationResponse(apiResponse) {
  const processed = {
    logs: [],
    summary: null,
    status: null,
    hasErrors: false,
  };

  if (!apiResponse || !apiResponse.data) {
    return processed;
  }

  const data = apiResponse.data;

  // Processar logs
  if (data.logs && Array.isArray(data.logs)) {
    processed.logs = data.logs.map((log) => {
      if (typeof log === "string") {
        return { message: log, type: "info" };
      }
      return {
        message: log.message || log.msg || String(log),
        type: log.type || log.level || "info",
      };
    });
  }

  // Processar resumo
  if (data.summary) {
    processed.summary = {
      totalMigrated: data.summary.total || data.summary.totalMigrated || 0,
      errors: data.summary.errors || data.summary.errorCount || 0,
      duration: data.summary.duration || data.summary.time || null,
    };
    processed.hasErrors = processed.summary.errors > 0;
  }

  // Processar status detalhado
  if (data.status || data.details) {
    processed.status = data.status || data.details;
  }

  return processed;
}

/**
 * Formatar tempo de duração
 */
function formatDuration(milliseconds) {
  if (!milliseconds) return "N/A";

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Mapear tipo de log da API para tipo do frontend
 */
function mapLogType(apiType) {
  const typeMap = {
    error: "error",
    erro: "error",
    err: "error",
    warning: "warning",
    warn: "warning",
    aviso: "warning",
    success: "success",
    sucesso: "success",
    ok: "success",
    info: "info",
    information: "info",
    debug: "info",
  };

  return typeMap[apiType?.toLowerCase()] || "info";
}

/**
 * Adicionar ícones aos logs baseado no tipo
 */
function getLogIcon(type) {
  const icons = {
    error: "❌",
    warning: "⚠️",
    success: "✅",
    info: "ℹ️",
  };
  return icons[type] || "📋";
}

/**
 * Formatar mensagem de log com timestamp e ícone
 */
function formatLogMessage(message, type) {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  const icon = getLogIcon(type);
  return `[${timestamp}] ${icon} ${message}`;
}

/**
 * Validar resposta da API
 */
function validateApiResponse(response) {
  if (!response) {
    throw new Error("Resposta da API está vazia");
  }

  if (!response.success && response.success !== undefined) {
    throw new Error(response.message || "Erro desconhecido na API");
  }

  return true;
}

/**
 * Criar resumo visual da migração
 */
function createMigrationSummaryHTML(summary) {
  if (!summary) return "";

  const successRate =
    summary.totalMigrated > 0
      ? (
          ((summary.totalMigrated - summary.errors) / summary.totalMigrated) *
          100
        ).toFixed(1)
      : 0;

  return `
    <div style="display: grid; gap: 10px; margin-top: 15px;">
      <div style="padding: 15px; background: linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%); border-radius: 10px; border: 2px solid #68d391;">
        <div style="font-size: 0.85rem; color: #22543d; margin-bottom: 5px;">Total Migrado</div>
        <div style="font-size: 2rem; font-weight: bold; color: #22543d;">${
          summary.totalMigrated
        }</div>
        <div style="font-size: 0.75rem; color: #276749; margin-top: 5px;">registros processados</div>
      </div>
      
      ${
        summary.errors > 0
          ? `
        <div style="padding: 15px; background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%); border-radius: 10px; border: 2px solid #f56565;">
          <div style="font-size: 0.85rem; color: #742a2a; margin-bottom: 5px;">Erros Encontrados</div>
          <div style="font-size: 2rem; font-weight: bold; color: #742a2a;">${summary.errors}</div>
          <div style="font-size: 0.75rem; color: #9b2c2c; margin-top: 5px;">registros com falha</div>
        </div>
      `
          : ""
      }
      
      <div style="padding: 15px; background: linear-gradient(135deg, #bee3f8 0%, #90cdf4 100%); border-radius: 10px; border: 2px solid #4299e1;">
        <div style="font-size: 0.85rem; color: #1e3a8a; margin-bottom: 5px;">Taxa de Sucesso</div>
        <div style="font-size: 2rem; font-weight: bold; color: #1e3a8a;">${successRate}%</div>
        <div style="font-size: 0.75rem; color: #2c5282; margin-top: 5px;">${
          summary.duration ? `Duração: ${formatDuration(summary.duration)}` : ""
        }</div>
      </div>
    </div>
  `;
}

/**
 * Verificar se deve usar simulação ou API real
 */
async function checkMigrationAPIAvailability() {
  try {
    const url =
      (window.API_REST ||
        window.API_BASE_URL + "/api" ||
        "http://localhost:3000/api") + "/health";
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.warn("API de migração não disponível:", error);
    return false;
  }
}

// Exportar funções para uso global
if (typeof window !== "undefined") {
  window.migrationUtils = {
    processMigrationResponse,
    formatDuration,
    mapLogType,
    getLogIcon,
    formatLogMessage,
    validateApiResponse,
    createMigrationSummaryHTML,
    checkMigrationAPIAvailability,
  };
}
