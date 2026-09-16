# G.M.A.C

Proyecto sencillo en HTML, CSS y JavaScript para obtener la ubicación actual del usuario con la API de geolocalización del navegador.

## Cómo abrirlo

1. Abre PowerShell en la carpeta del proyecto.
2. Ejecuta el servidor compartido:
   ```bash
   node server.js
   ```
3. En la PC visita:
   ```text
   http://localhost:8000
   ```
4. Para conectar otro computador o celular, ambos deben abrir la misma dirección del servidor. En una red local, conecta el dispositivo a la misma red Wi-Fi, busca la IPv4 de la PC con `ipconfig` y abre:
   ```text
   http://IP-DE-LA-PC:8000
   ```

Si el celular no puede abrir la dirección, ejecuta `abrir-firewall-gmac.bat` como administrador y permite Node.js en la red privada de Windows. La PC y el celular no deben usar redes Wi-Fi distintas ni una red de invitados. Para computadores fuera de esa red, publica este servidor con una URL HTTPS compartida y abre esa misma URL en ambos equipos.

No abras `index.html` directamente con `file://`: en ese modo cada dispositivo usa su propio almacenamiento y no puede compartir el código.

## Funcionalidad

- Solicita acceso a la ubicación del usuario.
- Muestra latitud, longitud, precisión y hora.
- Genera un enlace para ver la posición en Google Maps.
- Comparte y confirma el código de vinculación entre dispositivos mediante el servidor G.M.A.C.
- Usa Firebase Firestore para compartir el código y el historial entre computadores conectados a Internet.

## Activar Firebase

La configuración del proyecto Firebase está en `firebase-config.js`. En Firebase Console abre **Firestore Database > Reglas** y pega el contenido de `firestore.rules`; pulsa **Publicar** para probar la aplicación. Estas reglas son solo para desarrollo porque permiten acceso mediante el código. Antes de publicar la aplicación, agrega Firebase Authentication y reglas que validen al usuario autenticado.

Abre la aplicación mediante `node server.js` y visita la dirección mostrada por el servidor. El código y el historial se guardarán primero en Firestore; el servidor local queda como respaldo si Firebase no responde.

## Nota

La geolocalización solo funciona con permiso del usuario y desde un navegador que la soporte.

## Preparar repositorio

Con Git instalado, ejecuta desde esta carpeta:

```bash
git init
git add .
git commit -m "Preparar G.M.A.C para GitHub"
git branch -M main
git remote add origin URL_DE_TU_REPOSITORIO
git push -u origin main
```
