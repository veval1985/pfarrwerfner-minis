const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "ministrantenplaner.firebaseapp.com",
  projectId: "ministrantenplaner"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// UI
const darkToggle = document.getElementById("darkToggle");
const installBtn = document.getElementById("btnInstall");
const reminderBox = document.getElementById("reminderBox");

// DARK MODE
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

// LOGIN
document.getElementById("btnLogin").onclick = async () => {
  const email = document.getElementById("email").value;
  const pw = document.getElementById("password").value;
  await auth.signInWithEmailAndPassword(email, pw);
};

// REMINDER (simplified)
function checkReminder() {
  // nur Demo → bleibt sichtbar
  reminderBox.style.display = "block";
}

// INSTALL BUTTON
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "inline-block";
});

installBtn.onclick = async () => {
  deferredPrompt.prompt();
};

// SERVICE WORKER
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

// START
checkReminder();
