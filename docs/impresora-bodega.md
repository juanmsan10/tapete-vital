# Impresora de etiquetas de bodega — JADENS JD-268BT

**Fecha:** 11-sep-2026 · **Impresora:** JADENS Bluetooth Thermal Shipping Label Printer 4x6, azul
(Amazon B099MLDBKJ, modelo JD-268BT; el modelo exacto está en la calcomanía de abajo de la impresora).
**Etiquetas:** **50×50 mm**, térmicas directas (sin tinta), en rollo. La impresora acepta anchos de 40 a 108 mm y
largo desde 20 mm, así que las de 50×50 sirven; las 4×6 que vienen en la caja NO se usan (guardarlas o regalarlas).
**Comprar:** rollo de etiquetas térmicas adhesivas 50×50 mm (Mercado Libre o papelería; ~500 por rollo).
**PC:** Asus de la bodega, Windows. Conexión por **cable USB** (viene en la caja); Bluetooth no hace falta.

El panel (`/gestion` → pestaña Pedidos → paso Empacar → botón "Imprimir etiquetas") ya genera
las etiquetas a 50×50 mm. Lo único pendiente es instalar la impresora una vez en el PC.

## Instalación (una sola vez, ~15 minutos)

### 1. Conectar y cargar las etiquetas

1. Con la impresora **apagada** (interruptor en O), conecta el adaptador de corriente y el cable USB
   entre la impresora y el PC.
2. Tira de la palanca lateral para abrir la tapa. Pon el rollo de 50×50 con la cara imprimible
   **hacia arriba** y cierra las guías grises hasta que toquen los bordes del papel (si quedan flojas,
   la etiqueta sale torcida). Cierra la tapa hasta que haga clic.
3. Enciende la impresora (I). Espera la luz verde fija.
4. **Calibrar:** mantén presionado el botón de avance hasta oír **un pitido** y suéltalo. La impresora
   corre unas etiquetas y se detiene en el borde de corte. (Repetir cada vez que se cambie de rollo.)

### 2. Instalar el driver en el PC

1. Abre `https://jadens.com/pages/jd268-download-and-video` en el PC y descarga
   **Driver for Windows (JD-268BT)**. Si Windows Defender avisa, elige "Más información → Ejecutar de todas formas".
   (También viene en la memoria USB de la caja: archivo `JADENS_Printer_Driver_x.x.x.exe`.)
2. Ejecuta el instalador → **Install the printer driver** → Next.
3. Puerto: elige **USB** → **Search Printer** (la impresora debe estar encendida y conectada).
4. Modelo: escribe `268` en el buscador y elige **JD-268BT**.
5. Nombre: deja el que propone → Next → espera "Installing printer" → cierra el instalador.
6. Verifica: Configuración de Windows → Bluetooth y dispositivos → Impresoras y escáneres → debe aparecer
   **JD-268BT**. Si aparece "JD-268BT (Copia 1)", no vuelvas a instalar: quita la copia.

### 3. Dejarla como predeterminada y en 50×50

1. En Impresoras y escáneres → **JD-268BT** → **Establecer como predeterminada**.
2. Mismo lugar → **Preferencias de impresión**:
   - Página / Page Setup: **Nuevo** tamaño → nombre `50x50`, ancho **50 mm**, alto **50 mm** (o 1.97 × 1.97 in)
     → guardar y dejarlo seleccionado. El driver trae 4×6 por defecto; hay que cambiarlo.
   - Parámetros: oscuridad (Darkness/Density) en **10** (rango recomendado 8-12); velocidad la que trae.
3. Ahí mismo → Administrar → **Imprimir página de prueba**. Debe salir una etiqueta completa.

### 4. Probar desde el panel

1. En Chrome del PC, entra a `poloatierra.co/gestion` con el usuario de bodega → pestaña Pedidos → paso Empacar.
2. Botón **Imprimir etiquetas (N)**. Se abre el diálogo de impresión de Chrome:
   - Destino: **JD-268BT**.
   - Más ajustes → Tamaño del papel: **50x50** (el que creaste en el driver). Márgenes: **Ninguno**. Escala: **100 %**.
   - Desmarcar "Encabezados y pies de página" si aparece.
   Chrome recuerda estos ajustes para la próxima vez.
3. Imprimir. Si la etiqueta sale cortada o corrida, revisa que el tamaño del papel sea el mismo en los
   tres sitios: preferencias del driver, diálogo de Chrome y rollo cargado.

## Si algo falla

| Síntoma | Qué hacer |
|---|---|
| Luz roja parpadea cada 2 s | Sin papel o papel mal cargado. Recargar y calibrar (paso 1.4). |
| Luz roja parpadea 2 veces por segundo | Tapa mal cerrada. |
| Luz verde parpadea | Cabezal caliente; espera, reanuda sola. |
| Sale en blanco | Rollo al revés: la cara imprimible va hacia arriba. |
| Sale claro o borroso | Subir oscuridad a 12 en Preferencias de impresión. |
| Salta etiquetas o corta a mitad | Calibrar (paso 1.4) y revisar tamaño 50×50 en driver y Chrome. |
| No imprime nada | Reiniciar PC e impresora; si sigue, reinstalar el driver. |
| Autoprueba | Mantén el botón de avance hasta oír **dos pitidos**. |

Soporte JADENS: support@jadens.com · +1 833 470 2950 · support.jadens.com (artículos "Printer Setup (Windows)").
