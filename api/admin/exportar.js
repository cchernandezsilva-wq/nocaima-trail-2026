// ====================================================================
// ENDPOINT: ADMINISTRACIÓN - EXPORTAR A EXCEL / CSV
// ====================================================================

const db = require('../../lib/db');
const { verificarClaveAdmin } = require('./inscritos');

async function handleAdminExportar(req, res) {
    if (!verificarClaveAdmin(req)) {
        return res.status(401).send('Acceso no autorizado.');
    }

    try {
        const inscripciones = await db.obtenerTodasInscripciones();

        // Cabeceras oficiales para cronometraje de carrera y logística
        const headers = [
            'Dorsal',
            'Referencia',
            'Estado Pago',
            'Distancia',
            'Nombres Completos',
            'Tipo Doc',
            'Documento',
            'Fecha Nacimiento',
            'Es Menor',
            'Acudiente',
            'Tel Acudiente',
            'Email',
            'Telefono',
            'Genero',
            'Categoria',
            'Talla Camiseta',
            'EPS',
            'Contacto Emergencia',
            'Precio Base COP',
            'Total Pagado COP',
            'Metodo Pago',
            'Kit Entregado',
            'Fecha Registro',
            'Fecha Pago'
        ];

        // Función para escapar comillas dobles en CSV
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const rows = inscripciones.map(i => {
            const nomEmergencia = i.contactoEmergenciaNombre || i.contacto_emergencia_nombre || '';
            const telEmergencia = i.contactoEmergenciaTelefono || i.contacto_emergencia_telefono || '';
            let emergenciaStr = '';
            if (nomEmergencia && telEmergencia && nomEmergencia !== telEmergencia) {
                emergenciaStr = `${nomEmergencia} - ${telEmergencia}`;
            } else {
                emergenciaStr = nomEmergencia || telEmergencia;
            }

            return [
                escapeCSV(i.dorsal ? `#${i.dorsal}` : 'S/A'),
                escapeCSV(i.referencia),
                escapeCSV(i.estado_pago || i.estadoPago),
                escapeCSV((i.distancia || '').toUpperCase()),
                escapeCSV(i.nombres),
                escapeCSV(i.tipoDocumento || i.tipo_documento || 'CC'),
                escapeCSV(i.documento),
                escapeCSV(i.fechaNacimiento || i.fecha_nacimiento || ''),
                escapeCSV((i.esMenorEdad || i.es_menor_edad) ? 'SI' : 'NO'),
                escapeCSV(i.nombreAcudiente || i.nombre_acudiente || ''),
                escapeCSV(i.telefonoAcudiente || i.telefono_acudiente || ''),
                escapeCSV(i.email),
                escapeCSV(i.telefono),
                escapeCSV(i.genero),
                escapeCSV(i.categoria),
                escapeCSV(i.tallaCamiseta || i.talla_camiseta),
                escapeCSV(i.eps),
                escapeCSV(emergenciaStr),
                escapeCSV(i.precioBaseCOP || i.precio_base_cop),
                escapeCSV(i.totalPagarCOP || i.total_pagar_cop),
                escapeCSV(i.metodo_pago || 'Wompi'),
                escapeCSV((i.kit_entregado || i.kitEntregado) ? 'SI' : 'NO'),
                escapeCSV(i.creado_en || i.creadoEn),
                escapeCSV(i.pagado_en || i.pagadoEn || '')
            ].join(';');
        });

        // UTF-8 BOM (\uFEFF) para que Excel reconozca tildes y caracteres especiales sin problema
        const csvContent = '\uFEFF' + headers.join(';') + '\r\n' + rows.join('\r\n');

        const fechaStr = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="nocaima_trail_inscritos_${fechaStr}.csv"`);
        return res.status(200).send(csvContent);

    } catch (err) {
        console.error('[ADMIN] Error exportando CSV:', err);
        return res.status(500).send('Error generando archivo CSV.');
    }
}

module.exports = { handleAdminExportar };
