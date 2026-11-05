FLOWS = {

    "agendar_cita": {

        "tool": "agendar_cita",

        "pasos": [

            {
                "campo": "especialidad",
                "alternativas": ["id_medico", "nombre", "especialidad"],
                "pregunta": "¿Con qué especialidad médica necesitas la cita?"
            },

            {
                "campo": "ciudad",
                "alternativas": ["ciudad", "ciudad_omitida", "id_medico", "nombre", "apellido"],
                "pregunta": "¿En qué ciudad prefieres la cita? Puedes decir «cualquiera» si no importa."
            },

            {
                "campo": "fecha",
                "alternativas": ["fecha", "fecha_programada"],
                "pregunta": "¿Qué fecha y hora prefieres?"
            },

            {
                # Solo se pide tras comprobar que el horario realmente existe.
                "campo": "motivo_consulta",
                "tras": "horario_verificado",
                "pregunta": "¿Cuál es el motivo de tu consulta?",
            }

        ]

    },

    "buscar_medico": {

        "tool": "buscar_medico",

        "pasos": [
            {
                "campo": "ciudad",
                "alternativas": ["ciudad", "ciudad_omitida", "nombre", "apellido"],
                "pregunta": "¿En qué ciudad quieres buscar? Puedes decir «cualquiera» para ver todas."
            },
        ],

    },

    "reprogramar_cita": {

        "tool": "reprogramar_cita",

        "pasos": [
            {
                "campo": "codigo_cita",
                "pregunta": "¿Cuál es el código de la cita que deseas reprogramar?"
                "Por ejemplo, DOC-A7B2C9D4"
            },
            {
                "campo": "fecha",
                "pregunta": "¿Para qué nueva fecha y hora deseas reprogramarla?"
            },
        ],

    },

    "cancelar_cita": {
        "tool": "cancelar_cita",
        "pasos": [
            {
                "campo": "codigo_cita",
                "pregunta": (
                    "¿Cuál es el código de la cita que deseas cancelar?"
                ),
            },
            {
                "campo": "motivo_cancelacion",
                "pregunta": (
                    "¿Cuál es el motivo de la cancelación? "
                    "Puedes escribir hasta 500 caracteres."
                ),
            },
        ],
    },

}
