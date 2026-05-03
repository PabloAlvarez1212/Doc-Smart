from rest_framework import serializers
from .models import Cita
from .models import RecordatorioCita

class CitaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cita
        fields = '__all__'

class RecordatorioSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecordatorioCita
        fields = '__all__'  