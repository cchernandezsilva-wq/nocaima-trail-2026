// ====================================================================
// ENDPOINT: CREAR INSCRIPCIÓN Y GENERAR FIRMA WOMPI
// ====================================================================

const { validarInscripcion } = require('../lib/validacion');
const { calcularPrecioInscripcion } = require('../lib/precios');
const { generarFirmaIntegridad, generarReferenciaUnica } = require('../lib/wompi');
const db = require('../lib/db');

async function handleCrearInscripcion(req, res) {
    try {
        const body = req.body || {};
        
        // 1. Validar campos recibidos
        const validacion = validarInscripcion(body);
        if (!validacion.valido) {
            return res.status(400).json({
                ok: false,
                error: 'Datos de inscripción incompletos o incorrectos',
                detalles: validacion.errores
            });
        }

        const datos = validacion.datosLimpios;

        // 2. Comprobar si ya existe una inscripción APROBADA para este documento y distancia
        const inscripcionesPrevias = await db.obtenerPorDocumento(datos.documento);
        const yaAprobado = inscripcionesPrevias.find(i => 
            i.estado_pago === 'APROBADO' && 
            (i.distancia || '').toLowerCase() === datos.distancia.toLowerCase()
        );

        if (yaAprobado) {
            return res.status(409).json({
                ok: false,
                error: `Ya existe una inscripción APROBADA para el documento ${datos.documento} en la distancia ${datos.distancia.toUpperCase()}. Tu Dorsal asignado es el #${yaAprobado.dorsal}.`,
                referenciaExistente: yaAprobado.referencia,
                dorsal: yaAprobado.dorsal
            });
        }

        // 3. Calcular desglose de precios (Base + Comisión Wompi asumida por el corredor)
        const calculoPrecio = calcularPrecioInscripcion(datos.distancia);

        // 4. Generar referencia única
        const referencia = generarReferenciaUnica(datos.distancia);

        // 5. Guardar en base de datos en estado PENDIENTE
        const registroGuardado = await db.guardarInscripcion({
            referencia,
            distancia: datos.distancia,
            nombres: datos.nombres,
            tipoDocumento: datos.tipoDocumento,
            documento: datos.documento,
            fechaNacimiento: datos.fechaNacimiento,
            esMenorEdad: datos.esMenorEdad,
            nombreAcudiente: datos.nombreAcudiente,
            documentoAcudiente: datos.documentoAcudiente,
            telefonoAcudiente: datos.telefonoAcudiente,
            parentescoAcudiente: datos.parentescoAcudiente,
            email: datos.email,
            telefono: datos.telefono,
            genero: datos.genero,
            categoria: datos.categoria,
            tallaCamiseta: datos.tallaCamiseta,
            eps: datos.eps,
            contactoEmergenciaNombre: datos.contactoEmergenciaNombre,
            contactoEmergenciaTelefono: datos.contactoEmergenciaTelefono,
            precioBaseCOP: calculoPrecio.precioBaseCOP,
            comisionWompiCOP: calculoPrecio.comisionWompiCOP,
            totalPagarCOP: calculoPrecio.totalPagarCOP,
            totalCentavos: calculoPrecio.totalCentavos,
            aceptaReglamento: true,
            aceptaDatos: true
        });

        // 6. Generar firma de integridad criptográfica SHA-256 para Wompi
        const firmaIntegridad = generarFirmaIntegridad(
            referencia,
            calculoPrecio.totalCentavos,
            calculoPrecio.moneda
        );

        // 7. Retornar parámetros necesarios para abrir el Widget de Wompi
        const publicKey = process.env.WOMPI_PUBLIC_KEY || 'pub_stagtest_g2u0UQyK3YxFjhTXUhST3TQvxYsMmz2x';
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.get?.('host') || req.headers.host || 'localhost:3000';
        const siteUrl = process.env.SITE_URL || `${proto}://${host}`;
        const redirectUrl = `${siteUrl}/confirmacion.html?ref=${referencia}`;

        return res.status(201).json({
            ok: true,
            referencia,
            desglose: {
                distancia: datos.distancia.toUpperCase(),
                precioBaseCOP: calculoPrecio.precioBaseCOP,
                comisionWompiCOP: calculoPrecio.comisionWompiCOP,
                totalPagarCOP: calculoPrecio.totalPagarCOP,
                totalCentavos: calculoPrecio.totalCentavos,
                moneda: calculoPrecio.moneda
            },
            wompi: {
                publicKey,
                signature: firmaIntegridad,
                currency: calculoPrecio.moneda,
                amountInCents: calculoPrecio.totalCentavos,
                reference: referencia,
                redirectUrl,
                customerData: {
                    email: datos.email,
                    fullName: datos.nombres,
                    phoneNumber: datos.telefono,
                    legalId: datos.documento,
                    legalIdType: datos.tipoDocumento
                }
            }
        });

    } catch (err) {
        console.error('[API] Error creando inscripción:', err);
        return res.status(500).json({
            ok: false,
            error: 'Ocurrió un error interno procesando la inscripción. Inténtalo de nuevo.'
        });
    }
}

module.exports = { handleCrearInscripcion };
