import{M as v,c as l}from"./main-Dk0hW8cW.js";const i=t=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(t);let u=null,d=null;document.addEventListener("DOMContentLoaded",()=>{const t=document.getElementById("deleteModal");t&&(d=new v(t))});window.showToast=(t,s="primary")=>{const a=document.getElementById("toast-container");if(!a)return;const n=document.createElement("div"),o=s==="error"?"bi-x-circle-fill text-danger":"bi-check-circle-fill text-success";n.className=`bonk-toast ${s}`,n.innerHTML=`
        <div class="d-flex align-items-center">
            <i class="bi ${o}"></i>
            <span>${t}</span>
        </div>
    `,a.appendChild(n),setTimeout(()=>{n.style.opacity="0",setTimeout(()=>n.remove(),300)},3e3)};function w(t,s){if(!t||!s)return t;const a=s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ /g,"_"),n=t.lastIndexOf(".");if(n===-1)return t;const o=t.substring(n),c=t.lastIndexOf("-"),r=t.lastIndexOf("/");return c>r&&c<n?`${t.substring(0,c)}-${a}${o}`:`${t.substring(0,n)}-${a}${o}`}async function m(){const t=document.getElementById("cart-items-container"),s=document.getElementById("cart-content"),a=document.getElementById("empty-cart-msg"),n=document.getElementById("cart-subtotal"),o=document.getElementById("cart-total");if(!t)return;t.innerHTML='<tr><td colspan="5" class="text-center text-white py-4">A carregar carrinho...</td></tr>';const c=await l.get();if(t.innerHTML="",c.length===0){s.classList.add("d-none"),a.classList.remove("d-none");return}s.classList.remove("d-none"),a.classList.add("d-none");let r=0;c.forEach(e=>{const g=parseFloat(e.price)*e.qty;r+=g;const h=w(e.image_url,e.color_name),x=e.image_url||"https://placehold.co/80x80",p=document.createElement("tr");p.innerHTML=`
            <td class="ps-4 py-3">
                <div class="d-flex align-items-center">
                    <img 
                        src="${h}" 
                        onerror="this.onerror=null; this.src='${x}';"
                        class="cart-img me-3" 
                        alt="${e.name}"
                    >
                    <div>
                        <h6 class="mb-1 text-white fw-bold">
                            <a href="product.html?id=${e.id_prod}" class="text-decoration-none text-white">
                                ${e.name}
                            </a>
                        </h6>
                        <small class="text-secondary d-block">Cor: <span class="text-light">${e.color_name}</span></small>
                        <small class="text-secondary d-block">Tamanho: <span class="text-light">${e.size_name}</span></small>
                    </div>
                </div>
            </td>
            <td class="text-white">${i(e.price)}</td>
            <td>
                <div class="input-group input-group-sm" style="width: 100px;">
                    <button class="btn btn-outline-secondary btn-decrease" type="button" data-id="${e.id_cart_item}" data-qty="${e.qty}">-</button>
                    <input type="text" class="form-control text-center bg-dark text-white border-secondary" value="${e.qty}" readonly>
                    <button class="btn btn-outline-secondary btn-increase" type="button" data-id="${e.id_cart_item}" data-qty="${e.qty}">+</button>
                </div>
            </td>
            <td class="text-end pe-4 fw-bold text-primary">${i(g)}</td>
            <td class="text-end pe-3">
                <button class="btn btn-link text-danger p-0 btn-remove" data-id="${e.id_cart_item}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `,t.appendChild(p)}),n&&(n.textContent=i(r)),o&&(o.textContent=i(r))}function f(t){u=t,d?d.show():confirm("Remover este item?")&&b()}async function b(){u&&(await l.remove(u),d&&d.hide(),m(),window.showToast("Item removido com sucesso!","success"))}const y=document.getElementById("confirm-delete-btn");y&&y.addEventListener("click",b);document.addEventListener("click",async t=>{if(t.target.matches(".btn-increase")){const a=t.target.dataset.id,n=parseInt(t.target.dataset.qty);t.target.disabled=!0,await l.updateQty(a,n+1),m()}if(t.target.matches(".btn-decrease")){const a=t.target.dataset.id,n=parseInt(t.target.dataset.qty);n>1?(t.target.disabled=!0,await l.updateQty(a,n-1),m()):f(a)}const s=t.target.closest(".btn-remove");if(s){const a=s.dataset.id;f(a)}(t.target.id==="btn-checkout"||t.target.closest("#btn-checkout"))&&(window.location.href="checkout.html")});document.addEventListener("DOMContentLoaded",m);
