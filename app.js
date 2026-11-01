import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDfiy2YoxH-__zEl51Vaw5I4Btc9JyErvM",
  authDomain: "stitched-to-style.firebaseapp.com",
  projectId: "stitched-to-style",
  storageBucket: "stitched-to-style.firebasestorage.app",
  messagingSenderId: "992747942040",
  appId: "1:992747942040:web:532f1c271b9cba3d3360ed",
  measurementId: "G-TK2DNGJQ8Y"
};
const WHATSAPP = "917340589459";
const demoProducts = [
 {id:"demo1",name:"Everyday Elegance Suit",category:"Suits",price:1200,description:"A timeless suit style, customised to your fit.",image:"https://images.unsplash.com/photo-1583391733956-6c78276477e3?auto=format&fit=crop&w=900&q=80"},
 {id:"demo2",name:"The Essential Top",category:"Tops",price:450,description:"An easy, versatile top for everyday styling.",image:"https://images.unsplash.com/photo-1564257577-0a7f7d2c1c4d?auto=format&fit=crop&w=900&q=80"},
 {id:"demo3",name:"Occasion Dress",category:"Dresses",price:1500,description:"A special-occasion silhouette, stitched for you.",image:"https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80"}
];
let db=null, allProducts=[...demoProducts], activeCategory="All";
const configured= !firebaseConfig.apiKey.startsWith("PASTE_");
if(configured){try{const app=initializeApp(firebaseConfig);db=getFirestore(app);}catch(e){console.warn(e)}}
async function loadProducts(){
 if(db){try{const snap=await getDocs(query(collection(db,"products"),orderBy("createdAt","desc")));if(!snap.empty)allProducts=snap.docs.map(d=>({id:d.id,...d.data()}));else allProducts=[];}catch(e){console.error(e)}}
 renderFilters();renderProducts();
}
function renderFilters(){const cats=["All",...new Set(allProducts.map(p=>p.category).filter(Boolean))];const el=document.querySelector("#filters");if(!el)return;el.innerHTML=cats.map(c=>`<button class="filter ${c===activeCategory?'active':''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");el.querySelectorAll("button").forEach(b=>b.onclick=()=>{activeCategory=b.dataset.cat;renderFilters();renderProducts()})}
function renderProducts(){const el=document.querySelector("#products");if(!el)return;const items=allProducts.filter(p=>activeCategory==="All"||p.category===activeCategory);if(!items.length){el.innerHTML='<div class="empty">No styles in this category yet.<br>Check back soon for new designs.</div>';return}
 el.innerHTML=items.map(p=>`<article class="product-card"><div class="product-image"><img src="${escapeAttr(p.image||'')}" alt="${escapeAttr(p.name)}" loading="lazy" onerror="this.style.opacity='.15'"><span class="product-category">${escapeHtml(p.category||'Style')}</span></div><div class="product-info"><div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description||'Custom stitching available')}</p></div><div class="price">₹${Number(p.price||0).toLocaleString('en-IN')}<small style="display:block;font-size:9px;color:#776d65;font-weight:400">starting price</small></div></div><button class="card-book" data-name="${escapeAttr(p.name)}">Choose this style ↗</button></article>`).join("");
 el.querySelectorAll(".card-book").forEach(b=>b.onclick=()=>{document.querySelector("#chosenStyle").value=b.dataset.name;document.querySelector("#booking").scrollIntoView({behavior:"smooth"})})}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function escapeAttr(s=""){return escapeHtml(s)}
document.querySelector("#bookingForm")?.addEventListener("submit",e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());const msg=`STITCHING BOOKING REQUEST%0A%0ABOOKING CHARGE: ₹99 payable in advance%0APayment method to be discussed and confirmed on WhatsApp.%0A%0AName: ${encodeURIComponent(d.name)}%0ACustomer WhatsApp: ${encodeURIComponent(d.phone)}%0AStyle: ${encodeURIComponent(d.style)}%0ABust/Chest: ${encodeURIComponent(d.bust||"Not provided")} inches%0AWaist: ${encodeURIComponent(d.waist||"Not provided")} inches%0AHip: ${encodeURIComponent(d.hip||"Not provided")} inches%0AShoulder: ${encodeURIComponent(d.shoulder||"Not provided")} inches%0ASleeve: ${encodeURIComponent(d.sleeve||"Not provided")} inches%0AOutfit length: ${encodeURIComponent(d.length||"Not provided")} inches%0AOther notes: ${encodeURIComponent(d.notes||"None")}`;window.open(`https://wa.me/${WHATSAPP}?text=${msg}`,"_blank","noopener")});
document.querySelector("#year").textContent=new Date().getFullYear();
document.querySelector("#menuBtn")?.addEventListener("click",()=>document.querySelector("nav").classList.toggle("open"));
loadProducts();
