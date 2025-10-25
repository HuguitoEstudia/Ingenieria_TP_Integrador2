from datetime import date
from ast import literal_eval
import os
import pymongo
from bson.objectid import ObjectId
from fastapi import APIRouter, HTTPException

# # Utilice el enrutador para evitar importar la aplicación FastAPI en el momento de importar el módulo
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

# MONGO_URI="mongodb+srv://Elias:crud123@cluster0.ggcpank.mongodb.net/?appName=Cluster0"
# MONGO_URI = "mongodb://" + MONGO_HOST + ":" + MONGO_PUERTO + "/"
MONGO_URI = "mongodb://admin:admin123@localhost:27017"

MONGO_BASEDATOS="TPintegrador2"


#-----------------------------------------
#==========MADURADOR==========

@router.post("/create_madurador/", tags=["madurador"])
def create_madurador(litros:int, estado:str, lote:str, notas:str = ""):

    lotedict = literal_eval(lote)
    lotedict["_id"] = ObjectId(lotedict["_id"])
    
    documento = {"litros":litros,
                "estado":estado,
                "notas":notas,
                "lote":lotedict}
    
    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["maduradores"]

    # Insertamos el documento
    coleccion.insert_one(documento)

    # Cierro la conexión a la base de Datos
    cliente.close()
    
         


@router.post("/update_madurador_by_id/", tags=["madurador"])
def update_madurador_by_id(id:str, litros=None, estado=None, lote=None, notas=None):
    
    objid=ObjectId(id)

    #comprobamos que los atributos no esten vacios antes de modificar para no eliminar ninguno involuntariamente     
    nuevos_datos = {}

    if litros != None:
        nuevos_datos["litros"]=int(litros)
    
    if estado != None:
        nuevos_datos["estado"]=str(estado)
    
    if lote != None:
        lotedict = literal_eval(lote)
        lotedict["_id"] = ObjectId(lotedict["_id"])
        nuevos_datos["lote"]=lotedict

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
def delete_madurador_by_id(id:str):

    objid=ObjectId(id)

    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["maduradores"]

    # Insertamos el documento
    coleccion.delete_one({"_id":objid})

    # Cierro la conexión a la base de Datos
    cliente.close()


@router.get("/find_all_madurador/", tags=["madurador"])
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

    return Response(lista).toDict()


@router.get("/find_madurador_by_id/", tags=["madurador"])
def find_madurador_by_id(id:str):

    objid=ObjectId(id)
     
    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["maduradores"]

    # Ejecuto un find para traer todos los documentos de la colección y los asigno a la variable documentos
    documentos = coleccion.find_one({"_id":objid})

    cliente.close()

    return Response(_serialize_doc(documentos)).toDict()



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
def update_lote_by_id(id:str, cerveza=None, cantidadLitros=None, estado=None, fechaCarga=None, fechaVencimiento=None, notas=None):
    
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
def delete_lote_by_id(id:str):

    objid=ObjectId(id)

    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["lotes"]

    # Insertamos el documento
    coleccion.delete_one({"_id":objid})

    # Cierro la conexión a la base de Datos
    cliente.close()


@router.get("/find_all_lote/", tags=["lote"])
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

    return Response(lista).toDict()


@router.get("/find_lote_by_id/", tags=["lote"])
def find_lote_by_id(id:str):

    objid=ObjectId(id)
     
    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["lotes"]

    # Ejecuto un find para traer todos los documentos de la colección y los asigno a la variable documentos
    documentos = coleccion.find_one({"_id":objid})

    cliente.close()

    return Response(_serialize_doc(documentos)).toDict()





#==================================================================================================================================================






    
@router.get('/health')
def health():
    return {'status': 'ok'}

def _serialize_doc(documento):
    """Convertir ObjectId y fechas a tipos JSON serializables."""
    # Maneja None, tipos primitivos, ObjectId, date, dict, list recursivamente
    if documento is None:
        return None

    # ObjectId -> string
    if isinstance(documento, ObjectId):
        return str(documento)

    # Dates -> ISO string
    if isinstance(documento, (date,)):
        return documento.isoformat()

    # Dict: recursar en valores
    if isinstance(documento, dict):
        result = {}
        for k, v in documento.items():
            result[k] = _serialize_doc(v)
        return result

    # List/tuple: recursar en elementos
    if isinstance(documento, (list, tuple)):
        return [_serialize_doc(v) for v in documento]

    # Fallback: retornar como está (primitivos)
    return documento

@router.get('/api/records')
def api_records():
    # Retornar una lista simple de registros serializados para la SPA
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
    """Aceptar payloads codificados en formularios o JSON con campos litros, estado, notas, lote.
    Este endpoint es compatible con el frontend estático.
    """
    raise HTTPException(status_code=400, detail='Use el endpoint de formulario del backend a través de la aplicación frontend o asegúrese de que se envíen los campos del formulario')

