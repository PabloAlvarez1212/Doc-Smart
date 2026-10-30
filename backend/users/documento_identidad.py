import io,re,unicodedata,os,threading,pytesseract
from datetime import date
from difflib import SequenceMatcher
from PIL import Image,ImageOps,ImageEnhance,ImageFilter
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

if os.name=="nt":
    pytesseract.pytesseract.tesseract_cmd=r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# Un hilo por proceso de Tesseract; el paralelismo lo da la cantidad de procesos.
os.environ.setdefault("OMP_THREAD_LIMIT","1")
MAX_LADO_OCR=1600
_cpus=max(1,min(4,os.cpu_count() or 1))
_cupo=threading.BoundedSemaphore(_cpus)

class DocumentoError(Exception):pass

def _tesseract(img,**kw):
    with _cupo:return pytesseract.image_to_string(img,**kw)

def _paralelo(tareas):
    """Ejecuta callables sin argumentos y devuelve sus resultados en orden."""
    tareas=list(tareas)
    if len(tareas)==1:return [tareas[0]()]
    with ThreadPoolExecutor(max_workers=min(len(tareas),_cpus)) as ex:
        return [f.result() for f in [ex.submit(t) for t in tareas]]

def _limitar(img,maximo=MAX_LADO_OCR):
    """Reduce fotos de cámara enormes antes de ampliar; no agranda imágenes pequeñas."""
    m=max(img.size)
    if m<=maximo:return img
    f=maximo/m
    return img.resize((max(1,int(img.width*f)),max(1,int(img.height*f))),Image.Resampling.LANCZOS)

MESES={"ENE":1,"FEB":2,"MAR":3,"ABR":4,"MAY":5,"JUN":6,"JUL":7,"AGO":8,"SEP":9,"SEPT":9,"OCT":10,"NOV":11,"DIC":12}

def normalizar_texto(v):
    if not v:return ""
    v=unicodedata.normalize("NFKD",str(v))
    return re.sub(r"\s+"," ","".join(c for c in v if not unicodedata.combining(c)).upper()).strip()

def normalizar_numero(v):return re.sub(r"\D","",str(v or ""))

def similitud(a,b):return SequenceMatcher(None,normalizar_texto(a),normalizar_texto(b)).ratio()

def comparar_nombre_ocr(texto,valor):
    esp=[x for x in normalizar_texto(valor).split() if len(x)>=3]
    det=re.findall(r"[A-ZÑÁÉÍÓÚ]{3,}",normalizar_texto(texto))
    if not esp:return False,0
    r=[max((similitud(e,d) for d in det),default=0) for e in esp]
    return all(x>=.72 for x in r),round(sum(r)/len(r),2)

def preparar_imagen(contenido):
    try:
        img=_limitar(Image.open(io.BytesIO(contenido)).convert("RGB"))
        if img.height>img.width:img=img.rotate(90,expand=True)
        w,h=img.size
        img=img.resize((w*2,h*2),Image.Resampling.LANCZOS)
        img=ImageOps.autocontrast(ImageOps.grayscale(img))
        return ImageEnhance.Contrast(img).enhance(1.6).filter(ImageFilter.SHARPEN)
    except Exception:raise DocumentoError("No fue posible abrir el documento")

def ejecutar_ocr(contenido):
    img=preparar_imagen(contenido)
    try:r=[x.strip() for x in _paralelo([lambda p=p:_tesseract(img,lang="spa+eng",config=f"--oem 3 --psm {p}") for p in (6,11)])]
    except pytesseract.TesseractNotFoundError:raise DocumentoError("Tesseract no está instalado o configurado")
    except pytesseract.TesseractError:raise DocumentoError("No fue posible ejecutar el OCR")
    r=[x for x in r if x]
    if not r:raise DocumentoError("No se pudo leer el documento")
    return max(r,key=len)


def ejecutar_ocr_region(contenido, region, psm=6):
    try:
        img = _limitar(Image.open(io.BytesIO(contenido)).convert("RGB"))
        if img.height > img.width:
            img = img.rotate(90, expand=True)

        w, h = img.size
        x1, y1, x2, y2 = region

        img = img.crop((
            int(w * x1),
            int(h * y1),
            int(w * x2),
            int(h * y2),
        ))

        img = img.resize(
            (img.width * 3, img.height * 3),
            Image.Resampling.LANCZOS
        )
        img = ImageOps.autocontrast(ImageOps.grayscale(img))
        img = ImageEnhance.Contrast(img).enhance(1.8)

        return _tesseract(
            img,
            lang="spa+eng",
            config=f"--oem 3 --psm {psm}"
        ).strip()

    except (OSError, ValueError, pytesseract.TesseractError):
        return ""


def detectar_formato_cc(tf,tr=""):
    t=normalizar_texto(tf+"\n"+tr)
    raw=(tf+"\n"+tr).upper()

    if "NUP" in t or "NUIP" in t or "FECHA DE EXPIRACION" in t:
        return "nueva"

    if re.search(r"I<?C?COL[A-Z0-9<]{10,}",re.sub(r"\s+","",raw)):
        return "nueva"

    if re.search(r"\d{6}\d?[MFX]\d{6}\d?COL\d{6,12}",re.sub(r"[^A-Z0-9<]","",raw)):
        return "nueva"

    return "vieja"

def extraer_numero_cc(texto):
    for p in (
        r"\b(?:NUP|NUIP)\s*[:.]?\s*([\d.\s]{6,20})",
        r"(?<!\d)(\d{1,3}(?:\.\d{3}){2,3})(?!\d)"
    ):
        m=re.search(p,texto.upper())
        if m:
            n=normalizar_numero(m.group(1))
            if 6<=len(n)<=12:return n

    c=[normalizar_numero(x) for x in re.findall(r"(?<!\d)(?:\d[\s.-]*){6,12}(?!\d)",texto)]
    c=[x for x in c if 6<=len(x)<=12]
    return max(c,key=len) if c else None

def extraer_fecha(texto):
    t=normalizar_texto(texto)
    p=r"(\d{1,2})[\s./-]+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SEPT|OCT|NOV|DIC)[\s./-]+(\d(?:\s*\d){3})"
    m=re.search(r"FECHA\s+DE\s+NACIMIENTO.{0,50}?"+p,t) or re.search(p,t)

    if m:
        try:return date(int(re.sub(r"\s+","",m.group(3))),MESES[m.group(2)],int(m.group(1)))
        except:pass

    m=re.search(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b",t)
    if m:
        try:return date(int(m.group(3)),int(m.group(2)),int(m.group(1)))
        except:pass

    return None

def ejecutar_ocr_mrz(contenido):
    try:
        img=_limitar(Image.open(io.BytesIO(contenido)).convert("RGB"))
        if img.height>img.width:img=img.rotate(90,expand=True)
        img=ImageOps.autocontrast(ImageOps.grayscale(img))
        w,h=img.size
        regiones=[img.crop((0,int(h*.55),w,h)),img]
        ampliadas=[r.resize((r.width*2,r.height*2),Image.Resampling.LANCZOS) for r in regiones]
        textos=[t.strip() for t in _paralelo([lambda r=r,p=p:_tesseract(r,lang="eng",config=f"--oem 3 --psm {p}") for r in ampliadas for p in (6,11)])]
        return "\n".join(t for t in textos if t)
    except Exception:return ""

def extraer_mrz(texto):
    r={"numero_documento":None,"fecha_nacimiento":None,"nombres":None,"apellidos":None}
    if not texto:return r
    lineas=[]
    for l in texto.upper().splitlines():
        l=re.sub(r"[^A-Z0-9<]","",l)
        if l:lineas.append(l)

    for l in lineas:
        m=re.search(r"(\d{6})\d?[MFX](\d{6})\d?COL(\d{6,12})",l)
        if not m:continue
        f=m.group(1)
        try:
            yy,mm,dd=int(f[:2]),int(f[2:4]),int(f[4:6])
            actual=date.today().year%100
            r["fecha_nacimiento"]=date(1900+yy if yy>actual else 2000+yy,mm,dd)
        except:pass
        n=normalizar_numero(m.group(3))
        if 6<=len(n)<=12:r["numero_documento"]=n
        break

    for l in lineas:
        if "<<" not in l or l.startswith(("ICCOL","I<COL")):continue
        p=l.strip("<").split("<<",1)
        if len(p)!=2:continue
        a=" ".join(x for x in p[0].split("<") if x)
        n=" ".join(x for x in p[1].split("<") if x)
        if a:r["apellidos"]=a
        if n:r["nombres"]=n
        if a or n:break
    return r


def extraer_numero_cc_imagen(contenido):
    try:
        img=_limitar(Image.open(io.BytesIO(contenido)).convert("RGB"))
        if img.height>img.width:img=img.rotate(90,expand=True)

        w,h=img.size
        img=img.crop((0,0,w,int(h*.55)))
        conteo=Counter()

        # Escala 2 primero; la 3 solo si no hay consenso claro (>=3 lecturas iguales).
        for escala in (2,3):
            base=img.resize((img.width*escala,img.height*escala),Image.Resampling.LANCZOS)
            gris=ImageOps.autocontrast(ImageOps.grayscale(base))

            versiones=(
                gris,
                gris.point(lambda x:0 if x<150 else 255),
                gris.point(lambda x:0 if x<180 else 255),
                ImageEnhance.Contrast(gris).enhance(2)
            )

            trabajos=[
                lambda v=v,psm=psm:_tesseract(
                    v,
                    lang="eng",
                    config=f"--oem 3 --psm {psm} -c tessedit_char_whitelist=0123456789."
                )
                for v in versiones for psm in (6,11)
            ]

            for texto in _paralelo(trabajos):
                for linea in texto.splitlines():
                    n=normalizar_numero(linea)
                    if 6<=len(n)<=12:conteo[n]+=1

            if conteo and max(conteo.values())>=3:break

        if not conteo:return None
        return max(conteo,key=lambda n:(conteo[n],len(n)))
    except Exception:
        return None
    
def extraer_cc_vieja(contenido_frente,tf,tr,nombre,apellido):
    numero=extraer_numero_cc_imagen(contenido_frente) or extraer_numero_cc(tf) or extraer_numero_cc(tr)
    fecha=extraer_fecha(tr) or extraer_fecha(tf)
    total=tf+"\n"+tr
    nc=cn=ac=ca=None
    if nombre:nc,cn=comparar_nombre_ocr(total,nombre)
    if apellido:ac,ca=comparar_nombre_ocr(total,apellido)
    return {
        "formato_cc":"vieja","tipo_documento":"CC",
        "numero_documento":numero,
        "nombre_coincide":nc,"confianza_nombre":cn,
        "apellido_coincide":ac,"confianza_apellido":ca,
        "fecha_nacimiento":fecha
    }




def es_frente_cc_nueva(texto):
    t = normalizar_texto(texto)

    return bool(
        re.search(r"\b(?:NUIP|NUP|NU1P)\b", t)
        or (
            "APELLIDOS" in t
            and "NOMBRES" in t
            and (
                "REPUBLICA DE COLOMBIA" in t
                or "EXPIRACION" in t
            )
        )
    )





def extraer_nuip_nueva(texto):
    t = normalizar_texto(texto)

    patron = r"\b(?:NUIP|NUP|NUI[P]?|NU1P)\s*[:#.]?\s*((?:\d[\s.]*){6,12})"

    m = re.search(patron, t)
    if not m:
        return None

    numero = normalizar_numero(m.group(1))
    return numero if 6 <= len(numero) <= 12 else None




def extraer_fecha_nacimiento_nueva(texto):
    t = normalizar_texto(texto)

    meses = (
        r"ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|"
        r"SEP|SEPT|OCT|NOV|DIC"
    )

    patron_fecha = (
        rf"(?<!\d)(\d{{1,2}})[\s./-]*"
        rf"({meses})[\s./-]*(\d{{4}})(?!\d)"
    )

    # Primero buscar cerca de la etiqueta de nacimiento.
    etiquetas = [
        r"FECHA\s+DE\s+NACIMIENTO",
        r"NACIMIENTO",
        r"F\s*DE\s*NACIMIENTO",
    ]

    for etiqueta in etiquetas:
        m = re.search(etiqueta, t)
        if not m:
            continue

        fragmento = t[m.end():m.end() + 90]
        fecha = re.search(patron_fecha, fragmento)

        if fecha:
            try:
                return date(
                    int(fecha.group(3)),
                    MESES[fecha.group(2)],
                    int(fecha.group(1))
                )
            except (ValueError, KeyError):
                pass

    return None


def extraer_cc_nueva(contenido_frente, contenido_reverso, tf, tr, nombre, apellido):
    # Identificar el frente independientemente del orden.
    frente = tf if es_frente_cc_nueva(tf) else tr
    reverso = tr if frente == tf else tf

    # El MRZ solo se consulta en la imagen identificada como reverso.
    contenido_mrz = contenido_reverso

    # Región del frente y MRZ del reverso son independientes: se leen a la vez.
    numero = extraer_nuip_nueva(frente)
    fecha = extraer_fecha_nacimiento_nueva(frente)
    # La lectura por regiones solo hace falta si el texto completo no dio número o fecha.
    tareas = [lambda: ejecutar_ocr_mrz(contenido_mrz) if contenido_mrz else ""]
    if not (numero and fecha):
        tareas.append(lambda: extraer_datos_frente_cc_nueva(contenido_frente))
    resultados = _paralelo(tareas)
    texto_mrz = resultados[0]
    if len(resultados) > 1:
        numero = numero or resultados[1]["numero_documento"]
        fecha = fecha or resultados[1]["fecha_nacimiento"]

    mrz = extraer_mrz(texto_mrz)

    if not numero:
        numero = mrz["numero_documento"]

    if not fecha:
        fecha = mrz["fecha_nacimiento"]

    total = frente + "\n" + reverso

    if mrz["nombres"]:
        total += "\n" + mrz["nombres"]

    if mrz["apellidos"]:
        total += "\n" + mrz["apellidos"]

    nc = cn = ac = ca = None

    if nombre:
        nc, cn = comparar_nombre_ocr(total, nombre)

    if apellido:
        ac, ca = comparar_nombre_ocr(total, apellido)

    return {
        "formato_cc": "nueva",
        "tipo_documento": "CC",
        "numero_documento": numero,
        "nombre_coincide": nc,
        "confianza_nombre": cn,
        "apellido_coincide": ac,
        "confianza_apellido": ca,
        "fecha_nacimiento": fecha,
    }




def extraer_datos_frente_cc_nueva(contenido):
    # Coordenadas relativas: (izquierda, arriba, derecha, abajo)
    # Son regiones amplias para tolerar variaciones de encuadre.
    regiones = {
        "nuip": (0.35, 0.05, 1.00, 0.42),
        "fecha": (0.20, 0.38, 1.00, 0.90),
    }

    texto_nuip = ejecutar_ocr_region(
        contenido, regiones["nuip"], psm=6
    )
    texto_fecha = ejecutar_ocr_region(
        contenido,
        (0.05, 0.25, 1.00, 0.95),
        psm=11
    )

    fecha = extraer_fecha_nacimiento_nueva(texto_fecha)

    if not fecha:
        texto_fecha_2 = ejecutar_ocr_region(
            contenido,
            (0.05, 0.25, 1.00, 0.95),
            psm=6
        )
        fecha = extraer_fecha_nacimiento_nueva(texto_fecha_2)

    return {
        "numero_documento": extraer_nuip_nueva(texto_nuip),
        "fecha_nacimiento": fecha,
    }

def extraer_datos_cc(
    contenido_frente,
    contenido_reverso=None,
    nombre_declarado=None,
    apellido_declarado=None,
):
    if contenido_reverso:
        tf, tr = _paralelo([
            lambda: ejecutar_ocr(contenido_frente),
            lambda: ejecutar_ocr(contenido_reverso),
        ])
    else:
        tf, tr = ejecutar_ocr(contenido_frente), ""

    formato = detectar_formato_cc(tf, tr)

    if formato == "nueva":
        frente_es_primero = es_frente_cc_nueva(tf)
        frente_es_segundo = es_frente_cc_nueva(tr)

        if not frente_es_primero and not frente_es_segundo:
            raise DocumentoError(
                "No se pudo identificar el frente de la cédula nueva"
            )

        reverso_real = (
            contenido_reverso
            if frente_es_primero
            else contenido_frente
        )

        texto_frente = tf if frente_es_primero else tr
        texto_reverso = tr if frente_es_primero else tf

        frente_real = (
            contenido_frente if frente_es_primero
            else contenido_reverso
        )

        return extraer_cc_nueva(
            frente_real,
            reverso_real,
            texto_frente,
            texto_reverso,
            nombre_declarado,
            apellido_declarado,
        )

    # Mantener exactamente el flujo de la cédula antigua.
    return extraer_cc_vieja(
        contenido_frente,
        tf,
        tr,
        nombre_declarado,
        apellido_declarado,
    )

def extraer_numero_pasaporte(texto):
    for p in (
        r"PASSPORT\s*(?:NO|NUMBER)?\s*[:.]?\s*([A-Z0-9]{5,15})",
        r"PASAPORTE\s*(?:NO|NUMERO)?\s*[:.]?\s*([A-Z0-9]{5,15})"
    ):
        m=re.search(p,texto.upper())
        if m:return re.sub(r"[^A-Z0-9]","",m.group(1))
    return None

def extraer_datos_documento(contenido_frente,tipo,contenido_reverso=None,nombre_declarado=None,apellido_declarado=None):
    tipo=(tipo or "").upper()

    if tipo=="CC":
        return extraer_datos_cc(
            contenido_frente,
            contenido_reverso,
            nombre_declarado,
            apellido_declarado
        )

    texto=ejecutar_ocr(contenido_frente)
    nc,cn=comparar_nombre_ocr(texto,nombre_declarado) if nombre_declarado else (None,None)
    ac,ca=comparar_nombre_ocr(texto,apellido_declarado) if apellido_declarado else (None,None)

    return {
        "tipo_documento":tipo,
        "nombre_coincide":nc,"confianza_nombre":cn,
        "apellido_coincide":ac,"confianza_apellido":ca,
        "numero_documento":extraer_numero_pasaporte(texto) if tipo=="PASAPORTE" else extraer_numero_cc(texto),
        "fecha_nacimiento":extraer_fecha(texto)
    }
