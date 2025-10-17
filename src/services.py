from datetime import date
import json
from typing import List, Optional
from fastapi import Depends,Body
from app import app
import pymongo

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
def create_lote(litros,estado,notas,lote):
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

    return Response(lista).toDict()


# @app.get("/get_madurador_by_id/{item_id}",tags=["madurador"])
# def find_madurador_by_id():
    

# @app.post("/delete_madurador_by_id/{item_id}",tags=["madurador"])
# def delete_madurador_by_id():
    
