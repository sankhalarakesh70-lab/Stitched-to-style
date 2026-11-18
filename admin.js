
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence
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

// FIREBASE CONFIG
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

const $ = selector => document.querySelector(selector);
const money = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

const status = $("#status");
let auth = null;
let db = null;
let user = null;
let tab = "fabrics";

const cache = {
  fabrics: [],
  products: [],
  offers: []
};

function setStatus(message) {
  if(status) status.textContent=message;
}

function coll() {
  return tab==="fabrics" ? "fabrics" :
         tab==="products" ? "products" : "offers";
}

// FIREBASE INITIALIZATION
try {
  const app=initializeApp(firebaseConfig);
  auth=getAuth(app);
  db=getFirestore(app);

  await setPersistence(auth,browserSessionPersistence);

  onAuthStateChanged(auth,async u=>{
    user=u;

    if(!u) {
      $("#loginPanel")?.classList.remove("hidden");
      $("#adminApp")?.classList.add("hidden");
      setStatus("Please login to access Admin Panel.");
      return;
    }

    setStatus("Checking admin permission…");

    try {
      if(u.uid!==ADMIN_UID) {
        setStatus("This account is not authorized as admin.");
        await signOut(auth);
        return;
      }

      const adminSnapshot=await getDoc(doc(db,"admins",u.uid));

      if(!adminSnapshot.exists()) {
        setStatus("Admin document not found in Firestore. Please add admins/"+u.uid+" as the document ID.");
        await signOut(auth);
        return;
      }

      $("#loginPanel")?.classList.add("hidden");
      $("#adminApp")?.classList.remove("hidden");

      setStatus("Admin verified. Dashboard loaded.");
      await refresh();

    } catch(err) {
      console.error("Admin verification error:",err);
      setStatus("Could not verify admin: "+(err.code||err.message));
      await signOut(auth);
    }
  });

} catch(err) {
  console.error("Firebase setup error:",err);
  setStatus("Firebase setup error: "+err.message);
}

// LOGIN
$("#loginForm")?.addEventListener("submit",async e=>{
  e.preventDefault();

  if(!auth) {
    setStatus("Firebase is not ready. Refresh and try again.");
    return;
  }

  const data=Object.fromEntries(new FormData(e.currentTarget));
  const button=e.currentTarget.querySelector('button[type="submit"]');

  try {
    if(button) {
      button.disabled=true;
      button.textContent="Signing in…";
    }

    setStatus("Signing in…");
    await setPersistence(auth,browserSessionPersistence);

    await signInWithEmailAndPassword(
      auth,
      data.email.trim(),
      data.password
    );

  } catch(err) {
    console.error("Login error:",err);
    setStatus("Login failed: "+(err.code||err.message));
    alert("Login failed: "+(err.code||err.message)+"\n"+err.message);

  } finally {
    if(button) {
      button.disabled=false;
      button.textContent="Sign in";
    }
  }
});

// LOGOUT
$("#logoutBtn")?.addEventListener("click",async()=>{
  if(!confirm("Are you sure you want to logout?")) return;

  try {
    $("#logoutBtn").disabled=true;
    await signOut(auth);
    user=null;
    $("#loginPanel")?.classList.remove("hidden");
    $("#adminApp")?.classList.add("hidden");
    setStatus("Logged out successfully. Admin Panel locked.");
  } catch(err) {
    console.error("Logout error:",err);
    alert("Logout failed: "+err.message);
  } finally {
    $("#logoutBtn").disabled=false;
  }
});

// GET COLLECTION
async function getCollection(name) {
  try {
    const snapshot=await getDocs(collection(db,name));
    return snapshot.docs.map(x=>({id:x.id,...x.data()}));
  } catch(err) {
    console.error("Collection read failed:",name,err);
    return [];
  }
}

// REFRESH DASHBOARD
async function refresh() {
  if(!user || user.uid!==ADMIN_UID) return;

  for(const name of ["fabrics","products","offers"]) {
    cache[name]=await getCollection(name);
  }

  renderList();
  renderOffers();
  renderOrders();
  await loadBrandingAdmin();
}

// TAB SWITCHING
function switchTab(t) {
  tab=t;

  document.querySelectorAll("[data-tab]").forEach(b=>{
    b.classList.toggle("active",b.dataset.tab===t);
  });

  $("#editorPanel")?.classList.toggle(
    "hidden",t==="offers"||t==="orders"||t==="branding"
  );
  $("#offerPanel")?.classList.toggle("hidden",t!=="offers");
  $("#ordersPanel")?.classList.toggle("hidden",t!=="orders");
  $("#brandingPanel")?.classList.toggle("hidden",t!=="branding");

  if($("#listTitle")) {
    $("#listTitle").textContent=t==="fabrics"?"Fabric inventory":"Stitching styles";
  }

  if($("#formTitle")) {
    $("#formTitle").textContent=t==="fabrics"?"Add fabric":"Add stitching style";
  }

  const itemForm=$("#itemForm");
  if(itemForm?.elements.kind) {
    itemForm.elements.kind.value=t;
  }

  const priceLabel=$("#priceLabel");
  if(priceLabel) {
    priceLabel.innerHTML=
      (t==="fabrics"?"Price per metre (₹) *":"Stitching price per outfit (₹) *")+
      '<input name="price" type="number" min="0" step="0.01" required>';
  }

  $("#stockLabel")?.classList.toggle("hidden",t!=="fabrics");
  $("#colourLabel")?.classList.toggle("hidden",t!=="fabrics");

  clearItem();
  renderList();

  if(t==="branding") loadBrandingAdmin();
}

document.querySelectorAll("[data-tab]").forEach(b=>{
  b.addEventListener("click",()=>switchTab(b.dataset.tab));
});

// CLEAR ITEM FORM
function clearItem() {
  const f=$("#itemForm");
  if(!f) return;

  f.reset();

  if(f.elements.id) f.elements.id.value="";
  if(f.elements.kind) f.elements.kind.value=tab;

  if($("#formTitle")) {
    $("#formTitle").textContent=tab==="fabrics"?"Add fabric":"Add stitching style";
  }
}

$("#clearForm")?.addEventListener("click",clearItem);

// RENDER ITEMS
function renderList() {
  const el=$("#adminList");
  if(!el) return;

  const arr=cache[tab]||[];

  el.innerHTML=arr.map(p=>`
    <article class="admin-item">
      <img src="${esc(p.image||"")}" alt="">
      <div>
        <b>${esc(p.name)}</b>
        <small>${esc(p.category||"")}</small>
        <small>
          ${money(p.price)}
          ${tab==="fabrics"
            ? "/ metre · Stock: "+Number(p.stock||0)+" m"
            : "/ outfit"}
        </small>
      </div>
      <div class="actions">
        <button class="btn btn-small" data-edit="${esc(p.id)}">Edit</button>
        <button class="btn btn-small danger" data-delete="${esc(p.id)}">Delete</button>
      </div>
    </article>
  `).join("")||"<p>No items yet. Add your first item above.</p>";

  el.querySelectorAll("[data-edit]").forEach(b=>{
    b.onclick=()=>editItem(arr.find(x=>x.id===b.dataset.edit));
  });

  el.querySelectorAll("[data-delete]").forEach(b=>{
    b.onclick=async()=>{
      if(!confirm("Delete this item?")) return;
      try {
        await deleteDoc(doc(db,tab,b.dataset.delete));
        await refresh();
        setStatus("Item deleted successfully.");
      } catch(err) {
        alert("Delete failed: "+err.message);
      }
    };
  });
}

// EDIT ITEM
function editItem(p) {
  if(!p) return;

  const f=$("#itemForm");
  if(!f) return;

  ["id","name","category","price","stock","colours","description"].forEach(k=>{
    if(f.elements[k]) f.elements[k].value=p[k]??"";
  });

  if(f.elements.imageUrl) f.elements.imageUrl.value=p.image||"";
  if(f.elements.photo) f.elements.photo.value="";

  if($("#formTitle")) $("#formTitle").textContent="Edit: "+p.name;

  $("#editorPanel")?.scrollIntoView({behavior:"smooth"});
}

// CLOUDINARY IMAGE UPLOAD
async function uploadImage(file,folder="stitched-to-style") {
  const fd=new FormData();
  fd.append("file",file);
  fd.append("upload_preset",CLOUDINARY_UPLOAD_PRESET);
  fd.append("folder",folder);

  const res=await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {method:"POST",body:fd}
  );

  const result=await res.json();

  if(!res.ok) {
    throw new Error(result.error?.message||"Image upload failed");
  }

  return result.secure_url;
}

// SAVE ITEM
$("#itemForm")?.addEventListener("submit",async e=>{
  e.preventDefault();

  if(!user||user.uid!==ADMIN_UID) {
    alert("Admin permission required.");
    return;
  }

  const f=e.currentTarget;
  const d=Object.fromEntries(new FormData(f));

  try {
    const saveButton=f.querySelector('button[type="submit"]');
    if(saveButton) {
      saveButton.disabled=true;
      saveButton.textContent="Saving…";
    }

    let image=d.imageUrl||"";
    const file=f.elements.photo?.files?.[0];

    if(file) image=await uploadImage(file);

    const collectionName=tab==="fabrics"?"fabrics":"products";

    const payload={
      name:d.name.trim(),
      category:d.category.trim(),
      price:Number(d.price),
      description:(d.description||"").trim(),
      image,
      updatedAt:serverTimestamp()
    };

    if(tab==="fabrics") {
      payload.stock=Math.max(0,Number(d.stock)||0);
      payload.colours=(d.colours||"").trim();
    }

    if(d.id) {
      await updateDoc(doc(db,collectionName,d.id),payload);
    } else {
      await addDoc(collection(db,collectionName),{
        ...payload,
        createdAt:serverTimestamp()
      });
    }

    clearItem();
    await refresh();
    setStatus("Saved successfully. Public store and gallery updated.");

  } catch(err) {
    console.error("Save item error:",err);
    alert("Could not save: "+err.message);
  } finally {
    const saveButton=f.querySelector('button[type="submit"]');
    if(saveButton) {
      saveButton.disabled=false;
      saveButton.textContent="Save item";
    }
  }
});

// OFFERS FORM
$("#offerForm")?.addEventListener("submit",async e=>{
  e.preventDefault();

  if(!user||user.uid!==ADMIN_UID) return;

  const f=e.currentTarget;
  const d=Object.fromEntries(new FormData(f));

  try {
    const p={
      name:d.name.trim(),
      discountType:d.discountType,
      discountValue:Number(d.discountValue),
      minimumSpend:Number(d.minimumSpend||0),
      maxDiscount:d.maxDiscount===""?null:Number(d.maxDiscount),
      startDate:d.startDate||"",
      endDate:d.endDate||"",
      active:d.active==="true",
      updatedAt:serverTimestamp()
    };

    if(d.id) {
      await updateDoc(doc(db,"offers",d.id),p);
    } else {
      await addDoc(collection(db,"offers"),{
        ...p,
        createdAt:serverTimestamp()
      });
    }

    f.reset();
    if(f.elements.id) f.elements.id.value="";
    if($("#offerTitle")) $("#offerTitle").textContent="Add offer";

    await refresh();
    setStatus("Offer saved successfully.");

  } catch(err) {
    alert("Could not save offer: "+err.message);
  }
});

$("#clearOffer")?.addEventListener("click",()=>{
  $("#offerForm")?.reset();
  if($("#offerForm")?.elements.id) $("#offerForm").elements.id.value="";
  if($("#offerTitle")) $("#offerTitle").textContent="Add offer";
});

// RENDER OFFERS
function renderOffers() {
  const el=$("#offersList");
  if(!el) return;

  el.innerHTML=cache.offers.map(o=>`
    <div class="order-row">
      <b>${esc(o.name)}</b> —
      ${o.discountType==="percent"
        ? Number(o.discountValue)+"%"
        : money(o.discountValue)} off
      <small>
        · ${o.active?"Active":"Inactive"}
        · ${esc(o.startDate||"Any start")}
        to ${esc(o.endDate||"No end")}
      </small>
      <p>
        <button class="btn btn-small" data-offer-edit="${esc(o.id)}">Edit</button>
        <button class="btn btn-small danger" data-offer-delete="${esc(o.id)}">Delete</button>
      </p>
    </div>
  `).join("")||"<p>No offers added yet.</p>";

  el.querySelectorAll("[data-offer-edit]").forEach(b=>{
    b.onclick=()=>{
      const o=cache.offers.find(x=>x.id===b.dataset.offerEdit);
      if(!o) return;

      const f=$("#offerForm");
      ["id","name","discountType","discountValue","minimumSpend","maxDiscount","startDate","endDate"].forEach(k=>{
        if(f.elements[k]) f.elements[k].value=o[k]??"";
      });

      if(f.elements.active) f.elements.active.value=String(o.active!==false);
      if($("#offerTitle")) $("#offerTitle").textContent="Edit offer";
      $("#offerPanel")?.scrollIntoView({behavior:"smooth"});
    };
  });

  el.querySelectorAll("[data-offer-delete]").forEach(b=>{
    b.onclick=async()=>{
      if(!confirm("Delete this offer?")) return;
      try {
        await deleteDoc(doc(db,"offers",b.dataset.offerDelete));
        await refresh();
        setStatus("Offer deleted.");
      } catch(err) {
        alert("Could not delete offer: "+err.message);
      }
    };
  });
}

// WEBSITE LOGO / BRANDING
async function loadBrandingAdmin() {
  try {
    const snap=await getDoc(doc(db,"siteSettings","branding"));
    const url=snap.exists()?(snap.data().logoUrl||""):"";
    const img=$("#logoPreview");
    if(!img) return;

    if(url) {
      img.src=url;
      img.classList.remove("hidden");
    } else {
      img.removeAttribute("src");
      img.classList.add("hidden");
    }
  } catch(err) {
    console.warn("Branding load failed",err);
  }
}

// UPLOAD LOGO
$("#brandingForm")?.addEventListener("submit",async e=>{
  e.preventDefault();

  if(!user||user.uid!==ADMIN_UID) return;

  const form=e.currentTarget;
  const file=form.elements.logoFile?.files?.[0];

  if(!file) {
    alert("कृपया पहले PNG या JPG logo चुनें।");
    return;
  }

  if(!["image/png","image/jpeg"].includes(file.type)) {
    alert("केवल PNG या JPG logo upload करें।");
    return;
  }

  try {
    setStatus("Logo uploading…");

    const url=await uploadImage(file,"stitched-to-style/branding");

    await setDoc(
      doc(db,"siteSettings","branding"),
      {logoUrl:url,updatedAt:serverTimestamp()},
      {merge:true}
    );

    const preview=$("#logoPreview");
    if(preview) {
      preview.src=url;
      preview.classList.remove("hidden");
    }

    // Guarded form reset
    if(form && typeof form.reset==="function") form.reset();

    setStatus("Logo saved. Public website updated.");
    alert("Logo successfully save ho gaya. Website refresh karke check karein.");

  } catch(err) {
    console.error("Logo upload error:",err);
    setStatus("Logo save nahi hua.");
    alert("Logo save nahi hua: "+err.message);
  }
});

// REMOVE LOGO
$("#removeLogo")?.addEventListener("click",async()=>{
  if(!user||user.uid!==ADMIN_UID) return;

  if(!confirm("क्या आप website से logo हटाना चाहते हैं?")) return;

  try {
    await setDoc(
      doc(db,"siteSettings","branding"),
      {logoUrl:"",updatedAt:serverTimestamp()},
      {merge:true}
    );

    const preview=$("#logoPreview");
    if(preview) {
      preview.removeAttribute("src");
      preview.classList.add("hidden");
    }

    setStatus("Logo removed. Default brand mark restored.");

  } catch(err) {
    alert("Logo remove nahi hua: "+err.message);
  }
});

// ORDERS INFORMATION
function renderOrders() {
  const el=$("#ordersList");
  if(!el) return;

  el.innerHTML=`
    <div class="order-row">
      <b>WhatsApp Order Process</b>
      <p>Customers send their complete Fabric + Stitching order through WhatsApp. Order history is not automatically saved in this Admin Panel.</p>
      <p>₹99 confirmation and payment arrangements are discussed directly with the customer. Please verify payment manually before confirming an order.</p>
    </div>
  `;
}
