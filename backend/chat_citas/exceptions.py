class ChatError(Exception):
    def __init__(self, status, code, detail):
        super().__init__(detail)
        self.status, self.code, self.detail = status, code, detail
