const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(cors());
app.use(express.json());

// Servir index.html na raiz
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Frontend rodando",
    backend: BACKEND_URL,
    timestamp: new Date().toISOString(),
  });
});

// Middleware para tratamento de erros (deve vir antes do fallback)
app.use((err, req, res, next) => {
  console.error("❌ Erro:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

// Fallback para SPA - servir index.html para rotas não-API
app.use((req, res) => {
  // Não servir index.html para rotas de API ou arquivos com extensão
  if (req.path.startsWith("/api") || req.path.includes(".")) {
    return res.status(404).json({ error: "Arquivo ou rota não encontrada" });
  }

  // Servir index.html para SPA routing
  res.sendFile(path.join(__dirname, "index.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
🚀 Frontend rodando na porta ${PORT}

📱 Acesse: http://localhost:${PORT}

🔌 Backend conectado em: ${BACKEND_URL}

✅ Servidor frontend iniciado com sucesso!
  `);
});
