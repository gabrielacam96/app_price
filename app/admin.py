from django.contrib import admin
from .models import (
    Supplier, ItemAlibaba, ItemAmazon, ProductAttribute, Coincidence, PriceRange, PriceHistory,
    Comparacion, Alert, Budget, ListBudget, Following, ListFollowing,Inventario, ItemInventario
)



@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'country',)
    search_fields = ('name', 'country')

@admin.register(ItemAlibaba)
class ItemAlibabaAdmin(admin.ModelAdmin):
    list_display = ('title', 'supplier', 'rating', 'min_order')
    search_fields = ('title', 'supplier__name')

@admin.register(ItemAmazon)
class ItemAmazonAdmin(admin.ModelAdmin):
    list_display = ('title', 'rating', 'price', 'category')
    search_fields = ('title', 'category')

@admin.register(ProductAttribute)
class ProductAttributeAdmin(admin.ModelAdmin):
    list_display = ('name', 'value', 'item_amazon__id', 'item_alibaba__id')
    search_fields = ('item_amazon__id', 'item_alibaba__id')

@admin.register(Coincidence)
class CoincidenceAdmin(admin.ModelAdmin):
    list_display = ('id_item_alibaba', 'id_item_amazon')
    search_fields = ('id_item_alibaba__title', 'id_item_amazon__title')

@admin.register(PriceRange)
class PriceRangeAdmin(admin.ModelAdmin):
    list_display = ('item__id', 'minimo_range', 'maximo_range')
    search_fields = ('item__id',)

@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ('current_price', 'date', 'item_amazon__id', 'item_alibaba__id')
    search_fields = ('date','item_amazon__id', 'item_alibaba__id')


@admin.register(Comparacion)
class ComparacionAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'date','n_items_total')
    search_fields = ('name', 'user__username')

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('item', 'start_date', 'end_date', 'min_price', 'max_price')
    search_fields = ('item__title',)

@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'date','n_items_total','total_amount','shipping_cost_total')
    search_fields = ('name', 'user__username')

@admin.register(ListBudget)
class ListBudgetAdmin(admin.ModelAdmin):
    list_display = ('lista', 'item', 'units', 'shipping_cost','price_calculated')
    search_fields = ('lista__name', 'item__title')

@admin.register(Following)
class FollowingAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'date','n_items_total')
    search_fields = ('name', 'user__username')

@admin.register(ListFollowing)
class ListFollowingAdmin(admin.ModelAdmin):
    list_display = ('lista', 'item')
    search_fields = ('lista__name', 'item__title')
@admin.register(Inventario)
class InventarioAdmin(admin.ModelAdmin):
    list_display = ('name', 'date', 'user', 'n_items_total')
    search_fields = ('name', 'user__username')

@admin.register(ItemInventario)
class ItemInventarioAdmin(admin.ModelAdmin):
    list_display = ('item', 'unidades', 'precio_venta', 'precio_compra', 'budget')
    search_fields = ('item__title', 'budget__name')

class IncidenciaAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'descripcion', 'fecha', 'usuario', 'estado')
    search_fields = ('titulo', 'descripcion', 'usuario__username')