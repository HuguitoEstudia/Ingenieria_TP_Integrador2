from datetime import date
import json
import pymongo
from bson.objectid import ObjectId
from typing import List, Optional
from fastapi import Depends, Body, APIRouter, Form, HTTPException, Request
import os
from pathlib import Path

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

@router.post("/create_madurador/",tags=["madurador"])
def create_madurador(litros:int,estado:str,lote:dict,notas:str=""):
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


@router.post("/update_madurador_by_id/",tags=["madurador"])
def update_madurador(id,litros=None,estado=None,lote=None,notas=None):
    
    objid=ObjectId(id)

    #comprobamos que los atributos no esten vacios antes de modificar para no eliminar ninguno involuntariamente     
    nuevos_datos = {}

    if litros != None:
          nuevos_datos["litros"]=int(litros)
    
    if estado != None:
          nuevos_datos["estado"]=int(estado)
    
    if lote != None:
          nuevos_datos["lote"]=int(lote)

    if notas != None:
          nuevos_datos["notas"]=int(notas)
    
    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["maduradores"]

    # Insertamos el documento
    coleccion.update_one({"_id":objid},{'$set':nuevos_datos})

    # Cierro la conexión a la base de Datos
    cliente.close()


@router.post("/delete_madurador_by_id/",tags=["madurador"])
def delete_madurador_by_id(id):

    objid=ObjectId(id)

    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos = cliente[MONGO_BASEDATOS]
    coleccion = baseDatos[MONGO_COLECCION]

    # Insertamos el documento
    coleccion.delete_one({"_id":objid})

    # Cierro la conexión a la base de Datos
    cliente.close()

@router.get("/get_all_madurador/",tags=["madurador"])
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

    return str(Response(lista).toDict())


@router.get("/get_madurador_by_id/",tags=["madurador"])
def find_madurador_by_id(id):

    objid=ObjectId(id)
     
    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["maduradores"]

    # Ejecuto un find para traer todos los documentos de la colección y los asigno a la variable documentos
    documentos = coleccion.find_one({"_id":objid})

    cliente.close()

    return str(Response(documentos).toDict())









#==============================================================================================================================================================

#==============================================================================================================================================================

#==============================================================================================================================================================

#==============================================================================================================================================================

#==============================================================================================================================================================

#==============================================================================================================================================================

#==============================================================================================================================================================






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


# Compatibility endpoint the static SPA expects: accept form-encoded data at /add
@router.post('/add')
async def add_record(request: Request):
    """Accept form-encoded or JSON payloads with fields:
    litros, estado, notas, lote. Returns inserted_id on success.
    """
    litros = None
    estado = None
    notas = None
    lote = None

    # Try to read form data first (works for urlencoded and multipart)
    try:
        form = await request.form()
        if form:
            litros = form.get('litros')
            estado = form.get('estado')
            notas = form.get('notas')
            lote = form.get('lote')
    except Exception:
        pass

    # If no form data, try JSON body
    if not litros and not lote:
        try:
            body = await request.json()
            if isinstance(body, dict):
                litros = body.get('litros', litros)
                estado = body.get('estado', estado)
                notas = body.get('notas', notas)
                lote = body.get('lote', lote)
        except Exception:
            pass

    # Basic validation: require litros, lote and estado
    if litros is None or lote is None or estado is None:
        raise HTTPException(status_code=422, detail='`litros`, `estado` and `lote` are required')

    # normalize litros to number if possible
    try:
        # accept integer or float strings
        if isinstance(litros, str) and ('.' in litros or ',' in litros):
            litros = float(litros.replace(',','.'))
        else:
            litros = int(litros)
    except Exception:
        # leave as-is if cannot convert
        pass

    documento = {
        'litros': litros,
        'estado': estado,
        'notas': notas,
        'lote': lote,
    }

    cliente = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)
    try:
        baseDatos = cliente[MONGO_BASEDATOS]
        coleccion = baseDatos[MONGO_COLECCION]
        res = coleccion.insert_one(documento)
        return {'inserted_id': str(res.inserted_id)}
    finally:
        cliente.close()




# Optional: additional routes can be added to the router
# @router.get("/get_madurador_by_id/{item_id}", tags=["madurador"])
# def find_madurador_by_id():
    

# @router.post("/delete_madurador_by_id/{item_id}", tags=["madurador"])
# def delete_madurador_by_id():

    
    