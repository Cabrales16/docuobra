/**
 * ==============================================================================
 * DEMO · Datos semilla (100% ficticios)
 * ==============================================================================
 * Genera la "base de datos" inicial de la demo: módulos, proyectos, áreas, subcarpetas, archivos,
 * usuarios, favoritos, actividad y auditoría. Todo es inventado — ningún nombre, correo ni
 * documento corresponde a personas o archivos reales.
 *
 * La generación usa un PRNG con semilla fija, así que cada visitante arranca con exactamente los
 * mismos datos. Luego demo/mock-backend.js guarda los cambios en localStorage.
 */
(function () {
  'use strict';

  var DIA = 24 * 60 * 60 * 1000;

  /** PRNG determinista (mulberry32). */
  function crearAleatorio(semilla) {
    var a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var CONTRASENA_DEMO = 'Demo1234';

  var CUENTAS_DEMO = [
    { id: 'U1', nombre: 'Valentina Ríos', email: 'superadmin@docuobra.demo', rolId: 3, etiqueta: 'Superadministrador', descripcion: 'Ve todo: usuarios, roles, permisos por proyecto y logs.' },
    { id: 'U2', nombre: 'Camilo Herrera', email: 'admin@docuobra.demo', rolId: 2, etiqueta: 'Administrador', descripcion: 'Gestiona áreas, carpetas, archivos y usuarios.' },
    { id: 'U3', nombre: 'Laura Méndez', email: 'usuario@docuobra.demo', rolId: 1, etiqueta: 'Usuario', descripcion: 'Consulta y sube documentos en 2 proyectos asignados.' }
  ];

  var ROLES = [
    { id: 1, nombre: 'Usuario' },
    { id: 2, nombre: 'Administrador' },
    { id: 3, nombre: 'Superadministrador' }
  ];

  var MODULOS = [
    { idModulo: 'M1', nombre: 'Obras en ejecución', orden: 1, tipo: 'operacion' },
    { idModulo: 'M2', nombre: 'Proyectos en diseño', orden: 2, tipo: 'preapertura' },
    { idModulo: 'M3', nombre: 'Proyectos entregados', orden: 3, tipo: 'desarrollo' },
    { idModulo: 'M4', nombre: 'Institucional', orden: 4, tipo: 'corporativo' }
  ];

  var PROYECTOS = [
    { idProyecto: 'H1', nombre: 'Edificio Cumbre 80', idModulo: 'M1' },
    { idProyecto: 'H2', nombre: 'Conjunto Brisa del Valle', idModulo: 'M1' },
    { idProyecto: 'H3', nombre: 'Centro Empresarial Alameda', idModulo: 'M1' },
    { idProyecto: 'H4', nombre: 'Parque Logístico Norte', idModulo: 'M1' },
    { idProyecto: 'H5', nombre: 'Residencias El Roble', idModulo: 'M1' },
    { idProyecto: 'H6', nombre: 'Torre Mirador', idModulo: 'M2' },
    { idProyecto: 'H7', nombre: 'Colegio Los Cerros', idModulo: 'M2' },
    { idProyecto: 'H8', nombre: 'Clínica Horizonte', idModulo: 'M2' },
    { idProyecto: 'H9', nombre: 'Edificio Bahía', idModulo: 'M3' },
    { idProyecto: 'H10', nombre: 'Altos del Parque', idModulo: 'M3' },
    { idProyecto: 'H11', nombre: 'Sede del Estudio', idModulo: 'M4' }
  ];

  var AREAS_POR_TIPO = {
    operacion: ['Dirección de Obra', 'Arquitectónico', 'Estructural', 'Instalaciones Eléctricas', 'Instalaciones Hidrosanitarias', 'Presupuesto y Costos', 'Contratos y Proveedores', 'Seguridad y Salud (SST)', 'Jurídico', 'Calidad'],
    preapertura: ['Dirección de Proyecto', 'Arquitectónico', 'Estructural', 'Presupuesto y Costos', 'Licencias y Permisos', 'Jurídico'],
    desarrollo: ['Postventa y Garantías', 'Jurídico', 'Finanzas y Contabilidad', 'Clientes'],
    corporativo: ['Gerencia General', 'Finanzas y Contabilidad', 'Jurídico', 'Tecnología y Sistemas', 'Talento Humano', 'Comercial y Licitaciones', 'Clientes']
  };

  var PLANTILLAS_AREA = {
    'Dirección de Obra': {
      sub: { 'Comités de obra': ['Acta comité de obra - enero.pdf', 'Acta comité de obra - febrero.pdf'], 'Informes de avance': ['Informe de avance Q1.pptx', 'Informe de avance Q2.pptx'] },
      archivos: ['Plan de ejecución 2026.pdf', 'Informe mensual de obra.docx', 'Tablero de avance físico.xlsx', 'Presentación a la interventoría.pptx']
    },
    'Dirección de Proyecto': {
      sub: { 'Comités': ['Acta comité de diseño - enero.pdf', 'Acta comité de diseño - febrero.pdf'], 'Informes': ['Informe de hitos Q1.pptx', 'Informe de hitos Q2.pptx'] },
      archivos: ['Plan del proyecto 2026.pdf', 'Informe mensual del proyecto.docx', 'Tablero de hitos.xlsx', 'Presentación al cliente.pptx']
    },
    'Arquitectónico': {
      sub: { 'Planos': ['Planta arquitectónica nivel 1.pdf', 'Corte por fachada.pdf'], 'Renders': ['Render de fachada.jpg', 'Render de vestíbulo.jpg'] },
      archivos: ['Memoria arquitectónica.pdf', 'Cuadro de áreas.xlsx', 'Cuadro de acabados.xlsx', 'Referencia de materiales.png']
    },
    'Estructural': {
      sub: { 'Planos estructurales': ['Plano de cimentación.pdf', 'Plano de losas.pdf'], 'Cálculos': ['Memoria de cálculo estructural.pdf', 'Estudio de suelos.pdf'] },
      archivos: ['Despiece de refuerzo.xlsx', 'Informe de ensayos de concreto.pdf', 'Especificaciones técnicas.docx']
    },
    'Instalaciones Eléctricas': {
      sub: { 'Planos': ['Plano eléctrico nivel 1.pdf', 'Diagrama unifilar.pdf'], 'Certificaciones': ['Certificación RETIE.pdf'] },
      archivos: ['Cuadro de cargas.xlsx', 'Memoria de diseño eléctrico.pdf', 'Fotografías tablero general.jpg']
    },
    'Instalaciones Hidrosanitarias': {
      sub: { 'Planos': ['Plano hidrosanitario.pdf', 'Plano de red contra incendios.pdf'], 'Pruebas': ['Protocolo de pruebas de presión.pdf'] },
      archivos: ['Memoria de cálculo hidráulico.pdf', 'Cuadro de accesorios.xlsx', 'Informe de inspección.pdf']
    },
    'Presupuesto y Costos': {
      sub: { 'Cortes de obra': ['Corte de obra No. 12.pdf', 'Corte de obra No. 13.pdf'], 'Análisis de precios': ['APU estructura.xlsx', 'APU acabados.xlsx'] },
      archivos: ['Presupuesto de obra.xlsx', 'Flujo de caja de obra.xlsx', 'Comparativo de cotizaciones.xlsx', 'Cronograma valorizado.xlsx']
    },
    'Contratos y Proveedores': {
      sub: { 'Contratos': ['Contrato de obra civil.pdf', 'Contrato de suministro de acero.pdf'], 'Evaluación': ['Evaluación de proveedores.xlsx'] },
      archivos: ['Matriz de contratistas.xlsx', 'Órdenes de compra.xlsx', 'Pólizas de cumplimiento.pdf']
    },
    'Seguridad y Salud (SST)': {
      sub: { 'Capacitaciones': ['Plan de capacitación SST.xlsx', 'Inducción de seguridad.pptx'], 'Inspecciones': ['Inspección de trabajo en alturas.pdf', 'Inspección de andamios.pdf'] },
      archivos: ['Matriz de riesgos de obra.xlsx', 'Plan de emergencias.pdf', 'Registro fotográfico de EPP.jpg']
    },
    'Jurídico': {
      sub: { 'Contratos': ['Contrato de fiducia.pdf', 'Contrato de interventoría.pdf'], 'Licencias y permisos': ['Licencia de construcción.pdf', 'Concepto de uso de suelo.pdf'] },
      archivos: ['Póliza todo riesgo construcción.pdf', 'Matriz de riesgos legales.xlsx', 'Política de tratamiento de datos.docx']
    },
    'Calidad': {
      sub: { 'Auditorías': ['Auditoría interna de calidad.pdf', 'Plan de acción auditoría.xlsx'], 'Procedimientos': ['Procedimiento de recepción de materiales.docx', 'Procedimiento de control de concreto.docx'] },
      archivos: ['Manual de calidad.pdf', 'Checklist de acabados.xlsx', 'Encuesta de satisfacción.xlsx', 'Plan de calidad de obra.pdf']
    },
    'Licencias y Permisos': {
      sub: { 'Curaduría': ['Radicado ante curaduría.pdf', 'Acta de observaciones.pdf'], 'Servicios públicos': ['Factibilidad de servicios.pdf'] },
      archivos: ['Cronograma de trámites.xlsx', 'Licencia de construcción.pdf', 'Concepto de uso de suelo.pdf']
    },
    'Postventa y Garantías': {
      sub: { 'Garantías': ['Garantía de estabilidad.pdf', 'Garantía de acabados.pdf'], 'Solicitudes': ['Registro de solicitudes de postventa.xlsx'] },
      archivos: ['Acta de entrega.pdf', 'Manual del propietario.pdf', 'Planos récord.pdf']
    },
    'Finanzas y Contabilidad': {
      sub: { 'Cierres mensuales': ['Cierre contable - enero.xlsx', 'Cierre contable - febrero.xlsx', 'Cierre contable - marzo.xlsx'], 'Impuestos': ['Declaración de IVA - bimestre 1.pdf', 'Calendario tributario.xlsx'] },
      archivos: ['Presupuesto 2026.xlsx', 'Estados financieros Q2.pdf', 'Flujo de caja proyectado.xlsx', 'Conciliación bancaria.xlsx']
    },
    'Gerencia General': {
      sub: { 'Comités': ['Acta comité gerencial - enero.pdf', 'Acta comité gerencial - febrero.pdf'], 'Informes de gestión': ['Informe de gestión Q1.pptx', 'Informe de gestión Q2.pptx'] },
      archivos: ['Plan estratégico 2026.pdf', 'Informe mensual de gestión.docx', 'Tablero de indicadores.xlsx', 'Presentación a la junta directiva.pptx']
    },
    'Tecnología y Sistemas': {
      sub: { 'Licencias': ['Control de licencias de software.xlsx'], 'Manuales': ['Manual del software BIM.pdf', 'Guía de conexión a la red de la oficina.pdf'] },
      archivos: ['Inventario de equipos TI.xlsx', 'Política de seguridad de la información.pdf', 'Diagrama de red.png', 'Respaldo de configuración.zip']
    },
    'Talento Humano': {
      sub: { 'Procesos de selección': ['Perfil de cargo - residente de obra.docx', 'Perfil de cargo - dibujante CAD.docx'], 'Capacitaciones': ['Plan de capacitación anual.xlsx', 'Inducción corporativa.pptx'] },
      archivos: ['Organigrama.pdf', 'Manual de funciones.docx', 'Plan de bienestar.pptx', 'Reglamento interno de trabajo.pdf']
    },
    'Comercial y Licitaciones': {
      sub: { 'Propuestas': ['Propuesta técnica y económica.pdf', 'Anexos de la licitación.pdf'], 'Contratos con clientes': ['Convenio marco con cliente.pdf'] },
      archivos: ['Plan comercial 2026.pptx', 'Base de clientes.xlsx', 'Portafolio de proyectos.pdf', 'Campaña de lanzamiento.png']
    },
    'Clientes': {
      sub: { 'Asambleas': ['Acta asamblea de propietarios.pdf', 'Presentación de asamblea.pptx'] },
      archivos: ['Informe a clientes Q2.pdf', 'Modelo financiero del proyecto.xlsx', 'Teaser del proyecto.pdf']
    }
  };

  var TAMANO_POR_EXTENSION = {
    pdf: [180, 4200], docx: [40, 900], xlsx: [30, 1600], pptx: [900, 9500],
    png: [250, 3200], jpg: [400, 5200], zip: [2000, 12000], txt: [2, 40]
  };

  var MIME_POR_EXTENSION = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    png: 'image/png', jpg: 'image/jpeg', zip: 'application/zip', txt: 'text/plain'
  };

  var OTROS_USUARIOS = [
    { nombre: 'Andrés Castillo', email: 'andres.castillo@docuobra.demo', rolId: 1, estado: 'Activo', proyectos: 'H1,H3,H4' },
    { nombre: 'Mariana Duarte', email: 'mariana.duarte@docuobra.demo', rolId: 2, estado: 'Activo', proyectos: 'TODOS' },
    { nombre: 'Julián Ortega', email: 'julian.ortega@docuobra.demo', rolId: 1, estado: 'Activo', proyectos: 'H2' },
    { nombre: 'Daniela Quintero', email: 'daniela.quintero@docuobra.demo', rolId: 1, estado: 'Activo', proyectos: 'H6,H7,H8' },
    { nombre: 'Sebastián Morales', email: 'sebastian.morales@docuobra.demo', rolId: 1, estado: 'Activo', proyectos: 'H9,H10,H11' },
    { nombre: 'Catalina Rojas', email: 'catalina.rojas@docuobra.demo', rolId: 1, estado: 'Pendiente_Aprobacion', proyectos: '' },
    { nombre: 'Felipe Navarro', email: 'felipe.navarro@docuobra.demo', rolId: 1, estado: 'Pendiente_Aprobacion', proyectos: '' },
    { nombre: 'Natalia Vargas', email: 'natalia.vargas@docuobra.demo', rolId: 1, estado: 'Pendiente_Verificacion', proyectos: '' },
    { nombre: 'Ricardo Salazar', email: 'ricardo.salazar@docuobra.demo', rolId: 1, estado: 'Inactivo', proyectos: 'H5' }
  ];

  function extensionDe(nombre) {
    return String(nombre).split('.').pop().toLowerCase();
  }

  /** Construye la base de datos inicial completa. */
  function crearBaseDatosSemilla() {
    var rnd = crearAleatorio(20260929);
    var ahora = Date.now();
    var hace = function (diasMax, diasMin) {
      var min = diasMin || 0;
      return new Date(ahora - (min + rnd() * (diasMax - min)) * DIA - Math.floor(rnd() * 8 * 3600 * 1000)).toISOString();
    };
    var elegir = function (lista) { return lista[Math.floor(rnd() * lista.length)]; };

    var db = {
      version: 1,
      creadaEn: new Date(ahora).toISOString(),
      secuencia: 1000,
      roles: ROLES,
      modulos: MODULOS.map(function (m) { return { idModulo: m.idModulo, nombre: m.nombre, orden: m.orden }; }),
      proyectos: PROYECTOS.slice(),
      carpetas: [],
      archivos: [],
      usuarios: [],
      favoritos: [],
      actividad: [],
      auditoria: [],
      grupos: [],
      sesiones: {}
    };

    // ---------- Usuarios ----------
    CUENTAS_DEMO.forEach(function (c) {
      db.usuarios.push({
        id: c.id, nombre: c.nombre, email: c.email, password: CONTRASENA_DEMO,
        rolId: c.rolId, estado: 'Activo',
        proyectos: c.rolId === 1 ? 'H1,H2' : 'TODOS',
        fechaRegistro: hace(420, 300),
        prefs: { actividad: true, recordatorios: false, seguridad: true }
      });
    });
    OTROS_USUARIOS.forEach(function (u, i) {
      db.usuarios.push({
        id: 'U' + (i + 4), nombre: u.nombre, email: u.email, password: CONTRASENA_DEMO,
        rolId: u.rolId, estado: u.estado, proyectos: u.proyectos,
        fechaRegistro: u.estado.indexOf('Pendiente') === 0 ? hace(6, 1) : hace(280, 30),
        prefs: { actividad: true, recordatorios: true, seguridad: true }
      });
    });
    var nombresResponsables = db.usuarios.filter(function (u) { return u.estado === 'Activo'; }).map(function (u) { return u.nombre; });

    // ---------- Carpetas y archivos ----------
    var idCarpeta = 100;
    var idArchivo = 5000;

    function crearArchivo(idCarpetaDestino, nombre, diasMax) {
      var ext = extensionDe(nombre);
      var rango = TAMANO_POR_EXTENSION[ext] || [20, 500];
      var id = 'A' + (idArchivo++);
      var archivo = {
        id: id,
        idCarpeta: idCarpetaDestino,
        nombre: nombre,
        extension: ext,
        mimeType: MIME_POR_EXTENSION[ext] || 'application/octet-stream',
        tamano: Math.round((rango[0] + rnd() * (rango[1] - rango[0])) * 1024),
        fecha: hace(diasMax || 150),
        responsable: elegir(nombresResponsables),
        driveFileId: 'demo-' + id,
        restringidos: []
      };
      db.archivos.push(archivo);
      return archivo;
    }

    db.proyectos.forEach(function (proyecto) {
      var modulo = MODULOS.filter(function (m) { return m.idModulo === proyecto.idModulo; })[0];
      AREAS_POR_TIPO[modulo.tipo].forEach(function (nombreArea) {
        var area = { id: 'C' + (idCarpeta++), idProyecto: proyecto.idProyecto, idPadre: null, nombre: nombreArea, fechaCreacion: hace(400, 200) };
        db.carpetas.push(area);

        var plantilla = PLANTILLAS_AREA[nombreArea];
        plantilla.archivos.forEach(function (nombre) {
          // Variedad entre proyectos: no todos tienen todos los documentos.
          if (rnd() < 0.82) crearArchivo(area.id, nombre);
        });

        Object.keys(plantilla.sub).forEach(function (nombreSub) {
          var sub = { id: 'C' + (idCarpeta++), idProyecto: proyecto.idProyecto, idPadre: area.id, nombre: nombreSub, fechaCreacion: hace(300, 100) };
          db.carpetas.push(sub);
          plantilla.sub[nombreSub].forEach(function (nombre) { crearArchivo(sub.id, nombre, 220); });
        });

        // Un documento privado por área de costos: demuestra la privacidad por archivo.
        if (nombreArea === 'Presupuesto y Costos') {
          var privado = crearArchivo(area.id, 'Márgenes y utilidad (confidencial).xlsx', 20);
          privado.responsable = 'Valentina Ríos';
          privado.restringidos = db.usuarios.filter(function (u) { return u.id !== 'U1'; }).map(function (u) { return u.id; });
        }
      });
    });

    // ---------- Favoritos ----------
    function carpetaDe(idProyecto, nombre) {
      return db.carpetas.filter(function (c) { return c.idProyecto === idProyecto && c.nombre === nombre && !c.idPadre; })[0];
    }
    function archivosDe(carpeta) {
      return db.archivos.filter(function (a) { return a.idCarpeta === carpeta.id; });
    }
    function favorito(idUsuario, tipo, idRecurso, dias) {
      db.favoritos.push({ idUsuario: idUsuario, tipoRecurso: tipo, idRecurso: idRecurso, fecha: hace(dias || 60) });
    }

    ['U1', 'U2', 'U3'].forEach(function (idU, i) {
      var h = i === 2 ? ['H1', 'H2'] : ['H1', 'H2', 'H3', 'H11'];
      favorito(idU, 'Carpeta', carpetaDe(h[0], 'Presupuesto y Costos').id);
      favorito(idU, 'Carpeta', carpetaDe(h[1], 'Contratos y Proveedores').id);
      favorito(idU, 'Carpeta', carpetaDe(h[0], 'Dirección de Obra').id);
      var docs = archivosDe(carpetaDe(h[0], 'Dirección de Obra')).concat(archivosDe(carpetaDe(h[1], 'Arquitectónico')));
      docs.slice(0, 3).forEach(function (a) { favorito(idU, 'Archivo', a.id); });
      if (i < 2) favorito(idU, 'Carpeta', carpetaDe('H11', 'Gerencia General').id);
    });

    // ---------- Actividad reciente ----------
    ['U1', 'U2', 'U3'].forEach(function (idU, i) {
      var proyectosUsuario = i === 2 ? ['H1', 'H2'] : ['H1', 'H2', 'H3', 'H4', 'H6', 'H9', 'H11'];
      for (var k = 0; k < 22; k++) {
        var proyecto = elegir(proyectosUsuario);
        var areas = db.carpetas.filter(function (c) { return c.idProyecto === proyecto && !c.idPadre; });
        var area = elegir(areas);
        var docs = archivosDe(area).filter(function (a) { return a.restringidos.indexOf(idU) === -1; });
        var r = rnd();
        if (r < 0.55 && docs.length) {
          db.actividad.push({ idUsuario: idU, tipoRecurso: 'Archivo', idRecurso: elegir(docs).id, tipoInteraccion: rnd() < 0.3 ? 'Subió' : 'Abrió', fecha: hace(25) });
        } else if (r < 0.85) {
          db.actividad.push({ idUsuario: idU, tipoRecurso: 'Carpeta', idRecurso: area.id, tipoInteraccion: 'Abrió', fecha: hace(25) });
        } else {
          db.actividad.push({ idUsuario: idU, tipoRecurso: 'Proyecto', idRecurso: proyecto, tipoInteraccion: 'Abrió', fecha: hace(25) });
        }
      }
    });

    // ---------- Grupos de privacidad ----------
    db.grupos.push({ id: 'G1', idCreador: 'U1', nombre: 'Equipo Directivo', integrantes: ['U2', 'U5'] });
    db.grupos.push({ id: 'G2', idCreador: 'U1', nombre: 'Presupuestos', integrantes: ['U2', 'U4', 'U6'] });
    db.grupos.push({ id: 'G3', idCreador: 'U2', nombre: 'Equipo de obra', integrantes: ['U3', 'U6'] });

    // ---------- Auditoría ----------
    var eventos = [
      ['Login', 'Inicio de sesión exitoso', 'Usuarios', 'Exitosa'],
      ['Login', 'Inicio de sesión exitoso', 'Usuarios', 'Exitosa'],
      ['Login', 'Inicio de sesión exitoso', 'Usuarios', 'Exitosa'],
      ['Login', 'Intento de inicio de sesión con contraseña incorrecta', 'Usuarios', 'Fallida'],
      ['Logout', 'Cierre de sesión', 'Usuarios', 'Exitosa'],
      ['Subir_Archivo', 'Subió "Presupuesto de obra.xlsx" en Presupuesto y Costos', 'Archivos', 'Exitosa'],
      ['Subir_Archivo', 'Subió "Plan de ejecución 2026.pdf" en Dirección de Obra', 'Archivos', 'Exitosa'],
      ['Crear_Carpeta', 'Creó la carpeta "Cierres mensuales"', 'Carpetas', 'Exitosa'],
      ['Renombrar_Archivo', 'Renombró "Informe v2.docx" a "Informe mensual de obra.docx"', 'Archivos', 'Exitosa'],
      ['Eliminar_Archivo', 'Eliminó "Borrador contrato de obra.pdf"', 'Archivos', 'Exitosa'],
      ['Crear_Area', 'Creó el área "Calidad"', 'Carpetas', 'Exitosa'],
      ['Cambio_Rol', 'Cambió el rol de Mariana Duarte de "Usuario" a "Administrador"', 'Usuarios', 'Exitosa'],
      ['Aprobar_Usuario', 'Aprobó el acceso de Julián Ortega', 'Usuarios', 'Exitosa'],
      ['Permisos_Proyectos', 'Asignó 3 proyectos a Daniela Quintero', 'Usuarios', 'Exitosa'],
      ['Registro', 'Nuevo usuario registrado', 'Usuarios', 'Exitosa'],
      ['Privacidad_Archivo', 'Restringió "Márgenes y utilidad (confidencial).xlsx"', 'Archivos', 'Exitosa']
    ];
    var activos = db.usuarios.filter(function (u) { return u.estado === 'Activo'; });
    for (var n = 0; n < 60; n++) {
      var ev = elegir(eventos);
      var quien = elegir(activos);
      db.auditoria.push({ fecha: hace(45), idUsuario: quien.id, email: quien.email, tipo: ev[0], descripcion: ev[1], entidad: ev[2], estado: ev[3] });
    }

    return db;
  }

  window.DEMO_SEMILLA = {
    crearBaseDatosSemilla: crearBaseDatosSemilla,
    cuentasDemo: CUENTAS_DEMO,
    contrasenaDemo: CONTRASENA_DEMO,
    mimePorExtension: MIME_POR_EXTENSION,
    /** Archivos que "aparecen" en el explorador simulado de Google Drive. */
    archivosDriveSimulados: [
      { id: 'drive-001', nombre: 'Propuesta de diseño de fachada.pdf', mimeType: 'application/pdf', tamano: 2415000 },
      { id: 'drive-002', nombre: 'Cotización de acabados.xlsx', mimeType: MIME_POR_EXTENSION.xlsx, tamano: 318000 },
      { id: 'drive-003', nombre: 'Presentación aliados estratégicos.pptx', mimeType: MIME_POR_EXTENSION.pptx, tamano: 6120000 },
      { id: 'drive-004', nombre: 'Fotografías de avance de obra.jpg', mimeType: 'image/jpeg', tamano: 4870000 },
      { id: 'drive-005', nombre: 'Minuta reunión con proveedor.docx', mimeType: MIME_POR_EXTENSION.docx, tamano: 96000 },
      { id: 'drive-006', nombre: 'Checklist de entrega.xlsx', mimeType: MIME_POR_EXTENSION.xlsx, tamano: 142000 }
    ]
  };
})();
