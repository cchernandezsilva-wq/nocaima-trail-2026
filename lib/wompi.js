// ====================================================================
// UTILIDADES CRIPTOGRÁFICAS Y API DE WOMPI - NOCAIMA TRAIL 2026
// ====================================================================

const crypto = require('crypto');

/**
 * Genera la firma de integridad SHA-256 requerida por Wompi para iniciar pagos.
 * Fórmula oficial de Wompi:
 * SHA256(referencia + montoEnCentavos + moneda + secretoIntegridad)
 * 
 * @param {string} referencia - Identificador único de la orden
 * @param {number|string} montoCentavos - Monto total en centavos
 * @param {string} moneda - 'COP'
 * @param {string} [secret] - Secreto de integridad (opcional, usa process.env si no se provee)
 * @returns {string} Hash SHA-256 en formato hexadecimal minúscula
 */
function generarFirmaIntegridad(referencia, montoCentavos, moneda = 'COP', secret = null) {
    const integritySecret = secret || process.env.WOMPI_INTEGRITY_SECRET || '';
    if (!integritySecret) {
        console.warn('[WOMPI] Advertencia: WOMPI_INTEGRITY_SECRET no está configurado');
    }
    const cadena = `${referencia}${montoCentavos}${moneda}${integritySecret}`;
    return crypto.createHash('sha256').update(cadena, 'utf8').digest('hex');
}

/**
 * Obtiene el valor anidado de un objeto usando una ruta tipo "transaction.status"
 */
function getPropiedadAnidada(obj, path) {
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), obj);
}

/**
 * Valida la autenticidad de un evento Webhook enviado por Wompi.
 * Fórmula oficial de Wompi:
 * Concatena en orden los valores de signature.properties encontrados en 'data',
 * luego concatena el timestamp y el secreto de eventos, y calcula el SHA-256.
 * 
 * @param {object} payload - Cuerpo JSON completo recibido en el webhook
 * @param {string} [secret] - Secreto de eventos (WOMPI_EVENTS_SECRET)
 * @returns {boolean} True si la firma es válida y auténtica de Wompi
 */
function validarChecksumWebhook(payload, secret = null) {
    if (!payload || !payload.signature || !payload.signature.properties || !payload.signature.checksum) {
        return false;
    }

    const eventsSecret = secret || process.env.WOMPI_EVENTS_SECRET || '';
    const { properties, checksum } = payload.signature;
    const { data, timestamp } = payload;

    // Concatenar los valores según las propiedades indicadas
    let cadena = '';
    for (const prop of properties) {
        const val = getPropiedadAnidada(data, prop);
        cadena += (val !== null && val !== undefined) ? String(val) : '';
    }

    // Agregar timestamp y secreto de eventos
    cadena += String(timestamp);
    cadena += eventsSecret;

    const hashCalculado = crypto.createHash('sha256').update(cadena, 'utf8').digest('hex');
    return hashCalculado.toLowerCase() === checksum.toLowerCase();
}

/**
 * Consulta el estado oficial de una transacción directamente en la API de Wompi.
 * (Mecanismo de Doble Verificación independiente)
 * 
 * @param {string} transactionId - ID de transacción entregado por Wompi
 * @returns {Promise<object>} Datos oficiales de la transacción
 */
async function consultarTransaccionWompi(transactionId) {
    const apiUrl = process.env.WOMPI_API_URL || 'https://sandbox.wompi.co/v1';
    const privateKey = process.env.WOMPI_PRIVATE_KEY || '';

    try {
        const res = await fetch(`${apiUrl}/transactions/${transactionId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${privateKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            throw new Error(`Error en API Wompi: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        return data.data;
    } catch (err) {
        console.error('[WOMPI] Error consultando transacción:', err.message);
        throw err;
    }
}

/**
 * Genera una referencia amigable y única para la carrera.
 * Ejemplo: NOC26-10K-A8F2K
 */
function generarReferenciaUnica(distancia) {
    const dist = (distancia || '10k').toUpperCase();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `NOC26-${dist}-${timestamp}${randomHex}`;
}

module.exports = {
    generarFirmaIntegridad,
    validarChecksumWebhook,
    consultarTransaccionWompi,
    generarReferenciaUnica
};
