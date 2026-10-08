// ====================================================================
// ENDPOINT: CONSULTA DE ESTADO DE PAGO / TICKET DE CONFIRMACIÓN
// ====================================================================

const db = require('../lib/db');
const { consultarTransaccionWompi } = require('../lib/wompi');
const { enviarEmailConfirmacion } = require('../lib/email');

async function handleConsultarEstado(req, res) {
    try {
        const referencia = req.params.referencia || req.query.ref;
        const transactionId = req.query.id; // Parámetro enviado por Wompi al redirigir

        if (!referencia && !transactionId) {
            return res.status(400).json({ ok: false, error: 'Se requiere la referencia o el ID de transacción' });
        }

        let inscripcion = null;
        if (referencia) {
            inscripcion = await db.obtenerPorReferencia(referencia);
        }

        // Si tenemos transactionId de Wompi y la inscripción aún está PENDIENTE,
        // sincronizamos de inmediato consultando la API de Wompi (por si el webhook tardó unos segundos)
        if (transactionId && (!inscripcion || inscripcion.estado_pago === 'PENDIENTE')) {
            try {
                const dataWompi = await consultarTransaccionWompi(transactionId);
                if (dataWompi) {
                    const refWompi = dataWompi.reference;
                    if (!inscripcion && refWompi) {
                        inscripcion = await db.obtenerPorReferencia(refWompi);
                    }

                    if (inscripcion && dataWompi.status === 'APPROVED' && inscripcion.estado_pago !== 'APROBADO') {
                        inscripcion = await db.actualizarPagoAprobado(
                            inscripcion.referencia,
                            transactionId,
                            dataWompi.payment_method_type
                        );
                        await enviarEmailConfirmacion(inscripcion);
                    }
                }
            } catch (errSync) {
                console.warn('[ESTADO] Sincronización en vivo con Wompi no pudo completarse:', errSync.message);
            }
        }

        if (!inscripcion) {
            return res.status(404).json({ ok: false, error: 'Inscripción no encontrada' });
        }

        // Devolver únicamente los datos necesarios y seguros para visualización del atleta
        return res.status(200).json({
            ok: true,
            inscripcion: {
                referencia: inscripcion.referencia,
                nombres: inscripcion.nombres,
                distancia: (inscripcion.distancia || '').toUpperCase(),
                categoria: inscripcion.categoria,
                tallaCamiseta: inscripcion.tallaCamiseta || inscripcion.talla_camiseta,
                tipoDocumento: inscripcion.tipoDocumento || inscripcion.tipo_documento,
                documento: inscripcion.documento,
                estadoPago: inscripcion.estado_pago,
                dorsal: inscripcion.dorsal,
                totalPagarCOP: inscripcion.totalPagarCOP || inscripcion.total_pagar_cop,
                metodoPago: inscripcion.metodo_pago,
                pagadoEn: inscripcion.pagado_en,
                creadoEn: inscripcion.creado_en,
                esMenorEdad: inscripcion.esMenorEdad || inscripcion.es_menor_edad,
                nombreAcudiente: inscripcion.nombreAcudiente || inscripcion.nombre_acudiente
            }
        });

    } catch (err) {
        console.error('[ESTADO] Error al consultar estado:', err);
        return res.status(500).json({ ok: false, error: 'Error del servidor consultando estado' });
    }
}

module.exports = { handleConsultarEstado };
