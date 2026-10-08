// ====================================================================
// ENDPOINT: CONSULTA DE ATLETA POR DOCUMENTO (CÉDULA)
// ====================================================================

const db = require('../lib/db');

async function handleConsultaPorDocumento(req, res) {
    try {
        const { documento } = req.body || {};
        const docLimpio = String(documento || '').replace(/[^a-zA-Z0-9-]/g, '').trim();

        if (!docLimpio || docLimpio.length < 5) {
            return res.status(400).json({
                ok: false,
                error: 'Ingresa un número de documento válido (mínimo 5 caracteres).'
            });
        }

        const inscripciones = await db.obtenerPorDocumento(docLimpio);

        if (!inscripciones || inscripciones.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: `No se encontraron inscripciones registradas con el documento ${docLimpio}.`
            });
        }

        // Sanitizar respuesta pública (ocultar datos ultrasensibles como eps o emergencia)
        const resultados = inscripciones.map(i => ({
            referencia: i.referencia,
            nombres: i.nombres,
            distancia: (i.distancia || '').toUpperCase(),
            categoria: i.categoria,
            tallaCamiseta: i.tallaCamiseta || i.talla_camiseta,
            dorsal: i.dorsal || null,
            estadoPago: i.estado_pago,
            totalPagarCOP: i.totalPagarCOP || i.total_pagar_cop,
            fechaRegistro: i.creado_en,
            pagadoEn: i.pagado_en
        }));

        return res.status(200).json({
            ok: true,
            total: resultados.length,
            inscripciones: resultados
        });

    } catch (err) {
        console.error('[CONSULTA] Error en búsqueda por documento:', err);
        return res.status(500).json({ ok: false, error: 'Error procesando la consulta.' });
    }
}

module.exports = { handleConsultaPorDocumento };
