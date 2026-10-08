# 🏔️ Plataforma de Pagos Wompi e Inscripciones - Maratón Nocaima Trail 2026

Plataforma profesional, segura y completa para la gestión de inscripciones, pagos en línea con **Wompi Bancolombia**, asignación automática de dorsales con código QR y panel administrativo de control.

---

## 🚀 Inicio Rápido (Local)

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Iniciar el servidor local**:
   ```bash
   npm start
   ```
   O en modo desarrollo con recarga automática:
   ```bash
   npm run dev
   ```

3. **Abrir en tu navegador**:
   - Página Principal de la Carrera: [http://localhost:3000](http://localhost:3000)
   - Portal de Consulta de Corredores: [http://localhost:3000/consulta.html](http://localhost:3000/consulta.html)
   - Panel Organizador (Admin): [http://localhost:3000/admin/index.html](http://localhost:3000/admin/index.html)
     *(Clave por defecto: `TICS2026`)*
   - Términos, Habeas Data y Reglamento: [http://localhost:3000/terminos.html](http://localhost:3000/terminos.html)

---

## 💳 Pruebas en Sandbox (Sin Dinero Real)

El proyecto viene preconfigurado con el entorno **Sandbox de Wompi** para que puedas probar todo el flujo de inicio a fin:

### Datos de Prueba Oficiales de Wompi Sandbox:

- **Tarjeta de Crédito / Débito Aprobada**:
  - Número: `4242 4242 4242 4242`
  - Vencimiento: Cualquier fecha futura (ej. `12/28`)
  - CVC: `123`
  - Cuotas: `1`

- **Tarjeta Rechazada (para probar mensaje de error)**:
  - Número: `4111 1111 1111 1111`

- **Nequi Sandbox**:
  - Celular Aprobado: `3991111111`
  - Celular Rechazado: `3992222222`

- **PSE Sandbox**:
  - Selecciona cualquier banco de prueba y completa la simulación.

---

## 🔒 Arquitectura de Seguridad Implementada

1. **Firma de Integridad Criptográfica SHA-256**:
   - El monto nunca se puede alterar desde el navegador. El servidor calcula:
     `SHA256(referencia + totalCentavos + 'COP' + WOMPI_INTEGRITY_SECRET)`
   - Wompi rechaza de inmediato cualquier intento de pago si la firma no coincide exactamente.

2. **Validación de Webhooks con Checksum**:
   - El endpoint `/api/webhook-wompi` valida la firma oficial de Bancolombia para asegurarse de que nadie simule pagos falsos.

3. **Doble Verificación contra la API de Wompi**:
   - Al recibir la aprobación, el servidor consulta directamente a `GET /v1/transactions/:id` para corroborar el estado bancario.

4. **Comisión de Wompi Transparente**:
   - Configurada en `lib/precios.js` para ser asumida por el corredor (2.65% + $700 COP + 19% IVA de comisión).
   - El corredor ve claramente: *Tarifa Oficial + Tarifa Pasarela = Total a Pagar*.

5. **Protección a Menores de Edad**:
   - Para la distancia 5K Familiar o menores de 18 años, el sistema exige y valida los datos de un adulto responsable / tutor legal (nombre, cédula, teléfono y parentesco) con autorización explícita.

6. **Cumplimiento Legal Colombiano (Ley 1581 de 2012)**:
   - Checkbox obligatorio de autorización de tratamiento de datos personales (Habeas Data) y aceptación del reglamento de carrera en [terminos.html](file:///c:/Users/CRISTIANH/Documents/YO/PAGINA%20CARRERA/terminos.html).

---

## 🗄️ Base de Datos: Supabase (PostgreSQL) o Local

El sistema cuenta con un conector híbrido inteligente (`lib/db.js`):

- **Sin configurar Supabase**: Los registros se guardan de forma segura e inmediata en la carpeta local `data/inscripciones.json`.
- **Con Supabase (Recomendado para Producción en la nube)**:
  1. Crea una cuenta gratuita en [Supabase.com](https://supabase.com).
  2. Crea un proyecto nuevo.
  3. Ve al **SQL Editor** en Supabase, pega el contenido de [supabase/schema.sql](file:///c:/Users/CRISTIANH/Documents/YO/PAGINA%20CARRERA/supabase/schema.sql) y dale **Run**.
  4. Copia tu `Project URL` y `service_role secret` (en Project Settings -> API).
  5. Pégalos en tu archivo `.env`:
     ```env
     SUPABASE_URL=https://tu-proyecto.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
     ```

---

## 🎟️ Asignación de Dorsales & Credencial con QR

Cuando Wompi confirma el pago:
- Se asigna automáticamente un número de dorsal correlativo único:
  - **5K Familiar**: #5001 en adelante.
  - **10K Aventura**: #1001 en adelante.
  - **21K Élite**: #2001 en adelante.
- Se genera el **Pasaporte Oficial con Código QR Dinámico** en `confirmacion.html`.
- El corredor puede imprimirlo o guardarlo en PDF.
- El día de la carrera en Nocaima, el organizador puede buscarlo o escanear el QR desde el celular y marcar el kit como entregado.

---

## 🌐 Despliegue Gratuito en Netlify o Vercel

### Despliegue en Netlify (100% Gratis):
1. Sube tu proyecto a un repositorio de GitHub (el archivo `.gitignore` ya protege tus claves).
2. Entra a [Netlify.com](https://netlify.com) y selecciona **"Add new site" -> "Import an existing project"**.
3. Selecciona tu repositorio.
4. Netlify detectará automáticamente el archivo [netlify.toml](file:///c:/Users/CRISTIANH/Documents/YO/PAGINA%20CARRERA/netlify.toml).
5. En **Site configuration -> Environment variables**, agrega las variables de tu archivo `.env` (`WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, etc.).
6. ¡Listo! Tu sitio estará en línea con HTTPS gratis.

---

## 🔄 Pasar a Producción con tu Cuenta Real de Wompi

Cuando tu cuenta comercial de Wompi esté verificada y aprobada por Bancolombia:
1. Ingresa a tu panel de Wompi -> **Desarrolladores**.
2. Copia tus llaves de **Producción**:
   - Llave pública (`pub_prod_...`)
   - Llave privada (`prv_prod_...`)
   - Secreto de integridad (`prod_integrity_...`)
   - Secreto de eventos (`prod_events_...`)
3. En la sección **URL de Eventos** de Wompi, configura tu Webhook:
   `https://tu-dominio.com/api/webhook-wompi`
4. Actualiza las variables correspondientes en tu hosting o en el archivo `.env`:
   ```env
   WOMPI_ENVIRONMENT=production
   WOMPI_API_URL=https://production.wompi.co/v1
   WOMPI_PUBLIC_KEY=pub_prod_...
   WOMPI_PRIVATE_KEY=prv_prod_...
   WOMPI_INTEGRITY_SECRET=prod_integrity_...
   WOMPI_EVENTS_SECRET=prod_events_...
   ```
