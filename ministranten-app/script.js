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

// ---------- Utils ----------
function isAdminUser(user) {
  return user && adminEmails.includes(user.email.toLowerCase());
}

function sollKinderwahlVerstecken(user) {
  return user && adminsOhneKinderwahl.includes(user.email.toLowerCase());
}

function getSaubereTeilnehmer(arr) {
  return Array.isArray(arr) ? arr.filter(x => x) : [];
}

// ---------- Anzeige ----------
function anzeigen() {
  liste.innerHTML = "";

  const selectedMonth = monatSelect.value;

  let gefiltert = messen.filter(m => m.monat === selectedMonth);

  if (gefiltert.length === 0) {
    liste.innerHTML = '<div class="empty-state">Für diesen Monat sind noch keine Gottesdienste eingetragen.</div>';
    return;
  }

  gefiltert.forEach(m => {

    const teilnehmer = getSaubereTeilnehmer(m.teilnehmer);
    const aktuellerMini = kindSelect ? kindSelect.value : "";
    const eingetragen = aktuellerMini && teilnehmer.includes(aktuellerMini);

    const div = document.createElement("div");
    div.className = "card";

    // STATUS
    if (teilnehmer.length === 0) {
      div.classList.add("rot");
    } else if (teilnehmer.length === 1) {
      div.classList.add("gelb");
    } else {
      div.classList.add("gruen");
    }

    let warnung = "";
    if (teilnehmer.length === 0) {
      warnung = '<div class="warnung">🚨 Noch kein Ministrant!</div>';
    }

    div.innerHTML = `
      <div class="card-title">${m.name}</div>
      <div>👥 ${teilnehmer.length}</div>
      <div>${teilnehmer.join("<br>")}</div>
      ${warnung}
    `;

    const user = auth.currentUser;

    if (user && !sollKinderwahlVerstecken(user)) {

      const btnEin = document.createElement("button");
      btnEin.textContent = "Ich ministriere";

      if (eingetragen) {
        btnEin.disabled = true;
      } else {
        btnEin.onclick = () => eintragen(m.id);
      }

      const btnAus = document.createElement("button");
      btnAus.textContent = "Austragen";
      btnAus.className = "secondary";

      if (!eingetragen) {
        btnAus.disabled = true;
      } else {
        btnAus.onclick = () => austragen(m.id);
      }

      div.appendChild(btnEin);
      div.appendChild(btnAus);
    }

    if (user && isAdminUser(user)) {

      const del = document.createElement("button");
      del.textContent = "Messe löschen";
      del.className = "danger";
      del.onclick = () => deleteMesse(m.id);

      div.appendChild(del);
    }

    liste.appendChild(div);
  });
}

// ---------- Firebase ----------
db.collection("messen").onSnapshot(snapshot => {
  messen = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  anzeigen();
});

// ---------- Login ----------
btnLogin.onclick = () => {
  auth.signInWithEmailAndPassword(
    document.getElementById("email").value,
    document.getElementById("password").value
  );
};

btnLogout.onclick = () => auth.signOut();

// ---------- Auth ----------
auth.onAuthStateChanged(user => {

  if (user) {
    loginStatus.innerText = "Eingeloggt: " + user.email;
    loginForm.style.display = "none";
    btnLogout.style.display = "inline-block";

    if (isAdminUser(user)) {
      adminCreateBox.style.display = "block";
    }

    if (!sollKinderwahlVerstecken(user)) {
      kindContainer.style.display = "block";

      ladeKinder(user.email);
    }

  } else {
    loginForm.style.display = "flex";
    btnLogout.style.display = "none";
    adminCreateBox.style.display = "none";
    kindContainer.style.display = "none";
  }

  anzeigen();
});

// ---------- Kinder ----------
function ladeKinder(email) {
  db.collection("kinder")
    .where("eltern", "==", email)
    .get()
    .then(snap => {

      kindSelect.innerHTML = '<option value="">👶 Mini auswählen…</option>';

      snap.forEach(doc => {
        const o = document.createElement("option");
        o.value = doc.data().name;
        o.innerText = doc.data().name;
        kindSelect.appendChild(o);
      });
    });
}

// ---------- Aktionen ----------
async function eintragen(id) {
  const name = kindSelect.value;

  if (!name) {
    alert("Bitte Mini auswählen");
    return;
  }

  await db.collection("messen").doc(id).update({
    teilnehmer: firebase.firestore.FieldValue.arrayUnion(name)
  });
}

async function austragen(id) {
  const name = kindSelect.value;

  if (!name) return;

  await db.collection("messen").doc(id).update({
    teilnehmer: firebase.firestore.FieldValue.arrayRemove(name)
  });
}

async function deleteMesse(id) {
  if (!confirm("Wirklich löschen?")) return;
  await db.collection("messen").doc(id).delete();
}

btnCreateMesse.onclick = async () => {

  const name = newName.value.trim();

  if (!name) {
    alert("Bitte Namen eingeben");
    return;
  }

  // ✅ Monat direkt aus Datum erkennen
  let monat = "";

  const match = name.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);

  if (match) {
    const month = match[2].padStart(2, "0");
    const year = match[3];
    monat = `${year}-${month}`;
  } else {
    // Fallback falls kein Datum erkannt
    monat = monatSelect.value;
  }

  await db.collection("messen").add({
    name,
    monat,
    teilnehmer: []
  });

  newName.value = "";
};
// ---------- Dark Mode ----------
darkToggle.onclick = () => {
  document.body.classList.toggle("dark");
};

// ---------- Start ----------
const heute = new Date();
const yyyy = heute.getFullYear();
const mm = String(heute.getMonth() + 1).padStart(2, '0');

monatSelect.value = `${yyyy}-${mm}`;
