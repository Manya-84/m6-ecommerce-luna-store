const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTOS_FILE = path.join(DATA_DIR, 'productos.json');
const VENTAS_FILE = path.join(DATA_DIR, 'ventas.json');

app.use(express.json());
app.use(express.static(__dirname));

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'El cuerpo JSON de la solicitud es inválido.' });
  }
  return next(error);
});

async function readJsonFile(filePath, defaultValue = []) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeJsonFile(filePath, defaultValue);
      return defaultValue;
    }
    throw error;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

function sanitizeProductInput(input) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const image = typeof input.image === 'string' ? input.image.trim() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const category = typeof input.category === 'string' ? input.category.trim() : '';

  const price = Number(input.price);
  const stock = Number(input.stock);

  if (!title) throw new Error('El campo title es obligatorio.');
  if (!Number.isFinite(price) || price <= 0) throw new Error('El campo price debe ser un número mayor a 0.');
  if (!Number.isInteger(stock) || stock < 0) throw new Error('El campo stock debe ser un entero mayor o igual a 0.');

  return {
    title,
    price,
    description,
    category,
    image,
    stock
  };
}

function parseCartItemsHeader(req) {
  const rawItems = req.header('x-cart-items');

  if (!rawItems) {
    throw new Error('Debe enviar los productos de la venta en el header x-cart-items.');
  }

  let parsedItems;

  try {
    parsedItems = JSON.parse(decodeURIComponent(rawItems));
  } catch (error) {
    throw new Error('El header x-cart-items no contiene un JSON válido.');
  }

  if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
    throw new Error('La venta debe incluir al menos un producto.');
  }

  const normalizedItems = parsedItems.map((item) => ({
    id: Number(item?.id),
    quantity: Number(item?.quantity)
  }));

  if (
    normalizedItems.some(
      (item) => !Number.isInteger(item.id) || item.id <= 0 || !Number.isInteger(item.quantity) || item.quantity <= 0
    )
  ) {
    throw new Error('Los productos enviados para la venta no son válidos.');
  }

  return normalizedItems.reduce((accumulator, item) => {
    const existingItem = accumulator.find((entry) => entry.id === item.id);

    if (existingItem) {
      existingItem.quantity += item.quantity;
      return accumulator;
    }

    accumulator.push(item);
    return accumulator;
  }, []);
}

function calculateSaleTotals(subtotal, discountCode) {
  const shippingBase = 3990;
  const normalizedCode = typeof discountCode === 'string' ? discountCode.trim().toUpperCase() : '';
  let shipping = shippingBase;
  let discount = 0;

  if (normalizedCode === 'PROMO10' && subtotal >= 30000) {
    discount = Math.min(subtotal * 0.1, 50000);
  }

  if (normalizedCode === 'ENVIOGRATIS' && subtotal >= 25000) {
    shipping = 0;
    discount = shippingBase;
  }

  return {
    subtotal,
    shipping,
    discount,
    total: subtotal + shipping - discount,
    discountCode: normalizedCode || null
  };
}

app.get('/productos', async (req, res) => {
  try {
    const productos = await readJsonFile(PRODUCTOS_FILE, []);
    return res.status(200).json(productos);
  } catch (error) {
    return res.status(500).json({ error: 'No fue posible leer productos.' });
  }
});

app.post(['/productos', '/producto'], async (req, res) => {
  try {
    const productos = await readJsonFile(PRODUCTOS_FILE, []);
    const nuevoProducto = sanitizeProductInput(req.body || {});

    const maxId = productos.reduce((max, producto) => Math.max(max, producto.id || 0), 0);
    const productoConId = { id: maxId + 1, ...nuevoProducto };

    productos.push(productoConId);
    await writeJsonFile(PRODUCTOS_FILE, productos);

    return res.status(201).json({ message: 'Producto registrado correctamente.', product: productoConId });
  } catch (error) {
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'No fue posible registrar el producto.' });
  }
});

app.put('/producto', async (req, res) => {
  try {
    const productId = Number(req.body?.id ?? req.query?.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'Debe enviar un id de producto válido.' });
    }

    const productos = await readJsonFile(PRODUCTOS_FILE, []);
    const index = productos.findIndex((producto) => producto.id === productId);

    if (index === -1) {
      return res.status(404).json({ error: `No existe producto con id ${productId}.` });
    }

    const productoActual = productos[index];
    const body = req.body || {};

    const parcial = {
      ...productoActual,
      ...body
    };

    const stock = Number(parcial.stock);
    const price = Number(parcial.price);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: 'El campo price debe ser un número mayor a 0.' });
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: 'El campo stock debe ser un entero mayor o igual a 0.' });
    }

    if (typeof parcial.title !== 'string' || parcial.title.trim() === '') {
      return res.status(400).json({ error: 'El campo title es obligatorio.' });
    }

    const nuevoProducto = {
      id: productId,
      title: parcial.title.trim(),
      price,
      description: typeof parcial.description === 'string' ? parcial.description.trim() : '',
      category: typeof parcial.category === 'string' ? parcial.category.trim() : '',
      image: typeof parcial.image === 'string' ? parcial.image.trim() : '',
      stock
    };

    productos[index] = nuevoProducto;
    await writeJsonFile(PRODUCTOS_FILE, productos);

    return res.status(200).json({ message: 'Producto actualizado correctamente.', product: nuevoProducto });
  } catch (error) {
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'No fue posible actualizar el producto.' });
  }
});

app.delete('/producto', async (req, res) => {
  try {
    const productId = Number(req.body?.id ?? req.query?.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'Debe enviar un id de producto válido.' });
    }

    const productos = await readJsonFile(PRODUCTOS_FILE, []);
    const productIndex = productos.findIndex((producto) => producto.id === productId);

    if (productIndex === -1) {
      return res.status(404).json({ error: `No existe producto con id ${productId}.` });
    }

    const [productoEliminado] = productos.splice(productIndex, 1);
    await writeJsonFile(PRODUCTOS_FILE, productos);

    return res.status(200).json({ message: 'Producto eliminado correctamente.', product: productoEliminado });
  } catch (error) {
    return res.status(500).json({ error: 'No fue posible eliminar el producto.' });
  }
});

app.post('/venta', async (req, res) => {
  try {
    const cartItems = parseCartItemsHeader(req);
    const discountCode = req.header('x-discount-code') || '';
    const productos = await readJsonFile(PRODUCTOS_FILE, []);
    const ventas = await readJsonFile(VENTAS_FILE, []);
    const productosActualizados = productos.map((producto) => ({ ...producto }));
    const saleItems = [];

    for (const cartItem of cartItems) {
      const productIndex = productosActualizados.findIndex((producto) => producto.id === cartItem.id);

      if (productIndex === -1) {
        return res.status(404).json({ error: `No existe producto con id ${cartItem.id}.` });
      }

      const producto = productosActualizados[productIndex];

      if (producto.stock < cartItem.quantity) {
        return res.status(409).json({ error: `Stock insuficiente para ${producto.title}.` });
      }

      producto.stock -= cartItem.quantity;

      saleItems.push({
        productId: producto.id,
        title: producto.title,
        quantity: cartItem.quantity,
        unitPrice: producto.price,
        lineTotal: producto.price * cartItem.quantity
      });
    }

    const subtotal = saleItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const totals = calculateSaleTotals(subtotal, discountCode);

    const nuevaVenta = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      ...totals,
      items: saleItems
    };

    try {
      await writeJsonFile(PRODUCTOS_FILE, productosActualizados);
      await writeJsonFile(VENTAS_FILE, [...ventas, nuevaVenta]);
    } catch (error) {
      try {
        await writeJsonFile(PRODUCTOS_FILE, productos);
      } catch (rollbackError) {
        console.error('No fue posible restaurar productos tras error en venta.', rollbackError);
      }
      throw error;
    }

    return res.status(201).json({ message: 'Venta registrada correctamente.', sale: nuevaVenta });
  } catch (error) {
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'No fue posible registrar la venta.' });
  }
});

app.get('/ventas', async (req, res) => {
  try {
    const ventas = await readJsonFile(VENTAS_FILE, []);
    return res.status(200).json(ventas);
  } catch (error) {
    return res.status(500).json({ error: 'No fue posible leer ventas.' });
  }
});

app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'index.html'));
});

app.use((req, res) => {
  return res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
