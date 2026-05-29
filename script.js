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

// ---------- Monat aus Datumsstring ableiten ----------
function detectMonthFromName(name) {
  const text = String(name || "");
  const match = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);

  if (!match) return null;

  const month = match[2].padStart(2, "0");
  const year = match[3];
  return `${year}-${month}`;
}

// ---------- Datum/Uhrzeit aus Name lesen ----------
function parseDateTimeFromName(name, monatFallback) {
  const text = String(name || "");

  let dateMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  let timeMatch = text.match(/(\d{1,2}):(\d{2})/);

  let day = 1;
  let month = 0;
  let year = new Date().getFullYear();
  let hour = 0;
  let minute = 0;

  if (dateMatch) {
    day = parseInt(dateMatch[1], 10);
    month = parseInt(dateMatch[2], 10) - 1;
    year = parseInt(dateMatch[3], 10);
  } else {
    if (monatFallback) {
      const parts = String(monatFallback).split("-");
      if (parts.length === 2) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
      }
    }

    const shortMatch = text.match(/(\d{1,2})\.(\d{1,2})/);
    if (shortMatch) {
      day = parseInt(shortMatch[1], 10);
      month = parseInt(shortMatch[2], 10) - 1;
    }
  }

  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = parseInt(timeMatch[2], 10);
  }

  return new Date(year, month, day, hour, minute);
}

// ---------- Schönes Datum anzeigen ----------
function formatDisplayDate(name, monatFallback) {
  if (!name) return "";

  const match = name.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);

  if (!match) return name;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // ✅ wichtig
  const year = parseInt(match[3], 10);

  const timeMatch = name.match(/(\d{1,2}):(\d{2})/);
  let hour = 0;
  let minute = 0;

  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = parseInt(timeMatch[2], 10);
  }

  const dateObj = new Date(year, month, day, hour, minute);

  const weekday = new Intl.DateTimeFormat("de-DE", {
    weekday: "short"
  }).format(dateObj);

  const formattedDate = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long"
  }).format(dateObj);

  if (timeMatch) {
    const time = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(dateObj);

    return `${weekday}, ${formattedDate} – ${time} Uhr`;
  }

  return `${weekday}, ${formattedDate}`;
}

// ---------- Teilnehmer bereinigen ----------
function getSaubereTeilnehmer(teilnehmerRaw) {
  return Array.isArray(teilnehmerRaw)
    ? teilnehmerRaw.filter(name => name && name.trim() !== "")
    : [];
}

// ---------- Teilnehmerliste rendern ----------
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

  const currentValue = monatSelect.value;
  if (currentValue) return;

  const heute = new Date();
  const yyyy = heute.getFullYear();
  const mm = String(heute.getMonth() + 1).padStart(2, "0");
  const defaultKey = `${yyyy}-${mm}`;

  const exists = Array.from(monatSelect.options).some(opt => opt.value === defaultKey);
  if (exists) {
    monatSelect.value = defaultKey;
  } else if (monatSelect.options.length > 0) {
    monatSelect.selectedIndex = 0;
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
    return normalizeMonthKey(m.monat) === selectedMonth;
  });

  gefiltert = gefiltert.sort((a, b) => {
    const dateA = parseDateTimeFromName(a.name, a.monat).getTime();
    const dateB = parseDateTimeFromName(b.name, b.monat).getTime();
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
      <div class="card-title">${formatDisplayDate(m.name, m.monat)}</div>
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
setDefaultMonthIfNeeded();
startMessenSubscription();
