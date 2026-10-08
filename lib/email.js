// ====================================================================
// ENVÍO DE CORREOS TRANSACCIONALES - NOCAIMA TRAIL 2026
// ====================================================================

/**
 * Envía el correo electrónico de confirmación con el ticket y dorsal
 * al atleta que completó su pago con éxito.
 */
async function enviarEmailConfirmacion(corredor) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const siteUrl = process.env.SITE_URL || 'https://nocaimatrail.com';

    const asunto = `🏃 ¡Inscripción Confirmada! Dorsal #${corredor.dorsal} - Nocaima Trail 2026`;
    const ticketUrl = `${siteUrl}/confirmacion.html?ref=${corredor.referencia}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #081c15; color: #e5e7eb; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #1b4332; border-radius: 16px; overflow: hidden; border: 1px solid #d4a373; }
            .header { background: #04100c; padding: 30px 20px; text-align: center; }
            .header h1 { color: #d4a373; margin: 0; font-size: 26px; }
            .body { padding: 30px 25px; }
            .dorsal-box { background: #081c15; border: 2px dashed #d4a373; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0; }
            .dorsal-number { font-size: 48px; font-weight: 900; color: #faedcd; margin: 5px 0; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .details-table td { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 14px; }
            .btn { display: inline-block; background: #d4a373; color: #081c15; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 50px; margin-top: 20px; }
            .footer { background: #081c15; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>NOCAIMA TRAIL 2026</h1>
                <p style="color: #74c69d; margin: 5px 0 0 0;">15 de Noviembre de 2026 • Cundinamarca</p>
            </div>
            <div class="body">
                <h2>¡Bienvenido a la Montaña, ${corredor.nombres}!</h2>
                <p>Tu pago ha sido confirmado con éxito a través de Wompi. Ya tienes un cupo asegurado en la línea de partida.</p>
                
                <div class="dorsal-box">
                    <span style="color: #74c69d; font-size: 12px; font-weight: bold; letter-spacing: 2px;">TU DORSAL OFICIAL</span>
                    <div class="dorsal-number">#${corredor.dorsal}</div>
                    <span style="color: #d4a373; font-weight: bold; font-size: 16px;">DISTANCIA: ${String(corredor.distancia).toUpperCase()}</span>
                </div>

                <table class="details-table">
                    <tr><td><strong>Atleta:</strong></td><td>${corredor.nombres}</td></tr>
                    <tr><td><strong>Documento:</strong></td><td>${corredor.tipoDocumento || 'CC'} ${corredor.documento}</td></tr>
                    <tr><td><strong>Categoría:</strong></td><td>${corredor.categoria}</td></tr>
                    <tr><td><strong>Talla Camiseta:</strong></td><td>Talla ${corredor.tallaCamiseta}</td></tr>
                    <tr><td><strong>Referencia de Pago:</strong></td><td><code>${corredor.referencia}</code></td></tr>
                    <tr><td><strong>Total Pagado:</strong></td><td>$${(corredor.totalPagarCOP || 0).toLocaleString('es-CO')} COP</td></tr>
                </table>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="${ticketUrl}" class="btn">Ver & Descargar Ticket Oficial con QR</a>
                </div>
            </div>
            <div class="footer">
                <p>Recuerda presentar este ticket digital o tu documento de identidad para reclamar el kit de competencia en Nocaima.</p>
                <p>© 2026 Nocaima Trail. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    if (resendApiKey) {
        try {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Nocaima Trail <inscripciones@nocaimatrail.com>',
                    to: [corredor.email],
                    subject: asunto,
                    html: htmlContent
                })
            });
            console.log(`[EMAIL] Correo de confirmación enviado a ${corredor.email}`);
            return true;
        } catch (err) {
            console.error('[EMAIL] Error enviando correo vía Resend:', err.message);
        }
    } else {
        console.log(`[EMAIL SIMULADO] Se enviaría confirmación a ${corredor.email} con Dorsal #${corredor.dorsal}. Ver ticket en: ${ticketUrl}`);
    }
    return false;
}

module.exports = {
    enviarEmailConfirmacion
};
