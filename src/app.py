import uvicorn
from fastapi import FastAPI

app = FastAPI()

# Import services.router here (after creating `app`) to avoid circular import during module import
from .services import router as services_router
app.include_router(services_router)

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)

