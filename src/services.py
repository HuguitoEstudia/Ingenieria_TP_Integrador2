from datetime import date
import json
from typing import List, Optional
from fastapi import Depends, Body, APIRouter
import pymongo
import os
from pathlib import Path

# Optionally load a .env file if present (development convenience)
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parents[1] / '.env'
    if env_path.exists():
        load_dotenv(env_path)
except Exception:
    # python-dotenv not installed or .env not present — skip silently
    pass

# Use an APIRouter so this module does not import the FastAPI `app` at import-time
router = APIRouter()

class Response():
    def __init__(self,data):
        self.data = data

    def toDict(self):
        return {"data":self.data}

#Defino la base de datos y la colección

MONGO_TIEMPO_FUERA = int(os.environ.get('MONGO_TIMEOUT_MS', '1000'))

# Preferred: full connection string from env (for Atlas or custom setups)
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')

# Database and collection names
MONGO_BASEDATOS = os.environ.get('MONGO_DATABASE', 'TPintegrador2')
MONGO_COLECCION = os.environ.get('MONGO_COLLECTION', 'maduradores')


#-----------------------------------------

@router.post("/create_madurador/", tags=["madurador"])
def create_lote(litros, estado, notas, lote):
    documento = {"litros":litros,
                 "estado":estado,
                 "notas":notas,
                 "lote":lote}
    
    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos = cliente[MONGO_BASEDATOS]
    coleccion = baseDatos[MONGO_COLECCION]

    # Insertamos el documento
    coleccion.insert_one(documento)

    # Cierro la conexión a la base de Datos
    cliente.close()


@router.get("/get_all_madurador/", tags=["madurador"])
def find_all_madurador():

    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos = cliente[MONGO_BASEDATOS]
    coleccion = baseDatos[MONGO_COLECCION]

    # Ejecuto un find para traer todos los documentos de la colección y los asigno a la variable documentos
    documentos = coleccion.find()

    lista = []

    for documento in documentos:
        lista.append(documento)

    cliente.close()

    return Response(lista).toDict()


# Simple health endpoint used by the static SPA
@router.get("/health")
def health():
    return {"status": "ok"}


# Compatibility endpoint for the SPA: returns a plain list of records
@router.get("/api/records")
def api_records():
    try:
        result = find_all_madurador()
        # find_all_madurador returns {"data": [...]} so extract the list
        if isinstance(result, dict):
            return result.get("data", [])
        return result
    except Exception:
        return []


# Optional: additional routes can be added to the router
# @router.get("/get_madurador_by_id/{item_id}", tags=["madurador"])
# def find_madurador_by_id():
    

# @router.post("/delete_madurador_by_id/{item_id}", tags=["madurador"])
# def delete_madurador_by_id():
    
