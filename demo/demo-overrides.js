/**
 * ==============================================================================
 * DEMO · Ajustes de interfaz
 * ==============================================================================
 * Se carga DESPUÉS del bundle de la app. No cambia la lógica de la app: solo reemplaza lo que
 * en producción depende de servicios de Google que no existen en una demo estática:
 *   - Accesos rápidos con cuentas de demostración en el login.
 *   - Códigos de verificación/recuperación mostrados en pantalla (en producción llegan por correo).
 *   - Vista previa de documentos (en producción es un iframe de Google Drive).
 *   - Explorador de Google Drive simulado (en producción es Google Picker + OAuth).
 *   - Panel de privacidad sobre archivos ya subidos.
 *   - Insignia flotante "Demo" con botón para restablecer los datos.
 */
(function () {
  'use strict';

  var semilla = window.DEMO_SEMILLA;

  function esc(texto) {
    var div = document.createElement('div');
    div.textContent = texto == null ? '' : String(texto);
    return div.innerHTML;
  }

  function notificar(mensaje, tipo, duracion) {
    if (typeof showNotification === 'function') showNotification(mensaje, tipo || 'info', duracion || 3000);
  }

  // ============================================================================
  // 1. Accesos rápidos en el login
  // ============================================================================
  function insertarAccesosDemo() {
    var form = document.getElementById('loginForm');
    if (!form || document.getElementById('demoAccesos')) return;

    var iconos = {
      3: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/><path d="M19 8l2 2-2 2"/></svg>',
      1: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg>'
    };

    var bloque = document.createElement('div');
    bloque.id = 'demoAccesos';
    bloque.className = 'demo-accesos';
    bloque.innerHTML =
      '<p class="demo-accesos-titulo"><span class="demo-dot"></span>Entra con una cuenta de demostración</p>' +
      '<div class="demo-accesos-lista">' +
        semilla.cuentasDemo.map(function (c) {
          return '<button type="button" class="demo-acceso" data-email="' + esc(c.email) + '" title="' + esc(c.descripcion) + '">' +
            '<span class="demo-acceso-icono">' + iconos[c.rolId] + '</span>' +
            '<span class="demo-acceso-texto"><strong>' + esc(c.etiqueta) + '</strong><small>' + esc(c.email) + '</small></span>' +
          '</button>';
        }).join('') +
      '</div>' +
      '<p class="demo-accesos-nota">Contraseña para todas: <code>' + esc(semilla.contrasenaDemo) + '</code></p>';

    form.parentNode.insertBefore(bloque, form.nextSibling);

    bloque.querySelectorAll('.demo-acceso').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var email = document.getElementById('loginEmail');
        var pass = document.getElementById('loginPassword');
        if (email) email.value = btn.dataset.email;
        if (pass) pass.value = semilla.contrasenaDemo;
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { cancelable: true }));
      });
    });
  }

  // ============================================================================
  // 2. Códigos "enviados por correo"
  // ============================================================================
  function mostrarCodigo(email, codigo, motivo) {
    var previo = document.getElementById('demoCodigo');
    if (previo) previo.remove();

    var tarjeta = document.createElement('div');
    tarjeta.id = 'demoCodigo';
    tarjeta.className = 'demo-codigo';
    tarjeta.innerHTML =
      '<div class="demo-codigo-cabecera">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>' +
        '<span>Correo simulado</span>' +
        '<button type="button" class="demo-codigo-cerrar" aria-label="Cerrar">&times;</button>' +
      '</div>' +
      '<p>Código de ' + esc(motivo) + ' para <strong>' + esc(email) + '</strong>:</p>' +
      '<div class="demo-codigo-valor">' + esc(codigo) + '</div>' +
      '<button type="button" class="demo-codigo-usar">Usar este código</button>';
    document.body.appendChild(tarjeta);

    tarjeta.querySelector('.demo-codigo-cerrar').addEventListener('click', function () { tarjeta.remove(); });
    tarjeta.querySelector('.demo-codigo-usar').addEventListener('click', function () {
      var input = document.getElementById('inputCodigoVerificacion') || document.getElementById('inputCodigoRecuperar');
      if (input && !input.disabled) {
        input.value = codigo;
        input.focus();
      }
      tarjeta.remove();
    });
  }

  // ============================================================================
  // 3. Vista previa de documentos
  // ============================================================================
  function aleatorioDesde(texto) {
    var h = 0;
    for (var i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
    return function () { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  }

  var PARRAFOS = [
    'El presente documento consolida la información del periodo y sirve como referencia para el equipo directivo y las áreas involucradas.',
    'Los indicadores se calcularon con base en los reportes del sistema de gestión proyectoera, validados por cada jefe de área antes del cierre.',
    'Se recomienda revisar los compromisos pendientes en el próximo comité y actualizar los responsables de cada acción.',
    'Las cifras presentadas son preliminares y pueden ajustarse tras la auditoría interna programada para el siguiente trimestre.',
    'Cualquier modificación a este documento debe quedar registrada en el repositorio para conservar la trazabilidad de versiones.'
  ];

  function previaDocumento(nombre, rnd) {
    var titulo = nombre.replace(/\.[^.]+$/, '');
    var html = '<div class="demo-hoja"><div class="demo-hoja-marca">DOCUOBRA</div><h1>' + esc(titulo) + '</h1>' +
      '<p class="demo-hoja-meta">Documento de ejemplo · Versión 1.' + Math.floor(rnd() * 9) + '</p>';
    for (var i = 0; i < 4; i++) {
      html += '<h3>' + (i + 1) + '. ' + ['Objetivo', 'Alcance', 'Desarrollo', 'Conclusiones'][i] + '</h3>';
      html += '<p>' + PARRAFOS[Math.floor(rnd() * PARRAFOS.length)] + ' ' + PARRAFOS[Math.floor(rnd() * PARRAFOS.length)] + '</p>';
    }
    return html + '</div>';
  }

  function previaHojaCalculo(nombre, rnd) {
    var columnas = ['Concepto', 'Ene', 'Feb', 'Mar', 'Abr', 'Total'];
    var conceptos = ['Estructura', 'Mampostería', 'Acabados', 'Instalaciones', 'Carpintería', 'Obras exteriores', 'Equipos', 'Imprevistos'];
    var html = '<div class="demo-excel"><div class="demo-excel-barra">' + esc(nombre) + '</div><table><thead><tr><th></th>' +
      columnas.map(function (c, i) { return '<th>' + String.fromCharCode(65 + i) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      '<tr><td class="demo-excel-num">1</td>' + columnas.map(function (c) { return '<td class="demo-excel-cab">' + c + '</td>'; }).join('') + '</tr>';
    conceptos.forEach(function (concepto, i) {
      var valores = [0, 0, 0, 0].map(function () { return Math.round(8 + rnd() * 140) * 1000; });
      var total = valores.reduce(function (a, b) { return a + b; }, 0);
      html += '<tr><td class="demo-excel-num">' + (i + 2) + '</td><td>' + concepto + '</td>' +
        valores.map(function (v) { return '<td class="demo-excel-valor">$ ' + v.toLocaleString('es-CO') + '</td>'; }).join('') +
        '<td class="demo-excel-valor demo-excel-total">$ ' + total.toLocaleString('es-CO') + '</td></tr>';
    });
    return html + '</tbody></table></div>';
  }

  function previaPresentacion(nombre) {
    var titulo = nombre.replace(/\.[^.]+$/, '');
    return '<div class="demo-slide"><div class="demo-slide-franja"></div><p class="demo-slide-marca">DOCUOBRA</p>' +
      '<h1>' + esc(titulo) + '</h1><p class="demo-slide-sub">Presentación de ejemplo · Repositorio de Documentos</p>' +
      '<div class="demo-slide-puntos"><span></span><span></span><span></span></div></div>';
  }

  function previaImagen(nombre, rnd) {
    var tono = Math.floor(rnd() * 360);
    return '<div class="demo-imagen" style="background:linear-gradient(135deg,hsl(' + tono + ',45%,62%),hsl(' + ((tono + 50) % 360) + ',50%,38%));">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
      '<p>' + esc(nombre) + '</p></div>';
  }

  function previaComprimido(nombre) {
    var entradas = ['config/bim.json', 'config/red.conf', 'respaldos/usuarios.csv', 'LEEME.txt'];
    return '<div class="demo-zip"><p><strong>' + esc(nombre) + '</strong> contiene:</p><ul>' +
      entradas.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul></div>';
  }

  function contenidoPrevia(archivo, ext) {
    var dataUrl = archivo.previaDemo || (window.DemoBackend && window.DemoBackend.previaDeArchivo(archivo.id));
    if (dataUrl) {
      if (/^data:image\//.test(dataUrl)) return '<img class="demo-previa-real" src="' + dataUrl + '" alt="">';
      if (/^data:application\/pdf/.test(dataUrl)) return '<iframe class="preview-archivo-frame" src="' + dataUrl + '"></iframe>';
    }
    var rnd = aleatorioDesde(archivo.nombre || '');
    if (['xls', 'xlsx', 'csv'].indexOf(ext) !== -1) return previaHojaCalculo(archivo.nombre, rnd);
    if (['ppt', 'pptx'].indexOf(ext) !== -1) return previaPresentacion(archivo.nombre);
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].indexOf(ext) !== -1) return previaImagen(archivo.nombre, rnd);
    if (['zip', 'rar', '7z'].indexOf(ext) !== -1) return previaComprimido(archivo.nombre);
    return previaDocumento(archivo.nombre, rnd);
  }

  window.abrirPreviewArchivo = function (archivo) {
    var user = typeof getCurrentUserSession === 'function' ? getCurrentUserSession() : null;
    if (user && typeof registrarActividadSilenciosa === 'function') {
      registrarActividadSilenciosa(user.ID_Usuario, 'Archivo', archivo.id, 'Abrió');
    }

    var extension = typeof extensionDeArchivo === 'function' ? extensionDeArchivo(archivo.nombre) : '';
    var iconoUrl = typeof iconoArchivoUrl === 'function' ? iconoArchivoUrl(extension) : '';
    var fecha = archivo.fecha ? new Date(archivo.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    var tamano = typeof formatearTamaño === 'function' ? formatearTamaño(archivo.tamano || 0) : '';

    abrirPanelLateral({
      titulo: 'Vista previa',
      ancho: 'grande',
      html:
        '<div class="preview-archivo">' +
          '<div class="preview-archivo-encabezado">' +
            '<img class="preview-archivo-icono" src="' + iconoUrl + '" alt="">' +
            '<div class="preview-archivo-info">' +
              '<p class="preview-archivo-nombre">' + esc(archivo.nombre) + '</p>' +
              '<p class="preview-archivo-meta">' + extension.toUpperCase() + (fecha ? ' &bull; ' + fecha : '') + (tamano ? ' &bull; ' + tamano : '') +
                (archivo.responsable ? ' &bull; ' + esc(archivo.responsable) : '') + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="preview-archivo-frame-wrap demo-previa-wrap">' + contenidoPrevia(archivo, extension) + '</div>' +
          '<p class="demo-previa-nota">En producción aquí se muestra el visor de Google Drive con el archivo real.</p>' +
        '</div>'
    });
  };

  // "Ver en Drive": en la demo no hay archivo real al que ir.
  var abrirVentanaOriginal = window.open;
  window.open = function (url) {
    if (url === '#demo-drive') {
      notificar('En la demo los archivos no existen en Google Drive: usa la vista previa haciendo clic sobre el archivo.', 'info', 4000);
      return null;
    }
    return abrirVentanaOriginal.apply(window, arguments);
  };

  // ============================================================================
  // 4. Explorador de Google Drive simulado
  // ============================================================================
  function abrirDrivePickerSimulado() {
    var idCarpeta = (typeof estadoArchivosCarpeta !== 'undefined' && estadoArchivosCarpeta.ruta && estadoArchivosCarpeta.ruta.length)
      ? estadoArchivosCarpeta.ruta[estadoArchivosCarpeta.ruta.length - 1].id : null;
    if (!idCarpeta) { notificar('Ingresa a una carpeta antes de importar archivos.', 'warning', 3500); return; }

    var archivos = window.DemoBackend.archivosDriveSimulados;
    var overlay = document.createElement('div');
    overlay.className = 'demo-picker-overlay';
    overlay.innerHTML =
      '<div class="demo-picker">' +
        '<div class="demo-picker-cabecera">' +
          '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#0F9D58" d="M8 3h8l6 10-4 7H6l-4-7z" opacity=".25"/><path fill="#4285F4" d="M6 20l3-5h13l-4 5z"/><path fill="#FB6E04" d="M8 3l-6 10 3 5 6-10z"/><path fill="#0F9D58" d="M16 3H8l6 10h8z"/></svg>' +
          '<div><h3>Google Drive (simulado)</h3><p>Selecciona los archivos que quieres copiar a esta carpeta.</p></div>' +
          '<button type="button" class="demo-picker-cerrar" aria-label="Cerrar">&times;</button>' +
        '</div>' +
        '<div class="demo-picker-lista">' +
          archivos.map(function (a) {
            var icono = typeof iconoArchivoUrl === 'function' ? iconoArchivoUrl(a.nombre) : '';
            var tam = typeof formatearTamaño === 'function' ? formatearTamaño(a.tamano) : '';
            return '<label class="demo-picker-item"><input type="checkbox" value="' + a.id + '">' +
              '<img src="' + icono + '" alt=""><span class="demo-picker-nombre">' + esc(a.nombre) + '</span><span class="demo-picker-tam">' + tam + '</span></label>';
          }).join('') +
        '</div>' +
        '<div class="demo-picker-pie"><span class="demo-picker-contador">0 seleccionados</span>' +
          '<div><button type="button" class="btn-cancelar demo-picker-cancelar">Cancelar</button> ' +
          '<button type="button" class="btn-enviar demo-picker-importar" disabled>Importar</button></div></div>' +
      '</div>';
    document.body.appendChild(overlay);

    var cerrar = function () { overlay.remove(); };
    overlay.addEventListener('click', function (e) { if (e.target === overlay) cerrar(); });
    overlay.querySelector('.demo-picker-cerrar').addEventListener('click', cerrar);
    overlay.querySelector('.demo-picker-cancelar').addEventListener('click', cerrar);

    var btnImportar = overlay.querySelector('.demo-picker-importar');
    var contador = overlay.querySelector('.demo-picker-contador');
    overlay.querySelectorAll('input[type=checkbox]').forEach(function (chk) {
      chk.addEventListener('change', function () {
        var n = overlay.querySelectorAll('input:checked').length;
        contador.textContent = n + ' seleccionado' + (n === 1 ? '' : 's');
        btnImportar.disabled = n === 0;
      });
    });

    btnImportar.addEventListener('click', function () {
      var ids = Array.prototype.map.call(overlay.querySelectorAll('input:checked'), function (c) { return c.value; });
      var lista = archivos.filter(function (a) { return ids.indexOf(a.id) !== -1; })
        .map(function (a) { return { id: a.id, nombre: a.nombre, mimeType: a.mimeType, tamano: a.tamano }; });
      cerrar();
      if (typeof cerrarPanelLateral === 'function') cerrarPanelLateral();

      var user = getCurrentUserSession();
      var token = getCurrentUserToken();
      google.script.run
        .withSuccessHandler(function (res) {
          if (res && res.success) {
            notificar('✅ ' + res.message, 'success', 3500);
            if (user && typeof registrarActividadSilenciosa === 'function') {
              registrarActividadSilenciosa(user.ID_Usuario, 'Carpeta', idCarpeta, 'Importó ' + lista.length + ' archivo(s) desde Google Drive');
            }
            cargarContenidoCarpeta(idCarpeta);
          } else {
            notificar('❌ ' + ((res && res.message) || 'No se pudieron importar los archivos'), 'error', 4000);
          }
        })
        .guardarArchivosMultiplesDesdeDrive(idCarpeta, lista, token || (user ? user.ID_Usuario : null));
    });
  }

  window.abrirGoogleDrivePicker = abrirDrivePickerSimulado;
  window.abrirSelectorVentanaDrive = abrirDrivePickerSimulado;

  // ============================================================================
  // 5. Privacidad de un archivo ya subido (botón candado)
  // ============================================================================
  window.abrirSelectorPermisosExistente = function (archivo) {
    if (typeof estadoPermisos_ === 'undefined' || typeof abrirSelectorPermisosArchivo !== 'function') return;
    estadoPermisos_.modoEdicion = true;
    estadoPermisos_.archivoEdicion = archivo.id;
    estadoPermisos_.usuariosExcluidos = [];
    estadoPermisos_.grupoSeleccionado = null;
    // El selector toma el estado inicial de esta variable (ver scripts/ArchivosCarpetaPermisos.html).
    window.permisosArchivoSeleccionados = (archivo.restringidos || []).slice();
    abrirSelectorPermisosArchivo();
  };

  // ============================================================================
  // 6. Insignia "Demo"
  // ============================================================================
  function insertarInsignia() {
    var insignia = document.createElement('div');
    insignia.className = 'demo-insignia';
    insignia.innerHTML =
      '<span class="demo-dot"></span><span><strong>Demo</strong> · datos ficticios guardados solo en tu navegador</span>' +
      '<button type="button" id="demoRestablecer" title="Borrar cambios y volver a los datos iniciales">Restablecer</button>';
    document.body.appendChild(insignia);
    document.getElementById('demoRestablecer').addEventListener('click', function () {
      if (typeof showConfirmation === 'function') {
        showConfirmation('Se borrarán tus cambios (archivos, usuarios, favoritos…) y se cerrará la sesión.', '¿Restablecer la demo?', function () {
          window.DemoBackend.restablecer();
          window.location.reload();
        });
      }
    });
  }

  window.DemoUI = { mostrarCodigo: mostrarCodigo };

  document.addEventListener('DOMContentLoaded', function () {
    insertarAccesosDemo();
    insertarInsignia();
  });
})();
