// ====================================================================
// WEBHOOK OFICIAL DE EVENTOS WOMPI
// ====================================================================

const { validarChecksumWebhook, consultarTransaccionWompi } = require('../lib/wompi');
const { enviarEmailConfirmacion } = require('../lib/email');
const db = require('../lib/db');

async function handleWebhookWompi(req, res) {
    try {
        const payload = req.body;

        if (!payload || !payload.event) {
            return res.status(400).json({ error: 'Payload de webhook inválido' });
        }

        console.log(`[WEBHOOK WOMPI] Recibido evento: ${payload.event} a las ${new Date().toISOString()}`);

        // 1. Validar Checksum de seguridad si está configurado el secreto de eventos
        const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
        if (eventsSecret && !validarChecksumWebhook(payload, eventsSecret)) {
            console.error('[WEBHOOK WOMPI] ❌ Checksum inválido. Posible solicitud no autorizada.');
            return res.status(401).json({ error: 'Firma de evento inválida' });
        }

        // 2. Control de idempotencia (evitar procesar la misma transacción 2 veces)
        const registroIdempotencia = await db.registrarWebhook(payload);
        if (registroIdempotencia.duplicado) {
            console.log('[WEBHOOK WOMPI] Evento duplicado ignorado con éxito.');
            return res.status(200).json({ status: 'ok', mensaje: 'Evento ya procesado' });
        }

        // 3. Procesar evento de actualización de transacción
        if (payload.event === 'transaction.updated') {
            const transaccion = payload.data?.transaction;
            if (!transaccion) {
                return res.status(400).json({ error: 'Faltan datos de la transacción' });
            }

            const { id: transaccionId, reference: referencia, status: estado, payment_method_type: metodoPago } = transaccion;

            console.log(`[WEBHOOK WOMPI] Transacción ${transaccionId} para referencia ${referencia}: Estado=${estado}`);

            // Buscar la inscripción en base de datos
            const inscripcion = await db.obtenerPorReferencia(referencia);
            if (!inscripcion) {
                console.warn(`[WEBHOOK WOMPI] Referencia ${referencia} no encontrada en la base de datos.`);
                return res.status(200).json({ status: 'ok', advertencia: 'Referencia no encontrada' });
            }

            if (estado === 'APPROVED') {
                // Doble verificación opcional consultando directamente a la API de Wompi
                try {
                    const datosOficiales = await consultarTransaccionWompi(transaccionId);
                    if (datosOficiales && datosOficiales.status !== 'APPROVED') {
                        console.error('[WEBHOOK WOMPI] ❌ Discrepancia detectada con la API de Wompi.');
                        return res.status(400).json({ error: 'Estado inconsistente' });
                    }
                } catch (e) {
                    console.warn('[WEBHOOK WOMPI] Consulta de doble verificación omitida:', e.message);
                }

                // Actualizar a APROBADO y asignar Dorsal oficial
                const inscripcionActualizada = await db.actualizarPagoAprobado(referencia, transaccionId, metodoPago);
                console.log(`[WEBHOOK WOMPI] ✅ Pago APROBADO para ${referencia}. Dorsal asignado: #${inscripcionActualizada?.dorsal}`);

                // Enviar correo de confirmación
                if (inscripcionActualizada) {
                    await enviarEmailConfirmacion(inscripcionActualizada);
                }

            } else if (estado === 'DECLINED' || estado === 'VOIDED' || estado === 'ERROR') {
                await db.actualizarEstadoPago(referencia, estado, transaccionId);
                console.log(`[WEBHOOK WOMPI] Estado actualizado a ${estado} para ${referencia}`);
            }
        }

        // Siempre responder 200 a Wompi para confirmar recepción
        return res.status(200).json({ status: 'ok' });

    } catch (err) {
        console.error('[WEBHOOK WOMPI] Error inesperado:', err);
        return res.status(500).json({ error: 'Error procesando webhook' });
    }
}

module.exports = { handleWebhookWompi };
