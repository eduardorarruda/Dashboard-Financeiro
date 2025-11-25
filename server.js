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

// Servir dashboard.html
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard", "dashboard.html"));
});

// Servir dashboard.html quando acessar o arquivo direto
app.get("/dashboard/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard", "dashboard.html"));
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

// Fallback para SPA - servir index.html para qualquer rota não encontrada
app.use((req, res) => {
  if (!req.path.includes(".")) {
    res.sendFile(path.join(__dirname, "index.html"));
  } else {
    res.status(404).json({ error: "Arquivo não encontrado" });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error("❌ Erro:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
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
