@echo off
netsh advfirewall firewall add rule name="G.M.A.C servidor 8000" dir=in action=allow protocol=TCP localport=8000 profile=private
if %errorlevel% equ 0 (
  echo Puerto 8000 habilitado para redes privadas.
) else (
  echo Ejecuta este archivo como administrador: clic derecho ^> Ejecutar como administrador.
)
pause
