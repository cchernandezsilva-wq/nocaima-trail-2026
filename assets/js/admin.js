// ====================================================================
// SCRIPT PANEL ADMINISTRATIVO - NOCAIMA TRAIL 2026
// ====================================================================

let inscritosData = [];
let adminSecret = sessionStorage.getItem('nocaima_admin_key') || '';

function autenticarAdmin(event) {
    if (event) event.preventDefault();
    const key = document.getElementById('input-admin-key').value.trim();
    if (!key) return;

    adminSecret = key;
    sessionStorage.setItem('nocaima_admin_key', key);
    cargarDatosAdmin();
}

function cerrarSesionAdmin() {
    sessionStorage.removeItem('nocaima_admin_key');
    adminSecret = '';
    document.getElementById('modal-auth').classList.remove('hidden');
}

async function cargarDatosAdmin() {
    if (!adminSecret) {
        document.getElementById('modal-auth').classList.remove('hidden');
        return;
    }

    const refreshIcon = document.getElementById('icon-refresh');
    if (refreshIcon) refreshIcon.classList.add('fa-spin');

    try {
        const res = await fetch('/api/admin/inscritos', {
            headers: { 'x-admin-key': adminSecret }
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
            document.getElementById('modal-auth').classList.remove('hidden');
            const errEl = document.getElementById('auth-error');
            if (errEl) {
                errEl.innerText = data.error || 'Clave de administración incorrecta.';
                errEl.classList.remove('hidden');
            }
            return;
        }

        // Acceso concedido
        document.getElementById('modal-auth').classList.add('hidden');
        inscritosData = data.inscripciones || [];
        renderizarMetricas(data.metricas);
        aplicarFiltros();

    } catch (err) {
        console.error('Error conectando con la API de administración:', err);
    } finally {
        if (refreshIcon) refreshIcon.classList.remove('fa-spin');
    }
}

function renderizarMetricas(m) {
    if (!m) return;
    document.getElementById('kpi-recaudo').innerText = `$${(m.totalRecaudadoCOP || 0).toLocaleString('es-CO')} COP`;
    document.getElementById('kpi-aprobados').innerText = m.totalAprobados || 0;
    document.getElementById('kpi-pendientes').innerText = `${m.totalPendientes || 0} en proceso de pago`;

    document.getElementById('kpi-5k').innerText = m.porDistancia?.['5k'] || 0;
    document.getElementById('kpi-10k').innerText = m.porDistancia?.['10k'] || 0;
    document.getElementById('kpi-21k').innerText = m.porDistancia?.['21k'] || 0;

    document.getElementById('talla-s').innerText = m.porTalla?.['S'] || 0;
    document.getElementById('talla-m').innerText = m.porTalla?.['M'] || 0;
    document.getElementById('talla-l').innerText = m.porTalla?.['L'] || 0;
    document.getElementById('talla-xl').innerText = m.porTalla?.['XL'] || 0;
}

function aplicarFiltros() {
    const busqueda = (document.getElementById('filtro-busqueda')?.value || '').toLowerCase();
    const distancia = document.getElementById('filtro-distancia')?.value || '';
    const estado = document.getElementById('filtro-estado')?.value || '';

    let filtrados = inscritosData.filter(i => {
        const coincideDist = !distancia || (i.distancia || '').toLowerCase() === distancia.toLowerCase();
        const coincideEstado = !estado || (i.estado_pago || '').toUpperCase() === estado.toUpperCase();
        const coincideTexto = !busqueda || 
            (i.nombres || '').toLowerCase().includes(busqueda) ||
            (i.documento || '').includes(busqueda) ||
            (i.referencia || '').toLowerCase().includes(busqueda) ||
            String(i.dorsal || '').includes(busqueda);

        return coincideDist && coincideEstado && coincideTexto;
    });

    renderizarTabla(filtrados);
}

function renderizarTabla(lista) {
    const tbody = document.getElementById('tabla-inscritos');
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-gray-500">No se encontraron corredores con los filtros seleccionados.</td></tr>`;
        return;
    }

    let html = '';
    lista.forEach(i => {
        const esAprobado = i.estado_pago === 'APROBADO';
        const estadoBadge = esAprobado
            ? `<span class="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold text-[10px]">APROBADO</span>`
            : (i.estado_pago === 'PENDIENTE' 
                ? `<span class="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-[10px]">PENDIENTE</span>`
                : `<span class="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold text-[10px]">${i.estado_pago}</span>`);

        const dorsalBadge = i.dorsal 
            ? `<span class="font-heading font-black text-sm text-nature-accent">#${i.dorsal}</span>`
            : `<span class="text-gray-500">-</span>`;

        const kitBtn = i.kit_entregado
            ? `<button onclick="toggleKit('${i.referencia}', false)" class="px-2 py-1 rounded bg-green-900/60 text-green-300 hover:bg-green-800 text-[10px] font-bold">Entregado ✓</button>`
            : `<button onclick="toggleKit('${i.referencia}', true)" class="px-2 py-1 rounded bg-nature-700/60 text-gray-400 hover:bg-nature-700 text-[10px]">Pendiente</button>`;

        const menorBadge = i.esMenorEdad ? `<span class="text-[9px] px-1 rounded bg-blue-900/60 text-blue-300 block">Menor de Edad</span>` : '';

        const btnAprobar = (!esAprobado && i.estado_pago === 'PENDIENTE')
            ? `<button onclick="confirmarAprobarManual('${i.referencia}', '${(i.nombres || '').replace(/'/g, "\\'")}')" 
                class="px-2 py-1 rounded bg-nature-accent hover:bg-white text-nature-900 font-bold text-[10px] transition-colors" title="Aprobar Pago Manual">
                <i class="fas fa-check-circle mr-0.5"></i> Aprobar
               </button>`
            : '';

        html += `
            <tr class="hover:bg-nature-700/20 transition-colors">
                <td class="py-3 px-4">${dorsalBadge}</td>
                <td class="py-3 px-4">
                    <strong class="text-white block font-medium">${i.nombres}</strong>
                    <span class="text-[10px] text-gray-400 font-mono">${i.referencia}</span>
                    ${menorBadge}
                </td>
                <td class="py-3 px-4">${i.tipoDocumento || 'CC'} ${i.documento}</td>
                <td class="py-3 px-4">
                    <span class="font-bold text-nature-accent">${(i.distancia || '').toUpperCase()}</span>
                    <span class="block text-[10px] text-gray-400">${i.categoria}</span>
                </td>
                <td class="py-3 px-4 font-semibold text-nature-earth">Talla ${i.tallaCamiseta || i.talla_camiseta}</td>
                <td class="py-3 px-4">$${(i.totalPagarCOP || i.total_pagar_cop || 0).toLocaleString('es-CO')}</td>
                <td class="py-3 px-4">${estadoBadge}</td>
                <td class="py-3 px-4">${kitBtn}</td>
                <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-1.5 flex-wrap">
                        ${btnAprobar}
                        <button onclick="abrirModalDetalle('${i.referencia}')" title="Ver Ficha Completa"
                            class="p-1.5 rounded-lg bg-nature-700 hover:bg-nature-600 text-gray-200 hover:text-white transition-colors">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="copiarTicketLink('${i.referencia}')" title="Copiar Link para Compartir"
                            class="p-1.5 rounded-lg bg-nature-700 hover:bg-nature-600 text-nature-accent hover:text-white transition-colors">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <a href="../confirmacion.html?ref=${i.referencia}" target="_blank" title="Ver Ticket Digital"
                            class="p-1.5 rounded-lg bg-nature-700 hover:bg-nature-600 text-nature-earth inline-block transition-colors">
                            <i class="fas fa-qrcode"></i>
                        </a>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

let currentModalRef = '';

function abrirModalDetalle(ref) {
    const at = inscritosData.find(i => i.referencia === ref);
    if (!at) return;

    currentModalRef = ref;
    document.getElementById('modal-det-nombre').innerText = at.nombres || 'Corredor';
    document.getElementById('modal-det-ref').innerText = at.referencia || '';
    document.getElementById('modal-det-dorsal').innerText = at.dorsal ? `#${at.dorsal}` : 'Sin Asignar';
    document.getElementById('modal-det-distancia').innerText = (at.distancia || '').toUpperCase();
    
    const estadoEl = document.getElementById('modal-det-estado');
    estadoEl.innerText = at.estado_pago || 'PENDIENTE';
    estadoEl.className = at.estado_pago === 'APROBADO' ? 'font-bold text-xs text-green-400' : 'font-bold text-xs text-yellow-400';

    const kitEl = document.getElementById('modal-det-kit');
    kitEl.innerText = at.kit_entregado ? 'Entregado ✓' : 'Pendiente';
    kitEl.className = at.kit_entregado ? 'font-bold text-xs text-green-400' : 'font-bold text-xs text-gray-400';

    document.getElementById('modal-det-doc').innerText = `${at.tipoDocumento || 'CC'} ${at.documento || '-'}`;
    document.getElementById('modal-det-email').innerText = at.email || '-';
    document.getElementById('modal-det-tel').innerText = at.telefono || '-';
    document.getElementById('modal-det-genero').innerText = at.genero || '-';
    document.getElementById('modal-det-categoria').innerText = at.categoria || '-';
    document.getElementById('modal-det-talla').innerText = `Talla ${at.tallaCamiseta || at.talla_camiseta || 'M'}`;
    document.getElementById('modal-det-eps').innerText = at.eps || 'No especificada';
    document.getElementById('modal-det-valor').innerText = `$${(at.totalPagarCOP || at.total_pagar_cop || 0).toLocaleString('es-CO')} COP`;

    const emNom = at.contactoEmergenciaNombre || at.contacto_emergencia_nombre || 'No registrado';
    const emTel = at.contactoEmergenciaTelefono || at.contacto_emergencia_telefono || '';
    document.getElementById('modal-det-emergencia-nom').innerText = emNom;
    document.getElementById('modal-det-emergencia-tel').innerText = emTel || 'Sin teléfono';
    
    const btnLlamar = document.getElementById('btn-llamar-emergencia');
    if (emTel) {
        btnLlamar.href = `tel:${emTel.replace(/[^0-9+]/g, '')}`;
        btnLlamar.classList.remove('hidden');
    } else {
        btnLlamar.classList.add('hidden');
    }

    // Menor de edad
    const seccionMenor = document.getElementById('modal-det-seccion-menor');
    if (at.esMenorEdad || at.es_menor_edad) {
        seccionMenor.classList.remove('hidden');
        document.getElementById('modal-det-tutor-nom').innerText = at.nombreAcudiente || at.nombre_acudiente || '-';
        document.getElementById('modal-det-tutor-doc').innerText = at.documentoAcudiente || at.documento_acudiente || '-';
        document.getElementById('modal-det-tutor-tel').innerText = at.telefonoAcudiente || at.telefono_acudiente || '-';
        document.getElementById('modal-det-tutor-parentesco').innerText = at.parentescoAcudiente || at.parentesco_acudiente || 'Tutor legal';
    } else {
        seccionMenor.classList.add('hidden');
    }

    document.getElementById('modal-det-link-ticket').href = `../confirmacion.html?ref=${encodeURIComponent(ref)}`;
    document.getElementById('modal-detalle-atleta').classList.remove('hidden');
}

function cerrarModalDetalle() {
    document.getElementById('modal-detalle-atleta').classList.add('hidden');
}

let pendingAdminAction = null;

function confirmarAprobarManual(ref, nombre) {
    mostrarAdminAlert(
        'Aprobar Pago Manual',
        `¿Deseas confirmar la recepción del pago en efectivo o transferencia para el atleta "${nombre}" (${ref})? Se le asignará un dorsal oficial y quedará habilitado para el evento.`,
        'confirm',
        () => ejecutarAprobacionManual(ref)
    );
}

async function ejecutarAprobacionManual(referencia) {
    cerrarAdminAlert();
    try {
        const res = await fetch('/api/admin/aprobar-manual', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminSecret
            },
            body: JSON.stringify({ referencia, metodoPago: 'EFECTIVO / TRANSFERENCIA' })
        });

        const data = await res.json();
        if (data.ok) {
            mostrarToast(`✓ Pago aprobado con dorsal #${data.inscripcion?.dorsal}`);
            cargarDatosAdmin();
        } else {
            mostrarAdminAlert('Error de Aprobación', data.error || 'No se pudo aprobar la inscripción.', 'error');
        }
    } catch (err) {
        mostrarAdminAlert('Error de Red', 'No fue posible comunicarse con el servidor.', 'error');
    }
}

function copiarTicketLink(ref) {
    if (!ref) return;
    const url = `${window.location.origin}/confirmacion.html?ref=${encodeURIComponent(ref)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            mostrarToast('✓ Enlace copiado al portapapeles');
        }).catch(() => fallbackCopiar(url));
    } else {
        fallbackCopiar(url);
    }
}

function fallbackCopiar(texto) {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        mostrarToast('✓ Enlace copiado al portapapeles');
    } catch (e) {
        mostrarAdminAlert('Enlace del Ticket', texto, 'info');
    }
    document.body.removeChild(ta);
}

function mostrarToast(mensaje) {
    const toast = document.getElementById('admin-toast');
    const msgEl = document.getElementById('admin-toast-msg');
    if (!toast || !msgEl) return;
    msgEl.innerText = mensaje;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3200);
}

function mostrarAdminAlert(titulo, mensaje, tipo = 'info', onConfirm = null) {
    const modal = document.getElementById('modal-admin-alert');
    const titleEl = document.getElementById('admin-alert-title');
    const msgEl = document.getElementById('admin-alert-msg');
    const iconBox = document.getElementById('admin-alert-icon-box');
    const icon = document.getElementById('admin-alert-icon');
    const btnCancel = document.getElementById('admin-alert-btn-cancel');
    const btnOk = document.getElementById('admin-alert-btn-ok');

    if (!modal) return;

    titleEl.innerText = titulo;
    msgEl.innerText = mensaje;

    // Estilos por tipo
    if (tipo === 'confirm') {
        iconBox.className = 'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner bg-yellow-500/20 text-yellow-400 border border-yellow-500/40';
        icon.className = 'fas fa-question-circle';
        btnCancel.classList.remove('hidden');
        btnOk.innerText = 'Confirmar Aprobación';
        btnOk.onclick = () => {
            if (onConfirm) onConfirm();
        };
    } else if (tipo === 'error') {
        iconBox.className = 'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner bg-red-500/20 text-red-400 border border-red-500/40';
        icon.className = 'fas fa-exclamation-triangle';
        btnCancel.classList.add('hidden');
        btnOk.innerText = 'Entendido';
        btnOk.onclick = cerrarAdminAlert;
    } else {
        iconBox.className = 'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner bg-nature-700/60 text-nature-accent border border-nature-500/30';
        icon.className = 'fas fa-info-circle';
        btnCancel.classList.add('hidden');
        btnOk.innerText = 'Aceptar';
        btnOk.onclick = cerrarAdminAlert;
    }

    modal.classList.remove('hidden');
}

function cerrarAdminAlert() {
    const modal = document.getElementById('modal-admin-alert');
    if (modal) modal.classList.add('hidden');
}

async function toggleKit(referencia, nuevoEstado) {
    try {
        const res = await fetch('/api/admin/entregar-kit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminSecret
            },
            body: JSON.stringify({ referencia, entregado: nuevoEstado })
        });
        if (res.ok) {
            mostrarToast(nuevoEstado ? '✓ Kit marcado como Entregado' : 'Kit marcado como Pendiente');
            cargarDatosAdmin();
        }
    } catch (err) {
        console.error('Error actualizando kit:', err);
    }
}

function descargarExcel() {
    if (!adminSecret) return;
    window.location.href = `/api/admin/exportar?key=${encodeURIComponent(adminSecret)}`;
}

document.addEventListener('DOMContentLoaded', () => {
    cargarDatosAdmin();
});
