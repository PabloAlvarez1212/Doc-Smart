class RouterDecision:

    def __init__(
        self,
        tool=False,
        tool_name=None,
        parametros=None,
        respuesta=None,
        usa_flujo=False,
        iniciar_flujo=None,
    ):

        self.tool = tool
        self.tool_name = tool_name
        self.parametros = parametros or {}
        self.respuesta = respuesta

        self.usa_flujo = usa_flujo
        self.iniciar_flujo = iniciar_flujo

    @property
    def usa_tool(self):
        return self.tool