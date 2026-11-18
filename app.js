
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, query, orderBy, doc, getDoc
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

const WHATSAPP = "917340087181";
let db = null;
let fabrics = [];
let styles = [];
let offers = [];
let activeFabricCategory = "All";
let activeStyleCategory = "All";

const demoFabrics = [
  {id:"df1",name:"Rose Floral Cotton",category:"Cotton",price:180,stock:80,colours:"Rose, White, Green",description:"Breathable printed cotton for everyday wear.",image:"https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=900&q=80"},
  {id:"df2",name:"Royal Purple Silk Blend",category:"Silk",price:420,stock:35,colours:"Purple, Wine",description:"Elegant silk-blend fabric for festive outfits.",image:"https://images.unsplash.com/photo-1604881988758-f76ad2f7aac1?auto=format&fit=crop&w=900&q=80"},
  {id:"df3",name:"Classic Suit Fabric",category:"Suit Material",price:260,stock:60,colours:"Blue, Beige, Black",description:"Versatile fabric for suits and kurtis.",image:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80"}
];

const demoStyles = [
  {id:"ds1",name:"Everyday Kurti",category:"Kurtis",price:450,description:"Comfortable custom-stitched everyday kurti.",image:"https://images.unsplash.com/photo-1583391733956-6c78276477e3?auto=format&fit=crop&w=900&q=80"},
  {id:"ds2",name:"Festive Anarkali Suit",category:"Suits",price:1200,description:"A graceful festive silhouette, tailored to your fit.",image:"https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80"},
  {id:"ds3",name:"Occasion Dress",category:"Dresses",price:1500,description:"A special-occasion style stitched for you.",image:"https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80"}
];

const money = n => "₹" + Math.max(0, Number(n)||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const attr = esc;
const today = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
};

try {
  db = getFirestore(initializeApp(firebaseConfig));
} catch(e) {
  console.warn("Firebase unavailable",e);
}

async function readCollection(name, sortField="createdAt") {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db,name),orderBy(sortField,"desc")));
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch(e) {
    console.warn("Could not load "+name,e);
    try {
      const snap = await getDocs(collection(db,name));
      return snap.docs.map(d=>({id:d.id,...d.data()}));
    } catch(err) {
      console.warn("Collection fallback failed",err);
      return [];
    }
  }
}

async function loadBranding() {
  if (!db) return;
  try {
    const snap = await getDoc(doc(db,"siteSettings","branding"));
    if (!snap.exists()) return;
    const logo = snap.data().logoUrl || "";
    if (!logo) return;

    ["siteLogo","siteLogoFooter"].forEach(id=>{
      const img=document.getElementById(id);
      if(img){img.src=logo;img.classList.remove("hidden");}
    });
    ["brandFallback","brandFallbackFooter"].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.classList.add("hidden");
    });
  } catch(e) {
    console.warn("Could not load brand logo",e);
  }
}

async function load() {
  const [f,s,o] = await Promise.all([
    readCollection("fabrics"),
    readCollection("products"),
    readCollection("offers")
  ]);

  fabrics = f.length ? f : demoFabrics;
  styles = s.length ? s : demoStyles;
  offers = o.filter(x=>
    x.active !== false &&
    (!x.startDate || x.startDate <= today()) &&
    (!x.endDate || x.endDate >= today())
  );

  renderFilters("fabric");
  renderFilters("style");
  renderCards("fabric");
  renderCards("style");
  fillSelects();
  renderGallery();
  calculate();
}

function renderFilters(type) {
  const data = type==="fabric" ? fabrics : styles;
  const active = type==="fabric" ? activeFabricCategory : activeStyleCategory;
  const el = document.querySelector(type==="fabric" ? "#fabricFilters" : "#styleFilters");
  if (!el) return;

  const cats = ["All",...new Set(data.map(p=>p.category).filter(Boolean))];
  el.innerHTML = cats.map(c=>
    `<button type="button" class="filter ${c===active?'active':''}" data-cat="${attr(c)}">${esc(c)}</button>`
  ).join("");

  el.querySelectorAll("button").forEach(b=>{
    b.onclick=()=>{
      if(type==="fabric") activeFabricCategory=b.dataset.cat;
      else activeStyleCategory=b.dataset.cat;
      renderFilters(type);
      renderCards(type);
    };
  });
}

function card(p,type) {
  const price = Number(p.price)||0;
  const unit = type==="fabric" ? "/ metre" : "starting";
  return `
    <article class="product-card">
      <div class="product-image">
        <img src="${attr(p.image||"")}" alt="${attr(p.name)}" loading="lazy" onerror="this.style.opacity='.12'">
        <span class="product-category">${esc(p.category||(type==="fabric"?"Fabric":"Style"))}</span>
      </div>
      <div class="product-info">
        <div>
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.description||"")}${type==="fabric"&&p.colours?`<br><b>Colours:</b> ${esc(p.colours)}`:""}</p>
        </div>
        <div class="price">${money(price)}<small style="display:block;font-size:10px;color:#776d85;font-weight:500">${unit}</small></div>
      </div>
      <button type="button" class="card-book" data-choose="${type}" data-id="${attr(p.id)}">Choose ${type==="fabric"?"fabric":"style"} ↗</button>
    </article>`;
}

function renderCards(type) {
  const data = type==="fabric" ? fabrics : styles;
  const active = type==="fabric" ? activeFabricCategory : activeStyleCategory;
  const el = document.querySelector(type==="fabric" ? "#fabricsGrid" : "#stylesGrid");
  if (!el) return;

  const items = data.filter(p=>active==="All"||p.category===active);
  el.innerHTML = items.length
    ? items.map(p=>card(p,type)).join("")
    : `<div class="empty">No ${type==="fabric"?"fabrics":"stitching styles"} listed right now. Please check back soon.</div>`;

  el.querySelectorAll("[data-choose]").forEach(b=>{
    b.onclick=()=>{
      if(b.dataset.choose==="fabric") {
        document.querySelector("#fabricSelect").value=b.dataset.id;
      } else {
        document.querySelector("#styleSelect").value=b.dataset.id;
      }
      calculate();
      document.querySelector("#order").scrollIntoView({behavior:"smooth"});
    };
  });
}

function fillSelects() {
  const fs=document.querySelector("#fabricSelect");
  const ss=document.querySelector("#styleSelect");
  if (!fs || !ss) return;

  fs.innerHTML='<option value="">Choose fabric</option>'+
    fabrics.map(p=>`<option value="${attr(p.id)}">${esc(p.name)} — ${money(p.price)}/m</option>`).join("");

  ss.innerHTML='<option value="">Choose a style</option>'+
    styles.map(p=>`<option value="${attr(p.id)}">${esc(p.name)} — ${money(p.price)}</option>`).join("");
}

function activeOffers() {
  return offers;
}

function getEstimate() {
  const form=document.querySelector("#orderForm");
  if(!form) return {fabricTotal:0,stitchTotal:0,discount:0,total:0};

  const fabric=fabrics.find(p=>p.id===form.elements.fabricId.value);
  const style=styles.find(p=>p.id===form.elements.styleId.value);
  const metres=Math.max(0,Number(form.elements.metres.value)||0);

  const fabricTotal=fabric ? Number(fabric.price||0)*metres : 0;
  const stitchTotal=style ? Number(style.price||0) : 0;
  const subtotal=fabricTotal+stitchTotal;

  let discount=0;
  activeOffers().forEach(o=>{
    const min=Number(o.minimumSpend||0);
    if(subtotal>=min) {
      let value=o.discountType==="percent"
        ? subtotal*Number(o.discountValue||0)/100
        : Number(o.discountValue||0);
      if(o.maxDiscount) value=Math.min(value,Number(o.maxDiscount));
      discount=Math.max(discount,value);
    }
  });

  discount=Math.min(discount,subtotal);
  return {fabricTotal,stitchTotal,discount,total:Math.max(0,subtotal-discount)};
}

function calculate() {
  const result=getEstimate();
  const set=(id,value)=>{
    const el=document.querySelector(id);
    if(el)el.textContent=value;
  };
  set("#fabricEstimate",money(result.fabricTotal));
  set("#stitchEstimate",money(result.stitchTotal));
  set("#discountEstimate","-"+money(result.discount));
  set("#totalEstimate",money(result.total));
}

function renderGallery() {
  const track=document.querySelector("#galleryTrack");
  if(!track) return;

  const galleryItems=styles.filter(p=>p.image);
  if(!galleryItems.length) {
    track.innerHTML='<div class="empty">Gallery images will appear here when stitching styles are added in Owner Admin.</div>';
    track.style.animation="none";
    return;
  }

  const makeItems=()=>galleryItems.map(p=>`
    <button type="button" class="gallery-item" data-gallery-image="${attr(p.image)}" data-gallery-name="${attr(p.name)}" aria-label="View ${attr(p.name)}">
      <img src="${attr(p.image)}" alt="${attr(p.name)}" loading="lazy">
      <span class="gallery-caption">${esc(p.name)}</span>
    </button>
  `).join("");

  const html=makeItems();
  track.innerHTML=html+html;
  track.querySelectorAll("[data-gallery-image]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      openLightbox(btn.dataset.galleryImage,btn.dataset.galleryName);
    });
  });
}

function openLightbox(src,name) {
  const box=document.querySelector("#galleryLightbox");
  const img=document.querySelector("#lightboxImage");
  const caption=document.querySelector("#lightboxCaption");
  if(!box||!img) return;
  img.src=src;
  caption.textContent=name||"";
  box.classList.remove("hidden");
  document.body.style.overflow="hidden";
}

function closeLightbox() {
  const box=document.querySelector("#galleryLightbox");
  if(box)box.classList.add("hidden");
  document.body.style.overflow="";
}

document.querySelector("#lightboxClose")?.addEventListener("click",closeLightbox);
document.querySelector("#galleryLightbox")?.addEventListener("click",e=>{
  if(e.target.id==="galleryLightbox")closeLightbox();
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape")closeLightbox();
});

document.querySelector("#orderForm")?.addEventListener("input",calculate);
document.querySelector("#orderForm")?.addEventListener("change",calculate);

document.querySelector("#orderForm")?.addEventListener("submit",e=>{
  e.preventDefault();

  const form=e.currentTarget;
  const d=Object.fromEntries(new FormData(form).entries());

  // Always require fabric + stitching together.
  const fabric=fabrics.find(p=>p.id===d.fabricId);
  const style=styles.find(p=>p.id===d.styleId);
  const metres=Math.max(0,Number(d.metres)||0);

  if(!d.name.trim()) {
    alert("Please enter your name.");
    form.elements.name.focus();
    return;
  }

  if(!d.phone.trim() || d.phone.replace(/\D/g,"").length<10) {
    alert("Please enter a valid WhatsApp number.");
    form.elements.phone.focus();
    return;
  }

  if(!fabric) {
    alert("Fabric चुनना जरूरी है। कृपया Fabric चुनें।");
    form.elements.fabricId.focus();
    return;
  }

  if(!style) {
    alert("Stitching style चुनना जरूरी है। कृपया Stitching style चुनें।");
    form.elements.styleId.focus();
    return;
  }

  if(metres<0.5) {
    alert("Fabric quantity कम से कम 0.5 metre होनी चाहिए।");
    form.elements.metres.focus();
    return;
  }

  const {fabricTotal,stitchTotal,discount,total}=getEstimate();

  const lines=[
    "STITCHED.TO.STYLE — COMPLETE ORDER REQUEST",
    "",
    "Name: "+d.name,
    "Customer WhatsApp: "+d.phone,
    "Order type: Fabric + Stitching (Mandatory)",
    "",
    "FABRIC DETAILS",
    "Fabric: "+fabric.name,
    "Colour: "+(d.colour||"To confirm"),
    "Quantity: "+metres+" metre(s)",
    "Fabric estimate: "+money(fabricTotal),
    "",
    "STITCHING DETAILS",
    "Stitching style: "+style.name,
    "Stitching estimate: "+money(stitchTotal),
    "",
    "Subtotal: "+money(fabricTotal+stitchTotal),
    "Offer discount: -"+money(discount),
    "ESTIMATED TOTAL: "+money(total),
    "",
    "ORDER CONFIRMATION AMOUNT: ₹99",
    "Payment method/details to be discussed on WhatsApp.",
    "",
    "MEASUREMENTS (INCHES)",
    "Bust/chest: "+(d.bust||"Not provided"),
    "Waist: "+(d.waist||"Not provided"),
    "Hip: "+(d.hip||"Not provided"),
    "Shoulder: "+(d.shoulder||"Not provided"),
    "Sleeve: "+(d.sleeve||"Not provided"),
    "Outfit length: "+(d.length||"Not provided"),
    "Notes: "+(d.notes||"None"),
    "",
    "Please confirm fabric availability, final price, delivery and payment details."
  ];

  const url="https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent(lines.join("\n"));
  const opened=window.open(url,"_blank");

  if(!opened) {
    window.location.href=url;
  }
});

document.querySelector("#year").textContent=new Date().getFullYear();

document.querySelector("#menuBtn")?.addEventListener("click",()=>{
  document.querySelector("nav")?.classList.toggle("open");
});

document.querySelectorAll("nav a").forEach(a=>{
  a.addEventListener("click",()=>document.querySelector("nav")?.classList.remove("open"));
});

load().catch(err=>{
  console.error("Website loading error:",err);
  const fg=document.querySelector("#fabricsGrid");
  const sg=document.querySelector("#stylesGrid");
  if(fg)fg.innerHTML='<div class="empty">Fabrics could not be loaded. Please refresh the page.</div>';
  if(sg)sg.innerHTML='<div class="empty">Stitching styles could not be loaded. Please refresh the page.</div>';
});

loadBranding();
