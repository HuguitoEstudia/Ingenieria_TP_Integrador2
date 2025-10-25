import uvicorn  # arma un servidor local
from fastapi import FastAPI

app = FastAPI()

# Permitir solicitudes de origen cruzado desde el servidor de desarrollo frontend
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5001", "http://localhost:5001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Importe services.router aquí (después de crear `app`) para evitar la importación circular durante la importación del módulo
from .services import router as services_router
app.include_router(services_router)

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)

