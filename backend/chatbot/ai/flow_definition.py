FLOWS = {

    "agendar_cita": {

        "tool": "agendar_cita",

        "pasos": [

            {
                "campo": "especialidad",
                "pregunta": "¿Con qué especialidad médica necesitas la cita?"
            },

            {
                "campo": "ciudad",
                "pregunta": "¿En qué ciudad deseas la cita?"
            },

            {
                "campo": "fecha",
                "pregunta": "¿Qué fecha prefieres?"
            }

        ]

    },

    "reprogramar_cita": {

        "tool": "reprogramar_cita",

        "pasos": [
            {
                "campo": "id_cita",
                "pregunta": "¿Cuál es el número de la cita que deseas reprogramar?"
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
                "campo": "id_cita",
                "pregunta": "¿Cuál es el número de la cita que deseas cancelar?"
            },
        ],

    },

}
