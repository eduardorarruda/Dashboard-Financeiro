const API_BASE_URL = "http://localhost:3000/api";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");
const loginButton = document.getElementById("loginButton");
const errorMessage = document.getElementById("errorMessage");
const signupLink = document.getElementById("signupLink");
const googleLogin = document.getElementById("googleLogin");
const facebookLogin = document.getElementById("facebookLogin");
const appleLogin = document.getElementById("appleLogin");

// Toggle de visibilidade da senha
passwordToggle.addEventListener("click", function () {
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);
  passwordToggle.textContent = type === "password" ? "👁️" : "🙈";
});

// Função para mostrar erro
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  setTimeout(() => {
    errorMessage.style.display = "none";
  }, 5000);
}

// Função para mostrar sucesso
function showSuccess(message) {
  let successMessage = document.getElementById("successMessage");
  if (!successMessage) {
    successMessage = document.createElement("div");
    successMessage.id = "successMessage";
    successMessage.style.cssText = `
      background: #d4edda;
      color: #155724;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 0.9rem;
      display: none;
      animation: slideIn 0.3s ease-out;
    `;
    errorMessage.parentNode.insertBefore(successMessage, errorMessage);
  }

  successMessage.textContent = message;
  successMessage.style.display = "block";
  setTimeout(() => {
    successMessage.style.display = "none";
  }, 3000);
}

// Função para mostrar loading
function setLoading(loading) {
  if (loading) {
    loginButton.classList.add("loading");
    loginButton.disabled = true;
  } else {
    loginButton.classList.remove("loading");
    loginButton.disabled = false;
  }
}

// Função para fazer requisições à API
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Erro na requisição");
    }

    return data;
  } catch (error) {
    console.error("❌ Erro na API:", error);
    throw error;
  }
}

// Função para realizar login real
async function performLogin(email, password) {
  try {
    // CORRIGIDO: Removido o "/api" do início
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    return result;
  } catch (error) {
    throw new Error(error.message || "Erro no login");
  }
}

// Função para salvar dados do usuário no localStorage
function saveUserData(userData) {
  try {
    // CORREÇÃO: Salvar o objeto user e o token
    localStorage.setItem("currentUser", JSON.stringify(userData.user));
    localStorage.setItem("authToken", userData.token); // Salvar o token
    sessionStorage.setItem("isLoggedIn", "true");
  } catch (error) {
    console.warn("⚠️ Não foi possível salvar dados do usuário:", error);
  }
}

// Manipulador do formulário de login
loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Por favor, preencha todos os campos");
    return;
  }

  // Validar formato do email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError("Por favor, insira um email válido");
    return;
  }

  setLoading(true);

  try {
    const result = await performLogin(email, password);

    if (result.success) {
      // CORREÇÃO: Passar o objeto 'result' inteiro que contém user e token
      saveUserData(result.data);

      showSuccess(
        `Login realizado com sucesso! Bem-vindo, ${result.data.user.name}!`
      );

      // Limpar formulário
      loginForm.reset();

      // Redirecionar após 2 segundos
      setTimeout(() => {
        window.location.href = "/dashboard/dashboard.html";
        console.log("🚀 Redirecionando para dashboard...");
      }, 2000);
    } else {
      showError(result.message || "Erro no login");
    }
  } catch (error) {
    showError(error.message || "Erro de conexão com o servidor");
  } finally {
    setLoading(false);
  }
});

// Função para registrar novo usuário
async function registerUser(name, email, password) {
  try {
    const result = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    return result;
  } catch (error) {
    throw new Error(error.message || "Erro no cadastro");
  }
}

// Animações nos inputs
const inputs = document.querySelectorAll(".form-input");
inputs.forEach((input) => {
  input.addEventListener("focus", function () {
    this.parentElement.style.transform = "scale(1.02)";
  });

  input.addEventListener("blur", function () {
    this.parentElement.style.transform = "scale(1)";
  });
});

// Link para cadastro
signupLink.addEventListener("click", function (e) {
  e.preventDefault();

  // Criar modal de cadastro ou redirecionar
  const shouldCreateAccount = confirm(
    "Deseja criar uma nova conta?\n\nClique OK para continuar com o cadastro."
  );

  if (shouldCreateAccount) {
    createRegistrationModal();
  }
});

// Função para criar modal de registro
function createRegistrationModal() {
  const existingModal = document.getElementById("registrationModal");
  if (existingModal) {
    existingModal.remove();
  }

  // Criar modal
  const modal = document.createElement("div");
  modal.id = "registrationModal";
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease-out;
  `;

  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 20px;
      padding: 40px;
      width: 90%;
      max-width: 400px;
      position: relative;
      animation: slideIn 0.3s ease-out;
    ">
      <button id="closeModal" style="
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
      ">&times;</button>
      
      <h2 style="margin-bottom: 20px; color: #333;">Criar Conta</h2>
      
      <form id="registrationForm">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 600;">Nome</label>
          <input type="text" id="regName" required style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 1rem;
          ">
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 600;">Email</label>
          <input type="email" id="regEmail" required style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 1rem;
          ">
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 600;">Senha</label>
          <input type="password" id="regPassword" required style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 1rem;
          ">
        </div>
        
        <button type="submit" id="registerBtn" style="
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        ">Criar Conta</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = modal.querySelector("#closeModal");
  const registrationForm = modal.querySelector("#registrationForm");

  closeModal.addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  registrationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = modal.querySelector("#regName").value.trim();
    const email = modal.querySelector("#regEmail").value.trim();
    const password = modal.querySelector("#regPassword").value;

    if (!name || !email || !password) {
      alert("Preencha todos os campos");
      return;
    }

    if (password.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    try {
      const registerBtn = modal.querySelector("#registerBtn");
      registerBtn.textContent = "Criando...";
      registerBtn.disabled = true;

      const result = await registerUser(name, email, password);
      console.log("✅ Usuário registrado:", result);

      alert("Conta criada com sucesso!");
      modal.remove();
    } catch (error) {
      alert(error.message || "Erro ao criar conta");
    } finally {
      const registerBtn = modal.querySelector("#registerBtn");
      if (registerBtn) {
        registerBtn.textContent = "Criar Conta";
        registerBtn.disabled = false;
      }
    }
  });
}
