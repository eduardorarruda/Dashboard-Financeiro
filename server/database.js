require("dotenv").config();

const { Pool } = require("pg");
const bcrypt = require("bcrypt");

// Configurações do banco de dados
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(dbConfig);

pool.on("connect", () => {
  console.log("🔗 Conectado ao banco PostgreSQL");
});

pool.on("error", (err) => {
  console.error("❌ Erro na conexão com o banco:", err);
  process.exit(-1);
});

// Classe para gerenciar operações do banco
class Database {
  // Método para testar a conexão
  static async testConnection() {
    try {
      const client = await pool.connect();
      console.log("✅ Teste de conexão bem-sucedido");
      client.release();
      return true;
    } catch (error) {
      console.error("❌ Erro no teste de conexão:", error);
      return false;
    }
  }

  // Método para buscar usuário por email
  static async getUserByEmail(email) {
    const query = "SELECT * FROM Usuario WHERE email = $1";

    try {
      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Erro ao buscar usuário:", error);
      throw error;
    }
  }

  // Método para verificar login
  static async verifyLogin(email, password) {
    try {
      // Buscar usuário por email
      const user = await this.getUserByEmail(email);

      if (!user) {
        return {
          success: false,
          message: "Email não encontrado",
        };
      }

      // Verificar senha
      const isValidPassword = await bcrypt.compare(password, user.senha);

      if (!isValidPassword) {
        return {
          success: false,
          message: "Senha incorreta",
        };
      }

      // Login bem-sucedido
      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      };
    } catch (error) {
      console.error("❌ Erro na verificação de login:", error);
      return {
        success: false,
        message: "Erro interno do servidor",
      };
    }
  }

  // Método para criar novo usuário
  static async createUser(name, email, password) {
    try {
      // Verificar se email já existe
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        return {
          success: false,
          message: "Email já está em uso",
        };
      }

      // Hash da senha
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Inserir usuário
      const query = `
        INSERT INTO Usuario (name, email, senha) 
        VALUES ($1, $2, $3) 
        RETURNING id, name, email
      `;

      const result = await pool.query(query, [name, email, hashedPassword]);

      return {
        success: true,
        user: result.rows[0],
      };
    } catch (error) {
      console.error("❌ Erro ao criar usuário:", error);
      return {
        success: false,
        message: "Erro ao criar usuário",
      };
    }
  }

  // Método para atualizar dados do usuário
  static async updateUser(id, updates) {
    try {
      const { name, email, password } = updates;
      let query = "UPDATE Usuario SET updated_at = CURRENT_TIMESTAMP";
      const values = [];
      let paramCount = 0;

      if (name) {
        paramCount++;
        query += `, name = $${paramCount}`;
        values.push(name);
      }

      if (email) {
        paramCount++;
        query += `, email = $${paramCount}`;
        values.push(email);
      }

      if (password) {
        paramCount++;
        const hashedPassword = await bcrypt.hash(password, 12);
        query += `, senha = $${paramCount}`;
        values.push(hashedPassword);
      }

      paramCount++;
      query += ` WHERE id = $${paramCount} RETURNING id, name, email`;
      values.push(id);

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return {
          success: false,
          message: "Usuário não encontrado",
        };
      }

      return {
        success: true,
        user: result.rows[0],
      };
    } catch (error) {
      console.error("❌ Erro ao atualizar usuário:", error);
      return {
        success: false,
        message: "Erro ao atualizar usuário",
      };
    }
  }

  // Método para deletar usuário
  static async deleteUser(id) {
    try {
      const query = "DELETE FROM Usuario WHERE id = $1 RETURNING id";
      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return {
          success: false,
          message: "Usuário não encontrado",
        };
      }

      return {
        success: true,
        message: "Usuário deletado com sucesso",
      };
    } catch (error) {
      console.error("❌ Erro ao deletar usuário:", error);
      return {
        success: false,
        message: "Erro ao deletar usuário",
      };
    }
  }

  // Método para listar todos os usuários
  static async getAllUsers() {
    try {
      const query =
        "SELECT id, name, email, created_at FROM Usuario ORDER BY created_at DESC";
      const result = await pool.query(query);

      return {
        success: true,
        users: result.rows,
      };
    } catch (error) {
      console.error("❌ Erro ao buscar usuários:", error);
      return {
        success: false,
        message: "Erro ao buscar usuários",
      };
    }
  }

  // Método para listar todos os parceiros (clifornec)
  static async getAllPartners() {
    try {
      // Nota: Esta query assume que você tem as colunas necessárias. Ajuste se preciso.
      const query = `
        SELECT 
          id, 
          cgc, 
          razaosocial, 
          nomefantasia, 
          numerocel, 
          numeroend, 
          cep, 
          rua, 
          bairro,
          email
        FROM clifornec 
        ORDER BY razaosocial ASC
      `;
      const result = await pool.query(query);

      return {
        success: true,
        partners: result.rows,
      };
    } catch (error) {
      console.error("❌ Erro ao buscar parceiros:", error);
      return { success: false, message: "Erro ao buscar parceiros" };
    }
  }

  static async getTipopag() {
    try {
      const query = `
      SELECT * FROM tipopag 
    `;
      const result = await pool.query(query);

      return {
        success: true,
        records: result.rows,
      };
    } catch (error) {
      console.error("❌ Erro ao buscar registros tipo de pagamentos:", error);
      return {
        success: false,
        message: "Erro ao buscar registros tipo de pagamentos",
      };
    }
  }

  // Método para LISTAR todas as movimentações financeiras (GET)
  static async getAllFinancialRecords() {
    try {
      const query = `
      SELECT 
        f.id,
        f.tipo,
        f.situacao,
        f.numero,
        f.valor,
        f.datavencimento,
        c.razaosocial AS parceiro_nome 
      FROM financeiro AS f
      JOIN clifornec AS c ON f.id_clifornec = c.id
      ORDER BY f.datavencimento DESC
    `;
      const result = await pool.query(query);

      return {
        success: true,
        records: result.rows,
      };
    } catch (error) {
      console.error("❌ Erro ao buscar registros financeiros:", error);
      return {
        success: false,
        message: "Erro ao buscar registros financeiros",
      };
    }
  }

  // Método para CRIAR uma nova movimentação financeira (POST)
  static async postFinancialRecords(data) {
    const {
      descricao,
      idtipopag,
      datavencimento,
      valor,
      tipo,
      numero,
      id_clifornec,
    } = data;

    try {
      const query = `
      INSERT INTO financeiro (
        descricao, idtipopag, datavencimento, valor, situacao, tipo, numero, id_clifornec
      )
      VALUES ($1, $2, $3, $4, 'A', $5, $6, $7)
      RETURNING *;
    `;

      const values = [
        descricao,
        idtipopag,
        datavencimento,
        valor,
        tipo,
        numero,
        id_clifornec,
      ];

      const result = await pool.query(query, values);

      return {
        success: true,
        message: "Registro financeiro criado com sucesso!",
        newRecord: result.rows[0],
      };
    } catch (error) {
      console.error("❌ Erro ao criar registro financeiro:", error);
      return {
        success: false,
        message: "Erro ao criar registro financeiro",
      };
    }
  }

  // Método para ATUALIZAR uma movimentação financeira existente (UPDATE/PUT)
  static async updateFinancialRecords(id, data) {
    // Lista dos campos que podem ser atualizados
    const allowedFields = [
      "descricao",
      "idtipopag",
      "datavencimento",
      "valor",
      "situacao",
      "tipo",
      "numero",
      "id_clifornec",
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    // Monta a query dinamicamente com base nos dados recebidos
    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex++}`);
        values.push(data[field]);
      }
    });

    // Se nenhum campo válido foi enviado, retorna um erro
    if (setClauses.length === 0) {
      return {
        success: false,
        message: "Nenhum campo válido para atualizar foi fornecido.",
      };
    }

    // Adiciona o ID ao final da lista de valores para a cláusula WHERE
    values.push(id);

    try {
      // Monta a query final
      const query = `
      UPDATE financeiro
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *; -- Retorna o registro atualizado
    `;

      const result = await pool.query(query, values);

      // Verifica se algum registro foi realmente atualizado
      if (result.rowCount === 0) {
        return {
          success: false,
          message: "Registro financeiro não encontrado para atualização.",
        };
      }

      return {
        success: true,
        message: "Registro financeiro atualizado com sucesso!",
        updatedRecord: result.rows[0],
      };
    } catch (error) {
      console.error("❌ Erro ao atualizar registro financeiro:", error);
      return {
        success: false,
        message: "Erro ao atualizar registro financeiro",
      };
    }
  }

  // Método para DELETAR uma movimentação financeira (DELETE)
  static async deleteFinancialRecords(id) {
    try {
      // Query para DELETAR um registro específico pelo ID
      const query = `
      DELETE FROM financeiro
      WHERE id = $1;
    `;

      const result = await pool.query(query, [id]);

      // Verifica se a linha foi realmente deletada. Se rowCount for 0, o ID não existia.
      if (result.rowCount === 0) {
        return {
          success: false,
          message: "Registro financeiro não encontrado para exclusão.",
        };
      }

      return {
        success: true,
        message: "Registro financeiro excluído com sucesso!",
      };
    } catch (error) {
      console.error("❌ Erro ao deletar registro financeiro:", error);
      return {
        success: false,
        message: "Erro ao deletar registro financeiro",
      };
    }
  }

  // Método para fazer ou desfazer pagamento
  static async finceiroPago(id, data) {
    try {
      const situacao = data.situacao ? data.situacao.toUpperCase() : null;

      if (situacao !== "A" && situacao !== "P") {
        return {
          success: false,
          message:
            "Valor inválido para 'situação'. Apenas 'A' (Aberto) ou 'P' (Pago) são permitidos.",
        };
      }

      // CORREÇÃO: Atualizar a tabela financeiro ao invés de clifornec
      const query = `
      UPDATE financeiro SET
      situacao = $1
      WHERE id = $2
      RETURNING *;
    `;
      const values = [situacao, id];

      const result = await pool.query(query, values);

      if (result.rowCount === 0) {
        return {
          success: false,
          message: `Movimentação financeira com ID ${id} não encontrada.`,
        };
      }

      return {
        success: true,
        message: `Movimentação ${
          situacao === "P" ? "marcada como paga" : "marcada como pendente"
        } com sucesso!`,
        record: result.rows[0],
      };
    } catch (error) {
      console.error("⚠ Erro ao atualizar situação da movimentação:", error);

      return {
        success: false,
        message: "Erro ao atualizar situação da movimentação no banco.",
      };
    }
  }
  // Método para DELETAR uma movimentação financeira (DELETE)
  static async deleteFinancialRecords(id) {
    try {
      // Query para DELETAR um registro específico pelo ID
      const query = `
      DELETE FROM financeiro
      WHERE id = $1;
    `;

      const result = await pool.query(query, [id]);

      // Verifica se a linha foi realmente deletada. Se rowCount for 0, o ID não existia.
      if (result.rowCount === 0) {
        return {
          success: false,
          message: "Registro financeiro não encontrado para exclusão.",
        };
      }

      return {
        success: true,
        message: "Registro financeiro excluído com sucesso!",
      };
    } catch (error) {
      console.error("❌ Erro ao deletar registro financeiro:", error);
      return {
        success: false,
        message: "Erro ao deletar registro financeiro",
      };
    }
  }

  // Método para buscar cidade estado
  static async getCidadeEstado() {
    try {
      const query = "SELECT * FROM cidadeestado";
      const result = await pool.query(query);

      return {
        success: true,
        records: result.rows,
      };
    } catch (error) {
      console.error("❌ Erro ao buscar registros Cidade Estado:", error);
      return {
        success: false,
        message: "Erro ao buscar registros Cidade Estado",
      };
    }
  }

  static async createPartner(data) {
    try {
      const query = `
        INSERT INTO clifornec 
          (cgc, razaosocial, nomefantasia, numerocel, numeroend, cep, rua, bairro, idcidadeestado, email)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
      `;

      const values = [
        data.cgc,
        data.razaoSocial,
        data.nomeFantasia,
        data.celular.replace(/\D/g, ""),
        data.numero,
        data.cep,
        data.rua,
        data.bairro,
        data.cidadeEstado,
        data.email,
      ];

      const result = await pool.query(query, values);
      return { success: true, partner: result.rows[0] };
    } catch (error) {
      console.error("❌ Erro ao criar parceiro:", error);
      return { success: false, message: "Erro ao criar parceiro no banco." };
    }
  }

  // Método para ATUALIZAR um parceiro existente
  static async updatePartner(id, data) {
    try {
      const query = `
        UPDATE clifornec SET
          cgc = $1,
          razaosocial = $2,
          nomefantasia = $3,
          numerocel = $4,
          numeroend = $5,
          cep = $6,
          rua = $7,
          bairro = $8,
          idcidadeestado = $9, 
          email = $10
        WHERE id = $11
        RETURNING *;
      `;
      const values = [
        data.cgc,
        data.razaoSocial,
        data.nomeFantasia,
        data.celular.replace(/\D/g, ""),
        data.numero,
        data.cep,
        data.rua,
        data.bairro,
        data.cidadeEstado,
        data.email,
        id,
      ];

      const result = await pool.query(query, values);
      return { success: true, partner: result.rows[0] };
    } catch (error) {
      console.error("❌ Erro ao atualizar parceiro:", error);
      return {
        success: false,
        message: "Erro ao atualizar parceiro no banco.",
      };
    }
  }

  static async getPartner(cgc) {
    try {
      const query = `
      SELECT c.*, ci.nomecidade, ci.nomeestado
      FROM clifornec c
      INNER JOIN cidadeestado ci ON ci.id = c.idcidadeestado
      WHERE c.cgc = $1
    `;
      const values = [cgc];

      const result = await pool.query(query, values);
      return { success: true, partner: result.rows[0] };
    } catch (error) {
      console.error("❌ Erro ao buscar parceiro:", error);
      return {
        success: false,
        message: "Erro ao buscar parceiro no banco.",
      };
    }
  }

  static async deletePartner(id) {
    try {
      const checkQuery =
        "SELECT 1 FROM financeiro WHERE id_clifornec = $1 LIMIT 1";
      const checkResult = await pool.query(checkQuery, [id]);

      if (checkResult.rowCount > 0) {
        return {
          success: false,
          message:
            "Este parceiro não pode ser excluído pois possui movimentações financeiras associadas.",
        };
      }

      const deleteQuery = "DELETE FROM clifornec WHERE id = $1 RETURNING id";
      const result = await pool.query(deleteQuery, [id]);

      if (result.rowCount === 0) {
        return {
          success: false,
          message: "Parceiro não encontrado para exclusão.",
        };
      }

      return {
        success: true,
        message: "Parceiro excluído com sucesso.",
      };
    } catch (error) {
      console.error("❌ Erro ao deletar parceiro:", error);
      return {
        success: false,
        message: "Erro ao deletar parceiro no banco.",
      };
    }
  }

  // Método para fechar todas as conexões
  static async closeConnections() {
    try {
      await pool.end();
      console.log("🔒 Conexões com o banco encerradas");
    } catch (error) {
      console.error("❌ Erro ao fechar conexões:", error);
    }
  }
}

// Inicialização automática
(async () => {
  try {
    await Database.testConnection();
    console.log("🚀 Database inicializado com sucesso");
  } catch (error) {
    console.error("❌ Erro na inicialização do database:", error);
  }
})();

module.exports = {
  Database,
  pool,
};
