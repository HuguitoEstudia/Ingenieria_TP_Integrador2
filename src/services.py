from datetime import date
import json
import os
import pymongo
from bson.objectid import ObjectId
from fastapi import APIRouter, HTTPException

# Use router to avoid importing the FastAPI app at module import time
router = APIRouter()

class Response():
    def __init__(self,data):
        self.data = data

    def toDict(self):
        return {"data":self.data}

#Defino la base de datos y la colección

MONGO_HOST="localhost"
MONGO_PUERTO="27017"
MONGO_TIEMPO_FUERA=10000

# MONGO_URI="mongodb+srv://db_user_TP_PROMO:R4LvCFtcXtb0I3mQ@cluster0.18gaj25.mongodb.net/TPintegrador2?retryWrites=true&w=majority"
MONGO_URI = "mongodb://" + MONGO_HOST + ":" + MONGO_PUERTO + "/"

MONGO_BASEDATOS="TPintegrador2"


#-----------------------------------------
#==========MADURADOR==========

@router.post("/create_madurador/", tags=["madurador"])
def create_madurador(litros:int, estado:str, lote:str, notas:str = ""):

    lote = lote.replace("'",'"')
    lote = json.loads(lote)
    
    documento = {"litros":litros,
                "estado":estado,
                "notas":notas,
                "lote":lote}
    
    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["maduradores"]

    # Insertamos el documento
    coleccion.insert_one(documento)

    # Cierro la conexión a la base de Datos
    cliente.close()
    
         


@router.post("/update_madurador_by_id/", tags=["madurador"])
def update_madurador(id, litros=None, estado=None, lote=None, notas=None):
    
    objid=ObjectId(id)

    #comprobamos que los atributos no esten vacios antes de modificar para no eliminar ninguno involuntariamente     
    nuevos_datos = {}

    if litros != None:
        nuevos_datos["litros"]=int(litros)
    
    if estado != None:
        nuevos_datos["estado"]=str(estado)
    
    if lote != None:
        lote = lote.replace("'",'"')
        lote = json.loads(lote)
        nuevos_datos["lote"]=lote

    if notas != None:
        nuevos_datos["notas"]=str(notas)
    
    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["maduradores"]

    # Insertamos el documento
    coleccion.update_one({"_id":objid},{'$set':nuevos_datos})

    # Cierro la conexión a la base de Datos
    cliente.close()



@router.post("/delete_madurador_by_id/", tags=["madurador"])
def delete_madurador_by_id(id):

    objid=ObjectId(id)

    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["maduradores"]

    # Insertamos el documento
    coleccion.delete_one({"_id":objid})

    # Cierro la conexión a la base de Datos
    cliente.close()


@router.get("/get_all_madurador/", tags=["madurador"])
def find_all_madurador():

    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["maduradores"]

    # Ejecuto un find para traer todos los documentos de la colección y los asigno a la variable documentos
    documentos = coleccion.find()

    lista = []

    for documento in documentos:
            lista.append(_serialize_doc(documento))

    cliente.close()

    return str(Response(lista).toDict())


@router.get("/get_madurador_by_id/", tags=["madurador"])
def find_madurador_by_id(id):

    objid=ObjectId(id)
     
    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["maduradores"]

    # Ejecuto un find para traer todos los documentos de la colección y los asigno a la variable documentos
    documentos = coleccion.find_one({"_id":objid})

    cliente.close()

    return str(Response(_serialize_doc(documentos)).toDict())



#==========LOTE==========


@router.post("/create_lote/", tags=["lote"])
def create_lote(cerveza:str, estado:str, cantidadLitros:int, fechaCarga:str, fechaVencimiento:str, notas:str = ""):
    documento = {"cerveza":cerveza,
                 "estado":estado,
                 "cantidadLitros":cantidadLitros,
                 "fechaCarga":fechaCarga,
                 "fechaVencimiento":fechaVencimiento,
                 "notas":notas}
    
    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["lotes"]

    # Insertamos el documento
    coleccion.insert_one(documento)

    # Cierro la conexión a la base de Datos
    cliente.close()


@router.post("/update_lote_by_id/", tags=["lote"])
def update_lote(id, cerveza=None, cantidadLitros=None, estado=None, fechaCarga=None, fechaVencimiento=None, notas=None):
    
    objid=ObjectId(id)

    #comprobamos que los atributos no esten vacios antes de modificar para no eliminar ninguno involuntariamente     
    nuevos_datos = {}

    if cerveza != None:
          nuevos_datos["cerveza"]=str(cerveza)
    
    if cantidadLitros != None:
          nuevos_datos["cantidadLitros"]=str(cantidadLitros)
    
    if estado != None:
          nuevos_datos["estado"]=str(estado)

    if fechaCarga != None:
          nuevos_datos["fechaCarga"]=fechaCarga

    if fechaVencimiento != None:
          nuevos_datos["fechaVencimiento"]=fechaVencimiento

    if notas != None:
          nuevos_datos["notas"]=str(notas)
    
    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["lotes"]

    # Insertamos el documento
    coleccion.update_one({"_id":objid},{'$set':nuevos_datos})

    # Cierro la conexión a la base de Datos
    cliente.close()



@router.post("/delete_lote_by_id/", tags=["lote"])
def delete_lote_by_id(id):

    objid=ObjectId(id)

    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["lotes"]

    # Insertamos el documento
    coleccion.delete_one({"_id":objid})

    # Cierro la conexión a la base de Datos
    cliente.close()


@router.get("/get_all_lote/", tags=["lote"])
def find_all_lote():

    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["lotes"]

    # Ejecuto un find para traer todos los documentos de la colección y los asigno a la variable documentos
    documentos = coleccion.find()

    lista = []

    for documento in documentos:
            lista.append(_serialize_doc(documento))

    cliente.close()

    return str(Response(lista).toDict())


@router.get("/get_lote_by_id/", tags=["lote"])
def find_lote_by_id(id):

    objid=ObjectId(id)
     
    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["lotes"]

    # Ejecuto un find para traer todos los documentos de la colección y los asigno a la variable documentos
    documentos = coleccion.find_one({"_id":objid})

    cliente.close()

    return str(Response(_serialize_doc(documentos)).toDict())





#==================================================================================================================================================






    
@router.get('/health')
def health():
    return {'status': 'ok'}

def _serialize_doc(documento):
    """Convert ObjectId and dates to JSON-serializable types."""
    if documento is None:
        return None
    doc = {}
    for k, v in documento.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, (date,)):
            doc[k] = v.isoformat()
        else:
            doc[k] = v
    return doc

@router.get('/api/records')
def api_records():
    # Return a plain list of serialized records for the SPA
    cliente = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)
    try:
        baseDatos = cliente[MONGO_BASEDATOS]
        coleccion = baseDatos['maduradores']
        documentos = list(coleccion.find())
        return [_serialize_doc(d) for d in documentos]
    finally:
        cliente.close()

@router.post('/add')
def add_record(request: dict = None): # type: ignore
    """Accept form-encoded or JSON payloads with fields litros, estado, notas, lote.
    This endpoint is compatibility for the static frontend.
    """
    raise HTTPException(status_code=400, detail='Use the backend form endpoint via the frontend app or ensure form fields are sent')
    
