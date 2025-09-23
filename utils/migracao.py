import os
import requests
import psycopg2
import sys

# --- INFORMAÇÕES DE CONEXÃO COM O BANCO DE DADOS ---
# Substitua com suas credenciais do Aiven
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASSWORD")

# URL do JSON de cidades e estados
JSON_URL = "https://gist.githubusercontent.com/letanure/3012978/raw/6938daa8ba69bcafa89a8c719690225641e39586/estados-cidades.json"

def baixar_dados_json():
    """Baixa e carrega os dados de cidades e estados do JSON."""
    try:
        print("Baixando dados do JSON...")
        response = requests.get(JSON_URL)
        response.raise_for_status()  # Lança um erro para respostas ruins (4xx ou 5xx)
        print("Download completo.")
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Erro ao baixar o JSON: {e}")
        sys.exit(1) # Encerra o script se não conseguir baixar os dados

def conectar_banco():
    """Cria e retorna uma conexão com o banco de dados PostgreSQL."""
    try:
        print("Conectando ao banco de dados PostgreSQL...")
        conn = psycopg2.connect(
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASS,
    host=DB_HOST,
    port=DB_PORT,
    sslmode='require',
    sslrootcert="Downloads/ca (4).pem" 
)
        print("Conexão bem-sucedida!")
        return conn
    except psycopg2.OperationalError as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        print("\nVerifique se as credenciais (host, porta, usuário, senha) estão corretas.")
        sys.exit(1) # Encerra o script se a conexão falhar

def inserir_dados(conn, cursor, data):
    """Insere os dados dos estados e cidades na tabela existente cidadeEstado."""
    print("Iniciando a inserção dos dados. Isso pode levar alguns instantes...")
    total_cidades = 0
    try:
        for estado in data["estados"]:
            nome_estado = estado["nome"]
            for cidade in estado["cidades"]:
                cursor.execute(
                    "INSERT INTO cidadeEstado (nomecidade, nomeestado) VALUES (%s, %s);",
                    (cidade, nome_estado)
                )
                total_cidades += 1
        
        conn.commit()
        print(f"Sucesso! {total_cidades} cidades foram inseridas no banco de dados.")

    except Exception as e:
        print(f"Ocorreu um erro durante a inserção: {e}")
        conn.rollback()

def main():
    """Função principal que orquestra todo o processo."""
    dados = baixar_dados_json()
    
    conn = None # Inicia a variável de conexão como nula
    try:
        conn = conectar_banco()
        # O cursor é usado para executar comandos SQL
        with conn.cursor() as cursor:
            inserir_dados(conn, cursor, dados)
            
    finally:
        # Garante que a conexão seja fechada, mesmo se ocorrer um erro
        if conn is not None:
            conn.close()
            print("Conexão com o banco de dados foi fechada.")

# Ponto de entrada do script
if __name__ == "__main__":
    main()

