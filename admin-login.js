const loginForm = document.querySelector("#admin-login-form");
const loginStatus = document.querySelector("#login-status");

function t(key) {
  return window.AppI18n?.t(key) || key;
}

async function redirectIfAuthenticated() {
  const response = await fetch("/api/admin/session");
  const session = await response.json();
  if (session.authenticated) {
    window.location.href = "/admin.html";
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = loginForm.querySelector("button[type='submit']");
  const password = new FormData(loginForm).get("password");
  submitButton.disabled = true;
  loginStatus.textContent = t("admin.login_loading");

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || t("admin.login_error"));
    }
    window.location.href = "/admin.html";
  } catch (error) {
    loginStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

redirectIfAuthenticated();
