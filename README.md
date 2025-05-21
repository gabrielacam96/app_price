# Plataforma de Comparación de Precios entre Amazon y Proveedores Mayoristas

Este proyecto es una aplicación web full-stack orientada a ayudar a emprendedores y autónomos a **identificar oportunidades de reventa** mediante la comparación de precios entre productos de **Amazon** y proveedores como **Alibaba**.

La plataforma permite buscar productos, visualizar su historial de precios, establecer alertas, gestionar presupuestos de compra, administrar inventario y exportar resultados en PDF. También incluye funcionalidades avanzadas como scraping automatizado y predicción de precios basada en series temporales.

## 🌐 Tecnologías utilizadas

- **Frontend:** React + Vite + Material UI (MUI)
- **Backend:** Django + Django REST Framework
- **Scraping:** Selenium + BeautifulSoup
- **Base de datos:** PostgreSQL (RDS)
- **Autenticación:** JWT + Cookies HttpOnly

---

## 📁 Estructura del proyecto

/frontend/ # Código del frontend (React)
├── pages/ # Vistas principales (login, presupuestos, favoritos, alertas, etc.)
├── components/ # Componentes reutilizables (tablas, modales, botones)
├── context/ # Contexto global de autenticación
├── hooks/ # Custom hooks (axiosPrivate, useAuth, etc.)
├── middleware/ # Rutas protegidas y control de acceso
├── theme/ # Estilos globales
└── App.js # Enrutador principal y layout base

/backend/ # Código del backend (Django)
├── app/ # Lógica de negocio principal (modelos, views, serializers, señales)
│ ├── models.py # Modelos como ItemAlibaba, Budget, Inventario, etc.
│ ├── serializers.py # Serializadores de Django REST Framework
│ ├── signals.py # Lógica para scraping y generación automática de datos
│ ├── views.py # Vistas API (CRUD, búsquedas, alertas)
│ ├── urls.py # Rutas API REST
│ └── permissions.py # Roles y restricciones (admin, premium, básico)
├── scrappers/ # Scripts de scraping de Amazon y Alibaba
├── ml/ # Algoritmos de predicción de precios (series temporales)
├── settings.py # Configuración general del proyecto
└── manage.py # Ejecutable de Django
