
from django.contrib.auth.models import User
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Supplier, ItemAlibaba, ItemAmazon, ProductAttribute, Coincidence, PriceRange, PriceHistory,
    Comparacion, Alert, Budget, ListBudget, Following, ListFollowing, CategoryAmazon, CategoryAlibaba
)

class ChangeGroupSerializer(serializers.Serializer):
    group = serializers.ChoiceField(choices=["usuario_basico", "usuario_premium"])

class UserSerializer(serializers.ModelSerializer):   #  ←  importante
    class Meta:
        model  = User
        fields = ("id", "username", "first_name",
                  "last_name", "email", "is_active", "groups")
        read_only_fields = ("id", "groups")   # o los que quieras
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "password", "password_confirm"]

    def validate(self, data):
        """
        Validar que las contraseñas coincidan.
        """
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
        return data

    def create(self, validated_data):
        """
        Crear un nuevo usuario con contraseña encriptada.
        """
        validated_data.pop("password_confirm")  # Removemos la confirmación de la contraseña
        user = User.objects.create_user(**validated_data)
        return user

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'
class PriceRangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceRange
        fields = '__all__'

class ItemAlibabaSerializer(serializers.ModelSerializer):
    supplier_name = serializers.ReadOnlyField(source='supplier.name')

    class Meta:
        model = ItemAlibaba
        fields = ['id','title','imagen','supplier','supplier_name','rating','min_order','url','category']


class ProductAttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductAttribute
        fields = '__all__'

class ItemAmazonSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = ItemAmazon
        fields = '__all__'

class CoincidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coincidence
        fields = '__all__'


class PriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceHistory
        fields = '__all__'


class ComparacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comparacion
        fields = '__all__'
        read_only_fields = ['user'] 

class AlertSerializer(serializers.ModelSerializer):
    item_alibaba_title = serializers.SerializerMethodField()
    item_amazon_title = serializers.SerializerMethodField()

    def get_item_alibaba_title(self, obj):
        if obj.item_alibaba:
            return obj.item_alibaba.title  # Asumiendo que `ItemAlibaba` tiene un campo `title`
        return None

    def get_item_amazon_title(self, obj):
        if obj.item_amazon:
            return obj.item_amazon.title  # Asumiendo que `ItemAmazon` tiene un campo `title`
        return None
    
    class Meta:
        model = Alert
        fields = '__all__'

class ListBudgetSerializer(serializers.ModelSerializer):
    price_calculated = serializers.SerializerMethodField()
    item_name = serializers.ReadOnlyField(source='item.title')
    class Meta:
        model = ListBudget
        fields = ['id','lista','item','item_name','units', 'shipping_cost', 'price_calculated']

    def get_price_calculated(self, obj):
        price_calculated = obj.price_calculated
        if callable(price_calculated):
            return price_calculated()
        return price_calculated
    
class BudgetSerializer(serializers.ModelSerializer):
    n_items_total = serializers.ReadOnlyField()
    shipping_cost_total = serializers.ReadOnlyField()
    total_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = Budget
        fields = ['id','name', 'user', 'date','n_items_total','total_amount','shipping_cost_total','items']

class ListFollowingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListFollowing
        fields = '__all__'

class FollowingSerializer(serializers.ModelSerializer):
    n_items_total = serializers.ReadOnlyField()
    
    class Meta:
        model = Following
        fields = '__all__'
