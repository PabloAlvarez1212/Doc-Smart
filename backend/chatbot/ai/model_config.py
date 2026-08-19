import os

from dotenv import load_dotenv


load_dotenv()


# Se mantiene en una variable de entorno para cambiar de modelo sin desplegar
# modificaciones de código cuando Google retire o publique nuevas versiones.
GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.5-flash-lite",
)
