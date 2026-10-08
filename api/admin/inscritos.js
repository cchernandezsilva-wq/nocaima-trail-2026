// ====================================================================
// ENDPOINT: ADMINISTRACIÓN - LISTADO Y MÉTRICAS
// ====================================================================

const db = require('../../lib/db');

function verificarClaveAdmin(req) {
    const claveEsperada = process.env.ADMIN_SECRET_KEY || 'TICS2026';
    const claveRecibida = req.headers['x-admin-key'] || req.query.key;
    return claveRecibida && claveRecibida === claveEsperada;
}

async function handleAdminInscritos(req, res) {
    if (!verificarClaveAdmin(req)) {
        return res.status(401).json({ ok: false, error: 'Acceso no autorizado. Clave de administrador inválida.' });
    }

    try {
        const { distancia, estado, busqueda } = req.query;
        const inscripciones = await db.obtenerTodasInscripciones({ distancia, estado, busqueda });
        const metricas = await db.obtenerMetricasAdmin();

        return res.status(200).json({
            ok: true,
            metricas,
            inscripciones
        });
    } catch (err) {
        console.error('[ADMIN] Error obteniendo inscritos:', err);
        return res.status(500).json({ ok: false, error: 'Error del servidor en administración.' });
    }
}

async function handleAdminMarcarKit(req, res) {
    if (!verificarClaveAdmin(req)) {
        return res.status(401).json({ ok: false, error: 'Acceso no autorizado.' });
    }

    try {
        const { referencia, entregado } = req.body || {};
        const inscripcion = await db.obtenerPorReferencia(referencia);
        if (!inscripcion) {
            return res.status(404).json({ ok: false, error: 'Inscripción no encontrada' });
        }

        const entregadoBool = (entregado !== undefined) ? Boolean(entregado) : true;
        const actualizada = await db.actualizarKitEntregado(referencia, entregadoBool);

        return res.status(200).json({
            ok: true,
            mensaje: `Kit para ${actualizada.nombres} marcado como ${actualizada.kit_entregado ? 'ENTREGADO' : 'PENDIENTE'}.`,
            inscripcion: actualizada
        });
    } catch (err) {
        console.error('[ADMIN] Error actualizando estado de kit:', err);
        return res.status(500).json({ ok: false, error: 'Error actualizando kit.' });
    }
}

async function handleAdminAprobarManual(req, res) {
    if (!verificarClaveAdmin(req)) {
        return res.status(401).json({ ok: false, error: 'Acceso no autorizado. Clave de administrador inválida.' });
    }

    try {
        const { referencia, metodoPago, transaccionId } = req.body || {};
        if (!referencia) {
            return res.status(400).json({ ok: false, error: 'La referencia es obligatoria.' });
        }

        const inscripcion = await db.obtenerPorReferencia(referencia);
        if (!inscripcion) {
            return res.status(404).json({ ok: false, error: 'Inscripción no encontrada.' });
        }

        if (inscripcion.estado_pago === 'APROBADO') {
            return res.status(200).json({
                ok: true,
                mensaje: `La inscripción ya está aprobada con dorsal #${inscripcion.dorsal}.`,
                inscripcion
            });
        }

        const transId = transaccionId || `MANUAL-${Date.now().toString(36).toUpperCase()}`;
        const metodo = metodoPago || 'EFECTIVO / TRANSFERENCIA MANUAL';
        const aprobada = await db.actualizarPagoAprobado(referencia, transId, metodo);

        // Disparar envío de correo si está configurado
        try {
            const { enviarEmailConfirmacion } = require('../../lib/email');
            await enviarEmailConfirmacion(aprobada);
        } catch (emailErr) {
            console.warn('[ADMIN] Notificación de email omitida en pago manual:', emailErr.message);
        }

        return res.status(200).json({
            ok: true,
            mensaje: `Pago aprobado exitosamente para ${aprobada.nombres}. Dorsal asignado: #${aprobada.dorsal}`,
            inscripcion: aprobada
        });
    } catch (err) {
        console.error('[ADMIN] Error aprobando pago manual:', err);
        return res.status(500).json({ ok: false, error: 'Error procesando la aprobación manual.' });
    }
}

module.exports = {
    handleAdminInscritos,
    handleAdminMarcarKit,
    handleAdminAprobarManual,
    verificarClaveAdmin
};
