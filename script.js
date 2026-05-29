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

// ---------- Monat aus Datum im Namen erkennen ----------
function detectMonthFromName(name) {
  const text = String(name || "").trim();

  // 13.06.2026
  const numericMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (numericMatch) {
    const month = String(parseInt(numericMatch[2], 10)).padStart(2, "0");
    const year = numericMatch[3];
    return `${year}-${month}`;
  }

  // 13. Juni 2026
  const germanMatch = text.match(/(\d{1,2})\.\s*([A-Za-zÄÖÜäöüß]+)\s+(\d{4})/);
  if (germanMatch) {
    const monthNumber = germanMonthToNumber(germanMatch[2]);
    if (monthNumber) {
      return `${germanMatch[3]}-${String(monthNumber).padStart(2, "0")}`;
    }
  }

  return null;
}

// ---------- Monatsschlüssel robust bestimmen ----------
function getMonthKeyForMass(m) {
  const stored = normalizeMonthKey(m.monat);
  if (stored) return stored;

  const detected = detectMonthFromName(m.name);
  if (detected) return detected;

  return "";
}

// ---------- Datum/Uhrzeit aus Name lesen ----------
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

  // 1) Format: 13.06.2026
  const numericMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (numericMatch) {
    day = parseInt(numericMatch[1], 10);
    month = parseInt(numericMatch[2], 10) - 1;
    year = parseInt(numericMatch[3], 10);
    return new Date(year, month, day, hour, minute);
  }

  // 2) Format: 13. Juni 2026
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

  // 3) Fallback auf gespeicherten Monat
  if (monatFallback) {
    const parts = String(monatFallback).split("-");
    if (parts.length === 2) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
    }
  }

  return new Date(year, month, day, hour, minute);
}

// ---------- Datum schön darstellen ----------
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

// ---------- Monats-Dropdown dynamisch aus vorhandenen Messen ----------
function syncMonthDropdownWithData() {
  if (!monatSelect) return;

  const monthKeys = [...new Set(
    messen
      .map(m => getMonthKeyForMass(m))
      .filter(Boolean)
  )].sort();

  if (monthKeys.length === 0) {
    // Fallback: aktueller Monat, falls noch keine Messe existiert
    const heute = new Date();
    const defaultKey = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}`;
    monatSelect.innerHTML = "";
    const option = document.createElement("option");
    option.value = defaultKey;
    option.textContent = new Intl.DateTimeFormat("de-DE", { month: "long" }).format(heute) + " " + heute.getFullYear();
    monatSelect.appendChild(option);
    monatSelect.value = defaultKey;
    return;
  }

  const current = monatSelect.value;

  monatSelect.innerHTML = "";

  monthKeys.forEach(key => {
    const [year, month] = key.split("-");
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const monthLabel = new Intl.DateTimeFormat("de-DE", {
      month: "long"
    }).format(dateObj);

    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} ${year}`;
    monatSelect.appendChild(option);
  });

  if (monthKeys.includes(current)) {
    monatSelect.value = current;
    return;
  }

  const heute = new Date();
  const defaultKey = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}`;

  if (monthKeys.includes(defaultKey)) {
    monatSelect.value = defaultKey;
  } else {
    monatSelect.value = monthKeys[0];
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
    const dateObj = parseDateTimeFromName(m.name, getMonthKeyForMass(m));
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
      syncMonthDropdownWithData();
      anzeigen();
      renderStats();
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
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

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

      setTimeout(checkReminder, 400);
    })
    .catch((error) => {
      console.log("Fehler beim Laden der Kinder:", error);
      showMessage("Die Kinder konnten nicht geladen werden.");
    });
}

// ---------- Kind holen ----------
function getName() {
  const name = kindSelect ? kindSelect.value : "";

  if (!name) {
    if (kindError) {
      kindError.style.display = "block";
    } else {
      alert("Bitte zuerst einen Mini auswählen.");
    }
    return null;
  }

  if (kindError) {
    kindError.style.display = "none";
  }

  return name;
}

// ---------- Anzeige ----------
function anzeigen() {
  if (!liste || !monatSelect) return;

  liste.innerHTML = "";

  const selectedMonth = normalizeMonthKey(monatSelect.value);

  let gefiltert = messen.filter((m) => {
    return getMonthKeyForMass(m) === selectedMonth;
  });

  gefiltert = gefiltert.sort((a, b) => {
    const dateA = parseDateTimeFromName(a.name, getMonthKeyForMass(a)).getTime();
    const dateB = parseDateTimeFromName(b.name, getMonthKeyForMass(b)).getTime();
    return dateA - dateB;
  });

  if (gefiltert.length === 0) {
    liste.innerHTML = '<div class="empty-state">Für diesen Monat sind noch keine Gottesdienste eingetragen.</div>';
    return;
  }

  gefiltert.forEach((m) => {
    const teilnehmer = getSaubereTeilnehmer(m.teilnehmer);
    const aktuellerMini = kindSelect ? kindSelect.value : "";
    const miniIstBereitsEingetragen = !!(aktuellerMini && teilnehmer.includes(aktuellerMini));

    const user = auth.currentUser;
    const istAdmin = isAdminUser(user);
    const kinderwahlVersteckt = sollKinderwahlVerstecken(user);

    const div = document.createElement("div");
    div.className = "card";

    if (teilnehmer.length === 0) {
      div.classList.add("rot");
    } else if (teilnehmer.length === 1) {
      div.classList.add("gelb");
    } else {
      div.classList.add("gruen");
    }

    let statusIcon = "✅";
    if (teilnehmer.length === 0) statusIcon = "❗";
    if (teilnehmer.length === 1) statusIcon = "⚠️";

    let warnung = "";
    if (teilnehmer.length === 0) {
      warnung = '<div class="warnung">🚨 Noch kein Ministrant eingetragen!</div>';
    } else if (teilnehmer.length === 1) {
      warnung = '<div class="warnung">⚠️ Noch 1 weiterer Mini wäre gut</div>';
    }

    div.innerHTML = `
      <div class="status-badge">${statusIcon}</div>
      <div class="card-title">${formatDisplayDate(m.name, getMonthKeyForMass(m))}</div>
      <div class="mini-info">👥 ${teilnehmer.length} Ministrant${teilnehmer.length === 1 ? "" : "en"}</div>
      <div class="mini-info mini-list">${renderTeilnehmerListe(teilnehmer)}</div>
      ${warnung}
    `;

    const actionRow = document.createElement("div");
    actionRow.className = "action-row";

    if (user && !kinderwahlVersteckt) {
      const btnEin = document.createElement("button");
      btnEin.textContent = "Ich ministriere";

      if (miniIstBereitsEingetragen) {
        btnEin.disabled = true;
        btnEin.classList.add("disabled");
      } else {
        btnEin.addEventListener("click", () => eintragen(m.id));
      }

      actionRow.appendChild(btnEin);

      const btnAus = document.createElement("button");
      btnAus.textContent = "Austragen";
      btnAus.className = "secondary";

      if (!miniIstBereitsEingetragen) {
        btnAus.disabled = true;
        btnAus.classList.add("disabled");
      } else {
        btnAus.addEventListener("click", () => austragen(m.id));
      }

      actionRow.appendChild(btnAus);
    }

    if (user && istAdmin) {
      const btnDelete = document.createElement("button");
      btnDelete.textContent = "Messe löschen";
      btnDelete.className = "danger";
      btnDelete.addEventListener("click", () => deleteMesse(m.id, m.name || "diese Messe"));
      actionRow.appendChild(btnDelete);
    }

    if (actionRow.children.length > 0) {
      div.appendChild(actionRow);
    }

    liste.appendChild(div);
  });
}

// ---------- Monat wechseln ----------
if (monatSelect) {
  monatSelect.addEventListener("change", () => {
    anzeigen();
  });
}

// ---------- Wenn anderes Kind gewählt wird ----------
if (kindSelect) {
  kindSelect.addEventListener("change", () => {
    anzeigen();
    setTimeout(checkReminder, 200);
  });
}

// ---------- Admin: neue Messe speichern ----------
if (btnCreateMesse) {
  btnCreateMesse.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user || !isAdminUser(user)) return;

    const name = newName ? newName.value.trim() : "";

    if (!name) {
      alert("Bitte Namen der Messe eingeben.");
      return;
    }

    let monat = detectMonthFromName(name);

    if (!monat) {
      monat = monatSelect ? monatSelect.value : "";
    }

    if (!monat) {
      alert("Der Monat konnte nicht erkannt werden.");
      return;
    }

    try {
      await db.collection("messen").add({
        name: name,
        monat: monat,
        teilnehmer: []
      });

      if (newName) {
        newName.value = "";
      }

      showSuccessEffect();
    } catch (error) {
      console.log("Fehler beim Speichern der Messe:", error);
      alert("Fehler beim Speichern der Messe.");
    }
  });
}

// ---------- Admin: Messe löschen ----------
async function deleteMesse(id, name) {
  const user = auth.currentUser;
  if (!user || !isAdminUser(user)) return;

  const confirmDelete = confirm(`Möchtest du "${name}" wirklich löschen?`);
  if (!confirmDelete) return;

  try {
    await db.collection("messen").doc(id).delete();
    showSuccessEffect();
  } catch (error) {
    console.log("Fehler beim Löschen der Messe:", error);
    alert("Fehler beim Löschen der Messe.");
  }
}

// ---------- Statistik ----------
function renderStats() {
  const user = auth.currentUser;
  if (!user) return;
  if (!isAdminUser(user)) return;

  if (!adminStats || !statMessen || !statRot || !statGelb || !statGruen || !kindStats) {
    return;
  }

  const bereinigteMessen = messen.map(m => ({
    ...m,
    teilnehmer: getSaubereTeilnehmer(m.teilnehmer)
  }));

  statMessen.textContent = bereinigteMessen.length;
  statRot.textContent = bereinigteMessen.filter(m => m.teilnehmer.length === 0).length;
  statGelb.textContent = bereinigteMessen.filter(m => m.teilnehmer.length === 1).length;
  statGruen.textContent = bereinigteMessen.filter(m => m.teilnehmer.length >= 2).length;

  const count = {};

  bereinigteMessen.forEach((m) => {
    m.teilnehmer.forEach((n) => {
      count[n] = (count[n] || 0) + 1;
    });
  });

  const sortiert = Object.entries(count).sort((a, b) => b[1] - a[1]);

  if (sortiert.length === 0) {
    kindStats.innerHTML = '<div class="empty-state">Noch keine Einträge im Jahr.</div>';
    return;
  }

  kindStats.innerHTML = sortiert
    .map(([name, anzahl]) => `
      <div class="kind-stat-row">
        <span>${name}</span>
        <strong>${anzahl}x</strong>
      </div>
    `)
    .join("");
}

// ---------- Aktionen ----------
async function eintragen(id) {
  if (!auth.currentUser) return;
  if (sollKinderwahlVerstecken(auth.currentUser)) return;

  const name = getName();
  if (!name) return;

  try {
    await db.collection("messen").doc(id).update({
      teilnehmer: firebase.firestore.FieldValue.arrayUnion(name)
    });

    showSuccessEffect();
    setTimeout(checkReminder, 200);
  } catch (error) {
    console.log("Fehler beim Eintragen:", error);
    alert("Fehler beim Eintragen: " + error.message);
  }
}

async function austragen(id) {
  if (!auth.currentUser) return;
  if (sollKinderwahlVerstecken(auth.currentUser)) return;

  const name = getName();
  if (!name) return;

  try {
    await db.collection("messen").doc(id).update({
      teilnehmer: firebase.firestore.FieldValue.arrayRemove(name)
    });

    showSuccessEffect();
  } catch (error) {
    console.log("Fehler beim Austragen:", error);
    alert("Fehler beim Austragen: " + error.message);
  }
}

// ---------- Dark Mode ----------
if (darkToggle) {
  const mode = localStorage.getItem("darkMode");

  if (mode === "on") {
    document.body.classList.add("dark");
    darkToggle.textContent = "☀️ Light Mode";
  } else {
    darkToggle.textContent = "🌙 Dark Mode";
  }

  darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
      darkToggle.textContent = "☀️ Light Mode";
      localStorage.setItem("darkMode", "on");
    } else {
      darkToggle.textContent = "🌙 Dark Mode";
      localStorage.setItem("darkMode", "off");
    }
  });
}

// ---------- Start ----------
startMessenSubscription();
