from django.urls import path, include
from .views import *
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet)
router.register(r'items_amazon', ItemAmazonViewSet)
router.register(r'items_alibaba', ItemAlibabaViewSet)
router.register(r'budgets', BudgetViewSet)
router.register(r'list_budget', ListBudgetViewSet)
router.register(r'following', FollowingViewSet)
router.register(r'lists_following', ListFollowingViewSet)
router.register(r'alerts', AlertViewSet)
router.register(r'comparaciones', ComparacionViewSet)
router.register(r'coincidence',CoincidenceViewSet)
router.register(r'price_history', PriceHistoryViewSet)
router.register(r'price_range', PriceRangeViewSet)
router.register(r'product_atributes', ProductAttributesViewSet)
router.register(r'users', UserViewSet),
router.register(r'items-inventario', ItemInventarioViewSet)
router.register(r'incidencias', IncidenciaViewSet)

urlpatterns = [
    path('amazon/scrape/', scrape_amazon_products, name='amazon_scrape_list_products'),
    path('alibaba/scrape/', scrape_alibaba_products, name='alibaba_scrape_list_products'),
    path('alibaba/scrape/image/', scrape_alibaba_by_image, name='alibaba_scrape_image'),  # no se usa en el frontend 
    path('check-alerts/', CheckAlertsAPIView.as_view(), name='check_alerts'),
    path("login/", AuthView.as_view(), name="login"),   # Iniciar sesión , cerrar sesion
    path("register/", RegisterView.as_view(), name="register"),  # Registro de usuarios)
    path('amazon/categories/', CategoryAmazonAPIView.as_view(), name='category-amazon-list'), # Listado de categorías de items de Amazon
    path('alibaba/categories/', CategoryAlibabaAPIView.as_view(), name='category-alibaba-list'), # Listado de categorías de items de Alibaba
    path('compare-items/', compare_items, name='compare-items'),
    path('', include(router.urls)),
    path("csrf/", csrf, name="csrf"),
    path("current_user/", current_user_view, name='current_user'),
    path("refresh_token/", refresh_view, name='refresh_token'),
    path("change-password/", change_password, name='change-password'),
    path("forecast-price/", PriceForecastView.as_view(), name='forecast-price'), #Predicción de precios de un producto en base a su historial de precios

]

