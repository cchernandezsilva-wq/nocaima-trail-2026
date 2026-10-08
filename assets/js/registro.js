// ====================================================================
// SCRIPT DE INSCRIPCIÓN, VALIDACIÓN REAL Y CHECKOUT WOMPI
// NOCAIMA TRAIL 2026
// ====================================================================

let configPrecios = null;

// Cargar configuración de precios y llaves desde el servidor
async function cargarConfiguracionPrecios() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const data = await res.json();
            configPrecios = data.precios;
            actualizarDesglosePrecios();
        }
    } catch (err) {
        console.warn('Usando precios locales por defecto:', err);
    }
}

// Actualizar visualmente el desglose de tarifas (Base + Comisión Wompi asumida por corredor)
function actualizarDesglosePrecios() {
    const selectedDist = document.querySelector('input[name="distancia"]:checked')?.value || '10k';
    const baseEl = document.getElementById('form-base-price');
    const feeEl = document.getElementById('form-fee-price');
    const totalEl = document.getElementById('form-total-price');

    let base = 95000;
    let fee = 3900;
    let total = 98900;

    if (configPrecios && configPrecios[selectedDist]) {
        base = configPrecios[selectedDist].precioBaseCOP;
        fee = configPrecios[selectedDist].comisionWompiCOP;
        total = configPrecios[selectedDist].totalPagarCOP;
    } else {
        if (selectedDist === '5k') {
            base = 75000;
            fee = 3200;
            total = 78200;
        } else if (selectedDist === '21k') {
            base = 125000;
            fee = 4800;
            total = 129800;
        }
    }

    if (baseEl) baseEl.innerText = `$${base.toLocaleString('es-CO')} COP`;
    if (feeEl) feeEl.innerText = `+$${fee.toLocaleString('es-CO')} COP`;
    if (totalEl) totalEl.innerText = `$${total.toLocaleString('es-CO')} COP`;
}

// Mostrar/Ocultar campos de acudiente para menores de edad
function toggleMenorEdadCampos() {
    const checkbox = document.getElementById('reg-es-menor');
    const container = document.getElementById('acudiente-fields-container');
    const nombreAcudiente = document.getElementById('reg-nombre-acudiente');
    const docAcudiente = document.getElementById('reg-doc-acudiente');
    const telAcudiente = document.getElementById('reg-tel-acudiente');

    if (!checkbox || !container) return;

    if (checkbox.checked) {
        container.classList.remove('hidden');
        if (nombreAcudiente) nombreAcudiente.required = true;
        if (docAcudiente) docAcudiente.required = true;
        if (telAcudiente) telAcudiente.required = true;
    } else {
        container.classList.add('hidden');
        if (nombreAcudiente) nombreAcudiente.required = false;
        if (docAcudiente) docAcudiente.required = false;
        if (telAcudiente) telAcudiente.required = false;
        clearFieldError('reg-nombre-acudiente', 'err-reg-nombre-acudiente');
        clearFieldError('reg-doc-acudiente', 'err-reg-doc-acudiente');
        clearFieldError('reg-tel-acudiente', 'err-reg-tel-acudiente');
    }
}

// ====================================================================
// FUNCIONES DE VALIDACIÓN ESTRICTA DE DATOS REALES
// ====================================================================

const PALABRAS_DUMMY_CLIENTE = [
    'test', 'prueba', 'asdf', 'qwerty', 'admin', 'anonimo', 'nadie', 'ninguno',
    'ninguna', 'fake', 'dummy', 'xxxx', 'aaaa', 'zzzz', 'sample', 'no tengo',
    'sin eps', 'sin seguro', 'nada'
];

function esDummy(str) {
    if (!str || typeof str !== 'string') return false;
    const norm = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return PALABRAS_DUMMY_CLIENTE.some(p => norm === p || norm.split(/\s+/).includes(p));
}

function esCaracteresRepetidos(str, max = 3) {
    if (!str) return false;
    const re = new RegExp(`(.)\\1{${max},}`, 'i');
    return re.test(str);
}

function esSecuencia(str) {
    if (!str || str.length < 5) return false;
    const clean = str.replace(/\D/g, '');
    const asc = '01234567890123456789';
    const desc = '98765432109876543210';
    return asc.includes(clean) || desc.includes(clean);
}

function setFieldError(inputId, errSpanId, errorMsg) {
    const input = document.getElementById(inputId);
    const span = document.getElementById(errSpanId);

    if (input) {
        input.classList.add('border-red-500', 'bg-red-950/20');
        input.classList.remove('border-nature-700', 'border-green-500/80', 'bg-green-950/10');
    }
    if (span) {
        span.innerText = errorMsg;
        span.classList.remove('hidden');
    }
}

function clearFieldError(inputId, errSpanId) {
    const input = document.getElementById(inputId);
    const span = document.getElementById(errSpanId);

    if (input) {
        input.classList.remove('border-red-500', 'bg-red-950/20');
        input.classList.add('border-nature-700');
    }
    if (span) {
        span.innerText = '';
        span.classList.add('hidden');
    }
}

function marcarCampoValido(inputId, errSpanId) {
    clearFieldError(inputId, errSpanId);
    const input = document.getElementById(inputId);
    if (input && input.value.trim().length > 0) {
        input.classList.remove('border-nature-700', 'border-red-500');
        input.classList.add('border-green-500/80', 'bg-green-950/10');
    }
}

// Validadores individuales
function validarNombreVal(val, label = 'nombre') {
    if (!val || val.trim().length === 0) return `El ${label} es obligatorio.`;
    const str = val.trim();
    if (str.length < 5) return `El ${label} debe tener al menos 5 caracteres.`;
    if (str.length > 70) return `El ${label} es demasiado largo.`;
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(str)) {
        return `El ${label} solo debe contener letras (sin números ni símbolos).`;
    }
    const palabras = str.split(/\s+/).filter(p => p.length >= 2);
    if (palabras.length < 2) {
        return `Ingresa tu ${label} real (mínimo nombre y apellido, ej: Carlos Mendoza).`;
    }
    if (esCaracteresRepetidos(str, 3)) {
        return `El ${label} contiene letras repetidas no válidas.`;
    }
    if (esDummy(str)) {
        return `Por favor ingresa un ${label} real.`;
    }
    return null;
}

function validarDocumentoVal(tipo, val) {
    if (!val || val.trim().length === 0) return 'El número de documento es obligatorio.';
    const str = val.trim().replace(/\s+/g, '');
    const tipoNorm = (tipo || 'CC').toUpperCase();

    if (tipoNorm === 'CC') {
        if (!/^\d{6,10}$/.test(str)) {
            return 'La Cédula de Ciudadanía (CC) debe contener entre 6 y 10 dígitos numéricos.';
        }
        if (/^(\d)\1+$/.test(str)) {
            return 'El número de cédula no puede tener todos los dígitos iguales.';
        }
        if (esSecuencia(str)) {
            return 'El número de cédula no puede ser una secuencia correlativa (ej: 12345678).';
        }
    } else if (tipoNorm === 'TI') {
        if (!/^\d{10,11}$/.test(str)) {
            return 'La Tarjeta de Identidad (TI) debe contener 10 u 11 dígitos numéricos.';
        }
        if (/^(\d)\1+$/.test(str)) {
            return 'El número de tarjeta de identidad no puede ser repetitivo.';
        }
    } else if (tipoNorm === 'CE') {
        if (!/^[a-zA-Z0-9]{5,9}$/.test(str)) {
            return 'La Cédula de Extranjería debe contener entre 5 y 9 caracteres alfanuméricos.';
        }
    } else if (tipoNorm === 'PASAPORTE') {
        if (!/^[a-zA-Z0-9]{6,12}$/.test(str)) {
            return 'El Pasaporte debe contener entre 6 y 12 caracteres alfanuméricos.';
        }
    } else {
        if (str.length < 5 || str.length > 15) {
            return 'El número de identificación debe tener entre 5 y 15 caracteres.';
        }
    }
    return null;
}

function validarTelefonoVal(val, label = 'teléfono') {
    if (!val || val.trim().length === 0) return `El ${label} es obligatorio.`;
    let clean = val.trim().replace(/[^0-9]/g, '');

    if (clean.length === 12 && clean.startsWith('573')) {
        clean = clean.substring(2);
    }

    if (!/^3\d{9}$/.test(clean)) {
        return `El ${label} debe ser un celular colombiano de 10 dígitos que inicie por 3 (ej: 3101234567).`;
    }

    if (/^3(\d)\1{8}$/.test(clean)) {
        return `El ${label} no puede tener dígitos repetidos no válidos.`;
    }

    if (esSecuencia(clean)) {
        return `El ${label} no corresponde a un número real.`;
    }

    return null;
}

function validarEmailVal(val) {
    if (!val || val.trim().length === 0) return 'El correo electrónico es obligatorio.';
    const clean = val.trim().toLowerCase();

    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
    if (!re.test(clean)) {
        return 'Ingresa un correo electrónico con formato válido (ej: tu.nombre@gmail.com).';
    }

    const partes = clean.split('@');
    const usuario = partes[0];
    const dominio = partes[1];

    if (usuario.length < 2) return 'El usuario del correo electrónico es demasiado corto.';

    const prohibidos = [
        'test.com', 'prueba.com', 'fake.com', 'correo.com', 'example.com',
        'mailinator.com', 'tempmail.com', '10minutemail.com', 'asdf.com', 'xyz.com'
    ];
    if (prohibidos.includes(dominio)) {
        return 'Por favor ingresa un correo electrónico real donde recibirás tu confirmación.';
    }

    if (esDummy(usuario)) {
        return 'Por favor ingresa un correo personal real.';
    }

    return null;
}

function validarEPSVal(val) {
    if (!val || val.trim().length === 0) return 'La EPS o seguro médico es obligatorio.';
    const clean = val.trim();
    if (clean.length < 3 || clean.length > 40) {
        return 'Ingresa un nombre de EPS o seguro médico válido (entre 3 y 40 caracteres).';
    }
    if (esDummy(clean)) {
        return 'Debes ingresar una EPS real (ej: Sanitas, Sura, Nueva EPS, Sisbén o Particular).';
    }
    if (!/[a-zA-Z]/.test(clean)) {
        return 'La EPS debe contener el nombre de la entidad de salud.';
    }
    return null;
}

function validarFechaNacVal(val, distancia) {
    if (!val) return 'La fecha de nacimiento es obligatoria.';
    const fecha = new Date(val);
    if (isNaN(fecha.getTime())) return 'La fecha de nacimiento no es válida.';

    const fechaEvento = new Date('2026-11-15T00:00:00Z');
    let edad = fechaEvento.getFullYear() - fecha.getFullYear();
    const m = fechaEvento.getMonth() - fecha.getMonth();
    if (m < 0 || (m === 0 && fechaEvento.getDate() < fecha.getDate())) {
        edad--;
    }

    if (edad < 10) {
        return 'La edad mínima para competir en el evento es de 10 años cumplidos.';
    }
    if (edad > 95) {
        return 'Por favor verifica la fecha de nacimiento ingresada.';
    }
    if (edad < 18 && (distancia === '10k' || distancia === '21k')) {
        return `Los participantes menores de 18 años (${edad} años) solo pueden inscribirse en la distancia 5K Familiar.`;
    }
    return null;
}

// Función maestra de validación de todo el formulario
function validarTodoElFormulario() {
    const listaErrores = [];
    let primerCampoError = null;

    const distancia = document.querySelector('input[name="distancia"]:checked')?.value || '10k';
    const nombre = document.getElementById('reg-nombre')?.value?.trim();
    const tipoDoc = document.getElementById('reg-tipo-doc')?.value || 'CC';
    const doc = document.getElementById('reg-doc')?.value?.trim();
    const fechaNac = document.getElementById('reg-fecha-nac')?.value;
    const esMenor = document.getElementById('reg-es-menor')?.checked || false;

    const email = document.getElementById('reg-email')?.value?.trim();
    const tel = document.getElementById('reg-tel')?.value?.trim();
    const eps = document.getElementById('reg-eps')?.value?.trim();

    const emergNombre = document.getElementById('reg-emergencia-nombre')?.value?.trim();
    const emergTel = document.getElementById('reg-emergencia-tel')?.value?.trim();

    const aceptaReglamento = document.getElementById('reg-acepta-reglamento')?.checked;
    const aceptaDatos = document.getElementById('reg-acepta-datos')?.checked;

    function registrarError(inputId, spanId, msg) {
        setFieldError(inputId, spanId, msg);
        listaErrores.push(msg);
        if (!primerCampoError) {
            primerCampoError = document.getElementById(inputId);
        }
    }

    // 1. Nombre atleta
    const errNom = validarNombreVal(nombre, 'nombre completo del atleta');
    if (errNom) {
        registrarError('reg-nombre', 'err-reg-nombre', errNom);
    } else {
        marcarCampoValido('reg-nombre', 'err-reg-nombre');
    }

    // 2. Documento atleta
    const errDoc = validarDocumentoVal(tipoDoc, doc);
    if (errDoc) {
        registrarError('reg-doc', 'err-reg-doc', errDoc);
    } else {
        marcarCampoValido('reg-doc', 'err-reg-doc');
    }

    // 3. Fecha nacimiento
    const errFecha = validarFechaNacVal(fechaNac, distancia);
    if (errFecha) {
        registrarError('reg-fecha-nac', 'err-reg-fecha-nac', errFecha);
    } else {
        marcarCampoValido('reg-fecha-nac', 'err-reg-fecha-nac');
    }

    // 4. Acudiente (si es menor)
    if (esMenor) {
        const nomAcudiente = document.getElementById('reg-nombre-acudiente')?.value?.trim();
        const docAcudiente = document.getElementById('reg-doc-acudiente')?.value?.trim();
        const telAcudiente = document.getElementById('reg-tel-acudiente')?.value?.trim();

        const errAcNom = validarNombreVal(nomAcudiente, 'nombre del adulto responsable');
        if (errAcNom) {
            registrarError('reg-nombre-acudiente', 'err-reg-nombre-acudiente', errAcNom);
        } else if (nombre && nomAcudiente.toLowerCase() === nombre.toLowerCase()) {
            registrarError('reg-nombre-acudiente', 'err-reg-nombre-acudiente', 'El acudiente no puede tener el mismo nombre que el atleta menor.');
        } else {
            marcarCampoValido('reg-nombre-acudiente', 'err-reg-nombre-acudiente');
        }

        const errAcDoc = validarDocumentoVal('CC', docAcudiente);
        if (errAcDoc) {
            registrarError('reg-doc-acudiente', 'err-reg-doc-acudiente', errAcDoc);
        } else if (doc && docAcudiente === doc) {
            registrarError('reg-doc-acudiente', 'err-reg-doc-acudiente', 'El documento del acudiente no puede ser igual al documento del menor.');
        } else {
            marcarCampoValido('reg-doc-acudiente', 'err-reg-doc-acudiente');
        }

        const errAcTel = validarTelefonoVal(telAcudiente, 'teléfono del adulto');
        if (errAcTel) {
            registrarError('reg-tel-acudiente', 'err-reg-tel-acudiente', errAcTel);
        } else {
            marcarCampoValido('reg-tel-acudiente', 'err-reg-tel-acudiente');
        }
    }

    // 5. Correo electrónico
    const errEmail = validarEmailVal(email);
    if (errEmail) {
        registrarError('reg-email', 'err-reg-email', errEmail);
    } else {
        marcarCampoValido('reg-email', 'err-reg-email');
    }

    // 6. Teléfono móvil
    const errTel = validarTelefonoVal(tel, 'celular del atleta');
    if (errTel) {
        registrarError('reg-tel', 'err-reg-tel', errTel);
    } else {
        marcarCampoValido('reg-tel', 'err-reg-tel');
    }

    // 7. EPS
    const errEps = validarEPSVal(eps);
    if (errEps) {
        registrarError('reg-eps', 'err-reg-eps', errEps);
    } else {
        marcarCampoValido('reg-eps', 'err-reg-eps');
    }

    // 8. Contacto de Emergencia
    const errEmNom = validarNombreVal(emergNombre, 'nombre del contacto de emergencia');
    if (errEmNom) {
        registrarError('reg-emergencia-nombre', 'err-reg-emergencia-nombre', errEmNom);
    } else if (nombre && emergNombre.toLowerCase() === nombre.toLowerCase()) {
        registrarError('reg-emergencia-nombre', 'err-reg-emergencia-nombre', 'El contacto de emergencia debe ser un familiar o allegado, no tú mismo.');
    } else {
        marcarCampoValido('reg-emergencia-nombre', 'err-reg-emergencia-nombre');
    }

    const errEmTel = validarTelefonoVal(emergTel, 'teléfono de emergencia');
    if (errEmTel) {
        registrarError('reg-emergencia-tel', 'err-reg-emergencia-tel', errEmTel);
    } else if (tel && emergTel.replace(/\D/g, '').endsWith(tel.replace(/\D/g, ''))) {
        registrarError('reg-emergencia-tel', 'err-reg-emergencia-tel', 'El teléfono de emergencia debe ser de otra persona, no tu mismo celular.');
    } else {
        marcarCampoValido('reg-emergencia-tel', 'err-reg-emergencia-tel');
    }

    // 9. Términos y condiciones
    if (!aceptaReglamento || !aceptaDatos) {
        listaErrores.push('Debes aceptar el reglamento de la carrera y el tratamiento de datos personales para continuar.');
    }

    return {
        valido: listaErrores.length === 0,
        primerCampoError,
        listaErrores
    };
}

// Configurar validación en tiempo real al tipear y al salir del campo
function inicializarValidacionEnVivo() {
    const inputsConfig = [
        { id: 'reg-nombre', errId: 'err-reg-nombre', fn: (v) => validarNombreVal(v, 'nombre completo') },
        { id: 'reg-doc', errId: 'err-reg-doc', fn: (v) => validarDocumentoVal(document.getElementById('reg-tipo-doc')?.value, v) },
        { id: 'reg-email', errId: 'err-reg-email', fn: validarEmailVal },
        { id: 'reg-tel', errId: 'err-reg-tel', fn: (v) => validarTelefonoVal(v, 'celular') },
        { id: 'reg-eps', errId: 'err-reg-eps', fn: validarEPSVal },
        { id: 'reg-emergencia-nombre', errId: 'err-reg-emergencia-nombre', fn: (v) => validarNombreVal(v, 'nombre de emergencia') },
        { id: 'reg-emergencia-tel', errId: 'err-reg-emergencia-tel', fn: (v) => validarTelefonoVal(v, 'teléfono de emergencia') },
        { id: 'reg-nombre-acudiente', errId: 'err-reg-nombre-acudiente', fn: (v) => validarNombreVal(v, 'nombre del adulto') },
        { id: 'reg-doc-acudiente', errId: 'err-reg-doc-acudiente', fn: (v) => validarDocumentoVal('CC', v) },
        { id: 'reg-tel-acudiente', errId: 'err-reg-tel-acudiente', fn: (v) => validarTelefonoVal(v, 'celular del adulto') }
    ];

    inputsConfig.forEach(item => {
        const el = document.getElementById(item.id);
        if (!el) return;

        el.addEventListener('blur', () => {
            const err = item.fn(el.value);
            if (err) {
                setFieldError(item.id, item.errId, err);
            } else {
                marcarCampoValido(item.id, item.errId);
            }
        });

        el.addEventListener('input', () => {
            // Limpiar error mientras escribe si ya es válido
            const err = item.fn(el.value);
            if (!err) {
                marcarCampoValido(item.id, item.errId);
            }
        });
    });

    // Auto-ajustar categoría y validar menor de edad según fecha de nacimiento
    const fechaEl = document.getElementById('reg-fecha-nac');
    if (fechaEl) {
        fechaEl.addEventListener('change', () => {
            const val = fechaEl.value;
            const dist = document.querySelector('input[name="distancia"]:checked')?.value || '10k';
            const err = validarFechaNacVal(val, dist);

            if (err) {
                setFieldError('reg-fecha-nac', 'err-reg-fecha-nac', err);
            } else {
                marcarCampoValido('reg-fecha-nac', 'err-reg-fecha-nac');

                // Auto-calcular edad
                const f = new Date(val);
                const fechaEvento = new Date('2026-11-15T00:00:00Z');
                let edad = fechaEvento.getFullYear() - f.getFullYear();
                const m = fechaEvento.getMonth() - f.getMonth();
                if (m < 0 || (m === 0 && fechaEvento.getDate() < f.getDate())) edad--;

                const menorCheck = document.getElementById('reg-es-menor');
                if (edad < 18) {
                    if (menorCheck && !menorCheck.checked) {
                        menorCheck.checked = true;
                        toggleMenorEdadCampos();
                    }
                    // Forzar distancia 5K si el atleta tiene menos de 18 años
                    const radio5k = document.querySelector('input[name="distancia"][value="5k"]');
                    if (radio5k && dist !== '5k') {
                        radio5k.checked = true;
                        actualizarDesglosePrecios();
                        mostrarErrorFormulario(`Por ser menor de edad (${edad} años), la distancia oficial se ha ajustado automáticamente a 5K Familiar.`);
                    }
                } else {
                    if (menorCheck && menorCheck.checked) {
                        menorCheck.checked = false;
                        toggleMenorEdadCampos();
                    }
                    // Sugerir categoría por edad
                    const catSelect = document.getElementById('reg-cat');
                    if (catSelect) {
                        if (edad < 40) catSelect.value = 'Libre (18-39 años)';
                        else if (edad < 50) catSelect.value = 'Máster A (40-49 años)';
                        else catSelect.value = 'Máster B (50+ años)';
                    }
                }
            }
        });
    }

    // Al cambiar tipo de documento, revalidar número
    const tipoDocEl = document.getElementById('reg-tipo-doc');
    const docEl = document.getElementById('reg-doc');
    if (tipoDocEl && docEl) {
        tipoDocEl.addEventListener('change', () => {
            if (docEl.value.trim().length > 0) {
                const err = validarDocumentoVal(tipoDocEl.value, docEl.value);
                if (err) setFieldError('reg-doc', 'err-reg-doc', err);
                else marcarCampoValido('reg-doc', 'err-reg-doc');
            }
        });
    }
}

// ====================================================================
// PROCESAR ENVÍO DEL FORMULARIO E INVOCAR WIDGET WOMPI
// ====================================================================

async function handleRegistrationSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('btn-submit-pago');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    const errorBox = document.getElementById('form-error-box');

    if (errorBox) {
        errorBox.classList.add('hidden');
        errorBox.innerHTML = '';
    }

    // 1. Ejecutar validaciones completas de datos reales
    const validacion = validarTodoElFormulario();
    if (!validacion.valido) {
        const errorHtml = validacion.listaErrores.map(e => `• ${e}`).join('<br>');
        mostrarErrorFormulario(errorHtml);

        if (validacion.primerCampoError) {
            validacion.primerCampoError.focus();
            validacion.primerCampoError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    // 2. Recolectar datos limpios
    const distancia = document.querySelector('input[name="distancia"]:checked')?.value || '10k';
    const nombres = document.getElementById('reg-nombre')?.value?.trim();
    const tipoDocumento = document.getElementById('reg-tipo-doc')?.value || 'CC';
    const documento = document.getElementById('reg-doc')?.value?.trim();
    const fechaNacimiento = document.getElementById('reg-fecha-nac')?.value || null;
    const esMenorEdad = document.getElementById('reg-es-menor')?.checked || false;

    const nombreAcudiente = document.getElementById('reg-nombre-acudiente')?.value?.trim() || '';
    const documentoAcudiente = document.getElementById('reg-doc-acudiente')?.value?.trim() || '';
    const telefonoAcudiente = document.getElementById('reg-tel-acudiente')?.value?.trim() || '';
    const parentescoAcudiente = document.getElementById('reg-parentesco')?.value || '';

    const email = document.getElementById('reg-email')?.value?.trim();
    const telefono = document.getElementById('reg-tel')?.value?.trim();
    const genero = document.getElementById('reg-genero')?.value;
    const categoria = document.getElementById('reg-cat')?.value;
    const talla = document.getElementById('reg-talla')?.value;
    const eps = document.getElementById('reg-eps')?.value?.trim();

    const emergenciaNombre = document.getElementById('reg-emergencia-nombre')?.value?.trim();
    const emergenciaTelefono = document.getElementById('reg-emergencia-tel')?.value?.trim();

    const aceptaReglamento = document.getElementById('reg-acepta-reglamento')?.checked;
    const aceptaDatos = document.getElementById('reg-acepta-datos')?.checked;

    // Estado visual de carga
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-nature-900 inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            Validando datos y conectando con Wompi...
        `;
    }

    try {
        // 3. Enviar datos al backend para crear orden y generar firma SHA-256
        const response = await fetch('/api/inscripciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                distancia,
                nombres,
                tipoDocumento,
                documento,
                fechaNacimiento,
                esMenorEdad,
                nombreAcudiente,
                documentoAcudiente,
                telefonoAcudiente,
                parentescoAcudiente,
                email,
                telefono,
                genero,
                categoria,
                talla,
                eps,
                contactoEmergenciaNombre: emergenciaNombre,
                contactoEmergenciaTelefono: emergenciaTelefono,
                aceptaReglamento,
                aceptaDatos
            })
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            const msgs = data.detalles ? data.detalles.join('<br>') : (data.error || 'Error al procesar inscripción.');
            mostrarErrorFormulario(msgs);
            restaurarBotonSubmit(submitBtn, originalBtnText);
            return;
        }

        // 4. Éxito en backend -> Abrir Widget Wompi oficial
        if (typeof WidgetCheckout === 'undefined') {
            mostrarErrorFormulario('No se pudo cargar la librería de Wompi. Por favor verifica tu conexión a internet.');
            restaurarBotonSubmit(submitBtn, originalBtnText);
            return;
        }

        const checkout = new WidgetCheckout({
            currency: data.wompi.currency,
            amountInCents: data.wompi.amountInCents,
            reference: data.wompi.reference,
            publicKey: data.wompi.publicKey,
            signature: {
                integrity: data.wompi.signature
            },
            redirectUrl: data.wompi.redirectUrl,
            customerData: {
                email: data.wompi.customerData.email,
                fullName: data.wompi.customerData.fullName,
                phoneNumber: data.wompi.customerData.phoneNumber,
                legalId: data.wompi.customerData.legalId,
                legalIdType: data.wompi.customerData.legalIdType
            }
        });

        // Ocultar modal de registro para que Wompi tome el protagonismo
        closeRegistrationModal();

        // Abrir pasarela Wompi
        checkout.open(function (result) {
            const transaction = result.transaction;
            console.log('Resultado transacción Wompi:', transaction);
            const sep = data.wompi.redirectUrl.includes('?') ? '&' : '?';
            const txId = transaction?.id ? encodeURIComponent(transaction.id) : '';
            window.location.href = `${data.wompi.redirectUrl}${sep}id=${txId}`;
        });

    } catch (err) {
        console.error('Error enviando formulario:', err);
        mostrarErrorFormulario('No se pudo conectar con el servidor de pagos. Revisa tu conexión a internet.');
    } finally {
        restaurarBotonSubmit(submitBtn, originalBtnText);
    }
}

function mostrarErrorFormulario(htmlMsg) {
    const errorBox = document.getElementById('form-error-box');
    if (errorBox) {
        errorBox.innerHTML = `
            <div class="flex items-start gap-2.5">
                <i class="fas fa-exclamation-triangle text-red-400 mt-1 flex-shrink-0 text-base"></i>
                <div class="text-xs leading-relaxed text-red-200">
                    <strong class="font-bold text-red-300 block mb-1">Por favor corrige los siguientes datos:</strong>
                    ${htmlMsg}
                </div>
            </div>
        `;
        errorBox.classList.remove('hidden');
        errorBox.classList.add('animate-shake');
        setTimeout(() => errorBox.classList.remove('animate-shake'), 400);
        errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (typeof mostrarAlertaModal === 'function') {
        mostrarAlertaModal({
            titulo: 'Revisa tus Datos',
            mensaje: `Detectamos información incompleta o incorrecta:<br><div class="text-left bg-nature-950/70 p-3 rounded-xl border border-red-500/40 text-xs text-red-200 mt-2 space-y-1">${htmlMsg}</div>`,
            tipo: 'error',
            textoBoton: 'Entendido, voy a corregir'
        });
    }
}

function restaurarBotonSubmit(btn, originalHtml) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

// Inicializar al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    cargarConfiguracionPrecios();
    inicializarValidacionEnVivo();
});
