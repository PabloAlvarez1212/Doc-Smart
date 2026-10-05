import io,re,unicodedata,os,pytesseract
from datetime import date
from difflib import SequenceMatcher
from PIL import Image,ImageOps,ImageEnhance,ImageFilter

if os.name=="nt":
    pytesseract.pytesseract.tesseract_cmd=r"C:\Program Files\Tesseract-OCR\tesseract.exe"

class DocumentoError(Exception):pass

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
        img=Image.open(io.BytesIO(contenido)).convert("RGB")
        if img.height>img.width:img=img.rotate(90,expand=True)
        w,h=img.size
        img=img.resize((w*2,h*2),Image.Resampling.LANCZOS)
        img=ImageOps.autocontrast(ImageOps.grayscale(img))
        return ImageEnhance.Contrast(img).enhance(1.6).filter(ImageFilter.SHARPEN)
    except Exception:raise DocumentoError("No fue posible abrir el documento")

def ejecutar_ocr(contenido):
    img=preparar_imagen(contenido)
    try:r=[pytesseract.image_to_string(img,lang="spa+eng",config=f"--oem 3 --psm {p}").strip() for p in (6,11)]
    except pytesseract.TesseractNotFoundError:raise DocumentoError("Tesseract no está instalado o configurado")
    except pytesseract.TesseractError:raise DocumentoError("No fue posible ejecutar el OCR")
    r=[x for x in r if x]
    if not r:raise DocumentoError("No se pudo leer el documento")
    return max(r,key=len)

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
        img=Image.open(io.BytesIO(contenido)).convert("RGB")
        if img.height>img.width:img=img.rotate(90,expand=True)
        img=ImageOps.autocontrast(ImageOps.grayscale(img))
        w,h=img.size
        regiones=[img.crop((0,int(h*.55),w,h)),img]
        textos=[]
        for r in regiones:
            rw,rh=r.size
            r=r.resize((rw*2,rh*2),Image.Resampling.LANCZOS)
            for p in (6,11):
                t=pytesseract.image_to_string(r,lang="eng",config=f"--oem 3 --psm {p}").strip()
                if t:textos.append(t)
        return "\n".join(textos)
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

def extraer_cc_vieja(tf,tr,nombre,apellido):
    numero=extraer_numero_cc(tf) or extraer_numero_cc(tr)
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

def extraer_cc_nueva(contenido_reverso,tf,tr,nombre,apellido):
    mrz=extraer_mrz(ejecutar_ocr_mrz(contenido_reverso)) if contenido_reverso else {
        "numero_documento":None,"fecha_nacimiento":None,"nombres":None,"apellidos":None
    }

    numero=extraer_numero_cc(tf) or mrz["numero_documento"] or extraer_numero_cc(tr)
    fecha=extraer_fecha(tf) or mrz["fecha_nacimiento"] or extraer_fecha(tr)

    total=tf+"\n"+tr
    if mrz["nombres"]:total+="\n"+mrz["nombres"]
    if mrz["apellidos"]:total+="\n"+mrz["apellidos"]

    nc=cn=ac=ca=None
    if nombre:nc,cn=comparar_nombre_ocr(total,nombre)
    if apellido:ac,ca=comparar_nombre_ocr(total,apellido)

    return {
        "formato_cc":"nueva","tipo_documento":"CC",
        "numero_documento":numero,
        "nombre_coincide":nc,"confianza_nombre":cn,
        "apellido_coincide":ac,"confianza_apellido":ca,
        "fecha_nacimiento":fecha
    }

def extraer_datos_cc(contenido_frente,contenido_reverso=None,nombre_declarado=None,apellido_declarado=None):
    tf=ejecutar_ocr(contenido_frente)
    tr=ejecutar_ocr(contenido_reverso) if contenido_reverso else ""
    formato=detectar_formato_cc(tf,tr)

    if formato=="nueva":
        return extraer_cc_nueva(
            contenido_reverso,tf,tr,
            nombre_declarado,apellido_declarado
        )

    return extraer_cc_vieja(
        tf,tr,
        nombre_declarado,apellido_declarado
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
