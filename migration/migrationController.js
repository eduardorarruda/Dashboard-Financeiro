const { firebirdPool, postgresPool } = require("./migrationDatabase");

const UserModel = require("./migration");

class MigrationController {
  static async startMigration() {
    try {
      console.log("Controlador: iniciando migração completa...");

      const usersResult = await this.migrateUsersOnly();

      return {
        success: true,
        data: {
          users: usersResult.data,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async migrateUsersOnly() {
    console.log("Controlador: migrando apenas usuários...");
    try {
      const result = await UserModel.migrateUsers(firebirdPool, postgresPool);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = { MigrationController };
