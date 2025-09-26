const { decryptPassword } = require("./utils/criptografiaUser");
const bcrypt = require("bcrypt");

async function migrateUsers(firebirdPool, postgresPool) {
  console.log("Iniciando migração de usuários...");

  return new Promise((resolve, reject) => {
    firebirdPool.get((err, db) => {
      if (err) {
        console.error("❌ Erro ao obter conexão do pool Firebird:", err);
        return reject(err);
      }

      const fdbQuery = "SELECT NOME, EMAIL, SENHA FROM USUARIO";
      db.query(fdbQuery, async (err, result) => {
        if (err) {
          console.error("❌ Erro ao executar a consulta no Firebird:", err);
          db.detach();
          return reject(err);
        }

        if (!result || result.length === 0) {
          console.log("🟡 Nenhum usuário encontrado no Firebird para migrar.");
          db.detach();
          return resolve();
        }

        console.log(`ℹ️  Encontrados ${result.length} usuários para migrar.`);

        for (const user of result) {
          try {
            if (!user.SENHA) {
              console.warn(
                `⚠️  Usuário ${user.EMAIL} com senha nula. Pulando...`
              );
              continue;
            }

            const encryptedPassword = user.SENHA.toString().trim();
            const plainTextPassword = decryptPassword(encryptedPassword);

            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(
              plainTextPassword,
              saltRounds
            );

            console.log(
              `Migrando: ${user.EMAIL} | Senha decifrada: '${plainTextPassword}' -> Hash gerado.`
            );

            // Aqui você precisa definir newDbPool para seu novo banco de dados
            // const newUserQuery =
            //   "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)";
            // const values = [user.NOME, user.EMAIL, hashedPassword];
            // await newDbPool.query(newUserQuery, values);
          } catch (error) {
            console.error(`❌ Falha ao migrar o usuário ${user.EMAIL}:`, error);
          }
        }
        console.log("✅ Migração de usuários concluída com sucesso!");
        db.detach();
        resolve();
      });
    });
  });
}

module.exports = { migrateUsers };
