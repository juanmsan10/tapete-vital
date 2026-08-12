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
//   POST { action:'deleteAll' }  → borra todas las filas de datos
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
