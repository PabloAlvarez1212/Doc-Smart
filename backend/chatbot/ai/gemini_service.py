import os
import time

from dotenv import load_dotenv
from google import genai
from google.genai.types import GenerateContentConfig

from chatbot.ai.prompts import SYSTEM_PROMPT

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def preguntar_gemini(historial):

    ultimo_error = None

    for intento in range(3):

        try:

            response = client.models.generate_content(

                model="gemini-2.5-lite",

                contents=historial,

                config=GenerateContentConfig(

                    system_instruction=SYSTEM_PROMPT,

                    temperature=0.6,

                    max_output_tokens=1000,

                )

            )

            return response.text

        except Exception as e:

            ultimo_error = e
            print(f"Intento {intento + 1}: {e}")

            time.sleep(2)

    print(f"Error definitivo Gemini: {ultimo_error}")

    return (
        "En este momento el servicio de inteligencia artificial está muy ocupado. "
        "Por favor intenta nuevamente en unos segundos."
    )
