from datetime import date
import json
from app import app
import pymongo
from bson.objectid import ObjectId

class Response():
    def __init__(self,data):
        self.data = data

    def toDict(self):
        return {"data":self.data}

#Defino la base de datos y la colección

MONGO_HOST="localhost"
MONGO_PUERTO="27017"
MONGO_TIEMPO_FUERA=1000

MONGO_URI="mongodb://"+MONGO_HOST+":"+MONGO_PUERTO+"/"

MONGO_BASEDATOS="TPintegrador2"


#-----------------------------------------

@app.post("/create_madurador/",tags=["madurador"])
def create_madurador(litros:int,estado:str,lote:dict,notas:str=""):
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


@app.post("/update_madurador_by_id/",tags=["madurador"])
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


@app.post("/delete_madurador_by_id/",tags=["madurador"])
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

@app.get("/get_all_madurador/",tags=["madurador"])
def find_all_madurador():

    #Defino el string de Conexion
    cliente=pymongo.MongoClient(MONGO_URI,serverSelectionTimeoutMS=MONGO_TIEMPO_FUERA)

    baseDatos=cliente[MONGO_BASEDATOS]
    coleccion=baseDatos["maduradores"]

    # Ejecuto un find para traer todos los documentos de la colección y los asigno a la variable documentos
    documentos = coleccion.find()

    lista = []

    for documento in documentos:
            lista.append(documento)

    cliente.close()

    return str(Response(lista).toDict())


@app.get("/get_madurador_by_id/",tags=["madurador"])
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
    
    