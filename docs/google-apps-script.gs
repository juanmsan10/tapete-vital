// ============================================================
// Apps Script de la Google Sheet de pedidos (Tapete Vital / PAT)
// Pegar en: Sheet → Extensiones → Apps Script (reemplaza todo)
// y luego: Implementar → Administrar implementaciones → ✏️ →
// Nueva versión → Implementar (así la URL del webhook NO cambia).
//
// API que expone (la que consume la app en Vercel):
//   GET  ?action=read            → { pedidos: [...] }
//   POST { ...datos }            → agrega una fila (nuevo pedido)
//   POST { action:'update', orden, ...campos } → edita campos de la fila
//   POST { action:'delete', orden }            → borra LA fila de esa orden
//   POST { action:'deleteAll' }  → borra todas las filas de datos
//
// Además incluye aplicarFormatoDescartados(): función de un solo uso que
// pinta en rojo las filas de pedidos Descartado (ver más abajo).
//
// El 'update' acepta CUALQUIER columna existente (estado, guia,
// nombre, telefono, email, ciudad, direccion, notas, etc.):
// busca la fila por 'orden' y solo pisa los campos enviados.
// Los encabezados se matchean sin tildes ni mayúsculas
// ("Teléfono" ≡ telefono), así el orden de columnas no importa.
// ============================================================

function hoja_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

// ============================================================
// Pinta en rojo la fila completa de los pedidos "Descartado".
// EJECUTAR UNA SOLA VEZ desde el editor: elegir esta función en el
// selector de arriba y pulsar ▷ Ejecutar. Crea una regla de formato
// condicional que queda guardada en la hoja, así que las filas nuevas
// se pintan solas sin volver a ejecutar nada.
// ============================================================
function aplicarFormatoDescartados() {
  var hoja = hoja_();
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

  // Conserva otras reglas que ya existan; solo reemplaza la de Descartado
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

// "Teléfono" → "telefono"
function clave_(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'read') {
    var datos = hoja_().getDataRange().getValues();
    var claves = datos[0].map(clave_);
    var pedidos = datos.slice(1).map(function (fila) {
      var p = {};
      claves.forEach(function (k, i) { p[k] = fila[i]; });
      return p;
    });
    return json_({ pedidos: pedidos });
  }
  return json_({ ok: true });
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var hoja = hoja_();
  var encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  var claves = encabezados.map(clave_);

  if (body.action === 'update') {
    var colOrden = claves.indexOf('orden') + 1;
    if (colOrden < 1) return json_({ error: 'No hay columna orden' });
    var valores = hoja.getRange(2, colOrden, Math.max(hoja.getLastRow() - 1, 1), 1).getValues();
    for (var f = 0; f < valores.length; f++) {
      if (String(valores[f][0]).trim() === String(body.orden).trim()) {
        var fila = f + 2;
        Object.keys(body).forEach(function (campo) {
          if (campo === 'action' || campo === 'orden') return;
          var col = claves.indexOf(clave_(campo)) + 1;
          if (col >= 1) hoja.getRange(fila, col).setValue(body[campo]);
        });
        return json_({ ok: true, orden: body.orden });
      }
    }
    return json_({ error: 'Orden no encontrada: ' + body.orden });
  }

  // Borrado puntual: elimina las filas cuya columna "orden" coincida exacto.
  // Nunca borra con orden vacío (protección contra borrados accidentales).
  if (body.action === 'delete') {
    if (!body.orden || !String(body.orden).trim()) return json_({ error: 'orden vacío' });
    var colO = claves.indexOf('orden') + 1;
    if (colO < 1) return json_({ error: 'No hay columna orden' });
    var vals = hoja.getRange(2, colO, Math.max(hoja.getLastRow() - 1, 1), 1).getValues();
    var borradas = 0;
    for (var i = vals.length - 1; i >= 0; i--) { // de abajo hacia arriba
      if (String(vals[i][0]).trim() === String(body.orden).trim()) {
        hoja.deleteRow(i + 2);
        borradas++;
      }
    }
    return json_({ ok: true, borradas: borradas });
  }

  if (body.action === 'deleteAll') {
    if (hoja.getLastRow() > 1) {
      hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).clearContent();
    }
    return json_({ ok: true });
  }

  // Sin action: nueva fila (pedido nuevo), en el orden de las columnas
  var nueva = claves.map(function (k) { return body[k] !== undefined ? body[k] : ''; });
  hoja.appendRow(nueva);
  return json_({ ok: true });
}
