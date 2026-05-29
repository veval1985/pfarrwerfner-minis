// ---------- Firebase Config ----------
const firebaseConfig = {
  apiKey: "AIzaSyC2WkwQIsqDF82_DVp5G6Y2Zzy1HEZthA8",
  authDomain: "ministrantenplaner.firebaseapp.com",
  projectId: "ministrantenplaner",
  storageBucket: "ministrantenplaner.firebasestorage.app",
  messagingSenderId: "938999214080",
  appId: "1:938999214080:web:285ea37f76c2e096fea8e5",
  measurementId: "G-T067N03YSY"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// ---------- UI ----------
const monatSelect = document.getElementById("monat");
const liste = document.getElementById("liste");

const loginStatus = document.getElementById("loginStatus");
const loginForm = document.getElementById("loginForm");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");

const kindSelect = document.getElementById("kind");
const kindContainer = document.getElementById("kindContainer");
const kindError = document.getElementById("kindError");

const adminStats = document.getElementById("adminStats");
const statMessen = document.getElementById("statMessen");
const statRot = document.getElementById("statRot");
const statGelb = document.getElementById("statGelb");
const statGruen = document.getElementById("statGruen");
const kindStats = document.getElementById("kindStats");

const darkToggle = document.getElementById("darkToggle");
const appMessage = document.getElementById("appMessage");

// Admin Create UI
const adminCreateBox = document.getElementById("adminCreateBox");
const newName = document.getElementById("newName");
const btnCreateMesse = document.getElementById("btnCreateMesse");

// ---------- Admin ----------
const adminEmails = [
  "evamaria.nitsch@gmx.at",
  "pollhammer@gmx.net",
  "sandra.deisl@eds.at"
].map(e => e.toLowerCase());

const adminsOhneKinderwahl = [
  "pollhammer@gmx.net",
  "sandra.deisl@eds.at"
].map(e => e.toLowerCase());

// ---------- Daten ----------
let messen = [];

// ---------- Hilfsfunktionen ----------
function normalizeMonthKey(value) {
  if (!value) return "";
  return String(value).trim();
}

function isAdminUser(user) {
  if (!user || !user.email) return false;
  return adminEmails.includes(user.email.trim().toLowerCase());
}

function sollKinderwahlVerstecken(user) {
  if (!user || !user.email) return false;
  return adminsOhneKinderwahl.includes(user.email.trim().toLowerCase());
}

function showMessage(text) {
  if (!appMessage) return;
  appMessage.style.display = "block";
  appMessage.textContent = text;
}

function hideMessage() {
  if (!appMessage) return;
  appMessage.style.display = "none";
  appMessage.textContent = "";
}

function showSuccessEffect() {
  document.body.classList.add("success-effect");
  setTimeout(() => {
    document.body.classList.remove("success-effect");
  }, 600);
}

function getSaubereTeilnehmer(teilnehmerRaw) {
  return Array.isArray(teilnehmerRaw)
    ? teilnehmerRaw.filter(name => name && name.trim() !== "")
    : [];
}

// ---------- Deutsche Monatsnamen ----------
function germanMonthToNumber(monthName) {
  const map = {
    "jänner": 1,
    "januar": 1,
    "februar": 2,
    "märz": 3,
    "maerz": 3,
    "april": 4,
    "mai": 5,
    "juni": 6,
    "juli": 7,
    "august": 8,
    "september": 9,
    "oktober": 10,
    "november": 11,
    "dezember": 12
  };

  return map[String(monthName || "").trim().toLowerCase()] || null;
}

// ---------- Monat aus Text erkennen ----------
function detectMonthFromName(name) {
  const text = String(name || "").trim();

  // Format: 13.06.2026
  let numericMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (numericMatch) {
    const month = String(parseInt(numericMatch[2], 10)).padStart(2, "0");
    const year = numericMatch[3];
    return `${year}-${month}`;
  }

  // Format: 13. Juni 2026
  let germanMatch = text.match(/(\d{1,2})\.\s*([A-Za-zÄÖÜäöüß]+)\s+(\d{4})/);
  if (germanMatch) {
    const monthNumber = germanMonthToNumber(germanMatch[2]);
    if (monthNumber) {
      return `${germanMatch[3]}-${String(monthNumber).padStart(2, "0")}`;
    }
  }

  return null;
}

// ---------- Datum/Uhrzeit aus Text lesen ----------
function parseDateTimeFromName(name, monatFallback) {
  const text = String(name || "").trim();

  let day = 1;
  let month = 0; // JS 0-basiert
  let year = new Date().getFullYear();
  let hour = 0;
  let minute = 0;

  // Uhrzeit holen
  const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = parseInt(timeMatch[2], 10);
  }

  // 1) DD.MM.YYYY
  const numericMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (numericMatch) {
    day = parseInt(numericMatch[1], 10);
    month = parseInt(numericMatch[2], 10) - 1;
    year = parseInt(numericMatch[3], 10);
    return new Date(year, month, day, hour, minute);
  }

  // 2) DD. Monatsname YYYY
  const germanMatch = text.match(/(\d{1,2})\.\s*([A-Za-zÄÖÜäöüß]+)\s+(\d{4})/);
  if (germanMatch) {
    day = parseInt(germanMatch[1], 10);
    const monthNumber = germanMonthToNumber(germanMatch[2]);
    year = parseInt(germanMatch[3], 10);

    if (monthNumber) {
      month = monthNumber - 1;
      return new Date(year, month, day, hour, minute);
    }
  }

  // 3) Fallback aus monat-Feld
  if (monatFallback) {
    const parts = String(monatFallback).split("-");
    if (parts.length === 2) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
    }
  }

  return new Date(year, month, day, hour, minute);
}

// ---------- Schönes Datum anzeigen ----------
function formatDisplayDate(name, monatFallback) {
  if (!name) return "";

  const dateObj = parseDateTimeFromName(name, monatFallback);

  if (isNaN(dateObj.getTime())) {
    return name;
  }

  const weekday = new Intl.DateTimeFormat("de-DE", {
    weekday: "short"
  }).format(dateObj);

  const day = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit"
  }).format(dateObj);

  const month = new Intl.DateTimeFormat("de-DE", {
    month: "long"
  }).format(dateObj);

  const hasTime = /(\d{1,2}):(\d{2})/.test(String(name));

  if (hasTime) {
    const time = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(dateObj);

    return `${weekday}, ${day}. ${month} – ${time} Uhr`;
  }

  return `${weekday}, ${day}. ${month}`;
}

// ---------- Teilnehmerliste ----------
function renderTeilnehmerListe(teilnehmer) {
  if (!Array.isArray(teilnehmer) || teilnehmer.length === 0) {
    return "Noch niemand eingetragen";
  }

  const aktuellerMini = kindSelect ? kindSelect.value : "";

  return teilnehmer
    .map((name) => {
      if (aktuellerMini && name === aktuellerMini) {
        return `<span class="mein-mini">✅ ${name}</span>`;
      }
      return `• ${name}`;
    })
    .join("<br>");
}

// ---------- Monat initial setzen ----------
function setDefaultMonthIfNeeded() {
  if (!monatSelect) return;

  const heute = new Date();
  const yyyy = heute.getFullYear();
  const mm = String(heute.getMonth() + 1).padStart(2, "0");
  const defaultKey = `${yyyy}-${mm}`;

  const exists = Array.from(monatSelect.options).some(opt => opt.value === defaultKey);

  if (exists) {
    monatSelect.value = defaultKey;
  } else if (monatSelect.options.length > 0 && !monatSelect.value) {
    monatSelect.selectedIndex = 0;
  }
}

// ---------- Reminder ----------
function reminderAlreadyShown(reminderKey) {
  try {
    return localStorage.getItem(reminderKey) === "shown";
  } catch {
    return false;
  }
}

function markReminderShown(reminderKey) {
  try {
    localStorage.setItem(reminderKey, "shown");
  } catch {
    // ignore
  }
}

function checkReminder() {
  const user = auth.currentUser;
  if (!user) return;
  if (sollKinderwahlVerstecken(user)) return;
  if (!kindSelect) return;

  const mini = kindSelect.value;
  if (!mini) return;

  const morgen = new Date();
  morgen.setHours(0, 0, 0, 0);
  morgen.setDate(morgen.getDate() + 1);

  const reminderKey = `reminder:${mini}:${morgen.getFullYear()}-${morgen.getMonth() + 1}-${morgen.getDate()}`;

  if (reminderAlreadyShown(reminderKey)) return;

  const matches = messen.filter((m) => {
    const dateObj = parseDateTimeFromName(m.name, m.monat);
    return (
      dateObj.getDate() === morgen.getDate() &&
      dateObj.getMonth() === morgen.getMonth() &&
      dateObj.getFullYear() === morgen.getFullYear() &&
      Array.isArray(m.teilnehmer) &&
      m.teilnehmer.includes(mini)
    );
  });

  if (matches.length > 0) {
    alert("⛪ Nicht vergessen – du ministrierst morgen!");
    markReminderShown(reminderKey);
  }
}

// ---------- Messen laden ----------
function startMessenSubscription() {
  db.collection("messen").onSnapshot(
    (snap) => {
      messen = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      hideMessage();
      setDefaultMonthIfNeeded();
      anzeigen();
      renderStats();

      // Reminder nach Laden neu prüfen
      setTimeout(checkReminder, 500);
    },
    (error) => {
      console.log("Fehler beim Laden der Messen:", error);
      messen = [];
      anzeigen();
      renderStats();

      if (error && error.code === "permission-denied") {
        showMessage("Die Gottesdienste konnten nicht geladen werden. Bitte Firestore-Regeln für 'messen' prüfen.");
      } else {
        showMessage("Die Gottesdienste konnten nicht geladen werden.");
      }
    }
  );
}

// ---------- Login ----------
if (btnLogin) {
  btnLogin.addEventListener("click", async () => {
    const emailField = document.getElementById("email");
    const passwordField = document.getElementById("password");

    const email = emailField ? emailField.value.trim() : "";
    const password = passwordField ? passwordField.value : "";

    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (e) {
      console.log("Login Fehler:", e);
      alert("Login fehlgeschlagen: " + e.code);
    }
  });
}

// ---------- Logout ----------
if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    try {
      const wirklich = confirm("Wirklich ausloggen?");
      if (!wirklich) return;
      await auth.signOut();
    } catch (e) {
      console.log("Logout Fehler:", e);
    }
  });
}

// ---------- Auth Status ----------
auth.onAuthStateChanged((user) => {
  if (user) {
    loginStatus.textContent = "Eingeloggt: " + user.email;
    loginForm.style.display = "none";
    btnLogout.style.display = "inline-block";

    const istAdmin = isAdminUser(user);
    const kinderwahlVersteckt = sollKinderwahlVerstecken(user);

    if (kinderwahlVersteckt) {
      kindContainer.style.display = "none";
      if (kindSelect) {
        kindSelect.innerHTML = '<option value="">🕯️ Mini auswählen…</option>';
      }
      if (kindError) {
        kindError.style.display = "none";
      }
    } else {
      kindContainer.style.display = "block";
      ladeKinder(user.email);
    }

    if (adminStats) {
      adminStats.style.display = istAdmin ? "block" : "none";
    }

    if (adminCreateBox) {
      adminCreateBox.style.display = istAdmin ? "block" : "none";
    }
  } else {
    loginStatus.textContent = "Nicht eingeloggt";
    loginForm.style.display = "flex";
    btnLogout.style.display = "none";
    kindContainer.style.display = "none";

    if (adminStats) {
      adminStats.style.display = "none";
    }

    if (adminCreateBox) {
      adminCreateBox.style.display = "none";
    }

    if (kindSelect) {
      kindSelect.innerHTML = '<option value="">🕯️ Mini auswählen…</option>';
    }

    if (kindError) {
      kindError.style.display = "none";
    }
  }

  anzeigen();
  renderStats();

  // Reminder nach Login erneut prüfen
  setTimeout(checkReminder, 600);
});

// ---------- Kinder laden ----------
function ladeKinder(email) {
  db.collection("kinder")
    .where("eltern", "==", email)
    .get()
    .then((snap) => {
      kindSelect.innerHTML = '<option value="">🕯️ Mini auswählen…</option>';

      snap.forEach((doc) => {
        const data = doc.data();
        const option = document.createElement("option");
        option.value = data.name;
        option.textContent = data.name;
        kindSelect.appendChild(option);
      });

      if (kindSelect.options.length > 1) {
        kindSelect.selectedIndex = 1;
      }

      // Reminder nach Kinderauswahl initial prüfen
      setTimeout(checkReminder, 400);
    })
    .catch((error) => {
      console.log("Fehler beim Laden der Kinder:", error);
      showMessage("Die Kinder konnten nicht geladen werden.");
    });
}
