# Luna Store - Entrega Módulo 6

Entrega del Módulo 6 del proyecto e-commerce, con backend REST básico y frontend conectado por `fetch`.

## Datos de la entrega

- Módulo: 6
- Autor/a: Fabian Umaña
- Repositorio GitHub: https://github.com/Manya-84/m6-ecommerce-luna-store

## Objetivo del proyecto

Implementar un servidor que:

- gestione productos y ventas mediante API REST,
- use módulo File System para persistencia en JSON,
- reciba la compra desde el botón **Comprar ahora**,
- registre ventas con `uuid`,
- actualice inventario luego de la compra,
- y devuelva códigos HTTP según cada caso.

## Estructura

```
m6_cierre_ecommerce/
├── index.html
├── producto.html
├── css/styles.css
├── js/app.js
├── server.js
├── package.json
├── package-lock.json
├── data/
│   ├── productos.json
│   └── ventas.json
├── DOCUMENTACION.md
└── README.md
```

## Tecnologías

- Frontend: HTML5, CSS3, Bootstrap 5, JavaScript
- Backend: Node.js, Express
- Persistencia: File System (`fs/promises`) con archivos JSON
- Identificadores de venta: `uuid`

## Instalación y ejecución

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Iniciar servidor:

   ```bash
   npm start
   ```

3. Abrir en navegador:

   ```
   http://localhost:3000
   ```

## API REST implementada

### Cliente

- `GET /` → entrega la aplicación cliente (`index.html`).

### Productos

- `GET /productos` → lista productos con stock.
- `POST /productos` → crea producto nuevo.
- `POST /producto` → alias para crear producto (compatibilidad con pauta).
- `PUT /producto` → modifica producto registrado.
- `DELETE /producto` → elimina producto por `id`.

### Ventas

- `POST /venta` → registra una venta nueva en `ventas.json` (sin payload).
- `GET /ventas` → devuelve ventas almacenadas.

## Flujo de compra implementado

1. Usuario agrega productos al carrito.
2. `Comprar ahora` ejecuta `POST /venta` sin payload en el body.
3. El frontend envía el carrito serializado en headers HTTP para cumplir la restricción de body vacío.
4. El servidor valida stock, recalcula montos, actualiza `productos.json` y registra la venta con id `uuid` en `data/ventas.json`.
5. Se recarga el catálogo con stock actualizado.

## Códigos HTTP utilizados

- `200 OK`: lecturas y actualizaciones correctas.
- `201 Created`: creación de producto o venta.
- `400 Bad Request`: datos inválidos o venta sin ítems pendientes.
- `404 Not Found`: producto o ruta inexistente.
- `500 Internal Server Error`: error inesperado de servidor/archivo.

## Requerimientos de evaluación cubiertos

1. **File System**: lectura/escritura de `productos.json` y `ventas.json` con `fs/promises`.
2. **Manejo de excepciones**: `try/catch` en todas las rutas críticas.
3. **Comprar ahora + POST /venta sin payload**: implementado en frontend y backend.
4. **API REST solicitada**: rutas creadas para productos y ventas.
5. **Status HTTP**: respuestas con códigos adecuados por situación.

## Publicación solicitada

- El proyecto está preparado para subirse a un repositorio público de GitHub.
- El README ya incluye objetivos y autor/a.
- URL del repositorio: https://github.com/Manya-84/m6-ecommerce-luna-store
- Luego se puede enlazar ese repositorio en la sección Portafolio del repositorio de portafolio.
