// ====================================================================
// CAPA DE BASE DE DATOS HÍBRIDA (SUPABASE + LOCAL STORAGE)
// ====================================================================
// Funciona de forma automática:
// 1. Si configuras SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env, usa Supabase PostgreSQL.
// 2. Si no tienes Supabase aún, almacena de forma segura en archivo local JSON,
//    permitiendo pruebas completas y funcionamiento sin dependencias externas.

const fs = require('fs');
const path = require('path');

// En entornos serverless (Netlify, AWS Lambda), el sistema de archivos raíz es de solo lectura.
const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);
const DATA_DIR = isServerless ? path.join('/tmp', 'nocaima_data') : path.join(__dirname, '..', 'data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'inscripciones.json');
const WEBHOOKS_FILE = path.join(DATA_DIR, 'webhooks.json');

// Asegurar que exista la carpeta de datos
try {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
} catch (e) {
    console.warn('[DB] Advertencia al crear directorio de datos:', e.message);
}

function leerArchivoJSON(ruta, fallback = []) {
    try {
        if (!fs.existsSync(ruta)) {
            try {
                fs.writeFileSync(ruta, JSON.stringify(fallback, null, 2), 'utf8');
            } catch (_) {}
            return fallback;
        }
        const raw = fs.readFileSync(ruta, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error(`[DB] Error leyendo ${ruta}:`, err.message);
        return fallback;
    }
}

function guardarArchivoJSON(ruta, data) {
    try {
        fs.writeFileSync(ruta, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.warn(`[DB] Error escribiendo ${ruta} (esperado en algunos entornos serverless):`, err.message);
        return false;
    }
}

// Rangos iniciales de Dorsales por distancia
const DORSALES_BASE = {
    '5k': 5001,
    '10k': 1001,
    '21k': 2001
};

/**
 * Normaliza un registro de inscripción para que cuente tanto con propiedades
 * camelCase como snake_case, garantizando compatibilidad total con el frontend,
 * exports CSV y bases de datos SQL.
 */
function normalizarInscripcion(obj) {
    if (!obj || typeof obj !== 'object') return null;

    const tipoDoc = obj.tipoDocumento || obj.tipo_documento || 'CC';
    const talla = obj.tallaCamiseta || obj.talla_camiseta || obj.talla || 'M';
    const precioBase = Number(obj.precioBaseCOP || obj.precio_base_cop || 0);
    const comision = Number(obj.comisionWompiCOP || obj.comision_wompi_cop || 0);
    const totalPagar = Number(obj.totalPagarCOP || obj.total_pagar_cop || 0);
    const centavos = Number(obj.totalCentavos || obj.total_centavos || (totalPagar * 100));
    const esMenor = Boolean(obj.esMenorEdad !== undefined ? obj.esMenorEdad : obj.es_menor_edad);
    const kitEntregado = Boolean(obj.kit_entregado !== undefined ? obj.kit_entregado : obj.kitEntregado);
    const estadoPago = obj.estado_pago || obj.estadoPago || 'PENDIENTE';

    return {
        ...obj,
        referencia: obj.referencia,
        distancia: (obj.distancia || '').toLowerCase(),
        nombres: obj.nombres || '',
        tipoDocumento: tipoDoc,
        tipo_documento: tipoDoc,
        documento: String(obj.documento || '').trim(),
        fechaNacimiento: obj.fechaNacimiento || obj.fecha_nacimiento || null,
        fecha_nacimiento: obj.fecha_nacimiento || obj.fechaNacimiento || null,
        esMenorEdad: esMenor,
        es_menor_edad: esMenor,
        nombreAcudiente: obj.nombreAcudiente || obj.nombre_acudiente || '',
        nombre_acudiente: obj.nombre_acudiente || obj.nombreAcudiente || '',
        documentoAcudiente: obj.documentoAcudiente || obj.documento_acudiente || '',
        documento_acudiente: obj.documento_acudiente || obj.documentoAcudiente || '',
        telefonoAcudiente: obj.telefonoAcudiente || obj.telefono_acudiente || '',
        telefono_acudiente: obj.telefono_acudiente || obj.telefonoAcudiente || '',
        parentescoAcudiente: obj.parentescoAcudiente || obj.parentesco_acudiente || '',
        parentesco_acudiente: obj.parentesco_acudiente || obj.parentescoAcudiente || '',
        email: obj.email || '',
        telefono: obj.telefono || '',
        genero: obj.genero || 'Masculino',
        categoria: obj.categoria || 'Libre (18-39 años)',
        tallaCamiseta: talla,
        talla_camiseta: talla,
        eps: obj.eps || '',
        contactoEmergenciaNombre: obj.contactoEmergenciaNombre || obj.contacto_emergencia_nombre || '',
        contacto_emergencia_nombre: obj.contacto_emergencia_nombre || obj.contactoEmergenciaNombre || '',
        contactoEmergenciaTelefono: obj.contactoEmergenciaTelefono || obj.contacto_emergencia_telefono || '',
        contacto_emergencia_telefono: obj.contacto_emergencia_telefono || obj.contactoEmergenciaTelefono || '',
        precioBaseCOP: precioBase,
        precio_base_cop: precioBase,
        comisionWompiCOP: comision,
        comision_wompi_cop: comision,
        totalPagarCOP: totalPagar,
        total_pagar_cop: totalPagar,
        totalCentavos: centavos,
        total_centavos: centavos,
        estado_pago: estadoPago,
        estadoPago: estadoPago,
        dorsal: obj.dorsal ? Number(obj.dorsal) : null,
        transaccion_wompi_id: obj.transaccion_wompi_id || obj.transaccionWompiId || null,
        metodo_pago: obj.metodo_pago || obj.metodoPago || null,
        kit_entregado: kitEntregado,
        fecha_entrega_kit: obj.fecha_entrega_kit || obj.fechaEntregaKit || null,
        acepta_reglamento: obj.acepta_reglamento !== undefined ? obj.acepta_reglamento : (obj.aceptaReglamento !== undefined ? obj.aceptaReglamento : true),
        acepta_datos_ley1581: obj.acepta_datos_ley1581 !== undefined ? obj.acepta_datos_ley1581 : (obj.aceptaDatos !== undefined ? obj.aceptaDatos : true),
        creado_en: obj.creado_en || obj.creadoEn || new Date().toISOString(),
        actualizado_en: obj.actualizado_en || obj.actualizadoEn || new Date().toISOString(),
        pagado_en: obj.pagado_en || obj.pagadoEn || null
    };
}

/**
 * Guarda una nueva inscripción con estado inicial PENDIENTE
 */
async function guardarInscripcion(datos) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
        try {
            const payload = {
                referencia: datos.referencia,
                distancia: (datos.distancia || '').toLowerCase(),
                nombres: datos.nombres,
                tipo_documento: datos.tipoDocumento || datos.tipo_documento || 'CC',
                documento: String(datos.documento || '').trim(),
                fecha_nacimiento: datos.fechaNacimiento || datos.fecha_nacimiento || null,
                es_menor_edad: Boolean(datos.esMenorEdad || datos.es_menor_edad),
                nombre_acudiente: datos.nombreAcudiente || datos.nombre_acudiente || null,
                documento_acudiente: datos.documentoAcudiente || datos.documento_acudiente || null,
                telefono_acudiente: datos.telefonoAcudiente || datos.telefono_acudiente || null,
                parentesco_acudiente: datos.parentescoAcudiente || datos.parentesco_acudiente || null,
                email: datos.email,
                telefono: datos.telefono,
                genero: datos.genero || 'Masculino',
                categoria: datos.categoria,
                talla_camiseta: datos.tallaCamiseta || datos.talla_camiseta || 'M',
                eps: datos.eps,
                contacto_emergencia_nombre: datos.contactoEmergenciaNombre || datos.contacto_emergencia_nombre,
                contacto_emergencia_telefono: datos.contactoEmergenciaTelefono || datos.contacto_emergencia_telefono,
                precio_base_cop: Number(datos.precioBaseCOP || datos.precio_base_cop),
                comision_wompi_cop: Number(datos.comisionWompiCOP || datos.comision_wompi_cop),
                total_pagar_cop: Number(datos.totalPagarCOP || datos.total_pagar_cop),
                total_centavos: Number(datos.totalCentavos || datos.total_centavos),
                estado_pago: 'PENDIENTE',
                acepta_reglamento: true,
                acepta_datos_ley1581: true
            };

            const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const inserted = await res.json();
                const obj = inserted[0] || inserted;
                return normalizarInscripcion(obj);
            } else {
                const errorTxt = await res.text();
                console.warn('[DB] Error en Supabase, recurriendo a local:', errorTxt);
            }
        } catch (err) {
            console.warn('[DB] Supabase no disponible, usando local:', err.message);
        }
    }

    // Modo local seguro
    const inscritos = leerArchivoJSON(LOCAL_DB_FILE, []);
    const index = inscritos.findIndex(i => i.referencia === datos.referencia);
    const nuevoRegistro = normalizarInscripcion({
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...datos,
        estado_pago: 'PENDIENTE',
        dorsal: null,
        transaccion_wompi_id: null,
        metodo_pago: null,
        kit_entregado: false,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
    });

    if (index >= 0) {
        inscritos[index] = { ...inscritos[index], ...nuevoRegistro, actualizado_en: new Date().toISOString() };
    } else {
        inscritos.push(nuevoRegistro);
    }

    guardarArchivoJSON(LOCAL_DB_FILE, inscritos);
    return nuevoRegistro;
}

/**
 * Obtiene una inscripción por su código de referencia
 */
async function obtenerPorReferencia(referencia) {
    if (!referencia) return null;
    const refLimpia = String(referencia).trim();

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
        try {
            const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?referencia=eq.${encodeURIComponent(refLimpia)}&select=*`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            if (res.ok) {
                const rows = await res.json();
                if (rows.length > 0) return normalizarInscripcion(rows[0]);
            }
        } catch (err) {
            console.warn('[DB] Error consultando Supabase:', err.message);
        }
    }

    const inscritos = leerArchivoJSON(LOCAL_DB_FILE, []);
    const match = inscritos.find(i => (i.referencia || '').trim().toUpperCase() === refLimpia.toUpperCase());
    return match ? normalizarInscripcion(match) : null;
}

/**
 * Obtiene todas las inscripciones asociadas a un documento de identidad
 */
async function obtenerPorDocumento(documento) {
    const docLimpio = String(documento || '').replace(/[^a-zA-Z0-9-]/g, '').trim();
    if (!docLimpio) return [];

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
        try {
            const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?documento=eq.${encodeURIComponent(docLimpio)}&select=*&order=creado_en.desc`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            if (res.ok) {
                const rows = await res.json();
                return rows.map(normalizarInscripcion);
            }
        } catch (err) {
            console.warn('[DB] Error consultando Supabase por doc:', err.message);
        }
    }

    const inscritos = leerArchivoJSON(LOCAL_DB_FILE, []);
    return inscritos
        .filter(i => String(i.documento || '').trim() === docLimpio)
        .map(normalizarInscripcion);
}

/**
 * Actualiza el estado a APROBADO y asigna dorsal correlativo según distancia
 */
async function actualizarPagoAprobado(referencia, transaccionId, metodoPago) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
        try {
            // Asignación atómica mediante función PL/pgSQL
            const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/asignar_dorsal_corredor`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ p_referencia: referencia })
            });

            if (rpcRes.ok) {
                // Actualizar transaccion y método
                await fetch(`${supabaseUrl}/rest/v1/inscripciones?referencia=eq.${encodeURIComponent(referencia)}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        transaccion_wompi_id: transaccionId,
                        metodo_pago: metodoPago || 'WOMPI',
                        actualizado_en: new Date().toISOString()
                    })
                });
                return await obtenerPorReferencia(referencia);
            } else {
                const rpcErr = await rpcRes.text();
                console.warn('[DB] RPC asignar_dorsal_corredor error:', rpcErr);
            }
        } catch (err) {
            console.warn('[DB] Error asignando dorsal en Supabase:', err.message);
        }
    }

    // Modo local
    const inscritos = leerArchivoJSON(LOCAL_DB_FILE, []);
    const index = inscritos.findIndex(i => i.referencia === referencia);
    if (index === -1) return null;

    const registro = normalizarInscripcion(inscritos[index]);

    // Asignar dorsal correlativo si aún no tiene
    if (!registro.dorsal) {
        const dist = (registro.distancia || '10k').toLowerCase();
        const dorsalBase = DORSALES_BASE[dist] || 1000;
        
        const dorsalesExistentes = inscritos
            .filter(i => (i.distancia || '').toLowerCase() === dist && i.dorsal)
            .map(i => parseInt(i.dorsal, 10))
            .filter(n => !isNaN(n));

        const maxDorsal = dorsalesExistentes.length > 0 ? Math.max(...dorsalesExistentes) : dorsalBase - 1;
        registro.dorsal = maxDorsal + 1;
    }

    registro.estado_pago = 'APROBADO';
    registro.estadoPago = 'APROBADO';
    registro.transaccion_wompi_id = transaccionId;
    registro.metodo_pago = metodoPago || 'WOMPI';
    registro.pagado_en = new Date().toISOString();
    registro.actualizado_en = new Date().toISOString();

    inscritos[index] = registro;
    guardarArchivoJSON(LOCAL_DB_FILE, inscritos);
    return registro;
}

/**
 * Actualiza el estado cuando el pago es declinado, anulado o pendiente
 */
async function actualizarEstadoPago(referencia, nuevoEstado, transaccionId = null) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
        try {
            const patchBody = {
                estado_pago: nuevoEstado,
                actualizado_en: new Date().toISOString()
            };
            if (transaccionId) patchBody.transaccion_wompi_id = transaccionId;

            await fetch(`${supabaseUrl}/rest/v1/inscripciones?referencia=eq.${encodeURIComponent(referencia)}`, {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(patchBody)
            });
        } catch (err) {
            console.warn('[DB] Error actualizando estado en Supabase:', err.message);
        }
    }

    const inscritos = leerArchivoJSON(LOCAL_DB_FILE, []);
    const index = inscritos.findIndex(i => i.referencia === referencia);
    if (index === -1) return null;

    inscritos[index].estado_pago = nuevoEstado;
    inscritos[index].estadoPago = nuevoEstado;
    if (transaccionId) inscritos[index].transaccion_wompi_id = transaccionId;
    inscritos[index].actualizado_en = new Date().toISOString();

    guardarArchivoJSON(LOCAL_DB_FILE, inscritos);
    return normalizarInscripcion(inscritos[index]);
}

/**
 * Actualiza la entrega del kit del atleta
 */
async function actualizarKitEntregado(referencia, entregado) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const fechaEntrega = entregado ? new Date().toISOString() : null;

    if (supabaseUrl && supabaseKey) {
        try {
            await fetch(`${supabaseUrl}/rest/v1/inscripciones?referencia=eq.${encodeURIComponent(referencia)}`, {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    kit_entregado: Boolean(entregado),
                    fecha_entrega_kit: fechaEntrega,
                    actualizado_en: new Date().toISOString()
                })
            });
        } catch (err) {
            console.warn('[DB] Error actualizando kit en Supabase:', err.message);
        }
    }

    const inscritos = leerArchivoJSON(LOCAL_DB_FILE, []);
    const index = inscritos.findIndex(i => i.referencia === referencia);
    if (index !== -1) {
        inscritos[index].kit_entregado = Boolean(entregado);
        inscritos[index].fecha_entrega_kit = fechaEntrega;
        inscritos[index].actualizado_en = new Date().toISOString();
        guardarArchivoJSON(LOCAL_DB_FILE, inscritos);
        return normalizarInscripcion(inscritos[index]);
    }

    return await obtenerPorReferencia(referencia);
}

/**
 * Registra evento de webhook para idempotencia y trazabilidad
 */
async function registrarWebhook(evento) {
    const eventId = evento.data?.transaction?.id || evento.id || `evt-${Date.now()}`;
    const transaccion = evento.data?.transaction;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
        try {
            // Verificar si ya existe en Supabase
            const checkRes = await fetch(`${supabaseUrl}/rest/v1/wompi_webhooks?evento_id=eq.${encodeURIComponent(eventId)}&select=id`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            if (checkRes.ok) {
                const rows = await checkRes.json();
                if (rows.length > 0) return { duplicado: true };
            }

            // Insertar auditoría de webhook
            await fetch(`${supabaseUrl}/rest/v1/wompi_webhooks`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    evento_id: eventId,
                    transaccion_id: transaccion?.id || null,
                    referencia: transaccion?.reference || null,
                    estado: transaccion?.status || null,
                    payload: evento
                })
            });
        } catch (err) {
            console.warn('[DB] Error registrando webhook en Supabase:', err.message);
        }
    }

    const webhooks = leerArchivoJSON(WEBHOOKS_FILE, []);
    const yaExiste = webhooks.some(w => w.evento_id === eventId);
    if (yaExiste) {
        return { duplicado: true };
    }

    webhooks.push({
        id: `wh-${Date.now()}`,
        evento_id: eventId,
        fecha: new Date().toISOString(),
        payload: evento
    });

    guardarArchivoJSON(WEBHOOKS_FILE, webhooks);
    return { duplicado: false };
}

/**
 * Obtiene todas las inscripciones para el panel de administración,
 * soportando tanto Supabase PostgreSQL como la base local.
 */
async function obtenerTodasInscripciones(filtros = {}) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let inscritos = [];

    if (supabaseUrl && supabaseKey) {
        try {
            const res = await fetch(`${supabaseUrl}/rest/v1/inscripciones?select=*&order=creado_en.desc`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            if (res.ok) {
                const rows = await res.json();
                inscritos = rows.map(normalizarInscripcion);
            }
        } catch (err) {
            console.warn('[DB] Error consultando todas las inscripciones en Supabase:', err.message);
        }
    }

    // Fallback a base local si no hay registros en Supabase o no está configurado
    if (inscritos.length === 0) {
        inscritos = leerArchivoJSON(LOCAL_DB_FILE, []).map(normalizarInscripcion);
    }
    
    let resultado = [...inscritos];
    if (filtros.distancia) {
        resultado = resultado.filter(i => (i.distancia || '').toLowerCase() === filtros.distancia.toLowerCase());
    }
    if (filtros.estado) {
        resultado = resultado.filter(i => (i.estado_pago || '').toUpperCase() === filtros.estado.toUpperCase());
    }
    if (filtros.busqueda) {
        const q = String(filtros.busqueda).toLowerCase().trim();
        resultado = resultado.filter(i => 
            (i.nombres || '').toLowerCase().includes(q) ||
            (i.documento || '').includes(q) ||
            (i.referencia || '').toLowerCase().includes(q) ||
            (String(i.dorsal || '')).includes(q)
        );
    }

    // Ordenar: más recientes primero
    resultado.sort((a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0));
    return resultado;
}

/**
 * Calcula métricas en tiempo real para el organizador
 */
async function obtenerMetricasAdmin() {
    const inscritos = await obtenerTodasInscripciones();
    const aprobados = inscritos.filter(i => i.estado_pago === 'APROBADO');

    let totalRecaudadoCOP = 0;
    const porDistancia = { '5k': 0, '10k': 0, '21k': 0 };
    const porTalla = { 'S': 0, 'M': 0, 'L': 0, 'XL': 0, 'XXL': 0 };
    const porGenero = { 'Masculino': 0, 'Femenino': 0, 'Otro': 0 };

    for (const a of aprobados) {
        totalRecaudadoCOP += Number(a.precioBaseCOP || a.precio_base_cop || 0);
        
        const dist = (a.distancia || '').toLowerCase();
        if (porDistancia[dist] !== undefined) porDistancia[dist]++;
        
        const talla = (a.tallaCamiseta || a.talla_camiseta || '').toUpperCase();
        if (porTalla[talla] !== undefined) porTalla[talla]++;

        const gen = a.genero || 'Masculino';
        if (porGenero[gen] !== undefined) porGenero[gen]++;
    }

    return {
        totalInscritos: inscritos.length,
        totalAprobados: aprobados.length,
        totalPendientes: inscritos.filter(i => i.estado_pago === 'PENDIENTE').length,
        totalRecaudadoCOP,
        porDistancia,
        porTalla,
        porGenero
    };
}

module.exports = {
    normalizarInscripcion,
    guardarInscripcion,
    obtenerPorReferencia,
    obtenerPorDocumento,
    actualizarPagoAprobado,
    actualizarEstadoPago,
    actualizarKitEntregado,
    registrarWebhook,
    obtenerTodasInscripciones,
    obtenerMetricasAdmin
};
