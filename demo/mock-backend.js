/**
 * ==============================================================================
 * DEMO · Backend simulado en el navegador
 * ==============================================================================
 * El frontend llama a su API con google.script.run.<funcion>(...). En esta demo esa interfaz la
 * implementa este archivo: cada función se resuelve en el navegador contra datos ficticios
 * (demo/mock-data.js) persistidos en localStorage.
 *
 * Así el frontend corre sin servidor y sin conexión a ningún servicio externo.
 */
(function () {
  'use strict';

  var CLAVE_STORAGE = 'docuobra-demo-db';
  var VERSION_DB = 1;
  var semilla = window.DEMO_SEMILLA;

  // ============================================================================
  // Persistencia
  // ============================================================================
  var db = cargarDb();
  /** Vistas previas de archivos subidos en esta sesión (dataURL; no se persisten). */
  var previasSesion = {};

  function cargarDb() {
    try {
      var guardada = JSON.parse(localStorage.getItem(CLAVE_STORAGE) || 'null');
      if (guardada && guardada.version === VERSION_DB) return guardada;
    } catch (e) { /* datos corruptos: se regenera */ }
    var nueva = semilla.crearBaseDatosSemilla();
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(nueva));
    return nueva;
  }

  function guardarDb() {
    try { localStorage.setItem(CLAVE_STORAGE, JSON.stringify(db)); } catch (e) { console.warn('[Demo] No se pudo persistir:', e); }
  }

  function restablecerDemo() {
    localStorage.removeItem(CLAVE_STORAGE);
    localStorage.removeItem('currentUser');
    previasSesion = {};
    db = cargarDb();
  }

  // ============================================================================
  // Utilidades
  // ============================================================================
  var PERMISOS_POR_ROL = {
    1: { Ver_Documentos: true, Subir_Documentos: true, Editar_Documentos: false, Eliminar_Documentos: false, Gestionar_Proyectos_Carpetas: false, Gestionar_Usuarios: false, Gestionar_Roles: false },
    2: { Ver_Documentos: true, Subir_Documentos: true, Editar_Documentos: true, Eliminar_Documentos: true, Gestionar_Proyectos_Carpetas: true, Gestionar_Usuarios: true, Gestionar_Roles: false },
    3: { Ver_Documentos: true, Subir_Documentos: true, Editar_Documentos: true, Eliminar_Documentos: true, Gestionar_Proyectos_Carpetas: true, Gestionar_Usuarios: true, Gestionar_Roles: true }
  };

  function ahoraIso() { return new Date().toISOString(); }
  function nuevoId(prefijo) { db.secuencia += 1; return prefijo + db.secuencia; }
  function norm(texto) { return String(texto || '').trim().toLowerCase(); }
  function ok(extra) { var r = { success: true }; for (var k in extra) r[k] = extra[k]; return r; }
  function error(mensaje) { return { success: false, message: mensaje }; }
  function extensionDe(nombre) { var p = String(nombre).split('.'); return p.length > 1 ? p.pop().toLowerCase() : ''; }

  function nombreRol(rolId) {
    var r = db.roles.filter(function (x) { return String(x.id) === String(rolId); })[0];
    return r ? r.nombre : 'Usuario';
  }

  function usuarioPorId(id) { return db.usuarios.filter(function (u) { return u.id === String(id); })[0] || null; }
  function usuarioPorEmail(email) { return db.usuarios.filter(function (u) { return norm(u.email) === norm(email); })[0] || null; }

  /** Igual que resolverUsuarioSolicitante_ del backend real: acepta token de sesión o ID. */
  function resolverUsuario() {
    for (var i = 0; i < arguments.length; i++) {
      var valor = arguments[i];
      if (!valor) continue;
      if (db.sesiones[valor]) return usuarioPorId(db.sesiones[valor]);
      var u = usuarioPorId(valor);
      if (u) return u;
    }
    return null;
  }

  function puede(usuario, permiso) {
    return !!(usuario && PERMISOS_POR_ROL[usuario.rolId] && PERMISOS_POR_ROL[usuario.rolId][permiso]);
  }

  function tieneAccesoProyecto(usuario, idProyecto) {
    if (!usuario || usuario.rolId === 3) return true;
    var val = String(usuario.proyectos || '').trim();
    if (!val) return false;
    if (val === '*' || val.toUpperCase() === 'TODOS') return true;
    return val.split(',').map(function (s) { return s.trim(); }).indexOf(String(idProyecto)) !== -1;
  }

  function auditar(usuario, tipo, descripcion, entidad, estado) {
    db.auditoria.push({
      fecha: ahoraIso(), idUsuario: usuario ? usuario.id : '', email: usuario ? usuario.email : '',
      tipo: tipo, descripcion: descripcion, entidad: entidad || '', estado: estado || 'Exitosa'
    });
  }

  function proyecto(idProyecto) { return db.proyectos.filter(function (h) { return h.idProyecto === String(idProyecto); })[0] || null; }
  function carpeta(idCarpeta) { return db.carpetas.filter(function (c) { return c.id === String(idCarpeta); })[0] || null; }
  function archivo(idArchivo) { return db.archivos.filter(function (a) { return a.id === String(idArchivo); })[0] || null; }
  function hijasDe(idCarpeta) { return db.carpetas.filter(function (c) { return c.idPadre === idCarpeta; }); }
  function archivosEn(idCarpeta) { return db.archivos.filter(function (a) { return a.idCarpeta === idCarpeta; }); }

  function puedeVerArchivo(usuario, a) {
    return !usuario || !a.restringidos || a.restringidos.indexOf(usuario.id) === -1;
  }

  /** Tamaño, cantidad de elementos y última actividad de una carpeta (recursivo). */
  function resumenCarpeta(c, usuario) {
    var total = 0, cantidad = 0, ultima = null;
    (function recorrer(id) {
      archivosEn(id).forEach(function (a) {
        if (!puedeVerArchivo(usuario, a)) return;
        total += a.tamano || 0;
        cantidad += 1;
        if (!ultima || a.fecha > ultima) ultima = a.fecha;
      });
      hijasDe(id).forEach(function (h) { cantidad += 1; recorrer(h.id); });
    })(c.id);
    return { id: c.id, nombre: c.nombre, cantidad: cantidad, tamanoTotal: total, fechaUltimaActividad: ultima };
  }

  function archivoParaCliente(a) {
    return {
      id: a.id, nombre: a.nombre, extension: a.extension, tamano: a.tamano, fecha: a.fecha,
      responsable: a.responsable, mimeType: a.mimeType,
      driveFileId: a.driveFileId, driveUrl: '#demo-drive',
      restringidos: (a.restringidos || []).slice(),
      previaDemo: previasSesion[a.id] || null
    };
  }

  function eliminarCarpetaRecursiva(idCarpeta) {
    hijasDe(idCarpeta).forEach(function (h) { eliminarCarpetaRecursiva(h.id); });
    db.archivos = db.archivos.filter(function (a) { return a.idCarpeta !== idCarpeta; });
    db.carpetas = db.carpetas.filter(function (c) { return c.id !== idCarpeta; });
  }

  /** Espejo de backend/Recursos.js:resolverRecurso_. */
  function resolverRecurso(tipo, idRecurso) {
    if (tipo === 'Proyecto') {
      var h = proyecto(idRecurso);
      return h ? { existe: true, tipoRecurso: 'Proyecto', idRecurso: h.idProyecto, nombre: h.nombre, contexto: 'Proyecto', idProyecto: h.idProyecto, nombreProyecto: h.nombre } : { existe: false };
    }
    if (tipo === 'Carpeta') {
      var c = carpeta(idRecurso);
      if (!c) return { existe: false };
      var hc = proyecto(c.idProyecto);
      return { existe: true, tipoRecurso: 'Carpeta', idRecurso: c.id, nombre: c.nombre, contexto: hc ? hc.nombre : '', idProyecto: c.idProyecto, nombreProyecto: hc ? hc.nombre : '' };
    }
    if (tipo === 'Archivo') {
      var a = archivo(idRecurso);
      if (!a) return { existe: false };
      var info = resolverRecurso('Carpeta', a.idCarpeta);
      return {
        existe: true, tipoRecurso: 'Archivo', idRecurso: a.id, nombre: a.nombre,
        contexto: [info.nombreProyecto, info.nombre].filter(Boolean).join(' / '),
        idProyecto: info.idProyecto, nombreProyecto: info.nombreProyecto, idCarpeta: a.idCarpeta, nombreCarpeta: info.nombre,
        driveFileId: a.driveFileId, driveUrl: '#demo-drive', extension: a.extension
      };
    }
    return { existe: false };
  }

  function generarCodigo() { return String(Math.floor(100000 + Math.random() * 900000)); }

  function avisarCodigo(email, codigo, motivo) {
    // En producción el código llega por correo (MailApp). En la demo se muestra en pantalla.
    setTimeout(function () {
      if (window.DemoUI && typeof window.DemoUI.mostrarCodigo === 'function') {
        window.DemoUI.mostrarCodigo(email, codigo, motivo);
      }
    }, 450);
  }

  function crearArchivoEnCarpeta(idCarpeta, datos, usuario, restringidos) {
    var id = nuevoId('A');
    var ext = extensionDe(datos.nombre) || 'pdf';
    var nuevo = {
      id: id, idCarpeta: String(idCarpeta), nombre: datos.nombre, extension: ext,
      mimeType: datos.mimeType || semilla.mimePorExtension[ext] || 'application/octet-stream',
      tamano: datos.tamano || 0, fecha: ahoraIso(),
      responsable: usuario ? usuario.nombre : 'Sistema', driveFileId: 'demo-' + id,
      restringidos: (restringidos || []).map(String).filter(function (x) { return !usuario || x !== usuario.id; })
    };
    db.archivos.push(nuevo);
    return nuevo;
  }

  // ============================================================================
  // API — mismas funciones globales que expone src/backend/*.js
  // ============================================================================
  var api = {
    // ---------------- Code.js ----------------
    obtenerVersionCacheGlobal: function () { return '1'; },

    // ---------------- Auth.js ----------------
    validarCredenciales: function (email, password) {
      var u = usuarioPorEmail(email);
      if (!u || u.password !== password) {
        auditar(u, 'Login', 'Intento de inicio de sesión fallido (' + email + ')', 'Usuarios', 'Fallida');
        return { success: false, message: 'Email o contraseña incorrectos', user: null };
      }
      if (u.estado === 'Pendiente_Verificacion') {
        return { success: false, message: 'Debes verificar tu correo antes de iniciar sesión', requiereVerificacion: true, user: null };
      }
      if (u.estado === 'Pendiente_Aprobacion') {
        return { success: false, message: 'Tu cuenta está pendiente de aprobación por un administrador', user: null };
      }
      if (u.estado === 'Inactivo') {
        return { success: false, message: 'Esta cuenta ha sido desactivada', user: null };
      }
      var token = 'demo-token-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      db.sesiones[token] = u.id;
      var user = {
        ID_Usuario: u.id, Nombre_Completo: u.nombre, Email: u.email,
        ID_Rol: u.rolId, Rol_ID: u.rolId, Rol: nombreRol(u.rolId),
        Estado: u.estado, token: token, cacheVersion: '1'
      };
      return { success: true, message: 'Inicio de sesión exitoso', user: user, token: token };
    },

    cerrarSesionUsuario: function (token) {
      delete db.sesiones[token];
      return { success: true };
    },

    registrarUsuario: function (nombre, email, password) {
      if (usuarioPorEmail(email)) return error('Este email ya está registrado');
      var u = {
        id: nuevoId('U'), nombre: String(nombre).trim(), email: norm(email), password: password,
        rolId: 1, estado: 'Pendiente_Verificacion', proyectos: '', fechaRegistro: ahoraIso(),
        prefs: { actividad: true, recordatorios: false, seguridad: true }
      };
      u.codigoVerificacion = generarCodigo();
      db.usuarios.push(u);
      avisarCodigo(u.email, u.codigoVerificacion, 'verificación de correo');
      return { success: true, message: 'Registro exitoso. Te enviamos un código de verificación.', userId: u.id, requiereVerificacion: true };
    },

    verificarEmailExistente: function (email) { return { exists: !!usuarioPorEmail(email) }; },

    enviarCodigoVerificacion: function (email) {
      var u = usuarioPorEmail(email);
      if (!u) return error('No existe una cuenta con ese correo');
      u.codigoVerificacion = generarCodigo();
      avisarCodigo(u.email, u.codigoVerificacion, 'verificación de correo');
      return ok({ message: 'Código enviado' });
    },

    verificarCodigoRegistro: function (email, codigo) {
      var u = usuarioPorEmail(email);
      if (!u || !u.codigoVerificacion || String(codigo) !== u.codigoVerificacion) return error('Código inválido o vencido');
      delete u.codigoVerificacion;
      u.estado = 'Pendiente_Aprobacion';
      auditar(u, 'Registro', 'Verificó su correo: ' + u.email, 'Usuarios');
      return ok({ message: '¡Correo verificado! Un administrador debe aprobar tu cuenta (en la demo: entra como Superadministrador → Usuarios → Aprobar).' });
    },

    solicitarCodigoRecuperacion: function (email) {
      var u = usuarioPorEmail(email);
      if (!u) return error('No encontramos una cuenta con ese correo');
      u.codigoRecuperacion = generarCodigo();
      avisarCodigo(u.email, u.codigoRecuperacion, 'recuperación de contraseña');
      return ok({ message: 'Código enviado a tu correo' });
    },

    validarCodigoRecuperacion: function (email, codigo) {
      var u = usuarioPorEmail(email);
      if (!u || String(codigo) !== u.codigoRecuperacion) return error('Código inválido o vencido');
      return ok({ message: 'Código válido' });
    },

    restablecerPasswordConCodigo: function (email, codigo, password) {
      var u = usuarioPorEmail(email);
      if (!u || String(codigo) !== u.codigoRecuperacion) return error('Código inválido o vencido');
      u.password = password;
      delete u.codigoRecuperacion;
      auditar(u, 'Recuperar_Contraseña', 'Restableció su contraseña con código', 'Usuarios');
      return ok({ message: '¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.' });
    },

    // ---------------- Logs.js ----------------
    registrarAuditoria: function (datos) {
      datos = datos || {};
      var u = usuarioPorId(datos.usuarioId);
      db.auditoria.push({
        fecha: ahoraIso(), idUsuario: datos.usuarioId || '', email: datos.emailUsuario || (u ? u.email : ''),
        tipo: datos.tipo || '', descripcion: datos.descripcion || '', entidad: datos.entidadAfectada || '', estado: datos.estado || 'Exitosa'
      });
      return ok();
    },

    obtenerRegistrosAuditoria: function (idUsuario, limite) {
      var u = resolverUsuario(idUsuario);
      if (!puede(u, 'Gestionar_Usuarios')) return error('No tienes permiso para ver los logs');
      var registros = db.auditoria.slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; }).slice(0, limite || 200).map(function (r) {
        var autor = usuarioPorId(r.idUsuario);
        return { fecha: r.fecha, usuarioNombre: autor ? autor.nombre : '', usuarioEmail: r.email, tipo: r.tipo, descripcion: r.descripcion, estado: r.estado };
      });
      return ok({ registros: registros });
    },

    // ---------------- Proyectos.js / Busqueda.js ----------------
    obtenerModulosConProyectos: function (token, idUsuario) {
      var u = resolverUsuario(token, idUsuario);
      return db.modulos.slice().sort(function (a, b) { return a.orden - b.orden; }).map(function (m) {
        return {
          idModulo: m.idModulo, nombre: m.nombre, orden: m.orden,
          proyectos: db.proyectos.filter(function (h) { return h.idModulo === m.idModulo && (!u || tieneAccesoProyecto(u, h.idProyecto)); })
            .map(function (h) { return { idProyecto: h.idProyecto, nombre: h.nombre }; })
        };
      });
    },

    buscarGlobal: function (termino) {
      var t = norm(termino);
      var sesion = JSON.parse(localStorage.getItem('currentUser') || 'null');
      var u = sesion ? usuarioPorId(sesion.ID_Usuario) : null;
      var proyectos = db.proyectos.filter(function (h) { return norm(h.nombre).indexOf(t) !== -1 && tieneAccesoProyecto(u, h.idProyecto); })
        .slice(0, 6).map(function (h) { return { idProyecto: h.idProyecto, nombre: h.nombre }; });
      var carpetas = db.carpetas.filter(function (c) { return norm(c.nombre).indexOf(t) !== -1 && tieneAccesoProyecto(u, c.idProyecto); })
        .slice(0, 8).map(function (c) { var h = proyecto(c.idProyecto); return { idCarpeta: c.id, nombre: c.nombre, idProyecto: c.idProyecto, nombreProyecto: h ? h.nombre : '' }; });
      return { proyectos: proyectos, carpetas: carpetas };
    },

    // ---------------- Carpetas.js ----------------
    obtenerCarpetasDelProyecto: function (idProyecto, token, idUsuario) {
      var u = resolverUsuario(token, idUsuario);
      if (!proyecto(idProyecto)) return error('Proyecto no encontrado');
      if (u && !tieneAccesoProyecto(u, idProyecto)) return error('No tienes acceso a este proyecto');
      var areas = db.carpetas.filter(function (c) { return c.idProyecto === String(idProyecto) && !c.idPadre; });
      return ok({ carpetas: areas.map(function (c) { return resumenCarpeta(c, u); }) });
    },

    obtenerContenidoCarpeta: function (idCarpeta, idUsuario) {
      var c = carpeta(idCarpeta);
      if (!c) return error('La carpeta ya no existe');
      var u = resolverUsuario(idUsuario);
      return ok({
        carpetaActual: { id: c.id, nombre: c.nombre },
        subcarpetas: hijasDe(c.id).map(function (h) { return resumenCarpeta(h, u); }),
        archivos: archivosEn(c.id).filter(function (a) { return puedeVerArchivo(u, a); })
          .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; }).map(archivoParaCliente)
      });
    },

    crearArea: function (idProyecto, nombre, idUsuario) {
      var u = resolverUsuario(idUsuario);
      if (!puede(u, 'Gestionar_Proyectos_Carpetas')) return error('No tienes permiso para crear áreas');
      var nueva = { id: nuevoId('C'), idProyecto: String(idProyecto), idPadre: null, nombre: String(nombre).trim(), fechaCreacion: ahoraIso() };
      db.carpetas.push(nueva);
      auditar(u, 'Crear_Area', 'Creó el área "' + nueva.nombre + '" en ' + (proyecto(idProyecto) || {}).nombre, 'Carpetas');
      return ok({ carpeta: nueva });
    },

    crearSubcarpeta: function (idPadre, nombre, tokenOId) {
      var u = resolverUsuario(tokenOId);
      var padre = carpeta(idPadre);
      if (!padre) return error('La carpeta destino no existe');
      if (!puede(u, 'Gestionar_Proyectos_Carpetas')) return error('No tienes permiso para crear carpetas');
      var nueva = { id: nuevoId('C'), idProyecto: padre.idProyecto, idPadre: padre.id, nombre: String(nombre).trim(), fechaCreacion: ahoraIso() };
      db.carpetas.push(nueva);
      auditar(u, 'Crear_Carpeta', 'Creó la carpeta "' + nueva.nombre + '" dentro de "' + padre.nombre + '"', 'Carpetas');
      return ok({ carpeta: nueva });
    },

    renombrarCarpeta: function (idCarpeta, nuevoNombre, tokenOId) {
      var u = resolverUsuario(tokenOId);
      var c = carpeta(idCarpeta);
      if (!c) return error('La carpeta no existe');
      if (!puede(u, 'Gestionar_Proyectos_Carpetas')) return error('No tienes permiso para renombrar carpetas');
      auditar(u, 'Renombrar_Carpeta', 'Renombró "' + c.nombre + '" a "' + nuevoNombre + '"', 'Carpetas');
      c.nombre = String(nuevoNombre).trim();
      return ok();
    },

    eliminarCarpeta: function (idCarpeta, tokenOId) {
      var u = resolverUsuario(tokenOId);
      var c = carpeta(idCarpeta);
      if (!c) return error('La carpeta no existe');
      if (!puede(u, 'Gestionar_Proyectos_Carpetas')) return error('No tienes permiso para eliminar carpetas');
      eliminarCarpetaRecursiva(c.id);
      auditar(u, 'Eliminar_Carpeta', 'Eliminó la carpeta "' + c.nombre + '" y su contenido', 'Carpetas');
      return ok();
    },

    // ---------------- Archivos.js / Drive.js ----------------
    guardarArchivoEnDrive: function (idCarpeta, nombre, base64, mimeType, tipoDoc, _estado, _responsable, tokenOId, permisos) {
      var u = resolverUsuario(tokenOId);
      if (!carpeta(idCarpeta)) return error('La carpeta destino no existe');
      if (!puede(u, 'Subir_Documentos')) return error('No tienes permiso para subir documentos');
      var tamano = Math.round(String(base64 || '').length * 3 / 4);
      var nuevo = crearArchivoEnCarpeta(idCarpeta, { nombre: nombre, mimeType: mimeType, tamano: tamano }, u, Array.isArray(permisos) ? permisos : []);
      // Solo para la sesión actual: permite ver la vista previa real del archivo subido.
      if (base64 && tamano < 6 * 1024 * 1024) previasSesion[nuevo.id] = 'data:' + (mimeType || 'application/octet-stream') + ';base64,' + base64;
      auditar(u, 'Subir_Archivo', 'Subió "' + nombre + '" en ' + carpeta(idCarpeta).nombre, 'Archivos');
      return ok({ archivo: archivoParaCliente(nuevo) });
    },

    obtenerArchivoPorIdOUrl: function (valor) {
      var lista = semilla.archivosDriveSimulados;
      var indice = Math.abs(String(valor).split('').reduce(function (acc, ch) { return acc + ch.charCodeAt(0); }, 0)) % lista.length;
      var base = lista[indice];
      return ok({ archivo: { id: 'drive-url-' + Date.now(), nombre: base.nombre, mimeType: base.mimeType, tamano: base.tamano } });
    },

    guardarArchivosMultiplesDesdeDrive: function (idCarpeta, lista, tokenOId) {
      var u = resolverUsuario(tokenOId);
      if (!carpeta(idCarpeta)) return error('La carpeta destino no existe');
      if (!puede(u, 'Subir_Documentos')) return error('No tienes permiso para subir documentos');
      (lista || []).forEach(function (item) {
        var base = semilla.archivosDriveSimulados.filter(function (d) { return d.id === item.id; })[0] || {};
        crearArchivoEnCarpeta(idCarpeta, { nombre: item.nombre, mimeType: item.mimeType, tamano: item.tamano || base.tamano || 250000 }, u, []);
      });
      var total = (lista || []).length;
      auditar(u, 'Migrar_Drive', 'Migró ' + total + ' archivo(s) desde Google Drive a "' + carpeta(idCarpeta).nombre + '"', 'Archivos');
      return ok({ message: total + ' archivo(s) migrado(s) desde Google Drive', totalExitosos: total });
    },

    renombrarArchivo: function (idArchivo, nuevoNombre, tokenOId) {
      var u = resolverUsuario(tokenOId);
      var a = archivo(idArchivo);
      if (!a) return error('El archivo no existe');
      var esPropietario = u && (a.responsable === u.nombre || a.responsable === u.email);
      if (!esPropietario && !puede(u, 'Editar_Documentos')) return error('No tienes permiso para renombrar este archivo');
      var nombre = String(nuevoNombre).trim();
      if (a.extension && !norm(nombre).endsWith('.' + a.extension)) nombre += '.' + a.extension;
      auditar(u, 'Renombrar_Archivo', 'Renombró "' + a.nombre + '" a "' + nombre + '"', 'Archivos');
      a.nombre = nombre;
      return ok();
    },

    eliminarArchivo: function (driveFileId, tokenOId) {
      var u = resolverUsuario(tokenOId);
      var a = db.archivos.filter(function (x) { return x.driveFileId === driveFileId || x.id === driveFileId; })[0];
      if (!a) return error('El archivo no existe');
      var esPropietario = u && (a.responsable === u.nombre || a.responsable === u.email);
      if (!esPropietario && !puede(u, 'Eliminar_Documentos')) return error('No tienes permiso para eliminar este archivo');
      db.archivos = db.archivos.filter(function (x) { return x !== a; });
      db.favoritos = db.favoritos.filter(function (f) { return !(f.tipoRecurso === 'Archivo' && f.idRecurso === a.id); });
      auditar(u, 'Eliminar_Archivo', 'Eliminó "' + a.nombre + '"', 'Archivos');
      return ok();
    },

    // ---------------- Permisos.js / Grupos.js ----------------
    obtenerListaUsuariosParaPermisos: function () {
      return ok({
        usuarios: db.usuarios.filter(function (u) { return u.estado === 'Activo'; })
          .map(function (u) { return { id: u.id, nombre: u.nombre, email: u.email }; })
      });
    },

    actualizarPermisosExistentes: function (idArchivo, idUsuario, idsRestringidos) {
      var u = resolverUsuario(idUsuario);
      var a = archivo(idArchivo);
      if (!a) return error('El archivo no existe');
      var esPropietario = u && (a.responsable === u.nombre || a.responsable === u.email);
      if (!esPropietario && !puede(u, 'Gestionar_Proyectos_Carpetas')) return error('Solo el propietario o un administrador puede cambiar la privacidad');
      a.restringidos = (idsRestringidos || []).map(String).filter(function (x) { return x !== (u && u.id); });
      auditar(u, 'Privacidad_Archivo', 'Actualizó la privacidad de "' + a.nombre + '" (' + a.restringidos.length + ' usuario(s) restringidos)', 'Archivos');
      return ok();
    },

    obtenerGruposUsuario: function (idUsuario) {
      return ok({
        grupos: db.grupos.filter(function (g) { return g.idCreador === String(idUsuario); })
          .map(function (g) { return { id: g.id, nombre: g.nombre, integrantes: g.integrantes.slice() }; })
      });
    },

    crearGrupoUsuario: function (idUsuario, nombre, integrantes) {
      var grupo = { id: nuevoId('G'), idCreador: String(idUsuario), nombre: String(nombre).trim(), integrantes: (integrantes || []).map(String) };
      db.grupos.push(grupo);
      return ok({ grupo: { id: grupo.id, nombre: grupo.nombre, integrantes: grupo.integrantes.slice() } });
    },

    eliminarGrupoUsuario: function (idUsuario, idGrupo) {
      db.grupos = db.grupos.filter(function (g) { return !(g.id === idGrupo && g.idCreador === String(idUsuario)); });
      return ok();
    },

    // ---------------- Usuario.js (perfil) ----------------
    obtenerDatosUsuarioActual: function (idUsuario) {
      var u = usuarioPorId(idUsuario);
      return u ? { id: u.id, nombre: u.nombre, email: u.email, rol: nombreRol(u.rolId), fechaRegistro: u.fechaRegistro } : null;
    },

    actualizarNombreUsuario: function (idUsuario, nombre) {
      var u = usuarioPorId(idUsuario);
      if (!u) return error('Usuario no encontrado');
      u.nombre = String(nombre).trim();
      return ok();
    },

    cambiarContrasenaUsuario: function (idUsuario, actual, nueva) {
      var u = usuarioPorId(idUsuario);
      if (!u) return error('Usuario no encontrado');
      if (u.password !== actual) return error('La contraseña actual no es correcta');
      u.password = nueva;
      auditar(u, 'Cambio_Contraseña', 'Cambió su contraseña desde el perfil', 'Usuarios');
      return ok();
    },

    obtenerPreferenciasNotificaciones: function (idUsuario) {
      var u = usuarioPorId(idUsuario);
      return u ? u.prefs : { actividad: false, recordatorios: false, seguridad: true };
    },

    guardarPreferenciasNotificaciones: function (idUsuario, prefs) {
      var u = usuarioPorId(idUsuario);
      if (!u) return error('Usuario no encontrado');
      u.prefs = prefs;
      return ok();
    },

    // ---------------- Favoritos.js ----------------
    obtenerIdsFavoritosUsuario: function (idUsuario) {
      return ok({
        favoritos: db.favoritos.filter(function (f) { return f.idUsuario === String(idUsuario); })
          .map(function (f) { return f.tipoRecurso + '|' + f.idRecurso; })
      });
    },

    alternarFavorito: function (idUsuario, tipoRecurso, idRecurso) {
      var existente = db.favoritos.filter(function (f) {
        return f.idUsuario === String(idUsuario) && f.tipoRecurso === tipoRecurso && f.idRecurso === String(idRecurso);
      })[0];
      if (existente) {
        db.favoritos = db.favoritos.filter(function (f) { return f !== existente; });
        return ok({ esFavorito: false });
      }
      db.favoritos.push({ idUsuario: String(idUsuario), tipoRecurso: tipoRecurso, idRecurso: String(idRecurso), fecha: ahoraIso() });
      return ok({ esFavorito: true });
    },

    obtenerFavoritosDetallados: function (idUsuario) {
      var u = usuarioPorId(idUsuario);
      var favoritos = db.favoritos.filter(function (f) { return f.idUsuario === String(idUsuario); })
        .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; })
        .map(function (f) { return resolverRecurso(f.tipoRecurso, f.idRecurso); })
        .filter(function (r) { return r.existe && tieneAccesoProyecto(u, r.idProyecto); });
      return ok({ favoritos: favoritos });
    },

    // ---------------- Actividad.js ----------------
    registrarActividad: function (idUsuario, tipoRecurso, idRecurso, tipoInteraccion) {
      db.actividad.push({ idUsuario: String(idUsuario), tipoRecurso: tipoRecurso, idRecurso: String(idRecurso), tipoInteraccion: tipoInteraccion, fecha: ahoraIso() });
      return ok();
    },

    obtenerActividadReciente: function (idUsuario, limite) {
      var u = usuarioPorId(idUsuario);
      var vistos = {};
      var actividad = db.actividad.filter(function (a) { return a.idUsuario === String(idUsuario); })
        .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; })
        .filter(function (a) {
          var clave = a.tipoRecurso + '|' + a.idRecurso;
          if (vistos[clave]) return false;
          vistos[clave] = true;
          return true;
        })
        .map(function (a) {
          var r = resolverRecurso(a.tipoRecurso, a.idRecurso);
          r.tipoInteraccion = a.tipoInteraccion;
          r.fecha = a.fecha;
          return r;
        })
        .filter(function (r) { return r.existe && tieneAccesoProyecto(u, r.idProyecto); })
        .slice(0, limite || 40);
      return ok({ actividad: actividad });
    },

    // ---------------- Roles.js (gestión de usuarios) ----------------
    obtenerCatalogoRoles: function () { return ok({ roles: db.roles.slice() }); },

    obtenerUsuariosParaGestion: function (token, idUsuario) {
      var solicitante = resolverUsuario(token, idUsuario);
      if (!puede(solicitante, 'Gestionar_Usuarios')) return error('No tienes permiso para gestionar usuarios');
      return ok({
        usuarios: db.usuarios.map(function (u) {
          var ids = String(u.proyectos || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          return {
            id: u.id, nombre: u.nombre, email: u.email, rol: nombreRol(u.rolId), rol_id: u.rolId, estado: u.estado,
            proyectos_permitidos: u.proyectos,
            proyectos_lista: ids.map(function (id) { var h = proyecto(id); return h ? h.nombre : null; }).filter(Boolean)
          };
        })
      });
    },

    cambiarRolUsuario: function (idObjetivo, idRolNuevo, token, idUsuario) {
      var solicitante = resolverUsuario(token, idUsuario);
      if (!puede(solicitante, 'Gestionar_Roles')) return error('Solo un Superadministrador puede cambiar roles');
      var u = usuarioPorId(idObjetivo);
      if (!u) return error('Usuario no encontrado');
      var anterior = nombreRol(u.rolId);
      u.rolId = Number(idRolNuevo);
      auditar(solicitante, 'Cambio_Rol', 'Cambió el rol de ' + u.nombre + ' de "' + anterior + '" a "' + nombreRol(u.rolId) + '"', 'Usuarios');
      return ok({ rol_id: u.rolId, rol_nombre: nombreRol(u.rolId) });
    },

    aprobarUsuario: function (idObjetivo, token, idUsuario) {
      var solicitante = resolverUsuario(token, idUsuario);
      if (!puede(solicitante, 'Gestionar_Usuarios')) return error('No tienes permiso para aprobar usuarios');
      var u = usuarioPorId(idObjetivo);
      if (!u) return error('Usuario no encontrado');
      u.estado = 'Activo';
      if (!u.proyectos) u.proyectos = 'TODOS';
      auditar(solicitante, 'Aprobar_Usuario', 'Aprobó el acceso de ' + u.nombre, 'Usuarios');
      return ok();
    },

    cambiarEstadoUsuario: function (idObjetivo, nuevoEstado, token, idUsuario) {
      var solicitante = resolverUsuario(token, idUsuario);
      if (!puede(solicitante, 'Gestionar_Usuarios')) return error('No tienes permiso para cambiar estados');
      var u = usuarioPorId(idObjetivo);
      if (!u) return error('Usuario no encontrado');
      if (solicitante && u.id === solicitante.id) return error('No puedes desactivar tu propia cuenta');
      u.estado = nuevoEstado;
      auditar(solicitante, 'Cambio_Estado', (nuevoEstado === 'Activo' ? 'Activó' : 'Desactivó') + ' el acceso de ' + u.nombre, 'Usuarios');
      return ok();
    },

    asignarProyectosAUsuario: function (idObjetivo, seleccion, token, idUsuario) {
      var solicitante = resolverUsuario(token, idUsuario);
      if (!puede(solicitante, 'Gestionar_Roles')) return error('Solo un Superadministrador puede asignar proyectos');
      var u = usuarioPorId(idObjetivo);
      if (!u) return error('Usuario no encontrado');
      u.proyectos = seleccion;
      var cant = seleccion === 'TODOS' ? 'todos los' : String(seleccion).split(',').filter(Boolean).length;
      auditar(solicitante, 'Permisos_Proyectos', 'Asignó ' + cant + ' proyectos a ' + u.nombre, 'Usuarios');
      return ok();
    },

    restablecerContrasenaUsuarioPorAdmin: function (idObjetivo, nuevaClave, token, idUsuario) {
      var solicitante = resolverUsuario(token, idUsuario);
      if (!puede(solicitante, 'Gestionar_Usuarios')) return error('No tienes permiso para restablecer contraseñas');
      var u = usuarioPorId(idObjetivo);
      if (!u) return error('Usuario no encontrado');
      u.password = nuevaClave;
      auditar(solicitante, 'Restablecer_Contraseña', 'Restableció la contraseña de ' + u.nombre, 'Usuarios');
      return ok({ message: 'Contraseña de ' + u.nombre + ' restablecida. Nueva clave: ' + nuevaClave });
    },

    crearUsuarioPorAdmin: function (datos, token, idUsuario) {
      var solicitante = resolverUsuario(token, idUsuario);
      if (!puede(solicitante, 'Gestionar_Usuarios')) return error('No tienes permiso para crear usuarios');
      if (!datos || !datos.email || !datos.nombre) return error('Faltan datos obligatorios');
      if (usuarioPorEmail(datos.email)) return error('Ya existe un usuario con ese correo');
      var rolId = Number(datos.rolId) || 1;
      if (rolId > 1 && !puede(solicitante, 'Gestionar_Roles')) rolId = 1;
      var u = {
        id: nuevoId('U'), nombre: String(datos.nombre).trim(), email: norm(datos.email), password: datos.password,
        rolId: rolId, estado: datos.estado || 'Activo', proyectos: datos.proyectos || 'TODOS', fechaRegistro: ahoraIso(),
        prefs: { actividad: true, recordatorios: false, seguridad: true }
      };
      db.usuarios.push(u);
      auditar(solicitante, 'Crear_Usuario', 'Creó al usuario ' + u.nombre + ' (' + nombreRol(u.rolId) + ')', 'Usuarios');
      return ok({ message: 'Usuario ' + u.nombre + ' creado. Puede entrar con ' + u.email + ' y la clave asignada.' });
    }
  };

  // ============================================================================
  // google.script.run simulado
  // ============================================================================
  var RESPUESTA_RAPIDA = { obtenerCatalogoRoles: true, obtenerVersionCacheGlobal: true, obtenerIdsFavoritosUsuario: true };

  function crearRunner(onSuccess, onFailure) {
    var base = {
      withSuccessHandler: function (cb) { return crearRunner(cb, onFailure); },
      withFailureHandler: function (cb) { return crearRunner(onSuccess, cb); },
      withUserObject: function () { return crearRunner(onSuccess, onFailure); }
    };
    return new Proxy(base, {
      get: function (target, prop) {
        if (prop in target) return target[prop];
        return function () {
          var args = Array.prototype.slice.call(arguments);
          // Latencia simulada, para que se vean los skeletons y estados de carga reales. Los
          // catálogos responden primero: la vista Usuarios pide roles y usuarios en paralelo y
          // asume que los roles llegan antes para poblar los <select> de rol.
          var demora = RESPUESTA_RAPIDA[prop] ? 30 : 160 + Math.random() * 300;
          setTimeout(function () {
            try {
              if (typeof api[prop] !== 'function') throw new Error('La función "' + String(prop) + '" no existe en el backend de la demo.');
              var resultado = api[prop].apply(null, args);
              guardarDb();
              var copia = resultado === undefined ? undefined : JSON.parse(JSON.stringify(resultado));
              if (typeof onSuccess === 'function') onSuccess(copia);
            } catch (e) {
              console.error('❌ [Demo] ' + String(prop) + ':', e);
              if (typeof onFailure === 'function') onFailure(e);
            }
          }, demora);
        };
      }
    });
  }

  if (!window.google) window.google = {};
  if (!window.google.script) window.google.script = {};
  window.google.script.run = crearRunner();

  window.DemoBackend = {
    api: api,
    restablecer: restablecerDemo,
    previaDeArchivo: function (idArchivo) { return previasSesion[idArchivo] || null; },
    archivosDriveSimulados: semilla.archivosDriveSimulados
  };

  console.log('%c🧪 DocuObra DEMO', 'color:#C1652B;font-weight:bold', '— backend simulado activo (datos ficticios en localStorage).');
})();
