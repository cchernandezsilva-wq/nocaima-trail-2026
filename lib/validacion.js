// ====================================================================
// VALIDACIÓN Y SANITIZACIÓN DE DATOS REALES - NOCAIMA TRAIL 2026
// ====================================================================

/**
 * Limpia y sanitiza una cadena de texto para evitar XSS o inyecciones
 */
function sanitizarTexto(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '');
}

/**
 * Verifica si una cadena contiene caracteres repetidos excesivamente (ej: "aaaaa", "111111")
 */
function esSecuenciaRepetida(str, maxRepetidos = 3) {
    if (!str || typeof str !== 'string') return false;
    const re = new RegExp(`(.)\\1{${maxRepetidos},}`, 'i');
    return re.test(str);
}

/**
 * Verifica si una cadena numérica es puramente secuencial (ej: "12345678", "98765432")
 */
function esSecuenciaNumerica(str) {
    if (!str || typeof str !== 'string' || str.length < 5) return false;
    const clean = str.replace(/\D/g, '');
    const ascendente = '01234567890123456789';
    const descendente = '98765432109876543210';
    return ascendente.includes(clean) || descendente.includes(clean);
}

/**
 * Palabras de prueba, ficticias o spam
 */
const PALABRAS_DUMMY = [
    'test', 'prueba', 'asdf', 'qwerty', 'admin', 'anonimo', 'nadie', 'ninguno',
    'ninguna', 'fulano', 'sutano', 'mengano', 'fake', 'dummy', 'xxxx', 'aaaa',
    'zzzz', 'ejemplo', 'sample', 'no tengo', 'sin eps', 'sin seguro', 'nada', 'ninguna eps'
];

function contienePalabraDummy(str) {
    if (!str || typeof str !== 'string') return false;
    const normalizada = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return PALABRAS_DUMMY.some(p => normalizada === p || normalizada.split(/\s+/).includes(p));
}

/**
 * Valida un nombre humano real (al menos 2 palabras, solo letras, sin spam)
 */
function validarNombreHumano(nombre, campoLabel = 'nombre completo') {
    if (!nombre || typeof nombre !== 'string') {
        return { valido: false, error: `El ${campoLabel} es obligatorio.` };
    }
    const limpio = nombre.trim();
    if (limpio.length < 5 || limpio.length > 70) {
        return { valido: false, error: `El ${campoLabel} debe tener entre 5 y 70 caracteres.` };
    }

    // Solo letras, acentos, diéresis, ñ y espacios
    const regexLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
    if (!regexLetras.test(limpio)) {
        return { valido: false, error: `El ${campoLabel} solo puede contener letras y espacios (sin números ni caracteres especiales).` };
    }

    // Al menos 2 palabras de al menos 2 letras cada una (Nombre y Apellido)
    const palabras = limpio.split(/\s+/).filter(p => p.length >= 2);
    if (palabras.length < 2) {
        return { valido: false, error: `Ingresa tu ${campoLabel} real (mínimo nombre y apellido, ej: Carlos Mendoza).` };
    }

    if (esSecuenciaRepetida(limpio, 3)) {
        return { valido: false, error: `El ${campoLabel} contiene caracteres repetidos no válidos.` };
    }

    if (contienePalabraDummy(limpio)) {
        return { valido: false, error: `Por favor ingresa un ${campoLabel} real.` };
    }

    return { valido: true, nombreLimpio: limpio };
}

/**
 * Valida un número de documento de identidad según su tipo
 */
function validarDocumento(tipo, numero) {
    if (!numero || typeof numero !== 'string') {
        return { valido: false, error: 'El número de documento de identidad es obligatorio.' };
    }
    const num = numero.trim().replace(/\s+/g, '');
    const tipoNorm = String(tipo || 'CC').toUpperCase().trim();

    if (tipoNorm === 'CC') {
        // Cédula de Ciudadanía: entre 6 y 10 dígitos numéricos
        if (!/^\d{6,10}$/.test(num)) {
            return { valido: false, error: 'La Cédula de Ciudadanía (CC) debe contener entre 6 y 10 dígitos numéricos.' };
        }
        if (/^(\d)\1+$/.test(num)) {
            return { valido: false, error: 'El número de cédula no puede tener todos los dígitos repetidos.' };
        }
        if (esSecuenciaNumerica(num)) {
            return { valido: false, error: 'El número de cédula no puede ser una secuencia correlativa (ej: 12345678).' };
        }
    } else if (tipoNorm === 'TI') {
        // Tarjeta de Identidad: 10 u 11 dígitos
        if (!/^\d{10,11}$/.test(num)) {
            return { valido: false, error: 'La Tarjeta de Identidad (TI) debe contener 10 u 11 dígitos numéricos.' };
        }
        if (/^(\d)\1+$/.test(num)) {
            return { valido: false, error: 'El número de tarjeta de identidad no puede ser repetitivo.' };
        }
    } else if (tipoNorm === 'CE') {
        // Cédula de Extranjería: alfanumérica entre 5 y 9 caracteres
        if (!/^[a-zA-Z0-9]{5,9}$/.test(num)) {
            return { valido: false, error: 'La Cédula de Extranjería (CE) debe contener entre 5 y 9 caracteres alfanuméricos.' };
        }
    } else if (tipoNorm === 'PASAPORTE') {
        // Pasaporte: alfanumérico entre 6 y 12 caracteres
        if (!/^[a-zA-Z0-9]{6,12}$/.test(num)) {
            return { valido: false, error: 'El Pasaporte debe tener entre 6 y 12 caracteres alfanuméricos.' };
        }
    } else {
        if (num.length < 5 || num.length > 15) {
            return { valido: false, error: 'El número de documento debe tener entre 5 y 15 caracteres.' };
        }
    }

    return { valido: true, documentoLimpio: num };
}

/**
 * Valida un teléfono celular colombiano (10 dígitos que inicien en 3)
 */
function validarTelefonoColombiano(tel, nombreCampo = 'teléfono') {
    if (!tel || typeof tel !== 'string') {
        return { valido: false, error: `El ${nombreCampo} es obligatorio.` };
    }
    let clean = tel.trim().replace(/[^0-9]/g, '');

    // Quitar prefijo internacional colombiano si viene incluido (+57)
    if (clean.length === 12 && clean.startsWith('573')) {
        clean = clean.substring(2);
    }

    if (!/^3\d{9}$/.test(clean)) {
        return { valido: false, error: `El ${nombreCampo} debe ser un celular colombiano de 10 dígitos que inicie por 3 (ej: 3101234567).` };
    }

    // No todos los dígitos iguales después del 3
    if (/^3(\d)\1{8}$/.test(clean)) {
        return { valido: false, error: `El ${nombreCampo} no puede tener dígitos repetidos no válidos.` };
    }

    if (esSecuenciaNumerica(clean)) {
        return { valido: false, error: `El ${nombreCampo} ingresado no corresponde a un número real.` };
    }

    return { valido: true, telefonoLimpio: clean };
}

/**
 * Valida un correo electrónico real con formato estricto y dominio creíble
 */
function validarEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valido: false, error: 'El correo electrónico es obligatorio.' };
    }
    const clean = email.trim().toLowerCase();

    // Formato RFC
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
    if (!re.test(clean)) {
        return { valido: false, error: 'El correo electrónico no tiene un formato válido (ej: nombre@gmail.com).' };
    }

    const partes = clean.split('@');
    const usuario = partes[0];
    const dominio = partes[1];

    if (usuario.length < 2) {
        return { valido: false, error: 'El usuario del correo electrónico es demasiado corto.' };
    }

    const dominiosProhibidos = [
        'test.com', 'prueba.com', 'fake.com', 'correo.com', 'example.com',
        'mailinator.com', 'tempmail.com', '10minutemail.com', 'asdf.com', 'xyz.com'
    ];
    if (dominiosProhibidos.includes(dominio)) {
        return { valido: false, error: 'Por favor ingresa un correo electrónico real donde recibirás tu ticket.' };
    }

    if (contienePalabraDummy(usuario)) {
        return { valido: false, error: 'Por favor ingresa tu correo electrónico real.' };
    }

    return { valido: true, emailLimpio: clean };
}

/**
 * Valida una entidad de EPS o seguro médico
 */
function validarEPS(eps) {
    if (!eps || typeof eps !== 'string') {
        return { valido: false, error: 'La EPS o seguro médico es obligatorio para la cobertura de accidentes en carrera.' };
    }
    const clean = eps.trim();
    if (clean.length < 3 || clean.length > 40) {
        return { valido: false, error: 'Ingresa un nombre de EPS o seguro médico válido (entre 3 y 40 caracteres).' };
    }

    if (contienePalabraDummy(clean)) {
        return { valido: false, error: 'Debes ingresar una EPS o cobertura de salud real (ej: Sanitas, Sura, Nueva EPS, Sisbén o Particular).' };
    }

    if (!/[a-zA-Z]/.test(clean)) {
        return { valido: false, error: 'La EPS debe contener el nombre de la entidad de salud.' };
    }

    return { valido: true, epsLimpia: clean };
}

/**
 * Valida fecha de nacimiento y edad en relación a la carrera (15 de Noviembre de 2026)
 */
function validarFechaNacimiento(fechaStr, distancia = '10k') {
    if (!fechaStr) {
        return { valido: true, fecha: null, edad: null };
    }

    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) {
        return { valido: false, error: 'La fecha de nacimiento no tiene un formato válido.' };
    }

    // Fecha oficial del evento
    const fechaEvento = new Date('2026-11-15T00:00:00Z');
    let edad = fechaEvento.getFullYear() - fecha.getFullYear();
    const m = fechaEvento.getMonth() - fecha.getMonth();
    if (m < 0 || (m === 0 && fechaEvento.getDate() < fecha.getDate())) {
        edad--;
    }

    if (edad < 10) {
        return { valido: false, error: 'La edad mínima para competir es de 10 años cumplidos en la fecha del evento.' };
    }

    if (edad > 95) {
        return { valido: false, error: 'Por favor verifica la fecha de nacimiento ingresada.' };
    }

    // Menores de edad (menos de 18 años) solo pueden correr 5K
    if (edad < 18 && (distancia === '10k' || distancia === '21k')) {
        return {
            valido: false,
            error: `Los participantes menores de edad (${edad} años) únicamente pueden participar en la distancia 5K Familiar.`
        };
    }

    return { valido: true, fecha: fechaStr, edad };
}

/**
 * Valida todos los datos recibidos en la solicitud de inscripción
 * @param {object} data - Datos enviados desde el formulario web
 * @returns {{ valido: boolean, errores: string[], datosLimpios: object }}
 */
function validarInscripcion(data) {
    const errores = [];
    const datos = data || {};

    // 1. Distancia
    const distancia = String(datos.distancia || '').toLowerCase().trim();
    if (!['5k', '10k', '21k'].includes(distancia)) {
        errores.push('Distancia no válida. Selecciona 5K, 10K o 21K.');
    }

    // 2. Nombre completo del atleta
    const vNombre = validarNombreHumano(datos.nombres, 'nombre completo del atleta');
    if (!vNombre.valido) {
        errores.push(vNombre.error);
    }
    const nombres = vNombre.nombreLimpio || sanitizarTexto(datos.nombres);

    // 3. Tipo y número de documento
    const tipoDocumento = sanitizarTexto(datos.tipoDocumento || 'CC').toUpperCase();
    if (!['CC', 'TI', 'CE', 'PASAPORTE', 'PPT'].includes(tipoDocumento)) {
        errores.push('Tipo de documento no válido. Selecciona CC, TI, CE o Pasaporte.');
    }

    const vDoc = validarDocumento(tipoDocumento, datos.documento);
    if (!vDoc.valido) {
        errores.push(vDoc.error);
    }
    const documento = vDoc.documentoLimpio || sanitizarTexto(datos.documento);

    // 4. Fecha de nacimiento y edad
    let esMenorEdad = Boolean(datos.esMenorEdad);
    let fechaNacimiento = datos.fechaNacimiento || null;
    let edadCalculada = null;

    if (fechaNacimiento) {
        const vFecha = validarFechaNacimiento(fechaNacimiento, distancia);
        if (!vFecha.valido) {
            errores.push(vFecha.error);
        } else {
            edadCalculada = vFecha.edad;
            if (edadCalculada !== null && edadCalculada < 18) {
                esMenorEdad = true;
            }
        }
    }

    // 5. Correo electrónico
    const vEmail = validarEmail(datos.email);
    if (!vEmail.valido) {
        errores.push(vEmail.error);
    }
    const email = vEmail.emailLimpio || sanitizarTexto(datos.email);

    // 6. Teléfono móvil del atleta
    const vTel = validarTelefonoColombiano(datos.telefono, 'teléfono móvil del atleta');
    if (!vTel.valido) {
        errores.push(vTel.error);
    }
    const telefono = vTel.telefonoLimpio || sanitizarTexto(datos.telefono);

    // 7. Género, Categoría y Talla
    const genero = sanitizarTexto(datos.genero || 'Masculino');
    if (!['Masculino', 'Femenino'].includes(genero)) {
        errores.push('Selecciona una rama/género válida (Masculino o Femenino).');
    }

    const categoria = sanitizarTexto(datos.categoria || 'Libre (18-39 años)');

    const talla = sanitizarTexto(datos.tallaCamiseta || datos.talla || 'M').toUpperCase();
    if (!['S', 'M', 'L', 'XL', 'XXL'].includes(talla)) {
        errores.push('Selecciona una talla de camiseta oficial (S, M, L, XL, XXL).');
    }

    // 8. EPS o seguro médico
    const vEps = validarEPS(datos.eps);
    if (!vEps.valido) {
        errores.push(vEps.error);
    }
    const eps = vEps.epsLimpia || sanitizarTexto(datos.eps);

    // 9. Contacto de emergencia
    let emergenciaNombre = sanitizarTexto(datos.contactoEmergenciaNombre);
    let emergenciaTel = sanitizarTexto(datos.contactoEmergenciaTelefono);

    // Si viene en el formato legacy combinado "Nombre - Tel"
    if (!emergenciaNombre && datos.contactoEmergencia) {
        const partes = String(datos.contactoEmergencia).split('-');
        if (partes.length >= 2) {
            emergenciaNombre = partes[0].trim();
            emergenciaTel = partes.slice(1).join('-').trim();
        } else {
            emergenciaNombre = datos.contactoEmergencia.trim();
        }
    }

    const vEmergNombre = validarNombreHumano(emergenciaNombre, 'nombre del contacto de emergencia');
    if (!vEmergNombre.valido) {
        errores.push(vEmergNombre.error);
    } else {
        emergenciaNombre = vEmergNombre.nombreLimpio;
        // El contacto de emergencia no puede ser el mismo atleta
        if (nombres && emergenciaNombre.toLowerCase() === nombres.toLowerCase()) {
            errores.push('El contacto de emergencia debe ser un familiar o allegado, no puede ser tu mismo nombre.');
        }
    }

    const vEmergTel = validarTelefonoColombiano(emergenciaTel, 'teléfono del contacto de emergencia');
    if (!vEmergTel.valido) {
        errores.push(vEmergTel.error);
    } else {
        emergenciaTel = vEmergTel.telefonoLimpio;
        // El teléfono de emergencia no puede ser el teléfono del atleta
        if (telefono && emergenciaTel === telefono) {
            errores.push('El teléfono de emergencia debe ser de otra persona (no puede ser tu mismo número personal).');
        }
    }

    // 10. Validación de menor de edad (acudiente obligatorio)
    let nombreAcudiente = '';
    let docAcudiente = '';
    let telAcudiente = '';
    let parentescoAcudiente = '';

    if (esMenorEdad) {
        if (distancia !== '5k') {
            errores.push('Los participantes menores de edad únicamente pueden inscribirse en la distancia 5K Familiar.');
        }

        const vAcudienteNom = validarNombreHumano(datos.nombreAcudiente, 'nombre del adulto responsable / acudiente');
        if (!vAcudienteNom.valido) {
            errores.push(vAcudienteNom.error);
        } else {
            nombreAcudiente = vAcudienteNom.nombreLimpio;
            if (nombres && nombreAcudiente.toLowerCase() === nombres.toLowerCase()) {
                errores.push('El nombre del acudiente debe ser de un adulto responsable diferente al menor de edad.');
            }
        }

        const vAcudienteDoc = validarDocumento('CC', datos.documentoAcudiente);
        if (!vAcudienteDoc.valido) {
            errores.push('Cédula del acudiente: ' + vAcudienteDoc.error);
        } else {
            docAcudiente = vAcudienteDoc.documentoLimpio;
            if (documento && docAcudiente === documento) {
                errores.push('El documento del acudiente no puede ser idéntico al documento del menor.');
            }
        }

        const vAcudienteTel = validarTelefonoColombiano(datos.telefonoAcudiente, 'teléfono del acudiente');
        if (!vAcudienteTel.valido) {
            errores.push(vAcudienteTel.error);
        } else {
            telAcudiente = vAcudienteTel.telefonoLimpio;
        }

        parentescoAcudiente = sanitizarTexto(datos.parentescoAcudiente || 'Padre / Madre');
    }

    // 11. Consentimientos obligatorios
    if (datos.aceptaReglamento === false) {
        errores.push('Debes aceptar el reglamento oficial de la carrera.');
    }
    if (datos.aceptaDatos === false) {
        errores.push('Debes autorizar el tratamiento de datos personales conforme a la Ley 1581.');
    }

    return {
        valido: errores.length === 0,
        errores,
        datosLimpios: {
            distancia,
            nombres,
            tipoDocumento,
            documento,
            fechaNacimiento,
            edadCalculada,
            esMenorEdad,
            nombreAcudiente,
            documentoAcudiente: docAcudiente,
            telefonoAcudiente: telAcudiente,
            parentescoAcudiente,
            email,
            telefono,
            genero,
            categoria,
            tallaCamiseta: talla,
            eps,
            contactoEmergenciaNombre: emergenciaNombre,
            contactoEmergenciaTelefono: emergenciaTel,
            aceptaReglamento: true,
            aceptaDatos: true
        }
    };
}

module.exports = {
    sanitizarTexto,
    validarEmail,
    validarNombreHumano,
    validarDocumento,
    validarTelefonoColombiano,
    validarEPS,
    validarFechaNacimiento,
    validarInscripcion
};
