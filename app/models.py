
from django.db import models
from django.contrib.auth.models import User  # Si queremos asociar las listas a usuarios
from django.utils import timezone
from django.core.exceptions import ValidationError

# Modelo de Supplier
class Supplier(models.Model):
    name = models.CharField(max_length=255)
    country = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.name

class CategoryAlibaba(models.TextChoices):
    ELECTRONICA = "44"
    MODA = "3"
    CASA = "15"
    BELLEZA = "6"
    JUGUETES = "26"
    DEPORTE = "18"
    LIBROS = "2202"

# Modelo de Item en Alibaba
class ItemAlibaba(models.Model):
    title = models.CharField(max_length=255)
    imagen = models.CharField(max_length=500, default="", blank=True)
    supplier = models.ForeignKey(Supplier,on_delete=models.CASCADE)
    rating = models.DecimalField(max_digits=3, decimal_places=2, blank=True, null=True)
    min_order = models.PositiveIntegerField()
    url = models.CharField(max_length=500, default="", blank=True)
    category = models.CharField(max_length=255, choices=CategoryAlibaba.choices, blank=True, null=True)  # Opciones de categoría(Category, on_delete=models.CASCADE)

    def __str__(self):
        return str(self.title)  # Assuming 'item' is the product field

# Modelo de Item en Amazon
class CategoryAmazon(models.TextChoices):
    ELECTRONICA = "electronics"
    MODA = "fashion"
    CASA = "kitchen"
    BELLEZA = "beauty"
    JUGUETES = "toys"
    DEPORTE = "sports"
    LIBROS = "books"
    TODO = "all"

class ItemAmazon(models.Model):
    title = models.CharField(max_length=255)
    imagen = models.URLField(blank=True, null=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=255, choices=CategoryAmazon.choices, default=CategoryAmazon.TODO)  # Opciones de categoría(Category, on_delete=models.CASCADE)
    url = models.CharField(max_length=800,default="", blank=True)
    

    def __str__(self):
        return str(self.title)  # Assuming 'item' is the product field

class ProductAttribute(models.Model):
    item_amazon = models.ForeignKey(ItemAmazon, related_name='attributes', on_delete=models.CASCADE, blank=True, null=True)
    item_alibaba = models.ForeignKey(ItemAlibaba, related_name='attributes', on_delete=models.CASCADE, blank=True, null=True)
    name = models.CharField(max_length=255)
    value = models.CharField(max_length=255)

    

    def __str__(self):
        return f"{self.name}: {self.value}"


# Relación de Coincidencia entre Alibaba y Amazon
class Coincidence(models.Model):
    id_item_alibaba = models.ForeignKey(ItemAlibaba, on_delete=models.CASCADE)
    id_item_amazon = models.ForeignKey(ItemAmazon, on_delete=models.CASCADE)

# Rango de precios para un ítem
class PriceRange(models.Model):
    item = models.ForeignKey(ItemAlibaba, related_name='prices', on_delete=models.CASCADE)
    minimo_range = models.PositiveIntegerField()
    maximo_range = models.PositiveIntegerField(blank=True, null=True)

    def __str__(self):
        return f"{self.minimo_range} - {self.maximo_range}"



# Historial de Precios
class PriceHistory(models.Model):
    item_amazon = models.ForeignKey(ItemAmazon, on_delete=models.CASCADE,blank=True, null=True)
    item_alibaba = models.ForeignKey(ItemAlibaba,on_delete=models.CASCADE,blank=True, null=True)
    rango = models.ForeignKey(PriceRange,on_delete=models.CASCADE,blank=True, null=True)
    current_price = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(default=timezone.now)

    def __str__(self):
        return f"{self.current_price} - {self.date}"
    
    def last_price(self):
        last_pricehistory = self.pricehistory_set.order_by('-date').first()
        return last_pricehistory.current_price if last_pricehistory else None



class Comparacion(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255,default='Mi lista de Comparación',blank=True)
    date= models.DateTimeField(auto_now_add=True)
    items = models.ManyToManyField(ItemAmazon, related_name='comparaciones')
    
    def __str__(self):
        return self.name
    
    @property
    def n_items_total(self):
        return self.items.count()
    

# Alertas de precios
class Alert(models.Model):
    item_alibaba = models.ForeignKey(ItemAlibaba, on_delete=models.CASCADE,blank=True, null=True)
    item_amazon = models.ForeignKey(ItemAmazon, on_delete=models.CASCADE,blank=True, null=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True)
    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateField()
    min_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rango = models.ForeignKey(PriceRange, on_delete=models.CASCADE, blank=True, null=True)

    def __str__(self):
        return f"Alerta para {self.item.title} - {self.user.username}"+ f"minimo: {self.min_price}" or f"maximo: {self.max_price}"

    @property
    def item(self):
        return self.item_alibaba or self.item_amazon
    
    def clean(self):
        if self.item_alibaba and self.item_amazon:
            raise ValidationError("No se puede establecer ambos ítems al mismo tiempo.")
        if self.item_alibaba and self.max_price:
            raise ValidationError("No se puede establecer un precio máximo para un ítem de Alibaba.")
        if self.item_amazon and self.min_price:
            raise ValidationError("No se puede establecer un precio mínimo para un ítem de Amazon.")
        return super().clean()



# Modelo de Budget (Presupuesto)
class Budget(models.Model):
    name = models.CharField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True)
    date = models.DateField(auto_now_add=True)  # Usamos una fecha predeterminada
    items = models.ManyToManyField(ItemAlibaba, through='ListBudget')
    
    estado = models.CharField(
        max_length=50,
        choices=[
            ('pendiente', 'Pendiente'),
            ('ordenado', 'Ordenado'),
            ('recibido', 'Recibido')
        ],
        default='pendiente'
        )

    @property
    def n_items_total(self):
        return self.items.count()

    @property
    def shipping_cost_total(self):
        return sum((listbudget.units *listbudget.shipping_cost) for listbudget in self.listbudget_set.all())

    @property
    def total_amount(self):
       return sum(
            (listbudget.units * (listbudget.price_calculated or 0)) + 
            (listbudget.units * (listbudget.shipping_cost or 0))
            for listbudget in self.listbudget_set.all()
        )
    


    def __str__(self):
        return self.name


# Relación entre Budget e Items
class ListBudget(models.Model):
    lista = models.ForeignKey(Budget, on_delete=models.CASCADE)
    item = models.ForeignKey(ItemAlibaba, on_delete=models.CASCADE)
    units = models.PositiveIntegerField()
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return self.item.title
    
    @property
    def price_calculated(self):
        """
        Retorna el último precio (PriceHistory) para la cantidad de unidades
        dentro de un rango que coincida.
        """
        # Filtra directamente en PriceHistory un registro cuyo rango
        # cumpla con la cantidad deseada (units), y toma el más reciente.
        price_history = PriceHistory.objects.filter(
            item_alibaba=self.item,
            rango__minimo_range__lte=self.units,
            rango__maximo_range__gte=self.units
        ).order_by('-date').first()

        # Retorna el precio si existe; si no, None.
        return price_history.current_price if price_history else None
    


# Modelo de Seguimiento
class Following(models.Model):
    name = models.CharField(max_length=255)
    date = models.DateField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE,blank=True)
    items = models.ManyToManyField(ItemAlibaba, through='ListFollowing')


    @property
    def n_items_total(self):
        return self.items.count()

    def __str__(self):
        return self.name


# Relación entre Following e Items
class ListFollowing(models.Model):
    lista = models.ForeignKey(Following, on_delete=models.CASCADE)
    item = models.ForeignKey(ItemAlibaba, on_delete=models.CASCADE)

class Inventario(models.Model):
    name = models.CharField(max_length=255)
    date = models.DateField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE,blank=True)
    items = models.ManyToManyField(ItemAlibaba, through='ItemInventario')

    @property
    def n_items_total(self):
        return self.items.count()

    def __str__(self):
        return self.name
    
class ItemInventario(models.Model):
   
    item = models.ForeignKey(ItemAlibaba, on_delete=models.CASCADE)
    unidades = models.PositiveIntegerField(default=0)
    vendidas = models.PositiveIntegerField(default=0)
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2,blank=True, null=True)
    precio_compra = models.DecimalField(max_digits=10, decimal_places=2,blank=True, null=True)
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE)
    inventario = models.ForeignKey(Inventario, on_delete=models.CASCADE)
    
    def __str__(self):
        return self.item.title
    

class Incidencia(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('en_progreso', 'En progreso'),
        ('resuelta', 'Resuelta'),
        ('cerrada', 'Cerrada'),
    ]

    TIPO_CHOICES = [
        ('error', 'Error'),
        ('sugerencia', 'Sugerencia'),
        ('consulta', 'Consulta'),
        ('otro', 'Otro'),
    ]

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, blank=True)
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='otro')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.titulo} ({self.usuario.username})"