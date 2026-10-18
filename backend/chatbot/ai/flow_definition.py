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
                "campo": "fecha",
                "alternativas": ["fecha", "fecha_programada"],
                "pregunta": "¿Qué fecha y hora prefieres?"
            }

        ]

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
