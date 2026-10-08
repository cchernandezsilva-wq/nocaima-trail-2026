// ====================================================================
// SERVIDOR PRINCIPAL HTTP / API - NOCAIMA TRAIL 2026
// ====================================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { handleCrearInscripcion } = require('./api/inscripciones');
const { handleWebhookWompi } = require('./api/webhook-wompi');
const { handleConsultarEstado } = require('./api/estado');
const { handleConsultaPorDocumento } = require('./api/consulta');
const { handleAdminInscritos, handleAdminMarcarKit, handleAdminAprobarManual } = require('./api/admin/inscritos');
const { handleAdminExportar } = require('./api/admin/exportar');
const { PRECIOS_BASE, calcularPrecioInscripcion } = require('./lib/precios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cabeceras básicas de seguridad
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Servir archivos estáticos del frontend (HTML, CSS, JS, imágenes)
app.use(express.static(path.join(__dirname)));

// --------------------------------------------------------------------
// RUTAS DE LA API
// --------------------------------------------------------------------

// 1. Estado de salud
app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        evento: 'Maratón Nocaima Trail 2026',
        ambiente: process.env.WOMPI_ENVIRONMENT || 'sandbox',
        timestamp: new Date().toISOString()
    });
});

// 2. Configuración pública para el frontend (Llave pública Wompi y precios)
app.get('/api/config', (req, res) => {
    const desgloses = {
        '5k': calcularPrecioInscripcion('5k'),
        '10k': calcularPrecioInscripcion('10k'),
        '21k': calcularPrecioInscripcion('21k')
    };

    res.json({
        ok: true,
        wompiPublicKey: process.env.WOMPI_PUBLIC_KEY || 'pub_stagtest_g2u0UQyK3YxFjhTXUhST3TQvxYsMmz2x',
        environment: process.env.WOMPI_ENVIRONMENT || 'sandbox',
        currency: process.env.CURRENCY || 'COP',
        precios: desgloses
    });
});

// 3. Crear inscripción y generar firma Wompi
app.post('/api/inscripciones', handleCrearInscripcion);

// 4. Webhook oficial de Wompi
app.post('/api/webhook-wompi', handleWebhookWompi);

// 5. Consultar estado de inscripción por referencia o transacción
app.get('/api/estado/:referencia', handleConsultarEstado);
app.get('/api/estado', handleConsultarEstado);

// 6. Búsqueda de atletas por cédula
app.post('/api/consulta', handleConsultaPorDocumento);

// 7. Rutas de administración
app.get('/api/admin/inscritos', handleAdminInscritos);
app.post('/api/admin/entregar-kit', handleAdminMarcarKit);
app.post('/api/admin/aprobar-manual', handleAdminAprobarManual);
app.get('/api/admin/exportar', handleAdminExportar);

// --------------------------------------------------------------------
// INICIO DEL SERVIDOR
// --------------------------------------------------------------------
app.listen(PORT, () => {
    console.log('====================================================================');
    console.log(`🏃 Servidor Nocaima Trail 2026 activo en: http://localhost:${PORT}`);
    console.log(`💳 Entorno Wompi: ${(process.env.WOMPI_ENVIRONMENT || 'sandbox').toUpperCase()}`);
    console.log(`🔒 Panel Administrador: http://localhost:${PORT}/admin/index.html`);
    console.log('====================================================================');
});
