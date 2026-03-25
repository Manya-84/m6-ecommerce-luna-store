const API_PRODUCTOS = '/productos';
const API_PRODUCTO = '/producto';
const API_VENTA = '/venta';

const grid = document.getElementById('grid');
const buscar = document.getElementById('buscar');
const cartCountEl = document.getElementById('cart-count');
const yearLabel = document.getElementById('year');

let productos = [];
let carrito = [];
let codigoDescuentoAplicado = '';

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(value);
}

function subtotal() {
  return carrito.reduce((total, item) => {
    const producto = productos.find((p) => p.id === item.id);
    if (!producto) {
      return total;
    }
    return total + producto.price * item.cantidad;
  }, 0);
}

function calcularTotales() {
  const subtotalCarrito = subtotal();
  const envioBase = 3990;
  let descuento = 0;
  let shipping = envioBase;

  if (codigoDescuentoAplicado === 'PROMO10' && subtotalCarrito >= 30000) {
    descuento = Math.min(subtotalCarrito * 0.1, 50000);
  }

  if (codigoDescuentoAplicado === 'ENVIOGRATIS' && subtotalCarrito >= 25000) {
    descuento = envioBase;
    shipping = 0;
  }

  return {
    subtotalCarrito,
    shipping,
    descuento,
    totalFinal: subtotalCarrito + shipping - descuento
  };
}

function actualizarContadorCarrito() {
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  if (cartCountEl) {
    cartCountEl.textContent = totalItems;
  }
}

function agregarAlCarrito(id, cantidad = 1) {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return;
  }

  const producto = productos.find((p) => p.id === id);
  if (!producto) {
    return;
  }

  const itemEnCarrito = carrito.find((item) => item.id === id);
  const cantidadActual = itemEnCarrito ? itemEnCarrito.cantidad : 0;

  if (cantidadActual + cantidad > producto.stock) {
    mostrarMensaje('Stock insuficiente para ese producto.', 'danger');
    return;
  }

  if (itemEnCarrito) {
    itemEnCarrito.cantidad += cantidad;
  } else {
    carrito.push({ id, cantidad });
  }

  actualizarContadorCarrito();
  renderCartUI();
}

function removerDelCarrito(id) {
  carrito = carrito.filter((item) => item.id !== id);
  actualizarContadorCarrito();
  renderCartUI();
}

function incrementarCantidad(id) {
  const item = carrito.find((entry) => entry.id === id);
  const producto = productos.find((entry) => entry.id === id);
  if (!item || !producto) {
    return;
  }

  if (item.cantidad >= producto.stock) {
    mostrarMensaje('No puedes agregar más unidades que el stock disponible.', 'danger');
    return;
  }

  item.cantidad += 1;
  actualizarContadorCarrito();
  renderCartUI();
}

function decrementarCantidad(id) {
  const item = carrito.find((entry) => entry.id === id);
  if (!item) {
    return;
  }

  if (item.cantidad === 1) {
    removerDelCarrito(id);
    return;
  }

  item.cantidad -= 1;
  actualizarContadorCarrito();
  renderCartUI();
}

function aplicarDescuento(codigo) {
  const subtotalCarrito = subtotal();

  if (codigo === 'PROMO10') {
    if (subtotalCarrito >= 30000) {
      return { ok: true };
    }
    return { ok: false, detalle: `Código PROMO10 requiere un mínimo de ${formatCurrency(30000)}` };
  }

  if (codigo === 'ENVIOGRATIS') {
    if (subtotalCarrito >= 25000) {
      return { ok: true };
    }
    return { ok: false, detalle: `Código ENVIOGRATIS requiere un mínimo de ${formatCurrency(25000)}` };
  }

  return { ok: false, detalle: 'Código inválido' };
}

function render(items) {
  if (!grid) {
    return;
  }

  if (!items.length) {
    grid.innerHTML = '<p class="text-muted">No hay productos disponibles.</p>';
    return;
  }

  const html = items.map(({ id, title, price, image, stock }) => `
      <article class="card">
        <img src="${image}" alt="${title}">
        <h3 title="${title}">${title}</h3>
        <p>${formatCurrency(price)}</p>
        <p class="small mb-2">Stock: ${stock}</p>
        <button data-id="${id}" ${stock <= 0 ? 'disabled' : ''}>
          ${stock <= 0 ? 'Sin stock' : 'Agregar'}
        </button>
      </article>
    `).join('');

  grid.innerHTML = html;
}

async function getProductos() {
  try {
    const response = await fetch(API_PRODUCTOS);
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    productos = Array.isArray(data) ? data : [];
    render(productos);
    renderCartUI();
  } catch (error) {
    if (grid) {
      grid.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
  }
}

function renderCartUI() {
  const cartItemsContainer = document.getElementById('cart-items-container');
  const cartSubtotalElement = document.getElementById('cart-subtotal');
  const cartShippingElement = document.getElementById('cart-shipping');
  const cartTotalElement = document.getElementById('cart-total');
  const cartDiscountElement = document.getElementById('cart-discount');
  const discountLine = document.getElementById('discount-line');
  const checkoutButton = document.getElementById('checkout-button');
  const cartEmptyMessage = document.getElementById('cart-empty-message');

  if (!cartItemsContainer) {
    return;
  }

  if (!carrito.length) {
    cartItemsContainer.innerHTML = '';
    if (cartEmptyMessage) cartEmptyMessage.style.display = 'block';
    if (checkoutButton) checkoutButton.disabled = true;
    if (discountLine) discountLine.style.display = 'none';
    if (cartSubtotalElement) cartSubtotalElement.textContent = formatCurrency(0);
    if (cartShippingElement) cartShippingElement.textContent = formatCurrency(3990);
    if (cartTotalElement) cartTotalElement.textContent = formatCurrency(0);
    return;
  }

  if (cartEmptyMessage) {
    cartEmptyMessage.style.display = 'none';
  }

  cartItemsContainer.innerHTML = carrito.map((item) => {
    const producto = productos.find((entry) => entry.id === item.id);
    if (!producto) {
      return '';
    }

    const precioLinea = producto.price * item.cantidad;

    return `
      <div class="cart-item mb-3 pb-3 border-bottom">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <h6 class="mb-1">${producto.title}</h6>
            <p class="fw-semibold mb-1">${formatCurrency(producto.price)} c/u</p>
            <small class="text-muted d-block mb-2">Stock disponible: ${producto.stock}</small>
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-sm btn-outline-secondary" onclick="decrementarCantidad(${item.id})">
                <i class="bi bi-dash"></i>
              </button>
              <span class="fw-semibold px-2">${item.cantidad}</span>
              <button class="btn btn-sm btn-outline-secondary" onclick="incrementarCantidad(${item.id})">
                <i class="bi bi-plus"></i>
              </button>
            </div>
          </div>
          <div class="text-end">
            <p class="fw-bold mb-2">${formatCurrency(precioLinea)}</p>
            <button class="btn btn-sm btn-outline-danger" onclick="removerDelCarrito(${item.id})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const totals = calcularTotales();

  if (cartSubtotalElement) cartSubtotalElement.textContent = formatCurrency(totals.subtotalCarrito);
  if (cartShippingElement) cartShippingElement.textContent = totals.shipping === 0 ? 'GRATIS' : formatCurrency(totals.shipping);
  if (cartTotalElement) cartTotalElement.textContent = formatCurrency(totals.totalFinal);
  if (checkoutButton) checkoutButton.disabled = false;

  if (totals.descuento > 0 && discountLine && cartDiscountElement) {
    discountLine.style.display = 'flex';
    cartDiscountElement.textContent = `-${formatCurrency(totals.descuento)}`;
  } else if (discountLine) {
    discountLine.style.display = 'none';
  }
}

function mostrarMensaje(texto, tipo = 'danger') {
  const discountMessage = document.getElementById('discount-message');
  if (!discountMessage) {
    return;
  }

  discountMessage.textContent = texto;
  discountMessage.className = `mt-2 small text-${tipo}`;
  discountMessage.style.display = 'block';
}

function limpiarMensaje() {
  const discountMessage = document.getElementById('discount-message');
  if (!discountMessage) {
    return;
  }
  discountMessage.style.display = 'none';
}

function handleApplyDiscount() {
  const discountInput = document.getElementById('discount-code-input');
  if (!discountInput) {
    return;
  }

  const codigo = discountInput.value.trim().toUpperCase();

  if (!codigo) {
    mostrarMensaje('Por favor ingresa un código de descuento.');
    return;
  }

  if (!carrito.length) {
    mostrarMensaje('Agrega productos al carrito antes de aplicar un código.');
    return;
  }

  const resultado = aplicarDescuento(codigo);
  if (!resultado.ok) {
    mostrarMensaje(resultado.detalle);
    return;
  }

  codigoDescuentoAplicado = codigo;
  limpiarMensaje();
  renderCartUI();
}

async function registrarVenta() {
  const checkoutButton = document.getElementById('checkout-button');

  if (!carrito.length) {
    mostrarMensaje('No hay productos en el carrito.');
    return;
  }

  try {
    if (checkoutButton) checkoutButton.disabled = true;

    const ventaResponse = await fetch(API_VENTA, {
      method: 'POST',
      headers: {
        'x-cart-items': encodeURIComponent(JSON.stringify(
          carrito.map((item) => ({
            id: item.id,
            quantity: item.cantidad
          }))
        )),
        'x-discount-code': codigoDescuentoAplicado
      }
    });

    if (!ventaResponse.ok) {
      const errorData = await ventaResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'No fue posible registrar la venta.');
    }

    carrito = [];
    codigoDescuentoAplicado = '';
    const discountInput = document.getElementById('discount-code-input');
    if (discountInput) discountInput.value = '';

    limpiarMensaje();
    mostrarMensaje('Compra realizada correctamente. Venta registrada en el servidor.', 'success');
    actualizarContadorCarrito();
    await getProductos();
  } catch (error) {
    mostrarMensaje(error.message || 'Error al procesar la compra.');
  } finally {
    renderCartUI();
    if (checkoutButton && carrito.length > 0) checkoutButton.disabled = false;
  }
}

function filtrarYRenderizar() {
  if (!buscar) {
    render(productos);
    return;
  }

  const termino = buscar.value.trim().toLowerCase();
  const activos = document.querySelector('[data-filter].active');
  const filter = activos ? activos.dataset.filter : 'todos';

  const categoryMap = {
    todos: null,
    electronica: 'electronics',
    joyeria: 'jewelery',
    ropa: ["men's clothing", "women's clothing"]
  };

  const filtradosCategoria = productos.filter((p) => {
    if (filter === 'todos') {
      return true;
    }
    const categoria = categoryMap[filter];
    if (Array.isArray(categoria)) {
      return categoria.includes(p.category);
    }
    return p.category === categoria;
  });

  const resultado = filtradosCategoria.filter((producto) => producto.title.toLowerCase().includes(termino));
  render(resultado);
}

function initEventos() {
  if (grid) {
    grid.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-id]');
      if (!button) {
        return;
      }

      const productId = Number(button.dataset.id);
      agregarAlCarrito(productId, 1);
    });
  }

  if (buscar) {
    buscar.addEventListener('input', filtrarYRenderizar);
  }

  const filterButtons = document.querySelectorAll('[data-filter]');
  filterButtons.forEach((button, index) => {
    if (index === 0) {
      button.classList.add('active');
    }

    button.addEventListener('click', (event) => {
      filterButtons.forEach((btn) => btn.classList.remove('active'));
      event.currentTarget.classList.add('active');
      filtrarYRenderizar();
    });
  });

  const applyDiscountBtn = document.getElementById('apply-discount-btn');
  if (applyDiscountBtn) {
    applyDiscountBtn.addEventListener('click', handleApplyDiscount);
  }

  const discountInput = document.getElementById('discount-code-input');
  if (discountInput) {
    discountInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleApplyDiscount();
      }
    });
  }

  const checkoutButton = document.getElementById('checkout-button');
  if (checkoutButton) {
    checkoutButton.addEventListener('click', registrarVenta);
  }
}

async function init() {
  if (yearLabel) {
    yearLabel.textContent = new Date().getFullYear();
  }

  initEventos();
  await getProductos();
  actualizarContadorCarrito();
  renderCartUI();
}

window.agregarAlCarrito = agregarAlCarrito;
window.removerDelCarrito = removerDelCarrito;
window.incrementarCantidad = incrementarCantidad;
window.decrementarCantidad = decrementarCantidad;

document.addEventListener('DOMContentLoaded', init);
