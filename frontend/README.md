# Frontend

Esta carpeta contiene una SPA servida por FastAPI (`frontend.app`). El frontend hace peticiones al backend (carpeta `src`) en el puerto 8001 por defecto.

Instrucciones rápidas (PowerShell):

1. Instala dependencias en el mismo intérprete Python usado para el backend:

```powershell
C:/Python313/python.exe -m pip install -r ..\requirements.txt
```

2. Arrancar el backend (en otra terminal):

```powershell
C:/Python313/python.exe -m uvicorn src.app:app --reload --port 8001
```

3. Arrancar el frontend (desde la raíz del repositorio):

```powershell
C:/Python313/python.exe -m uvicorn frontend.app:app --reload --port 5001
```

4. Abrir en el navegador: http://127.0.0.1:5001/

Notas:
- Podes cambiar la URL del backend desde el navegador almacenando en localStorage la clave `API_BASE` o fijando la variable de entorno `FRONTEND_BACKEND_URL` antes de ejecutar el servidor frontend.
