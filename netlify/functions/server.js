// ====================================================================
// NETLIFY SERVERLESS FUNCTION ENTRYPOINT
// ====================================================================

const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');

const { handleCrearInscripcion } = require('../../api/inscripciones');
const { handleWebhookWompi } = require('../../api/webhook-wompi');
const { handleConsultarEstado } = require('../../api/estado');
const { handleConsultaPorDocumento } = require('../../api/consulta');
const { handleAdminInscritos, handleAdminMarcarKit, handleAdminAprobarManual } = require('../../api/admin/inscritos');
const { handleAdminExportar } = require('../../api/admin/exportar');
const { calcularPrecioInscripcion } = require('../../lib/precios');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de normalización de rutas para Netlify Functions:
// Permite que la API responda correctamente sin importar cómo Netlify pase la ruta
app.use((req, res, next) => {
    if (req.url.startsWith('/.netlify/functions/server')) {
        req.url = req.url.replace('/.netlify/functions/server', '');
    }
    if (!req.url.startsWith('/api')) {
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    next();
});

// Rutas /api
app.get('/api/health', (req, res) => {
    res.json({ ok: true, host: 'Netlify Functions', timestamp: new Date().toISOString() });
});

app.get('/api/config', (req, res) => {
    res.json({
        ok: true,
        wompiPublicKey: process.env.WOMPI_PUBLIC_KEY || 'pub_stagtest_g2u0UQyK3YxFjhTXUhST3TQvxYsMmz2x',
        environment: process.env.WOMPI_ENVIRONMENT || 'sandbox',
        currency: process.env.CURRENCY || 'COP',
        precios: {
            '5k': calcularPrecioInscripcion('5k'),
            '10k': calcularPrecioInscripcion('10k'),
            '21k': calcularPrecioInscripcion('21k')
        }
    });
});

app.post('/api/inscripciones', handleCrearInscripcion);
app.post('/api/webhook-wompi', handleWebhookWompi);
app.get('/api/estado/:referencia', handleConsultarEstado);
app.get('/api/estado', handleConsultarEstado);
app.post('/api/consulta', handleConsultaPorDocumento);
app.get('/api/admin/inscritos', handleAdminInscritos);
app.post('/api/admin/entregar-kit', handleAdminMarcarKit);
app.post('/api/admin/aprobar-manual', handleAdminAprobarManual);
app.get('/api/admin/exportar', handleAdminExportar);

module.exports.handler = serverless(app);
