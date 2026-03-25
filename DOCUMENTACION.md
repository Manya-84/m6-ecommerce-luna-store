# Documentación técnica - Luna Store (Módulo 6)

## 1) Backend

El backend está implementado en `server.js` con Express y persistencia en archivos JSON.

### Persistencia

- `data/productos.json`: catálogo de productos con stock.
- `data/ventas.json`: historial de ventas.

Se usa `fs/promises` para manipular archivos de forma asíncrona.

## 2) Rutas REST

### GET /

Entrega la aplicación cliente principal.

**Respuesta**
- `200 OK` con `index.html`.

---

### GET /productos

Devuelve todos los productos registrados con su inventario.

**Respuesta**
- `200 OK` con arreglo JSON.
- `500 Internal Server Error` si falla lectura de archivo.

---

### POST /productos
### POST /producto

Registra un nuevo producto.

**Body ejemplo**

```json
{
  "title": "Teclado Mecánico",
  "price": 32990,
  "description": "Switches red",
  "category": "electronics",
  "image": "https://...",
  "stock": 10
}
```

**Respuesta**
- `201 Created` con el producto creado.
- `400 Bad Request` si faltan datos o son inválidos.
- `500 Internal Server Error` en error inesperado.

---

### PUT /producto

Actualiza un producto existente.

**Body ejemplo**

```json
{
  "id": 1,
  "title": "Auriculares Inalámbricos LunaSound",
  "price": 39990,
  "description": "Actualizado",
  "category": "electronics",
  "image": "https://...",
  "stock": 8
}
```

**Respuesta**
- `200 OK` producto actualizado.
- `400 Bad Request` datos inválidos.
- `404 Not Found` producto no existe.
- `500 Internal Server Error` error no controlado.

---

### DELETE /producto

Elimina un producto por `id` (query o body).

**Ejemplo**
- `DELETE /producto?id=3`

**Respuesta**
- `200 OK` con producto eliminado.
- `400 Bad Request` id inválido.
- `404 Not Found` id no existente.
- `500 Internal Server Error` error inesperado.

---

### POST /venta

Registra una venta en `ventas.json` con id UUID.

- El frontend llama esta ruta **sin payload en el body**.
- El frontend envía el carrito serializado en el header `x-cart-items` y, si aplica, el código en `x-discount-code`.
- El servidor valida stock disponible, recalcula subtotal, descuento, envío y total, actualiza inventario y registra la venta.

**Respuesta**
- `201 Created` con venta registrada.
- `400 Bad Request` si el header o el carrito son inválidos.
- `404 Not Found` si uno de los productos no existe.
- `409 Conflict` si el stock no alcanza.
- `500 Internal Server Error` si falla la escritura.

---

### GET /ventas

Devuelve todas las ventas almacenadas.

**Respuesta**
- `200 OK` con arreglo de ventas.
- `500 Internal Server Error` si falla lectura.

## 3) Flujo frontend-backend

1. Frontend solicita `GET /productos` y renderiza catálogo.
2. Usuario agrega productos al carrito.
3. Al presionar `Comprar ahora`:
  - se serializa el carrito en headers,
  - se ejecuta `POST /venta` sin body,
  - el backend valida stock y descuenta inventario,
   - se vacía carrito y se refresca catálogo.

## 4) Manejo de errores

- Validaciones de campos (`price`, `stock`, `title`, `id`).
- Captura de excepciones con `try/catch` en todas las rutas.
- Mensajes de error JSON consistentes.
- Códigos HTTP acordes al tipo de falla.

## 5) Evidencia de actualización de inventario

Después de una compra:

- `data/productos.json` disminuye stock por producto vendido.
- `data/ventas.json` agrega un objeto con:
  - `id` (UUID)
  - `createdAt`
  - `total`
  - `items[]`
