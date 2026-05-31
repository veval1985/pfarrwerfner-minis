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
const reminderBox = document.getElementById("reminderBox");

// Admin Create UI
const adminCreateBox = document.getElementById("adminCreateBox");
const newName = document.getElementById("newName");
const newBemerkung = document.getElementById("newBemerkung");
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
  let month = 0;
  let year = new Date().getFullYear();
  let hour = 0;
  let minute = 0;

  const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = parseInt(timeMatch[2], 10);
  }

  const numericMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (numericMatch) {
    day = parseInt(numericMatch[1], 10);
    month = parseInt(numericMatch[2], 10) - 1;
    year = parseInt(numericMatch[3], 10);
    return new Date(year, month, day, hour, minute);
  }

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

// ---------- Monats-Dropdown dynamisch ----------
function syncMonthDropdownWithData() {
  if (!monatSelect) return;

  const monthKeys = [...new Set(
    messen
      .map(m => getMonthKeyForMass(m))
      .filter(Boolean)
  )].sort();

  if (monthKeys.length === 0) {
    const heute = new Date();
    const defaultKey = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}`;

    monatSelect.innerHTML = "";
    const option = document.createElement("option");
    option.value = defaultKey;
    option.textContent =
      new Intl.DateTimeFormat("de-DE", { month: "long" }).format(heute)
        .replace(/^./, c => c.toUpperCase()) +
      " " +
      heute.getFullYear();

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

  if (monthKeys.includes(current) && current !== "") {
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
function checkReminder() {
  const user = auth.currentUser;
  if (!user) {
    if (reminderBox) reminderBox.style.display = "none";
    return;
  }

  if (sollKinderwahlVerstecken(user)) {
    if (reminderBox) reminderBox.style.display = "none";
    return;
  }

  if (!kindSelect || !reminderBox) return;

  const mini = kindSelect.value;
  if (!mini) {
    reminderBox.style.display = "none";
    return;
  }

  const morgen = new Date();
  morgen.setHours(0, 0, 0, 0);
  morgen.setDate(morgen.getDate() + 1);

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

  reminderBox.style.display = matches.length > 0 ? "block" : "none";
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
      checkReminder();
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
      kindSelect.innerHTML = '<option value="">🕯️ Mini auswählen…</option>';
      kindError.style.display = "none";
    } else {
      kindContainer.style.display = "block";
      ladeKinder(user.email);
    }

    adminStats.style.display = istAdmin ? "block" : "none";
    adminCreateBox.style.display = istAdmin ? "block" : "none";
  } else {
    loginStatus.textContent = "Nicht eingeloggt";
    loginForm.style.display = "flex";
    btnLogout.style.display = "none";
    kindContainer.style.display = "none";
    adminStats.style.display = "none";
    adminCreateBox.style.display = "none";
    kindSelect.innerHTML = '<option value="">🕯️ Mini auswählen…</option>';
    kindError.style.display = "none";
    reminderBox.style.display = "none";
  }

  anzeigen();
  renderStats();
  setTimeout(checkReminder, 300);
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

      checkReminder();
    })
    .catch((error) => {
      console.log("Fehler beim Laden der Kinder:", error);
      showMessage("Die Kinder konnten nicht geladen werden.");
    });
}

// ---------- Kind holen ----------
function getName() {
  const name = kindSelect.value;

  if (!name) {
    kindError.style.display = "block";
    return null;
  }

  kindError.style.display = "none";
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
    const aktuellerMini = kindSelect.value;
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
      ${m.bemerkung ? `<div class="bemerkung">ℹ️ ${m.bemerkung}</div>` : ""}
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
      const btnEdit = document.createElement("button");
      btnEdit.textContent = "Bearbeiten";
      btnEdit.className = "secondary";
      btnEdit.addEventListener("click", () => editMesse(m));
      actionRow.appendChild(btnEdit);

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
monatSelect.addEventListener("change", () => {
  anzeigen();
});

// ---------- Wenn anderes Kind gewählt wird ----------
kindSelect.addEventListener("change", () => {
  anzeigen();
  checkReminder();
});

// ---------- Neue Messe speichern ----------
btnCreateMesse.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user || !isAdminUser(user)) return;

  const name = newName.value.trim();
  const bemerkung = newBemerkung.value.trim();

  if (!name) {
    alert("Bitte Namen der Messe eingeben.");
    return;
  }

  let monat = detectMonthFromName(name);
  if (!monat) {
    monat = monatSelect.value || "";
  }

  if (!monat) {
    alert("Der Monat konnte nicht erkannt werden.");
    return;
  }

  try {
    await db.collection("messen").add({
      name: name,
      monat: monat,
      bemerkung: bemerkung || "",
      teilnehmer: []
    });

    newName.value = "";
    newBemerkung.value = "";
    showSuccessEffect();
  } catch (error) {
    console.log("Fehler beim Speichern der Messe:", error);
    alert("Fehler beim Speichern der Messe.");
  }
});

// ---------- Messe bearbeiten ----------
async function editMesse(m) {
  const user = auth.currentUser;
  if (!user || !isAdminUser(user)) return;

  const neuerName = prompt("Messe bearbeiten:", m.name || "");
  if (neuerName === null) return;

  const neueBemerkung = prompt(
    "Zusatzinfo (optional, z. B. Prangertag, Beerdigung, Firmung):",
    m.bemerkung || ""
  );
  if (neueBemerkung === null) return;

  let neuerMonat = detectMonthFromName(neuerName);
  if (!neuerMonat) {
    neuerMonat = getMonthKeyForMass(m);
  }

  try {
    await db.collection("messen").doc(m.id).update({
      name: neuerName.trim(),
      monat: neuerMonat || "",
      bemerkung: (neueBemerkung || "").trim()
    });

    showSuccessEffect();
  } catch (error) {
    console.log("Fehler beim Bearbeiten der Messe:", error);
    alert("Fehler beim Bearbeiten der Messe.");
  }
}

// ---------- Messe löschen ----------
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
  if (!user || !isAdminUser(user)) return;

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
    checkReminder();
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
    checkReminder();
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
