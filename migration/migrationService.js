require("dotenv").config();
const { MigrationController } = require("./migrationDatabase");

// Classe principal para gerenciar as migrações
class MigrationMain {
  static async executeMigration() {
    console.log("=".repeat(50));
    console.log("🚀 INICIANDO PROCESSO DE MIGRAÇÃO");
    console.log("=".repeat(50));

    try {
      const result = await MigrationController.startMigration();

      if (result.success) {
        console.log("\n" + "=".repeat(50));
        console.log("✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!");
        console.log("=".repeat(50));

        // Log dos resultados
        if (result.data) {
          console.log("\n📊 RESUMO FINAL:");
          console.log(
            `📋 Usuários: ${result.data.users?.successCount || 0} migrados, ${
              result.data.users?.errorCount || 0
            } erros`
          );
        }
      } else {
        console.log("\n" + "=".repeat(50));
        console.log("❌ ERRO NA MIGRAÇÃO!");
        console.log("=".repeat(50));
        console.error("Detalhes do erro:", result.error);
      }

      return result;
    } catch (error) {
      console.log("\n" + "=".repeat(50));
      console.log("💥 ERRO CRÍTICO NA MIGRAÇÃO!");
      console.log("=".repeat(50));
      console.error("Erro:", error);

      return {
        success: false,
        message: "Erro crítico durante a migração",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Método para executar apenas migração de usuários
  static async executeUserMigration() {
    console.log("👥 Executando migração de usuários...");

    try {
      const result = await MigrationController.migrateUsersOnly();
      console.log(
        result.success
          ? "✅ Usuários migrados!"
          : "❌ Erro na migração de usuários"
      );
      return result;
    } catch (error) {
      console.error("💥 Erro crítico na migração de usuários:", error);
      return {
        success: false,
        message: "Erro crítico na migração de usuários",
        error: error.message,
      };
    }
  }
}

// Função global que pode ser chamada pelo frontend/botão
global.startMigration = async () => {
  return await MigrationMain.executeMigration();
};

global.startUserMigration = async () => {
  return await MigrationMain.executeUserMigration();
};

module.exports = {
  MigrationMain,
  startMigration: MigrationMain.executeMigration,
  startUserMigration: MigrationMain.executeUserMigration,
};
