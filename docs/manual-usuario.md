# Manual de Uso Basico

## Inicio

Abre la URL publica del App Server. La primera pantalla muestra el hero de FORGE CORE con acceso directo al catalogo.

## Catalogo

1. Entra a `Productos`.
2. Filtra por GPU, RAM, CPU, SSD o Fuente.
3. Usa el buscador para encontrar productos por nombre, marca o categoria.
4. Pulsa `Detalle` para ver especificaciones.
5. Pulsa `Agregar` para sumar el producto al carrito.

## Detalle de producto

La vista muestra marca, categoria, rating, descripcion, especificaciones y precio. Desde aqui tambien puedes agregar el producto al carrito.

## Carrito

1. Entra a `Carrito`.
2. Ajusta cantidades con los botones de suma/resta.
3. Elimina productos con el boton de papelera.
4. Revisa subtotal, IGV, envio y total.
5. Pulsa `Simular pago`.

Si el backend y MariaDB estan activos, el pago ejecuta el stored procedure `sp_create_simulated_order` y descuenta stock.

## Admin

La seccion `Admin` muestra:

- Ventas simuladas.
- Cantidad de items.
- Productos con stock bajo.
- Estado de la base de datos.
- Uso de CPU, RAM, disco y procesos activos recolectados por el worker del backend.
