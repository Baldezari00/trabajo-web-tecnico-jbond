// ========================================
// HASH DE CONTRASEÑA (SHA-256)
// ========================================

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
// ========================================
// INICIALIZACIÓN DE CONTRASEÑA
// ========================================
function initializePassword() {
    // Contraseña por defecto: "admin123" (hasheada)
    if (!localStorage.getItem('adminPasswordHash')) {
        hashPassword('admin123').then(hash => {
            localStorage.setItem('adminPasswordHash', hash);
        });
    }
}
// =========================================
//  CARGA DE DATOS DESDE  + TURSO
// =========================================

let servicesData = [];
let pricesData = [];
const API_URL = "/prices";
const SERVICES_URL = "/services";


// Cargar datos desde tus funciones serverless
async function loadData() {
  try {
    const servicesRes = await fetch(SERVICES_URL);
    servicesData = await servicesRes.json();

    const pricesRes = await fetch(API_URL);
    pricesData = await pricesRes.json();

    // Guardar en localStorage para usar en el render
    localStorage.setItem("services", JSON.stringify(servicesData));
    localStorage.setItem("prices", JSON.stringify(pricesData));

    renderServices();
    renderPricesTable();
  } catch (err) {
    console.error("Error cargando datos:", err);
  }
}
// =========================================
//  RENDERIZADO – MOSTRAR EN EL HTML
// =========================================

function renderServices() {
  const container = document.getElementById("servicesGrid");
  if (!container) return;

  const services = JSON.parse(localStorage.getItem("services") || "[]");

  container.innerHTML = services
    .map(service => {
      // items viene como string → lo convertimos a array real
      let itemsList = [];
      try {
        itemsList = JSON.parse(service.items || "[]");
      } catch (e) {
        console.warn("Items mal formateados:", service.items);
        // Si no es JSON, intentar separar por líneas
        itemsList = (service.items || "").split("\n").filter(i => i.trim());
      }

      return `
        <div class="service-card" data-aos="fade-up" data-aos-delay="100">
            <div class="service-icon">${service.icon || ""}</div>
            <h3>${service.name}</h3>

            <ul>
              ${itemsList.map(i => `<li>${i}</li>`).join("")}
            </ul>

            <div class="service-price">Desde $${Number(service.price).toLocaleString("es-AR")}</div>
            <span class="badge-free">Presupuesto GRATIS</span>
        </div>
      `;
    })
    .join("");
}

// Renderizar tabla de precios en la página principal
function renderPricesTable() {
  const tableBody = document.getElementById("pricesTableBody");
  if (!tableBody) return;

  const prices = JSON.parse(localStorage.getItem("prices") || "[]");

  tableBody.innerHTML = prices.map(item => `
    <tr>
      <td>${item.service}</td>
      <td>$${Number(item.price).toLocaleString("es-AR")}</td>
      <td>${item.time}</td>
    </tr>
  `).join("");
}

// =========================================
//  PANEL ADMIN – EDITAR SERVICIOS
// =========================================

async function saveService() {
  const id = document.getElementById("editServiceId").value;
  const name = document.getElementById("serviceName").value;
  const icon = document.getElementById("serviceIcon").value;
  const description = document.getElementById("serviceItems").value;
  let price = document.getElementById("servicePrice").value;

  if (!name || !price) {
    showToast('⚠ Completá al menos nombre y precio');
    return;
  }

  // Convertir a número y validar máximo
  price = Number(price);
  if (isNaN(price) || price < 0 || price > 9999999) {
    showToast('⚠ El precio debe estar entre 0 y 9.999.999');
    return;
  }

  // Convertir descripción a JSON array
  const itemsArray = description.split("\n").filter(i => i.trim());
  const itemsJSON = JSON.stringify(itemsArray);

  if (id) {
    // Editar existente
    await updateService(id, name, icon, itemsJSON, price);
  } else {
    // Crear nuevo
    await addService(name, icon, itemsJSON, price);
  }

  cancelEditService();
}

function cancelEditService() {
  document.getElementById("editServiceId").value = '';
  document.getElementById("serviceName").value = '';
  document.getElementById("serviceIcon").value = '';
  document.getElementById("serviceItems").value = '';
  document.getElementById("servicePrice").value = '';
}

async function addService(name, icon, items, price) {
  try {
    const res = await fetch(SERVICES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon, items, price }),
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${await res.text()}`);
    }

    showToast('✓ Servicio agregado');
    await loadData();
    renderAdminServices();
  } catch (err) {
    console.error("Error agregando servicio:", err);
    showToast('⚠ Error al agregar servicio');
  }
}

async function updateService(id, name, icon, items, price) {
  try {
    const res = await fetch(SERVICES_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, icon, items, price }),
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${await res.text()}`);
    }

    showToast('✓ Servicio actualizado');
    await loadData();
    renderAdminServices();
  } catch (err) {
    console.error("Error actualizando servicio:", err);
    showToast('⚠ Error al actualizar servicio');
  }
}

async function deleteService(id) {
  if (!confirm("¿Eliminar este servicio?")) return;

  try {
    const res = await fetch(`${SERVICES_URL}?id=${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${await res.text()}`);
    }

    showToast('✓ Servicio eliminado');
    await loadData();
    renderAdminServices();
  } catch (err) {
    console.error("Error eliminando servicio:", err);
    showToast('⚠ Error al eliminar servicio');
  }
}

function editServiceAdmin(id, name, icon, items, price) {
  document.getElementById("editServiceId").value = id;
  document.getElementById("serviceName").value = name;
  document.getElementById("serviceIcon").value = icon;
  
  // Convertir JSON array a líneas
  try {
    const itemsArray = JSON.parse(items);
    document.getElementById("serviceItems").value = itemsArray.join("\n");
  } catch (e) {
    document.getElementById("serviceItems").value = items;
  }
  
  document.getElementById("servicePrice").value = price;

  // Scroll al formulario
  document.getElementById("serviceName").scrollIntoView({ behavior: 'smooth' });
}

// =========================================
//  PANEL ADMIN – EDITAR PRECIOS
// =========================================
async function savePrice() {
  const id = document.getElementById("editPriceId").value;
  const service = document.getElementById("priceService").value;
  let price = document.getElementById("priceAmount").value;
  const time = document.getElementById("priceTime").value || "N/A";

  if (!service || !price) {
    showToast("⚠ Completá al menos servicio y precio");
    return;
  }

 // Convertir a número y validar máximo
  price = Number(price);
  if (isNaN(price) || price < 0 || price > 9999999) {
    showToast('⚠ El precio debe estar entre 0 y 9.999.999');
    return;
  }

  if (id) {
    // Editar existente
    await updatePrice(id, service, price, time);
  } else {
    // Crear nuevo
    await addPrice(service, price, time);
  }

  cancelEditPrice();
}

function editPrice(id, service, price, time) {
  document.getElementById("editPriceId").value = id;
  document.getElementById("priceService").value = service;
  document.getElementById("priceAmount").value = price;
  document.getElementById("priceTime").value = time || '';

  // Scroll al formulario
  document.getElementById("priceService").scrollIntoView({ behavior: 'smooth' });
}
async function addPrice(service, price, time) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service, price, time }),
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${await res.text()}`);
    }

    showToast("✓ Precio agregado");
    await loadData();
    renderAdminPrices();
  } catch (err) {
    console.error("Error agregando precio:", err);
    showToast("⚠ Error al agregar precio");
  }
}

async function updatePrice(id, service, price, time) {
  try {
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, service, price, time }),
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${await res.text()}`);
    }

    showToast("✓ Precio actualizado");
    await loadData();
    renderAdminPrices();
  } catch (err) {
    console.error("Error actualizando precio:", err);
    showToast("⚠ Error al actualizar precio");
  }
}

function cancelEditPrice() {
  document.getElementById("editPriceId").value = "";
  document.getElementById("priceService").value = "";
  document.getElementById("priceAmount").value = "";
  document.getElementById("priceTime").value = "";
  
}

async function deletePrice(id) {
  if (!confirm("¿Eliminar este precio?")) return;

  try {
    const res = await fetch(`${API_URL}?id=${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${await res.text()}`);
    }

    showToast('✓ Precio eliminado');
    await loadData();
    renderAdminPrices();
  } catch (err) {
    console.error("Error eliminando precio:", err);
    showToast('⚠ Error al eliminar precio');
  }
}

// ========================================
// ADMIN - ABRIR/CERRAR LOGIN
// ========================================
function openAdminLogin() {
  document.getElementById('adminLoginModal').style.display = 'flex';
  document.getElementById('adminPassword').value = '';
  document.getElementById('adminPassword').focus();
}

function closeAdminLogin() {
  document.getElementById('adminLoginModal').style.display = 'none';
}

// ========================================
// ADMIN - LOGIN
// ========================================
async function adminLogin() {
  const password = document.getElementById('adminPassword').value;

  if (!password) {
    showToast('⚠ Por favor ingresá la contraseña');
    return;
  }

  const hashedInput = await hashPassword(password);
  const storedHash = localStorage.getItem('adminPasswordHash');

  if (hashedInput === storedHash) {
    closeAdminLogin();
    openAdminPanel();
    showToast('✓ Acceso concedido');
  } else {
    showToast('⚠ Contraseña incorrecta');
    document.getElementById('adminPassword').value = '';
  }
}

// ========================================
// ADMIN - ABRIR/CERRAR PANEL
// ========================================
function openAdminPanel() {
  document.getElementById('adminPanel').style.display = 'block';
  renderAdminServices();
  renderAdminPrices();
}

function closeAdminPanel() {
  document.getElementById('adminPanel').style.display = 'none';
  cancelEditService();
  cancelEditPrice();
}

// ========================================
// ADMIN - GESTIÓN DE SERVICIOS
// ========================================
function renderAdminServices() {
  const servicesList = document.getElementById('servicesList');
  if (!servicesList) return;

  const services = JSON.parse(localStorage.getItem('services') || '[]');

  servicesList.innerHTML = services.map(service => {
    const escapedName = (service.name || '').replace(/'/g, "\\'");
    const escapedIcon = (service.icon || '').replace(/'/g, "\\'");
    const escapedItems = (service.items || '[]').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    return `
    <div class="service-item">
      <div class="service-item-info">
        <h4>${service.icon || ''} ${service.name}</h4>
        <p>Desde $${Number(service.price).toLocaleString('es-AR')}</p>
      </div>
      <div class="service-item-actions">
        <button onclick="editServiceAdmin('${service.id}', '${escapedName}', '${escapedIcon}', '${escapedItems}', '${service.price}')" class="btn btn-small btn-edit">Editar</button>
        <button onclick="deleteService('${service.id}')" class="btn btn-small btn-delete">Eliminar</button>
      </div>
    </div>
  `}).join('');
}

// ========================================
// ADMIN - GESTIÓN DE PRECIOS
// ========================================
function renderAdminPrices() {
  const pricesList = document.getElementById('pricesList');
  if (!pricesList) return;

  const prices = JSON.parse(localStorage.getItem('prices') || '[]');

  pricesList.innerHTML = prices.map(price => {
    const escapedService = (price.service || '').replace(/'/g, "\\'");
    const escapedTime = (price.time || '').replace(/'/g, "\\'");
    
    return `
    <div class="price-item">
      <div class="price-item-info">
        <h4>${price.service}</h4>
        <p>$${Number(price.price).toLocaleString('es-AR')} - ${price.time}</p>
      </div>
      <div class="price-item-actions">
        <button onclick="editPrice('${price.id}', '${escapedService}', '${price.price}', '${escapedTime}')" class="btn btn-small btn-edit">Editar</button>
        <button onclick="deletePrice('${price.id}')" class="btn btn-small btn-delete">Eliminar</button>
      </div>
    </div>
  `}).join('');
}

// ========================================
// ADMIN - CAMBIAR CONTRASEÑA
// ========================================
async function changePassword() {
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!newPassword || !confirmPassword) {
    showToast('⚠ Por favor completá ambos campos');
    return;
  }

  if (newPassword.length < 6) {
    showToast('⚠ La contraseña debe tener al menos 6 caracteres');
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast('⚠ Las contraseñas no coinciden');
    return;
  }

  const hashedPassword = await hashPassword(newPassword);
  localStorage.setItem('adminPasswordHash', hashedPassword);

  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';

  showToast('✓ Contraseña cambiada exitosamente');
}


// ========================================
// SISTEMA DE TEMAS
// ========================================
const themes = ['blue', 'green', 'orange', 'purple'];
let currentThemeIndex = 0;

const themeSwitcher = document.getElementById('themeSwitcher');
const body = document.body;

// Cargar tema guardado
const savedTheme = localStorage.getItem('theme') || 'blue';
currentThemeIndex = themes.indexOf(savedTheme);
body.setAttribute('data-theme', savedTheme);
/*
// Cambiar tema con animación
themeSwitcher.addEventListener('click', () => {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    const newTheme = themes[currentThemeIndex];
    
    body.style.transition = 'background-color 0.5s ease, color 0.5s ease';
    body.setAttribute('data-theme', newTheme);
    
    localStorage.setItem('theme', newTheme);
    
    const themeNames = {
        'blue': 'Azul Técnico',
        'green': 'Verde Tech',
        'orange': 'Naranja Energético',
        'purple': 'Púrpura Profesional'
    };
    showToast(`Tema cambiado a: ${themeNames[newTheme]}`);
});
*/
// ========================================
// MENÚ MÓVIL
// ========================================
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const nav = document.getElementById('nav');

mobileMenuToggle.addEventListener('click', () => {
    mobileMenuToggle.classList.toggle('active');
    nav.classList.toggle('active');
});

nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenuToggle.classList.remove('active');
        nav.classList.remove('active');
    });
});



// ========================================
// FAQ ACCORDION
// ========================================
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    
    question.addEventListener('click', () => {
        faqItems.forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove('active');
            }
        });
        
        item.classList.toggle('active');
    });
});

// ========================================
// TESTIMONIOS SLIDER
// ========================================
const sliderDots = document.getElementById('sliderDots');
const testimonialCards = document.querySelectorAll('.testimonial-card');

if (window.innerWidth <= 768) {
    testimonialCards.forEach((card, index) => {
        const dot = document.createElement('span');
        dot.className = 'slider-dot';
        if (index === 0) dot.classList.add('active');
        sliderDots.appendChild(dot);
    });
}

// ========================================
// MOSTRAR/OCULTAR INPUTS "OTRO"
// ========================================

// Formulario Rápido - Dispositivo "Otro"
const dispositivoSelect = document.getElementById('dispositivoSelect');
const dispositivoOtro = document.getElementById('dispositivoOtro');

if (dispositivoSelect && dispositivoOtro) {
    dispositivoSelect.addEventListener('change', function() {
        if (this.value === 'Otro') {
            dispositivoOtro.style.display = 'block';
            dispositivoOtro.required = true;
            dispositivoOtro.style.animation = 'slideIn 0.3s ease';
        } else {
            dispositivoOtro.style.display = 'none';
            dispositivoOtro.required = false;
            dispositivoOtro.value = '';
        }
    });
}

// Formulario Rápido - Marca "Otra"
const marcaSelect = document.getElementById('marcaSelect');
const marcaOtra = document.getElementById('marcaOtra');

if (marcaSelect && marcaOtra) {
    marcaSelect.addEventListener('change', function() {
        if (this.value === 'Otra') {
            marcaOtra.style.display = 'block';
            marcaOtra.required = true;
            marcaOtra.style.animation = 'slideIn 0.3s ease';
        } else {
            marcaOtra.style.display = 'none';
            marcaOtra.required = false;
            marcaOtra.value = '';
        }
    });
}

// Formulario de Contacto - Dispositivo "Otro"
const dispositivoContactSelect = document.getElementById('dispositivoContactSelect');
const dispositivoContactOtro = document.getElementById('dispositivoContactOtro');

if (dispositivoContactSelect && dispositivoContactOtro) {
    dispositivoContactSelect.addEventListener('change', function() {
        if (this.value === 'Otro') {
            dispositivoContactOtro.style.display = 'block';
            dispositivoContactOtro.required = true;
            dispositivoContactOtro.style.animation = 'slideIn 0.3s ease';
        } else {
            dispositivoContactOtro.style.display = 'none';
            dispositivoContactOtro.required = false;
            dispositivoContactOtro.value = '';
        }
    });
}

// Formulario de Contacto - Marca "Otra"
const marcaContactSelect = document.getElementById('marcaContactSelect');
const marcaContactOtra = document.getElementById('marcaContactOtra');

if (marcaContactSelect && marcaContactOtra) {
    marcaContactSelect.addEventListener('change', function() {
        if (this.value === 'Otra') {
            marcaContactOtra.style.display = 'block';
            marcaContactOtra.required = true;
            marcaContactOtra.style.animation = 'slideIn 0.3s ease';
        } else {
            marcaContactOtra.style.display = 'none';
            marcaContactOtra.required = false;
            marcaContactOtra.value = '';
        }
    });
}

// ========================================
// ENVÍO DE FORMULARIOS CON EMAILJS
// ========================================

const EMAILJS_CONFIG = {
    publicKey: 'ZkcqPZTA0qAc_Ix5Q',
    serviceId: 'service_tm5prin',
    templateIdQuick: 'template_30c8b7q',
    templateIdContact: 'template_e6fne7l'
};

// Cargar EmailJS library
(function() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.onload = function() {
        emailjs.init(EMAILJS_CONFIG.publicKey);
    };
    document.head.appendChild(script);
})();

// FORMULARIO RÁPIDO
const quickForm = document.getElementById('quickForm');
if (quickForm) {
    quickForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = quickForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'ENVIANDO...';
        submitBtn.disabled = true;
        
        const formData = new FormData(quickForm);
        
        let dispositivo = formData.get('dispositivo');
        if (dispositivo === 'Otro' && formData.get('dispositivoOtro')) {
            dispositivo = formData.get('dispositivoOtro');
        }
        
        let marca = formData.get('marca');
        if (marca === 'Otra' && formData.get('marcaOtra')) {
            marca = formData.get('marcaOtra');
        }
        
        const templateParams = {
            dispositivo: dispositivo,
            marca: marca,
            modelo: formData.get('modelo'),
            problema: formData.get('problema'),
            email: formData.get('email')
        };
        
        try {
            await emailjs.send(
                EMAILJS_CONFIG.serviceId,
                EMAILJS_CONFIG.templateIdQuick,
                templateParams
            );
            
            showToast('✓ Presupuesto solicitado! Te contactaremos pronto.');
            quickForm.reset();
            if (dispositivoOtro) dispositivoOtro.style.display = 'none';
            if (marcaOtra) marcaOtra.style.display = 'none';
            
        } catch (error) {
            console.error('Error al enviar:', error);
            showToast('⚠ Error al enviar. Por favor llamanos o escribinos por WhatsApp.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// FORMULARIO DE CONTACTO COMPLETO
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'ENVIANDO...';
        submitBtn.disabled = true;
        
        const formData = new FormData(contactForm);
        
        let dispositivo = formData.get('dispositivo');
        if (dispositivo === 'Otro' && formData.get('dispositivoContactOtro')) {
            dispositivo = formData.get('dispositivoContactOtro');
        }
        
        let marca = formData.get('marca');
        if (marca === 'Otra' && formData.get('marcaContactOtra')) {
            marca = formData.get('marcaContactOtra');
        }
        
        const templateParams = {
            nombre: formData.get('nombre'),
            telefono: formData.get('telefono'),
            email: formData.get('email'),
            dispositivo: dispositivo,
            marca: marca,
            modelo: formData.get('modelo'),
            problema: formData.get('problema'),
            llamar: formData.get('llamar') ? 'Sí, prefiere que lo llamen' : 'No'
        };
        
        try {
            await emailjs.send(
                EMAILJS_CONFIG.serviceId,
                EMAILJS_CONFIG.templateIdContact,
                templateParams
            );
            
            showToast('✓ Mensaje enviado! Te responderemos en menos de 2 horas.');
            contactForm.reset();
            if (dispositivoContactOtro) dispositivoContactOtro.style.display = 'none';
            if (marcaContactOtra) marcaContactOtra.style.display = 'none';
            
        } catch (error) {
            console.error('Error al enviar:', error);
            showToast('⚠ Error al enviar. Por favor llamanos o escribinos por WhatsApp.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ========================================
// SISTEMA DE NOTIFICACIONES TOAST
// ========================================
function showToast(message, duration = 4000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ========================================
// SMOOTH SCROLL
// ========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// ========================================
// ANIMACIONES AL SCROLL
// ========================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

const animatedElements = document.querySelectorAll('.service-card, .why-item, .testimonial-card, .timeline-item');
animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ========================================
// CONTADOR DE VISITAS
// ========================================
let visitCount = localStorage.getItem('visitCount') || 0;
visitCount++;
localStorage.setItem('visitCount', visitCount);

// ========================================
// PREVENIR MÚLTIPLES ENVÍOS
// ========================================
let formSubmitting = false;

document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
        if (formSubmitting) {
            e.preventDefault();
            return false;
        }
    });
});

// ========================================
// LOG DE DEBUG
// ========================================
console.log('%c🔧Sistema Cargado', 'color: #2563EB; font-size: 16px; font-weight: bold;');
console.log('Tema actual:', body.getAttribute('data-theme'));


(() => {
  const header = document.getElementById("header");
  let lastScroll = window.pageYOffset;

  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll <= 0) {
      header.classList.remove("header--hidden");
      lastScroll = currentScroll;
      return;
    }

    if (currentScroll > lastScroll && currentScroll > 80) {
      // Bajando
      header.classList.add("header--hidden");
    } else {
      // Subiendo
      header.classList.remove("header--hidden");
    }

    lastScroll = currentScroll;
  });
})();

// ========================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  initializePassword();
  loadData(); // Esto carga servicios Y precios
});