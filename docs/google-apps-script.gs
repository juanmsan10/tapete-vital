// ============================================================
// Apps Script de la Google Sheet de PAT / Tapete Vital
// Pegar en: Sheet → Extensiones → Apps Script (reemplaza todo)
// y luego: Implementar → Administrar implementaciones → ✏️ →
// Nueva versión → Implementar (así la URL del webhook NO cambia).
//
// Maneja TRES hojas dentro del mismo archivo:
//   Pedidos    (la primera, la de siempre)
//   Usuarios   (acceso al panel; contraseñas cifradas)
//   Auditoria  (registro de quién hizo qué)
//
// API que expone:
//   GET  ?action=read[&hoja=Usuarios]        → { filas: [...] }  (+ pedidos para compatibilidad)
//   POST { ...datos }                        → agrega una fila
//   POST { action:'update', clave, valor, ...campos } → edita la fila que coincida
//   POST { action:'delete', clave, valor }   → borra las filas que coincidan
//
// 'clave' es la columna por la que se busca (por defecto 'orden').
// Los encabezados se matchean sin tildes ni mayúsculas.
// ============================================================

function hojaPorNombre_(nombre) {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  if (!nombre) return libro.getSheets()[0]; // Pedidos: la primera
  var h = libro.getSheetByName(nombre);
  if (!h) throw new Error('No existe la hoja: ' + nombre);
  return h;
}

// "Teléfono" → "telefono"
function clave_(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function leerHoja_(hoja) {
  var datos = hoja.getDataRange().getValues();
  if (datos.length < 2) return [];
  var claves = datos[0].map(clave_);
  return datos.slice(1).map(function (fila) {
    var o = {};
    claves.forEach(function (k, i) { o[k] = fila[i]; });
    return o;
  });
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'read') {
    var filas = leerHoja_(hojaPorNombre_(p.hoja));
    // 'pedidos' se mantiene por compatibilidad con lo que ya consumía la API
    return json_({ filas: filas, pedidos: filas });
  }
  return json_({ ok: true });
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var hoja = hojaPorNombre_(body.hoja);
  var ultimaCol = hoja.getLastColumn();
  var claves = hoja.getRange(1, 1, 1, ultimaCol).getValues()[0].map(clave_);
  var columnaClave = clave_(body.clave || 'orden');

  if (body.action === 'update' || body.action === 'delete') {
    var col = claves.indexOf(columnaClave) + 1;
    if (col < 1) return json_({ error: 'No hay columna ' + columnaClave });
    var buscado = String(body.valor !== undefined ? body.valor : body[columnaClave]).trim();
    if (!buscado) return json_({ error: 'valor vacío' });

    var filas = hoja.getLastRow() - 1;
    if (filas < 1) return json_({ error: 'hoja vacía' });
    var valores = hoja.getRange(2, col, filas, 1).getValues();

    if (body.action === 'delete') {
      var borradas = 0;
      for (var i = valores.length - 1; i >= 0; i--) {
        if (String(valores[i][0]).trim() === buscado) { hoja.deleteRow(i + 2); borradas++; }
      }
      return json_({ ok: true, borradas: borradas });
    }

    for (var f = 0; f < valores.length; f++) {
      if (String(valores[f][0]).trim() === buscado) {
        var fila = f + 2;
        Object.keys(body).forEach(function (campo) {
          if (campo === 'action' || campo === 'hoja' || campo === 'clave' || campo === 'valor') return;
          if (clave_(campo) === columnaClave) return;
          var c = claves.indexOf(clave_(campo)) + 1;
          if (c >= 1) hoja.getRange(fila, c).setValue(body[campo]);
        });
        return json_({ ok: true, valor: buscado });
      }
    }
    return json_({ error: 'No encontrado: ' + buscado });
  }

  // No existe un borrado masivo a propósito: esta URL es pública (tiene que
  // serlo para que Vercel la llame), así que un "vaciar hoja" sería un botón
  // de borrar toda la operación al alcance de cualquiera que sepa la dirección.

  // Sin action: nueva fila, en el orden de las columnas
  var nueva = claves.map(function (k) { return body[k] !== undefined ? body[k] : ''; });
  hoja.appendRow(nueva);
  return json_({ ok: true });
}

// ============================================================
// Pinta en rojo la fila completa de los pedidos "Descartado".
// EJECUTAR UNA SOLA VEZ desde el editor (selector de función → ▷).
// La regla queda guardada y aplica sola a las filas nuevas.
// ============================================================
function aplicarFormatoDescartados() {
  var hoja = hojaPorNombre_();
  var ultimaCol = hoja.getLastColumn();
  var claves = hoja.getRange(1, 1, 1, ultimaCol).getValues()[0].map(clave_);
  var colEstado = claves.indexOf('estado') + 1;
  if (colEstado < 1) throw new Error('No encontré la columna "Estado"');

  var letra = letraColumna_(colEstado);
  var rango = hoja.getRange(2, 1, hoja.getMaxRows() - 1, ultimaCol);
  var regla = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + letra + '2="Descartado"')
    .setFontColor('#D64541')
    .setRanges([rango])
    .build();

  var reglas = hoja.getConditionalFormatRules().filter(function (r) {
    var c = r.getBooleanCondition();
    if (!c) return true;
    return c.getCriteriaValues().join(' ').indexOf('"Descartado"') === -1;
  });
  reglas.push(regla);
  hoja.setConditionalFormatRules(reglas);
  return 'Listo: las filas Descartado quedan en rojo (columna ' + letra + ').';
}

function letraColumna_(n) {
  var s = '';
  while (n > 0) {
    var resto = (n - 1) % 26;
    s = String.fromCharCode(65 + resto) + s;
    n = (n - resto - 1) / 26;
  }
  return s;
}

// ============================================================
// Crea las hojas Usuarios y Auditoria con sus encabezados.
// EJECUTAR UNA SOLA VEZ desde el editor.
// ============================================================
function crearHojasDeSistema() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var definicion = {
    Usuarios: ['Usuario', 'Clave hash', 'Salt', 'Creado en', 'Ultimo acceso'],
    Auditoria: ['Id', 'Fecha', 'Usuario', 'Accion', 'Objetivo', 'Detalle'],
  };
  var creadas = [];
  Object.keys(definicion).forEach(function (nombre) {
    var h = libro.getSheetByName(nombre);
    if (!h) { h = libro.insertSheet(nombre); creadas.push(nombre); }
    if (h.getLastRow() === 0) {
      h.appendRow(definicion[nombre]);
      h.getRange(1, 1, 1, definicion[nombre].length).setFontWeight('bold');
      h.setFrozenRows(1);
    }
  });
  return creadas.length ? 'Hojas creadas: ' + creadas.join(', ') : 'Las hojas ya existían.';
}
