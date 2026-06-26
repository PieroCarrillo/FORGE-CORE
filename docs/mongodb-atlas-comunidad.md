# MongoDB Atlas Free para Comunidad

## Objetivo

El modulo de Comunidad guarda resenas de usuarios en MongoDB Atlas, separado de MariaDB.

- MariaDB: usuarios, productos, carrito, pedidos, inventario y metricas del servidor.
- MongoDB Atlas: documentos flexibles de resenas, votos de utilidad y moderacion.

Esta separacion ayuda a demostrar dos modelos de datos en el proyecto:

| Modulo | Base de datos | Motivo |
| --- | --- | --- |
| Catalogo e inventario | MariaDB en EC2 DB Server | Datos relacionales, stock y transacciones. |
| Checkout | MariaDB en EC2 DB Server | Stored procedures y bloqueo de inventario. |
| Comunidad | MongoDB Atlas Free M0 | Comentarios/documentos flexibles por producto. |
| Metricas SO | MariaDB en EC2 DB Server | Historico numerico del servidor app. |

## Crear MongoDB gratis

1. Entra a MongoDB Atlas.
2. Crea un proyecto llamado `FORGE CORE`.
3. Crea un cluster gratis `M0`.
4. Crea un usuario de base de datos, por ejemplo:

```txt
Usuario: forge_community
Password: una_clave_segura
```

5. En `Network Access`, agrega la IP publica actual del App Server:

```txt
54.209.166.104/32
```

Si reinicias la instancia EC2 y cambia la IP publica, actualiza esta regla con la nueva IP.

## Variable de entorno en AWS

En el App Server, el archivo real es:

```bash
/opt/forge-core/backend/.env
```

Debe incluir estas variables:

```bash
MONGODB_URI=mongodb+srv://forge_community:TU_PASSWORD@TU_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=forge_core
```

MariaDB se mantiene igual:

```bash
DB_HOST=<IP_PRIVADA_DEL_DB_SERVER>
DB_PORT=3306
DB_USER=forge_app
DB_NAME=forge_core
```

## Coleccion usada

El backend crea automaticamente la coleccion:

```txt
product_reviews
```

Cada documento tiene una estructura similar:

```json
{
  "userId": 2,
  "userName": "Cliente Demo",
  "userEmail": "cliente@forgecore.local",
  "productId": 1,
  "productName": "RTX 4090 Ultra",
  "rating": 5,
  "title": "Excelente para gaming",
  "comment": "Buen rendimiento y compra simulada validada.",
  "verifiedPurchase": true,
  "helpfulUserIds": [2, 4],
  "helpfulCount": 2,
  "status": "published",
  "createdAt": "2026-06-26T00:00:00.000Z",
  "updatedAt": "2026-06-26T00:00:00.000Z"
}
```

## Endpoints

| Metodo | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/products/:id/reviews` | Lista resenas publicadas de un producto. |
| POST | `/api/products/:id/reviews` | Crea una resena autenticada. |
| POST | `/api/reviews/:id/helpful` | Marca una resena como util. |
| GET | `/api/account/reviews` | Lista mis resenas. |
| GET | `/api/admin/reviews` | Admin ve todas las resenas. |
| DELETE | `/api/admin/reviews/:id` | Admin oculta una resena. |

## Prueba rapida desde EC2 App Server

```bash
cd /opt/forge-core/backend
grep MONGODB_URI .env
sudo systemctl restart forge-core-api
curl http://127.0.0.1/api/health
```

Luego entra a la web, inicia sesion como cliente, abre `Comunidad`, publica una resena y revisa Atlas en:

```txt
Database > Browse Collections > forge_core > product_reviews
```

