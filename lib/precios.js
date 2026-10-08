// ====================================================================
// GESTOR DE PRECIOS Y COMISIONES WOMPI - NOCAIMA TRAIL 2026
// ====================================================================

// Precios oficiales definidos exclusivamente en el backend (seguridad)
const PRECIOS_BASE = {
    '5k': {
        nombre: '5K Iniciación & Familiar',
        distancia: '5k',
        precioCOP: 75000,
        dorsalBase: 5001
    },
    '10k': {
        nombre: '10K Desafío Aventura',
        distancia: '10k',
        precioCOP: 95000,
        dorsalBase: 1001
    },
    '21k': {
        nombre: '21K Media Maratón Élite',
        distancia: '21k',
        precioCOP: 125000,
        dorsalBase: 2001
    }
};

/**
 * Calcula el desglose financiero exacto de la inscripción,
 * sumando la comisión de la pasarela de pagos Wompi asumida por el corredor.
 * 
 * @param {string} distancia - '5k', '10k' o '21k'
 * @returns {object} Desglose con base, comisión, total COP y centavos
 */
function calcularPrecioInscripcion(distancia) {
    const key = (distancia || '').toLowerCase();
    const config = PRECIOS_BASE[key];

    if (!config) {
        throw new Error(`Distancia no válida: ${distancia}. Opciones: 5k, 10k, 21k`);
    }

    const precioBase = config.precioCOP;

    // Configuración de comisiones Wompi (desde .env o valores por defecto)
    const feePercentage = parseFloat(process.env.WOMPI_FEE_PERCENTAGE || '2.65');
    const feeFixed = parseInt(process.env.WOMPI_FEE_FIXED_COP || '700', 10);
    const vatRate = parseFloat(process.env.WOMPI_FEE_VAT_PERCENTAGE || '19') / 100;

    // Cálculo: (Precio * %) + Fijo + IVA sobre comisión
    const comisionBase = (precioBase * (feePercentage / 100)) + feeFixed;
    const ivaComision = comisionBase * vatRate;
    const comisionTotal = Math.round(comisionBase + ivaComision);

    // Redondear a la centena más cercana para cifras limpias en pesos colombianos
    const comisionRedondeada = Math.ceil(comisionTotal / 100) * 100;
    const totalPagar = precioBase + comisionRedondeada;
    
    // Wompi exige el valor en centavos (ej: $98.800 COP -> 9880000 centavos)
    const totalCentavos = totalPagar * 100;

    return {
        distancia: key,
        nombreDistancia: config.nombre,
        precioBaseCOP: precioBase,
        comisionWompiCOP: comisionRedondeada,
        totalPagarCOP: totalPagar,
        totalCentavos: totalCentavos,
        moneda: process.env.CURRENCY || 'COP',
        dorsalBase: config.dorsalBase
    };
}

module.exports = {
    PRECIOS_BASE,
    calcularPrecioInscripcion
};
