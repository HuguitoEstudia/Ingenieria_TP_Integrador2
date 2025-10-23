from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import requests
from pathlib import Path

app = FastAPI()

BASEDIR = Path(__file__).resolve().parent
STATIC_DIR = str((BASEDIR / 'static').resolve())
TEMPLATES_DIR = str((BASEDIR / 'templates').resolve())

app.mount('/static', StaticFiles(directory=STATIC_DIR), name='static')
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Por defecto, apunta al backend que corremos en el proyecto (puerto 8001)
BACKEND_URL = os.environ.get('FRONTEND_BACKEND_URL', 'http://localhost:8001')


def backend_get(path: str):
    url = BACKEND_URL.rstrip('/') + '/' + path.lstrip('/')
    res = requests.get(url, timeout=3)
    res.raise_for_status()
    return res.json()


def backend_post(path: str, data=None):
    url = BACKEND_URL.rstrip('/') + '/' + path.lstrip('/')
    res = requests.post(url, data=data, timeout=5)
    res.raise_for_status()
    try:
        return res.json()
    except Exception:
        return res.text


@app.get('/', response_class=HTMLResponse)
def index(request: Request):
    try:
        records = backend_get('api/records')
    except Exception as e:
        records = []
        error = str(e)
    else:
        error = None
    return templates.TemplateResponse('index.html', {'request': request, 'records': records, 'error': error})


@app.post('/add')
def add(litros: str = Form(...), estado: str = Form(...), notas: str = Form(''), lote: str = Form(...)):
    payload = {'litros': litros, 'estado': estado, 'notas': notas, 'lote': lote}
    backend_post('add', data=payload)
    return RedirectResponse(url='/', status_code=303)


@app.post('/delete')
def delete(id: str = Form(...)):
    backend_post('delete_madurador_by_id/', data={'id': id})
    return RedirectResponse(url='/', status_code=303)
