import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
let db = null, fabrics = [], styles = [], offers = [], activeFabricCategory = "All", activeStyleCategory = "All";
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
try { db = getFirestore(initializeApp(firebaseConfig)); } catch(e) { console.warn("Firebase unavailable",e); }

async function readCollection(name, sortField) {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db,name),orderBy(sortField,"desc")));
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch(e) {
    console.warn("Could not load "+name,e);
    try { const snap = await getDocs(collection(db,name)); return snap.docs.map(d=>({id:d.id,...d.data()})); } catch { return []; }
  }
}
async function loadBranding() {
  if (!db) return;
  try {
    const snap = await getDoc(doc(db,"siteSettings","branding"));
    if (!snap.exists()) return;
    const logo = snap.data().logoUrl || "";
    if (!logo) return;
    ["siteLogo","siteLogoFooter"].forEach(id => { const img=document.getElementById(id); if(img){img.src=logo;img.classList.remove("hidden");} });
    ["brandFallback","brandFallbackFooter"].forEach(id => { const el=document.getElementById(id); if(el)el.classList.add("hidden"); });
  } catch(e) { console.warn("Could not load brand logo",e); }
}
async function load() {
  const [f,s,o] = await Promise.all([readCollection("fabrics","createdAt"),readCollection("products","createdAt"),readCollection("offers","createdAt")]);
  fabrics = f.length ? f : demoFabrics;
  styles = s.length ? s : demoStyles;
  offers = o.filter(x=>x.active !== false && (!x.startDate || x.startDate <= today()) && (!x.endDate || x.endDate >= today()));
  renderFilters("fabric"); renderFilters("style"); renderCards("fabric"); renderCards("style"); fillSelects(); calculate();
}
function today(){return new Date().toISOString().slice(0,10)}
function renderFilters(type) {
  const data = type==="fabric"?fabrics:styles, active = type==="fabric"?activeFabricCategory:activeStyleCategory, el=document.querySelector(type==="fabric"?"#fabricFilters":"#styleFilters");
  const cats=["All",...new Set(data.map(p=>p.category).filter(Boolean))];
  el.innerHTML=cats.map(c=>`<button type="button" class="filter ${c===active?'active':''}" data-cat="${attr(c)}">${esc(c)}</button>`).join("");
  el.querySelectorAll("button").forEach(b=>b.onclick=()=>{if(type==="fabric")activeFabricCategory=b.dataset.cat;else activeStyleCategory=b.dataset.cat;renderFilters(type);renderCards(type)});
}
function card(p,type){
 const price=Number(p.price)||0, unit=type==="fabric"?"/ metre":"starting";
 return `<article class="product-card"><div class="product-image"><img src="${attr(p.image||"")}" alt="${attr(p.name)}" loading="lazy" onerror="this.style.opacity='.12'"><span class="product-category">${esc(p.category|| (type==="fabric"?"Fabric":"Style"))}</span></div><div class="product-info"><div><h3>${esc(p.name)}</h3><p>${esc(p.description||"")}${type==="fabric"&&p.colours?`<br><b>Colours:</b> ${esc(p.colours)}`:""}</p></div><div class="price">${money(price)}<small style="display:block;font-size:10px;color:#776d85;font-weight:500">${unit}</small></div></div><button type="button" class="card-book" data-choose="${type}" data-id="${attr(p.id)}">Choose ${type==="fabric"?"fabric":"style"} ↗</button></article>`;
}
function renderCards(type){
 const data=type==="fabric"?fabrics:styles,active=type==="fabric"?activeFabricCategory:activeStyleCategory,el=document.querySelector(type==="fabric"?"#fabricsGrid":"#stylesGrid");
 const items=data.filter(p=>active==="All"||p.category===active);
 el.innerHTML=items.length?items.map(p=>card(p,type)).join():`<div class="empty">No ${type==="fabric"?"fabrics":"stitching styles"} listed right now. Please check back soon.</div>`;
 el.querySelectorAll("[data-choose]").forEach(b=>b.onclick=()=>{if(b.dataset.choose==="fabric"){document.querySelector("#orderType").value="fabric";document.querySelector("#fabricSelect").value=b.dataset.id;}else{document.querySelector("#orderType").value="stitching";document.querySelector("#styleSelect").value=b.dataset.id;}updateFields();calculate();document.querySelector("#order").scrollIntoView({behavior:"smooth"})});
}
function fillSelects(){
 const fs=document.querySelector("#fabricSelect"), ss=document.querySelector("#styleSelect");
 fs.innerHTML='<option value="">Choose fabric</option>'+fabrics.map(p=>`<option value="${attr(p.id)}">${esc(p.name)} — ${money(p.price)}/m</option>`).join("");
 ss.innerHTML='<option value="">Choose a style</option>'+styles.map(p=>`<option value="${attr(p.id)}">${esc(p.name)} — ${money(p.price)}</option>`).join("");
}
function activeOffers(){return offers}
function calculate(){
 const form=document.querySelector("#orderForm");if(!form)return;
 const type=form.elements.orderType.value, fabric=fabrics.find(p=>p.id===form.elements.fabricId.value), style=styles.find(p=>p.id===form.elements.styleId.value), metres=Math.max(0,Number(form.elements.metres.value)||0);
 const fabricTotal=(type==="fabric"||type==="both")&&fabric?Number(fabric.price||0)*metres:0;
 const stitchTotal=(type==="stitching"||type==="both")&&style?Number(style.price||0):0;
 let discount=0;const subtotal=fabricTotal+stitchTotal;
 activeOffers().forEach(o=>{const min=Number(o.minimumSpend||0);if(subtotal>=min){let value=o.discountType==="percent"?subtotal*Number(o.discountValue||0)/100:Number(o.discountValue||0);if(o.maxDiscount)value=Math.min(value,Number(o.maxDiscount));discount=Math.max(discount,value)}});
 discount=Math.min(discount,subtotal);
 document.querySelector("#fabricEstimate").textContent=money(fabricTotal);document.querySelector("#stitchEstimate").textContent=money(stitchTotal);document.querySelector("#discountEstimate").textContent="-"+money(discount);document.querySelector("#totalEstimate").textContent=money(subtotal-discount);
}
function updateFields(){
 const type=document.querySelector("#orderType").value;
 document.querySelector("#fabricField").classList.toggle("hidden",type==="stitching");
 document.querySelector("#colourField").classList.toggle("hidden",type==="stitching");
 document.querySelector("#metresField").classList.toggle("hidden",type==="stitching");
 document.querySelector("#styleField").classList.toggle("hidden",type==="fabric");
 document.querySelector("#fabricSelect").required=type!=="stitching";
 document.querySelector("#styleSelect").required=type!=="fabric";
 calculate();
}
document.querySelector("#orderType").addEventListener("change",updateFields);
["fabricSelect","styleSelect","metres"].forEach(id=>document.querySelector("#"+id).addEventListener("change",calculate));
document.querySelector("#metres").addEventListener("input",calculate);
document.querySelector("#orderForm").addEventListener("submit",e=>{
 e.preventDefault();const form=e.currentTarget,d=Object.fromEntries(new FormData(form).entries()),type=d.orderType;
 const fabric=fabrics.find(p=>p.id===d.fabricId),style=styles.find(p=>p.id===d.styleId),metres=Math.max(0,Number(d.metres)||0);
 const fabricTotal=(type!=="stitching"&&fabric)?Number(fabric.price||0)*metres:0,stitchTotal=(type!=="fabric"&&style)?Number(style.price||0):0,subtotal=fabricTotal+stitchTotal;
 let discount=0;activeOffers().forEach(o=>{if(subtotal>=Number(o.minimumSpend||0)){let x=o.discountType==="percent"?subtotal*Number(o.discountValue||0)/100:Number(o.discountValue||0);if(o.maxDiscount)x=Math.min(x,Number(o.maxDiscount));discount=Math.max(discount,x)}});discount=Math.min(discount,subtotal);
 if(type!=="stitching"&&!fabric){alert("Please choose a fabric.");return}if(type!=="fabric"&&!style){alert("Please choose a stitching style.");return}
 const total=Math.max(0,subtotal-discount);
 const lines=[
 "STITCHED.TO.STYLE — ORDER REQUEST","",
 "Name: "+d.name,"Customer WhatsApp: "+d.phone,"Order type: "+({fabric:"Fabric only",stitching:"Stitching only",both:"Fabric + stitching"}[type]),
 fabric?"Fabric: "+fabric.name:"",fabric?"Colour: "+(d.colour||"To confirm"):"",fabric?"Quantity: "+metres+" metre(s)":"",fabric?"Fabric estimate: "+money(fabricTotal):"",
 style?"Stitching style: "+style.name:"",style?"Stitching estimate: "+money(stitchTotal):"",
 "Subtotal: "+money(subtotal),"Offer discount: -"+money(discount),"ESTIMATED TOTAL: "+money(total),"",
 "Measurements (inches):","Bust/chest: "+(d.bust||"Not provided"),"Waist: "+(d.waist||"Not provided"),"Hip: "+(d.hip||"Not provided"),"Shoulder: "+(d.shoulder||"Not provided"),"Sleeve: "+(d.sleeve||"Not provided"),"Outfit length: "+(d.length||"Not provided"),"Notes: "+(d.notes||"None"),"",
 "Please confirm availability, final price, delivery and payment details."
 ].filter(Boolean).join("\n");
 const url="https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent(lines);window.open(url,"_blank","noopener");
});
document.querySelector("#year").textContent=new Date().getFullYear();
document.querySelector("#menuBtn")?.addEventListener("click",()=>document.querySelector("nav").classList.toggle("open"));
updateFields();load();

loadBranding();
