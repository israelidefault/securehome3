// =======================
// Firebase init
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyAr1SFr8IsGGKS7sJf_qELkEiNteFjEee0",
  authDomain: "home-147e6.firebaseapp.com",
  databaseURL: "https://home-147e6-default-rtdb.firebaseio.com",
  projectId: "home-147e6",
  storageBucket: "home-147e6.firebasestorage.app",
  messagingSenderId: "361377677042",
  appId: "1:361377677042:web:e0cbd2091ddfd953f25a6b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// =======================
// Helpers
// =======================
const $  = (sel) => document.querySelector(sel);

// ---------- page detection ----------
const IS_LOGS_PAGE   = /(^|\/)logs\.html$/i.test(location.pathname);
const IS_LOGIN_PAGE  = /(^|\/)login\.html$/i.test(location.pathname);
const IS_SIGNUP_PAGE = /(^|\/)signup\.html$/i.test(location.pathname);

// =======================
// Navbar inject
// =======================
(function injectNavbar(){
  if (IS_LOGIN_PAGE || IS_SIGNUP_PAGE) return;

  const ph = document.getElementById("navbar-placeholder");
  if (!ph) return;

  ph.outerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
      <div class="container">
        <a class="navbar-brand fw-bold" href="index.html">Smart Secured Home</a>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div id="nav" class="collapse navbar-collapse">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item"><a class="nav-link" href="index.html">Dashboard</a></li>
            <li class="nav-item"><a class="nav-link" href="logs.html">Logs</a></li>
            <li class="nav-item"><a class="nav-link" href="about.html">About</a></li>
            <li class="nav-item"><a class="nav-link" href="contact.html">Contact</a></li>

            <li class="nav-item ms-3">
              <button id="btnLogout" class="btn btn-outline-light btn-sm">Logout</button>
            </li>
          </ul>
        </div>
      </div>
    </nav>`;
})();

// =======================
// Local state + logs
// =======================
const KEY = "SSH_STATE_V1";

const defaultState = {
  wifi: "Connected",
  ip: "192.168.0.123",
  uptime: 0,
  mode: "Demo",
  lights: { on: false, dim: 0 },
  logs: [],
  auth: { loggedIn: false, username: "", password: "" }
};

function getState(){
  try {
    const raw = localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : { ...defaultState };

    if (!obj.auth) obj.auth = { loggedIn:false, username:"", password:"" };
    if (!Array.isArray(obj.logs)) obj.logs = [];

    return obj;
  } catch {
    return { ...defaultState };
  }
}

function setState(next){
  localStorage.setItem(KEY, JSON.stringify(next));
}

// addLog(consumer, msg)  — consumer: "MP3" / "RGB" / "LIGHTS"
function addLog(consumer, msg){
  const s = getState();
  const ts = new Date().toLocaleTimeString();

  const user = (s?.auth?.username && s.auth.username.trim())
    ? s.auth.username.trim()
    : "Guest";

  s.logs = [{ ts, user, consumer, msg }, ...(s.logs || [])].slice(0, 500);
  setState(s);

  if (IS_LOGS_PAGE) renderLog();
}

function renderLog(){
  if (!IS_LOGS_PAGE) return;

  const container = document.getElementById("logAccordion");
  if (!container) return;

  const s = getState();
  const logs = s.logs || [];

  // שלושה צרכנים קבועים
  const consumers = ["RGB", "MP3", "LIGHTS"];

  // קיבוץ לפי צרכן
  const grouped = { RGB: [], MP3: [], LIGHTS: [] };

  logs.forEach(l => {
    if (grouped[l.consumer]) grouped[l.consumer].push(l);
  });

  container.innerHTML = "";

  consumers.forEach((consumer, idx) => {
    const id = `cons_${idx}`;

    const items = grouped[consumer]
      .map(l => `<div class="small">[${l.ts}] <span class="text-muted">${l.user}</span> - ${l.msg}</div>`)
      .join("");

    container.innerHTML += `
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed" type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#${id}">
            ${consumer}
          </button>
        </h2>

        <div id="${id}" class="accordion-collapse collapse">
          <div class="accordion-body">
            ${items || `<div class="text-muted small">אין עדיין אירועים</div>`}
          </div>
        </div>
      </div>
    `;
  });
}


  
// =======================
// Render basic UI (safe)
// =======================
function render(){
  const s = getState();
  $("#stWifi")   && ($("#stWifi").textContent   = s.wifi);
  $("#stIp")     && ($("#stIp").textContent     = s.ip);
  $("#stUptime") && ($("#stUptime").textContent = s.uptime + " s");
  $("#stMode")   && ($("#stMode").textContent   = s.mode);
}

// =======================
// Auth
// =======================
function sign(){
  document.getElementById("error").style.display="none";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(() => window.location.href = "index.html")
    .catch((error) => {
      console.log("error", error.code, error.message);
      document.getElementById("error").innerText = "the email is already in use";
      document.getElementById("error").style.display="block";
    });
}

function login(){
  document.getElementById("error").style.display="none";

  const email = document.getElementById("loginemail").value;
  const password = document.getElementById("loginpassword").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // לשמור username ללוגים (כדי שיהיה משתמש אמיתי)
      const s = getState();
      s.auth.loggedIn = true;
      s.auth.username = email; // אפשר לשנות למה שאתה רוצה
      setState(s);

      window.location.href = "index.html";
    })
    .catch((error) => {
      console.log("error", error.code, error.message);
      document.getElementById("error").innerText = "the email or password are not right";
      document.getElementById("error").style.display="block";
    });
}

// =======================
// Events
// =======================
function bindEvents(){
  $("#btnLogout")?.addEventListener("click", ()=> {
    const s = getState();
    addLog("SYSTEM", `logout: ${s.auth.username || "Guest"}`);

    s.auth = { loggedIn:false, username:"", password:"" };
    setState(s);
    location.href = "login.html";
  });
}

// =======================
// Camera (only if elements exist)
// =======================
document.addEventListener("DOMContentLoaded", () => {
  const camElement = document.getElementById("ipcam");
  const startBtn = document.getElementById("startCameraBtn");
  const stopBtn = document.getElementById("stopCameraBtn");

  window.CAMERA_IP = "10.231.79.162";

  function startStream() {
    const ip = window.currentActiveIP || window.CAMERA_IP;
    if (!camElement) return;

    if (ip) {
      camElement.src = "http://" + ip + ":81/stream";
      camElement.style.display = "block";
    }
  }

  function stopStream() {
    if (!camElement) return;
    camElement.src = "";
    camElement.alt = "המצלמה כבויה";
  }

  startBtn?.addEventListener("click", startStream);
  stopBtn?.addEventListener("click", stopStream);

  db.ref("/camIp").on("value", (snapshot) => {
    const ipFromDB = snapshot.val();
    if (ipFromDB) window.currentActiveIP = ipFromDB;
  });
});

// =======================
// Consumers you asked (MP3 / RGB / LIGHTS)
// =======================
function setGreen(){
  const led = document.getElementById("rgbLight");
  if (led) {
    led.classList.remove("red");
    led.classList.add("green");
  }
  document.getElementById("rgbText") && (document.getElementById("rgbText").innerText = "System Active");
  db.ref("/toAltera").set(193);
  addLog("RGB", "System Active (Green)");
}

function setRed(){
  const led = document.getElementById("rgbLight");
  if (led) {
    led.classList.remove("green");
    led.classList.add("red");
  }
  document.getElementById("rgbText") && (document.getElementById("rgbText").innerText = "System Alert");
  db.ref("/toAltera").set(192);
  addLog("RGB", "System Alert (Red)");
}

function setBrightness(value, el){
  db.ref("/toAltera").set(value);

  document.querySelectorAll(".brightness-buttons button")
    .forEach(btn => btn.classList.remove("active"));
  if (el) el.classList.add("active");

  addLog("LIGHTS", `brightness ${value}`);
}

function selectSong(num) {
  db.ref("/toAltera").set(num);
  addLog("MP3", `selected song ${num}`);
}

function setVolume(value) {
  db.ref("/toAltera").set(value);
  addLog("MP3", `volume ${value}`);
}

function stopSong() {
  db.ref("/toAltera").set(0);
  addLog("MP3", "stop");
}

// =======================
// Sensors listeners (only update UI if elements exist)
// =======================
function listenPIR() {
  db.ref("fromAltera/A").on("value", (snapshot) => {
    const badge = document.getElementById("pirStatus");
    if (!badge) return;

    const value = snapshot.val();
    if (value == 1) {
      badge.textContent = "תנועה!";
      badge.className = "badge bg-danger mt-2";
    } else {
      badge.textContent = "שקט";
      badge.className = "badge bg-success mt-2";
    }
  });
}

function listenUltrasonic() {
  db.ref("fromAltera/B").on("value", (snapshot) => {
    const badge = document.getElementById("usStatus");
    if (!badge) return;

    const value = snapshot.val();
    badge.textContent = value + ' ס"מ';
    badge.className = (value < 20) ? "badge bg-danger mt-2" : "badge bg-success mt-2";
  });
}

function listenInfrared() {
  db.ref("fromAltera/C").on("value", (snapshot) => {
    const badge = document.getElementById("irStatus");
    if (!badge) return;

    const value = snapshot.val();
    badge.textContent = (value !== null) ? value : "---";
    badge.className = "badge bg-secondary mt-2";
  });
}

// =======================
// Boot
// =======================
render();
if (IS_LOGS_PAGE) renderLog();
bindEvents();

// uptime ticker
setInterval(() => {
  const next = getState();
  next.uptime = Number(next.uptime || 0) + 1;
  setState(next);
  $("#stUptime") && ($("#stUptime").textContent = next.uptime + " s");
}, 1000);

// storage sync (multi-tab)
window.addEventListener("storage", (ev) => {
  if (ev.key === KEY) {
    render();
    if (IS_LOGS_PAGE) renderLog();
  }
});

// expose functions for inline onclick
window.sign = sign;
window.login = login;
window.setGreen = setGreen;
window.setRed = setRed;
window.setBrightness = setBrightness;
window.selectSong = selectSong;
window.setVolume = setVolume;
window.stopSong = stopSong;
window.listenPIR = listenPIR;
window.listenUltrasonic = listenUltrasonic;
window.listenInfrared = listenInfrared;
