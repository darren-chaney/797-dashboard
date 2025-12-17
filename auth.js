/* ============================================================
   797 Sample Builder — Authorization Gate (Client-Side)
   Purpose:
   - Prevent unauthorized creation of samples / artifacts
   - Remain frictionless during development
   - No backend, no accounts, no data access
   ============================================================ */

/* =========================
   CONFIG
   ========================= */

// 🔧 DEV MODE BYPASS
// Set to true during heavy development to auto-unlock
// Set to false for normal internal use
const DEV_BYPASS = true;

// 🔐 ACCESS PHRASE (exact match)
const ACCESS_PHRASE = "ourMoonshine25!";

// Storage keys
const SESSION_KEY = "sb_auth_session";
const DEVICE_KEY  = "sb_auth_device";

// Auth version stamp (for future traceability)
const AUTH_VERSION = "passphrase-v1";

/* =========================
   INTERNAL STATE
   ========================= */

let authorized = false;

/* =========================
   UTILITIES
   ========================= */

function authorizeSession(rememberDevice = false) {
  sessionStorage.setItem(SESSION_KEY, "true");

  if (rememberDevice) {
    localStorage.setItem(DEVICE_KEY, "true");
  }

  authorized = true;

  // Expose minimal global auth stamp
  window.SB_AUTH = {
    authorized: true,
    authorizedAt: new Date().toISOString(),
    authVersion: AUTH_VERSION
  };

  removeAuthModal();
}

function isAlreadyAuthorized() {
  return (
    sessionStorage.getItem(SESSION_KEY) === "true" ||
    localStorage.getItem(DEVICE_KEY) === "true"
  );
}

/* =========================
   AUTH MODAL UI
   ========================= */

function showAuthModal() {
  const overlay = document.createElement("div");
  overlay.id = "sb-auth-overlay";
  overlay.innerHTML = `
    <div id="sb-auth-modal">
      <h2>🔒 797 Sample Builder (R&D)</h2>
      <p>Enter access phrase to continue</p>

      <input
        type="password"
        id="sb-auth-input"
        placeholder="Access phrase"
        autocomplete="off"
      />

      <label class="sb-auth-remember">
        <input type="checkbox" id="sb-auth-remember" />
        Remember this device (dev)
      </label>

      <div id="sb-auth-error"></div>

      <button id="sb-auth-unlock">Unlock</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("sb-auth-unlock").onclick = validatePhrase;
  document.getElementById("sb-auth-input").onkeydown = e => {
    if (e.key === "Enter") validatePhrase();
  };
}

function removeAuthModal() {
  const overlay = document.getElementById("sb-auth-overlay");
  if (overlay) overlay.remove();
}

function validatePhrase() {
  const input = document.getElementById("sb-auth-input");
  const remember = document.getElementById("sb-auth-remember").checked;
  const error = document.getElementById("sb-auth-error");

  if (!input) return;

  if (input.value === ACCESS_PHRASE) {
    authorizeSession(remember);
  } else {
    error.textContent = "Incorrect access phrase";
    error.style.color = "#f87171";
    input.value = "";
    input.focus();
  }
}

/* =========================
   INIT
   ========================= */

(function initAuth() {
  // Dev bypass (explicit)
  if (DEV_BYPASS === true) {
    authorizeSession(true);
    return;
  }

  // Existing authorization
  if (isAlreadyAuthorized()) {
    authorizeSession();
    return;
  }

  // Block app until authorized
  document.addEventListener("DOMContentLoaded", () => {
    showAuthModal();
  });
})();
