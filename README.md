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

## 📁 Estructura del proyecto

```bash
/frontend/                  # Código del frontend (React)
│
├── pages/                  # Vistas principales (login, presupuestos, favoritos, alertas, etc.)
├── components/             # Componentes reutilizables (tablas, modales, botones)
├── context/                # Contexto global de autenticación
├── hooks/                  # Custom hooks (axiosPrivate, useAuth)
├── middleware/             # Protección de rutas y control de acceso
├── theme/                  # Estilos globales con MUI
└── App.js                  # Enrutador y Layout principal

/backend/                   # Código del backend (Django)
│
├── app/                    # Lógica de negocio principal
│   ├── models.py           # Modelos: presupuestos, alertas, inventario, productos, etc.
│   ├── serializers.py      # Serializadores para la API REST
│   ├── signals.py          # Lógica automática de scraping y almacenamiento
│   ├── views.py            # Endpoints y lógica de negocio
│   ├── urls.py             # Rutas del backend
│   └── permissions.py      # Restricciones por roles
│
├── scrappers/              # Scripts de scraping para Amazon y Alibaba
├── ml/                     # Predicción de precios con series temporales
├── settings.py             # Configuración general
└── manage.py               # Comando principal de Django
