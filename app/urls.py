from django.urls import path
from . import views

urlpatterns = [
    path('amazon/scrape/<str:consulta>/', views.AmazonScrapeView.as_view(), name='amazon_scrape_list_products'),
    path('alibaba/scrape/<str:consulta>/', views.AlibabaScrapeView.as_view(), name='alibaba_scrape_list_products'),
    path('alibaba/scrape/details/<str:image>/', views.scrape_alibaba_by_image, name='alibaba_scrape_image'),
    path('alibaba/budget/add/<str:url>/', views.scrape_product, name='alibaba_scrape_product'),
]