
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDfiy2YoxH-__zEl51Vaw5I4Btc9JyErvM",
  authDomain: "stitched-to-style.firebaseapp.com",
  projectId: "stitched-to-style",
  storageBucket: "stitched-to-style.firebasestorage.app",
  messagingSenderId: "992747942040",
  appId: "1:992747942040:web:532f1c271b9cba3d3360ed",
  measurementId: "G-TK2DNGJQ8Y"
};

const CLOUDINARY_CLOUD_NAME = "mqizferj";
const CLOUDINARY_UPLOAD_PRESET = "stitched_gallery";
const ADMIN_UID = "p0c8oSUUhrT4bJbpima4CtvhRff2";

const status = document.querySelector("#status");
const $ = selector => document.querySelector(selector);

const money = n =>
  "₹" + Number(n || 0).toLocaleString("en-IN");

const esc = s =>
  String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

let auth;
let db;
let user;
let tab = "fabrics";

let cache = {
  fabrics: [],
  products: [],
  offers: []
};

const coll = () =>
  tab === "fabrics" ? "fabrics" :
  tab === "products" ? "products" : "offers";

// ---------------- FIREBASE INITIALIZATION ----------------

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, async u => {
    user = u;

    if (!u) {
      $("#loginPanel").classList.remove("hidden");
      $("#adminApp").classList.add("hidden");
      return;
    }

    status.textContent = "Checking admin permission…";

    try {
      if (u.uid !== ADMIN_UID) {
        status.textContent = "This account is not authorized as admin.";
        await signOut(auth);
        return;
      }

      const adminSnapshot = await getDoc(
        doc(db, "admins", u.uid)
      );

      if (!adminSnapshot.exists()) {
        status.textContent =
          "Admin document not found in Firestore. Please add admins/" +
          u.uid + " as the document ID.";

        await signOut(auth);
        return;
      }

      $("#loginPanel").classList.add("hidden");
      $("#adminApp").classList.remove("hidden");

      status.textContent = "Admin verified. Dashboard loaded.";

      await refresh();

    } catch (err) {
      console.error("Admin verification error:", err);

      status.textContent =
        "Could not verify admin: " +
        (err.code || err.message);

      await signOut(auth);
    }
  });

} catch (err) {
  console.error("Firebase setup error:", err);

  if (status) {
    status.textContent = "Firebase setup error: " + err.message;
  }
}

// ---------------- LOGIN ----------------

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const data = Object.fromEntries(
    new FormData(e.currentTarget)
  );

  const button = e.currentTarget.querySelector(
    'button[type="submit"]'
  );

  try {
    button.disabled = true;
    button.textContent = "Signing in…";
    status.textContent = "Signing in…";

    await setPersistence(auth, browserLocalPersistence);

    await signInWithEmailAndPassword(
      auth,
      data.email.trim(),
      data.password
    );

  } catch (err) {
    console.error("Login error:", err);

    status.textContent =
      "Login failed: " + (err.code || err.message);

    alert(
      "Login failed: " +
      (err.code || err.message) +
      "\n" + err.message
    );

  } finally {
    button.disabled = false;
    button.textContent = "Sign in";
  }
});

// ---------------- GET COLLECTION ----------------

async function getCollection(name) {
  try {
    const snapshot = await getDocs(collection(db, name));

    return snapshot.docs.map(x => ({
      id: x.id,
      ...x.data()
    }));

  } catch (err) {
    console.error(err);
    return [];
  }
}

// ---------------- REFRESH ----------------

async function refresh() {
  for (const name of ["fabrics", "products", "offers"]) {
    cache[name] = await getCollection(name);
  }

  renderList();
  renderOffers();
  renderOrders();

  await loadBrandingAdmin();
}

// ---------------- TAB SWITCHING ----------------

function switchTab(t) {
  tab = t;

  document.querySelectorAll("[data-tab]").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === t);
  });

  $("#editorPanel").classList.toggle(
    "hidden",
    t === "offers" || t === "orders" || t === "branding"
  );

  $("#offerPanel").classList.toggle("hidden", t !== "offers");
  $("#ordersPanel").classList.toggle("hidden", t !== "orders");
  $("#brandingPanel").classList.toggle("hidden", t !== "branding");

  $("#listTitle").textContent =
    t === "fabrics" ? "Fabric inventory" : "Stitching styles";

  $("#formTitle").textContent =
    t === "fabrics" ? "Add fabric" : "Add stitching style";

  $("#itemForm").elements.kind.value = t;

  $("#priceLabel").innerHTML =
    (t === "fabrics"
      ? "Price per metre (₹) *"
      : "Stitching price per outfit (₹) *") +
    '<input name="price" type="number" min="0" step="0.01" required>';

  $("#stockLabel").classList.toggle("hidden", t !== "fabrics");
  $("#colourLabel").classList.toggle("hidden", t !== "fabrics");

  clearItem();
  renderList();

  if (t === "branding") {
    loadBrandingAdmin();
  }
}

document.querySelectorAll("[data-tab]").forEach(b => {
  b.addEventListener("click", () => switchTab(b.dataset.tab));
});

// ---------------- CLEAR ITEM FORM ----------------

function clearItem() {
  $("#itemForm").reset();
  $("#itemForm").elements.id.value = "";
  $("#itemForm").elements.kind.value =
    tab === "products" ? "products" : "fabrics";

  $("#formTitle").textContent =
    tab === "fabrics" ? "Add fabric" : "Add stitching style";
}

$("#clearForm").addEventListener("click", clearItem);

// ---------------- RENDER ITEMS ----------------

function renderList() {
  const arr = cache[tab] || [];

  $("#adminList").innerHTML = arr.map(p => `
    <article class="admin-item">
      <img src="${esc(p.image || "")}" alt="">
      <div>
        <b>${esc(p.name)}</b>
        <small>${esc(p.category || "")}</small>
        <small>
          ${money(p.price)}
          ${tab === "fabrics"
            ? "/ metre · Stock: " + Number(p.stock || 0) + " m"
            : "/ outfit"}
        </small>
      </div>
      <div class="actions">
        <button class="btn btn-small" data-edit="${esc(p.id)}">Edit</button>
        <button class="btn btn-small danger" data-delete="${esc(p.id)}">Delete</button>
      </div>
    </article>
  `).join("") || "<p>No items yet. Add your first item above.</p>";

  $("#adminList").querySelectorAll("[data-edit]").forEach(b => {
    b.onclick = () => {
      editItem(arr.find(x => x.id === b.dataset.edit));
    };
  });

  $("#adminList").querySelectorAll("[data-delete]").forEach(b => {
    b.onclick = async () => {
      if (confirm("Delete this item?")) {
        await deleteDoc(doc(db, tab, b.dataset.delete));
        await refresh();
      }
    };
  });
}

// ---------------- EDIT ITEM ----------------

function editItem(p) {
  const f = $("#itemForm");

  ["id", "name", "category", "price", "stock",
   "colours", "description"].forEach(k => {
    if (f.elements[k]) {
      f.elements[k].value = p[k] ?? "";
    }
  });

  f.elements.imageUrl.value = p.image || "";
  f.elements.photo.value = "";

  $("#formTitle").textContent = "Edit: " + p.name;

  $("#editorPanel").scrollIntoView({
    behavior: "smooth"
  });
}

// ---------------- SAVE ITEM ----------------

$("#itemForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!user || user.uid !== ADMIN_UID) return;

  const f = e.currentTarget;
  const d = Object.fromEntries(new FormData(f));

  try {
    let image = d.imageUrl || "";
    const file = f.elements.photo.files[0];

    if (file) {
      const fd = new FormData();

      fd.append("file", file);
      fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      fd.append("folder", "stitched-to-style");

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: fd
        }
      );

      const r = await res.json();

      if (!res.ok) {
        throw new Error(r.error?.message || "Photo upload failed");
      }

      image = r.secure_url;
    }

    const name = tab === "fabrics" ? "fabrics" : "products";

    const payload = {
      name: d.name.trim(),
      category: d.category.trim(),
      price: Number(d.price),
      description: (d.description || "").trim(),
      image,
      updatedAt: serverTimestamp()
    };

    if (tab === "fabrics") {
      payload.stock = Math.max(0, Number(d.stock) || 0);
      payload.colours = (d.colours || "").trim();
    }

    if (d.id) {
      await updateDoc(doc(db, name, d.id), payload);
    } else {
      await addDoc(collection(db, name), {
        ...payload,
        createdAt: serverTimestamp()
      });
    }

    clearItem();
    await refresh();

    status.textContent = "Saved successfully. Public store updated.";

  } catch (err) {
    alert("Could not save: " + err.message);
  }
});

// ---------------- OFFERS FORM ----------------

$("#offerForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!user || user.uid !== ADMIN_UID) return;

  const f = e.currentTarget;
  const d = Object.fromEntries(new FormData(f));

  try {
    const p = {
      name: d.name.trim(),
      discountType: d.discountType,
      discountValue: Number(d.discountValue),
      minimumSpend: Number(d.minimumSpend || 0),
      maxDiscount: d.maxDiscount === "" ? null : Number(d.maxDiscount),
      startDate: d.startDate || "",
      endDate: d.endDate || "",
      active: d.active === "true",
      updatedAt: serverTimestamp()
    };

    if (d.id) {
      await updateDoc(doc(db, "offers", d.id), p);
    } else {
      await addDoc(collection(db, "offers"), {
        ...p,
        createdAt: serverTimestamp()
      });
    }

    f.reset();
    f.elements.id.value = "";

    await refresh();

    status.textContent =
      "Offer saved. Public order estimate will use it during active dates.";

  } catch (err) {
    alert("Could not save offer: " + err.message);
  }
});

$("#clearOffer").addEventListener("click", () => {
  $("#offerForm").reset();
  $("#offerForm").elements.id.value = "";
});

// ---------------- RENDER OFFERS ----------------

function renderOffers() {
  $("#offersList").innerHTML = cache.offers.map(o => `
    <div class="order-row">
      <b>${esc(o.name)}</b> —
      ${o.discountType === "percent"
        ? Number(o.discountValue) + "%"
        : money(o.discountValue)} off
      <small>
        · ${o.active ? "Active" : "Inactive"}
        · ${esc(o.startDate || "Any start")}
        to ${esc(o.endDate || "No end")}
      </small>
      <p>
        <button class="btn btn-small" data-offer-edit="${esc(o.id)}">Edit</button>
        <button class="btn btn-small danger" data-offer-delete="${esc(o.id)}">Delete</button>
      </p>
    </div>
  `).join("") || "<p>No offers added yet.</p>";

  $("#offersList").querySelectorAll("[data-offer-edit]").forEach(b => {
    b.onclick = () => {
      const o = cache.offers.find(x => x.id === b.dataset.offerEdit);
      const f = $("#offerForm");

      ["id", "name", "discountType", "discountValue",
       "minimumSpend", "maxDiscount", "startDate", "endDate"]
        .forEach(k => {
          if (f.elements[k]) {
            f.elements[k].value = o[k] ?? "";
          }
        });

      f.elements.active.value = String(o.active !== false);
      $("#offerTitle").textContent = "Edit offer";
    };
  });

  $("#offersList").querySelectorAll("[data-offer-delete]").forEach(b => {
    b.onclick = async () => {
      if (confirm("Delete this offer?")) {
        await deleteDoc(doc(db, "offers", b.dataset.offerDelete));
        await refresh();
      }
    };
  });
}

// ---------------- WEBSITE LOGO / BRANDING ----------------

async function loadBrandingAdmin() {
  try {
    const snap = await getDoc(doc(db, "siteSettings", "branding"));
    const url = snap.exists() ? (snap.data().logoUrl || "") : "";
    const img = $("#logoPreview");

    if (url) {
      img.src = url;
      img.classList.remove("hidden");
    } else {
      img.removeAttribute("src");
      img.classList.add("hidden");
    }

  } catch (e) {
    console.warn("Branding load failed", e);
  }
}

// ---------------- UPLOAD LOGO ----------------

$("#brandingForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!user || user.uid !== ADMIN_UID) return;

  const file = e.currentTarget.elements.logoFile.files[0];

  if (!file) {
    alert("कृपया पहले PNG या JPG logo चुनें।");
    return;
  }

  if (!["image/png", "image/jpeg"].includes(file.type)) {
    alert("केवल PNG या JPG logo upload करें।");
    return;
  }

  try {
    status.textContent = "Logo uploading…";

    const fd = new FormData();

    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    fd.append("folder", "stitched-to-style/branding");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: fd
      }
    );

    const r = await res.json();

    if (!res.ok) {
      throw new Error(r.error?.message || "Logo upload failed");
    }

    await setDoc(
      doc(db, "siteSettings", "branding"),
      {
        logoUrl: r.secure_url,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    $("#logoPreview").src = r.secure_url;
    $("#logoPreview").classList.remove("hidden");

    e.currentTarget.reset();

    status.textContent = "Logo saved. Public website updated.";

    alert("Logo successfully save ho gaya. Website refresh karke check karein.");

  } catch (err) {
    status.textContent = "Logo save nahi hua.";
    alert("Logo save nahi hua: " + err.message);
  }
});

// ---------------- REMOVE LOGO ----------------

$("#removeLogo").addEventListener("click", async () => {
  if (!user || user.uid !== ADMIN_UID) return;

  if (!confirm("क्या आप website से logo हटाना चाहते हैं?")) {
    return;
  }

  try {
    await setDoc(
      doc(db, "siteSettings", "branding"),
      {
        logoUrl: "",
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    $("#logoPreview").removeAttribute("src");
    $("#logoPreview").classList.add("hidden");

    status.textContent = "Logo removed. Default brand mark restored.";

  } catch (e) {
    alert("Logo remove nahi hua: " + e.message);
  }
});

// ---------------- ORDERS ----------------

function renderOrders() {
  $("#ordersList").innerHTML = `
    <p>
      Order history is not automatically recorded from WhatsApp.
      WhatsApp is used to send the customer's prepared order message;
      order confirmation and payment are handled with the customer in chat.
    </p>
  `;
}
