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
4. Conecta el celular a la misma red Wi-Fi, busca la IPv4 de la PC con `ipconfig` y abre:
   ```text
   http://IP-DE-LA-PC:8000
   ```

Si el celular no puede abrir la dirección, ejecuta `abrir-firewall-gmac.bat` como administrador y permite Node.js en la red privada de Windows. La PC y el celular no deben usar redes Wi-Fi distintas ni una red de invitados.

No abras `index.html` directamente con `file://`: en ese modo cada dispositivo usa su propio almacenamiento y no puede compartir el código.

## Funcionalidad

- Solicita acceso a la ubicación del usuario.
- Muestra latitud, longitud, precisión y hora.
- Genera un enlace para ver la posición en Google Maps.
- Comparte el código de vinculación entre dispositivos mediante el servidor G.M.A.C.

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
