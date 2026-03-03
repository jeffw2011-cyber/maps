import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware para JSON
  app.use(express.json());

  // Rota de saúde
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Servidor Explorador AI rodando" });
  });

  if (process.env.NODE_ENV !== "production") {
    // Configuração do Vite em modo desenvolvimento
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Servir arquivos estáticos em produção
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    
    // Fallback para SPA (todas as rotas servem o index.html)
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erro ao iniciar o servidor:", err);
});
