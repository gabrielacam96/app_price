import textwrap
from django.http import HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User, Group
from django.db.models import Q
from django.utils import timezone
from app.utils import clean_text
from django.db.models import OuterRef, Subquery
from django.contrib.auth import get_user_model


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAdminUser


from urllib.parse import unquote
from app.ml.feature_extraction import extract_features
from app.ml.forescast_price import forecast_price_json
from app.scrappers import scrape_alibaba,scrape_amazon

from rest_framework.permissions import IsAuthenticated
from io import BytesIO
from reportlab.pdfgen import canvas
from rest_framework.decorators import action
import logging

logger = logging.getLogger(__name__)





from .serializers import (
    LoginSerializer, RegisterSerializer, SupplierSerializer, ItemAlibabaSerializer,
    ItemAmazonSerializer, ProductAttributeSerializer, CoincidenceSerializer,
    PriceRangeSerializer, PriceHistorySerializer, ComparacionSerializer,
    AlertSerializer, BudgetSerializer, ListBudgetSerializer, FollowingSerializer,
    ListFollowingSerializer,UserSerializer, ChangeGroupSerializer, InventarioSerializer, ItemInventarioSerializer,IncidenciaSerializer
)
from .models import (
    Supplier, ItemAlibaba, ItemAmazon, ProductAttribute, Coincidence, PriceRange,Inventario, ItemInventario,
    PriceHistory, Comparacion, Alert, Budget, ListBudget, Following, ListFollowing, CategoryAmazon, CategoryAlibaba,ProductAttribute,Incidencia
)

def csrf(request):
    return JsonResponse({"csrfToken": get_token(request)})

@api_view(['POST'])
def refresh_view(request):
    # Leer refresh_token desde cookies
    refresh_token = request.COOKIES.get('refresh_token', None)
    if not refresh_token:
        return Response({"error": "No refresh token"}, status=400)

    try:
        refresh = RefreshToken(refresh_token)
        new_access = refresh.access_token
    except Exception as e:
        return Response({"error": str(e)}, status=400)

    response = Response({"detail": "token refreshed"}, status=200)
    response.set_cookie(
        'access_token',
        str(new_access),
        httponly=True,
        secure=False,
        samesite='None',
        max_age=3600  # coincide con tu access token lifetime
    )
    return response

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    """
    /users/      (GET, POST)  
    /users/{pk}/ (GET, PATCH, DELETE)  
    /users/{pk}/cambiar-grupo/   (PATCH)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]          # sólo admin cambia los grupos

    @action(detail=True, methods=["patch"], url_path="cambiar-grupo")
    def cambiar_grupo(self, request, pk=None):
        """
        PATCH /users/{id}/cambiar-grupo/
        Body: {"group":"usuario_premium"}
        """
        ser = ChangeGroupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        group_name = ser.validated_data["group"]

        usuario = self.get_object()

        #quita todos los grupos al que pertenece
        usuario.groups.clear()

        group = Group.objects.get(name=group_name)
        usuario.groups.add(group)
        
        return Response(
            {"status": "ok", "new_group": group_name},
            status=status.HTTP_200_OK,
        )

    def update(self, request, *args, **kwargs):
        """
        PATCH /users/{id}/
        Actualiza los datos del usuario.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')

    if not user.check_password(old_password):
        return Response({'error': 'La contraseña actual es incorrecta'}, status=400)

    if len(new_password) < 8:
        return Response({'error': 'La nueva contraseña debe tener al menos 8 caracteres'}, status=400)

    user.set_password(new_password)
    user.save()

    return Response({'message': 'Contraseña actualizada con éxito'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scrape_amazon_products(request):
    query     = request.query_params.get('query')
    category  = request.query_params.get('category')
    tendencia = request.query_params.get('filtro')

    return scrape_amazon.scrape_amazon_products(query, category, tendencia)
# ─── vista ──────────────────────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def scrape_alibaba_products(request):
    consulta  = request.query_params.get("consulta")
    categoria = request.query_params.get("categoria")

    return scrape_alibaba.scrape_alibaba_products(consulta, categoria)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scrape_alibaba_by_image(request):
    image = request.query_params.get("image")
    image_url = unquote(image)
    return scrape_alibaba.scrape_alibaba_by_image(image_url)
    


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    user = request.user
    print("Current user:", user)
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name':user.first_name,
        'last_name':user.last_name,
        'groups': [group.name for group in user.groups.all()]
    })

class AuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data["username"]
            password = serializer.validated_data["password"]

            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)  
                
                # 1) Generar los tokens con SimpleJWT
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)

                # 2) Crear la respuesta con datos del usuario
                response = Response({
                    "username": user.username,
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name":user.last_name,
                    "groups": [group.name for group in user.groups.all()]
                }, status=status.HTTP_200_OK)

                # 3) Guardar tokens en cookies seguras y HttpOnly
                response.set_cookie(
                    key='access_token',
                    value=access_token,
                    httponly=True,
                    secure=True,
                    samesite='None',   
                    max_age=3600,       
                    path='/',           
                )
                response.set_cookie(
                    key='refresh_token',
                    value=refresh_token,
                    httponly=True,
                    secure=True,
                    samesite='None',
                    max_age=86400,     # 24 horas (igual a tu REFRESH_TOKEN_LIFETIME)
                    path='/',
                )

                return response

            return Response({"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        # Cierra sesión de Django si la hay
        logout(request)

        response = Response({"message": "Logout exitoso"}, status=status.HTTP_200_OK)

        # Borra las cookies de token
        response.delete_cookie('access_token', path='/')
        response.delete_cookie('refresh_token', path='/')
        response.delete_cookie('sessionid', path='/')  # por si usas login(request, user)

        return response

class RegisterView(APIView):
    permission_classes = [AllowAny]  # Permitir registro sin autenticación

    def post(self, request):
        """
        Registrar un nuevo usuario.
        """
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "Usuario registrado correctamente", "user": user.username}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# Metodo HTTP	URL	Acción	Método en la clase
# Get	/items_alibaba/	Listar	list(self, request)
# Post	/items_alibaba/	Crear	create(self, request)
# Get	/items_alibaba/<id>/	Obtener uno	retrieve(self, request)
# Put	/items_alibaba/<id>/	Actualizar	update(self, request)
# Delete	/items_alibaba/<id>/	Eliminar	destroy(self, request)
class ItemAlibabaViewSet(viewsets.ModelViewSet):
    queryset = ItemAlibaba.objects.all()
    serializer_class = ItemAlibabaSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        title_param = self.request.query_params.get('title')

        # Filtrar por título, si se envía ?title=...
        if title_param:
            queryset = queryset.filter(
            Q(title__iexact=title_param) | Q(title__icontains=title_param[:50])
        )
            
        return queryset



# Método HTTP	URL	Acción	Método en la clase
# GET	/items_amazon/	Listar	list(self, request)
# POST	/items_amazon/	Crear	create(self, request)
# GET	/items_amazon/<id>/	Obtener uno	retrieve(self, request)
# PUT	/items_amazon/<id>/	Actualizar	update(self, request)
# DELETE	/items_amazon/<id>/	Eliminar	destroy(self, request)

class ItemAmazonViewSet(viewsets.ModelViewSet):
    queryset = ItemAmazon.objects.all()
    serializer_class = ItemAmazonSerializer
    permission_classes = [AllowAny]  # Permitir acceso sin autenticación
    
    # Mantenemos el 'lookup_field' por defecto (pk), para detalle con /itemamazon/<id>/
    # lookup_field = 'pk' (implícito, no necesitas especificarlo si no lo cambias a 'title')

    def get_queryset(self):
        queryset = super().get_queryset()
        title_param = self.request.query_params.get('title')
        id_param = self.request.query_params.get('id')

        # Filtrar por título, si se envía ?title=...
        if title_param:
            queryset = queryset.filter(
            Q(title__iexact=title_param) | Q(title__icontains=title_param[:50])
        )

        # Filtrar por ID, si se envía ?id=...
        if id_param:
            queryset = queryset.filter(pk=id_param)

        return queryset

        
    

class ProductAttributeViewSet(viewsets.ModelViewSet):
    queryset = ProductAttribute.objects.all()
    serializer_class = ProductAttributeSerializer

class CoincidenceViewSet(viewsets.ModelViewSet):
    queryset = Coincidence.objects.all()
    serializer_class = CoincidenceSerializer

#Metodo HTTP	URL	Acción	Método en la clase
# GET	/price_range/	Listar	list(self, request)
# POST	/price_range/	Crear	create(self, request)   
# GET	/price_range/<id>/	Obtener uno	retrieve(self, request)
# PUT	/price_range/<id>/	Actualizar	update(self, request)
# DELETE /price_range/<id>/	Eliminar	destroy(self, request)

class PriceRangeViewSet(viewsets.ModelViewSet):
    queryset = PriceRange.objects.all()
    serializer_class = PriceRangeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        item_id = self.request.query_params.get("item")
        if item_id:
            return self.queryset.filter(item=item_id)
        else:
            return super().get_queryset()


 #Metodo HTTP	URL	Acción	Método en la clase
# GET	/price_history/	Listar	list(self, request)
# POST	/price_history/	Crear	create(self, request)   
# GET	/price_history/<id>/	Obtener uno	retrieve(self, request)
# PUT	/price_history/<id>/	Actualizar	update(self, request)
# DELETE	/price_history/<id>/	Eliminar	destroy(self, request)
   

class PriceHistoryViewSet(viewsets.ModelViewSet):
    queryset = PriceHistory.objects.all()
    serializer_class = PriceHistorySerializer
    permission_classes = [IsAuthenticated]


    def get_queryset(self):
        qs = super().get_queryset()
        item_amazon_id  = self.request.query_params.get("item_amazon")
        item_alibaba_id = self.request.query_params.get("item_alibaba")
        date_param      = self.request.query_params.get("date")

        if item_amazon_id:
            return qs.filter(item_amazon_id=item_amazon_id)

        if item_alibaba_id and date_param:
            # ▼ último registro por rango para ese item_alibaba
            latest_per_rango = (
                qs.filter(item_alibaba_id=item_alibaba_id, rango=OuterRef("rango"))
                .order_by("-date")          # más reciente primero
                .values("id")[:1]           # nos quedamos con su PK
            )
            return (
                qs.filter(item_alibaba_id=item_alibaba_id)
                .exclude(rango=None)
                .filter(id__in=Subquery(latest_per_rango))
                .order_by("-date")          # opcional: ya son los más recientes
            )

        if item_alibaba_id:
            return qs.filter(item_alibaba_id=item_alibaba_id)

        return qs



# método HTTP	URL	Acción	Método en la clase
# GET	/comparaciones/	Listar	list(self, request)
# POST	/comparaciones/	Crear	create(self, request)
# GET	/comparaciones/<id>/	Obtener uno	retrieve(self, request)
# PUT	/comparaciones/<id>/	Actualizar	update(self, request)
# PATCH	/comparaciones/<id>/	Actualizar parcial	partial_update()
# DELETE	/comparaciones/<id>/	Eliminar	destroy(self, request)

class ComparacionViewSet(viewsets.ModelViewSet):
    queryset = Comparacion.objects.all()
    serializer_class = ComparacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Solo mostrar las comparaciones del usuario actual
        """
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        instance = self.get_object()
        serializer.save(user=instance.user)

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Solo mostrar las alertas del usuario actual
        """
        user = self.request.user
        usuario = self.request.query_params.get('usuario')

        if usuario and user.is_staff:
            return self.queryset.filter(user=usuario)
        else:
            if user.is_staff:
                return self.queryset.all()
            else:
                return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# Método HTTP	URL	Acción	Método en la clase
# GET	/budgets/	Listar	list(self, request)
# POST	/budgets/	Crear	create(self, request)
# GET	/budgets/<id>/	Obtener uno	retrieve(self, request)
# PUT	/budgets/<id>/	Actualizar	update(self, request)
# PATCH	/budgets/<id>/	Actualizar parcial	partial_update()
# DELETE	/budgets/<id>/	Eliminar	destroy(self, request)


class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.all()
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]  # Ensure permissions allow POST requests

    def get_queryset(self):
        """
        Solo mostrar los presupuestos del usuario actual
        """
        name = self.request.query_params.get('name')
        usuario = self.request.query_params.get('usuario')
        user = self.request.user
        if usuario and user.is_staff:
             return self.queryset.filter(user=usuario)  
        else:
            if (name):
                return self.queryset.filter(user=self.request.user, name__icontains=name)
            else: 
                if user.is_staff:
                    return self.queryset.all()
                else:
                    return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


    def perform_update(self, serializer):
        instance = self.get_object()
        estado = self.request.data.get('estado', None)
        if estado is not None:
            instance.estado = estado
        serializer.save(user=instance.user)

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        budget = self.get_object()
        lb_qs = ListBudget.objects.filter(lista=budget)

        # Preparamos buffer y canvas
        buffer = BytesIO()
        p = canvas.Canvas(buffer)
        
        # --- Encabezado fijo ---
        p.setFont("Helvetica-Bold", 18)
        p.drawString(50, 820, "COSTRACK")
        p.setFont("Helvetica", 12)
        p.drawString(50, 800, "Domicilio: Universidad de Alicante")

        # Título del presupuesto
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, 780, f"Presupuesto: {budget.name}")

        # Encabezados de tabla
        y = 760
        p.setFont("Helvetica-Bold", 12)
        headers = ["Producto", "Unidades", "Coste envío", "Precio unit.", "Total"]
        col_x = [50, 300, 380, 460, 540]
        for idx, header in enumerate(headers):
            p.drawString(col_x[idx], y, header)

        # Filas de items con wrap de título
        p.setFont("Helvetica", 10)
        y -= 20
        total_general = 0
        line_height = 12
        max_chars = 30

        for lb in lb_qs:
            # Calculamos total de este ítem
            unidades = lb.units or 0
            precio_u = float(lb.price_calculated or 0)
            envio    = float(lb.shipping_cost or 0)
            total    = unidades * precio_u + envio
            total_general += total

            # Preparamos el título con wrap
            title = lb.item.title or ""
            wrapped = textwrap.wrap(title, max_chars) or [""]

            # Dibujamos líneas de título
            for i, line in enumerate(wrapped):
                p.drawString(col_x[0], y - i * line_height, line)

            # Dibujamos las demás columnas en la primera línea
            p.drawString(col_x[1], y, str(unidades))
            p.drawString(col_x[2], y, f"{envio:.2f}")
            p.drawString(col_x[3], y, f"{precio_u:.2f}")
            p.drawString(col_x[4], y, f"{total:.2f}")

            # Bajamos el cursor en función de cuántas líneas ocupó el título
            y -= max(line_height * len(wrapped), line_height)

            # Nueva página si nos quedamos sin espacio
            if y < 100:
                p.showPage()
                # Dibujar de nuevo encabezado de tabla en la nueva página
                p.setFont("Helvetica-Bold", 12)
                y = 800
                for idx, header in enumerate(headers):
                    p.drawString(col_x[idx], y, header)
                p.setFont("Helvetica", 10)
                y -= 20

        # Pie de página con total general
        if y < 100:
            p.showPage()
            y = 800
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, y - 20, f"TOTAL PRESUPUESTO: {total_general:.2f} €")

        # Finalizar PDF
        p.showPage()
        p.save()
        buffer.seek(0)

        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="presupuesto_{budget.id}.pdf"'
        return response


# Método HTTP	URL	Acción	Método en la clase
# GET	/list_budget/	Listar	list(self, request)
# POST	/list_budget/	Crear	create(self, request)
# GET	/list_budget/<id>/	Obtener uno	retrieve(self, request)
# PUT	/list_budget/<id>/	Actualizar	update(self, request)
# PATCH	/list_budget/<id>/	Actualizar parcial	partial_update()
# DELETE	/list_budget/<id>/	Eliminar	destroy(self, request)
class ListBudgetViewSet(viewsets.ModelViewSet):
    queryset = ListBudget.objects.all()
    serializer_class = ListBudgetSerializer
    permission_classes = [IsAuthenticated]
   

    def get_queryset(self):
        lista_id = self.request.query_params.get('lista')  # `lista` viene del nombre del campo FK
        
        if (lista_id):
            return self.queryset.filter(lista_id=lista_id)
        return self.queryset




# Método HTTP	URL	Acción	Método en la clase
# GET	/following/	Listar	list(self, request)
# POST	/following/	Crear	create(self, request)
# GET	/following/<id>/	Obtener uno	retrieve(self, request) 
# PUT	/following/<id>/	Actualizar	update(self, request)
# PATCH	/following/<id>/	Actualizar parcial	partial_update()
# DELETE	/following/<id>/	Eliminar	destroy(self, request)
class FollowingViewSet(viewsets.ModelViewSet):
    queryset = Following.objects.all()  # Define el queryset aquí
    serializer_class = FollowingSerializer
    permission_classes = [IsAuthenticated]


    def get_queryset(self):
        """
        Si es admin, devuelve todos los seguimientos.
        Si no, solo devuelve los seguimientos del usuario autenticado.
        """
        user = self.request.user
        list_name = self.request.query_params.get('name')
        usuario = self.request.query_params.get('usuario')

        if usuario and user.is_staff:
            return self.queryset.filter(user=usuario)
        else:
            if user.is_staff:  # Verifica si el usuario es admin
                return self.queryset.all()
            else:
                if list_name:
                    return self.queryset.filter(user=user, name=list_name)
                return self.queryset.filter(user=user)

    def perform_create(self, serializer):
        """
        Asignar automáticamente el usuario autenticado al crear.
        """
        serializer.save(user=self.request.user)


# Metodo HTTP	URL	Acción	Método en la clase
# GET	/list_following/	Listar	list(self, request)
# POST	/list_following/	Crear	create(self, request)
# GET	/list_following/<id>/	Obtener uno	retrieve(self, request)
# PUT	/list_following/<id>/	Actualizar	update(self, request)
# PATCH	/list_following/<id>/	Actualizar parcial	partial_update()
# DELETE	/list_following/<id>/	Eliminar	destroy(self, request)

class ListFollowingViewSet(viewsets.ModelViewSet):
    queryset = ListFollowing.objects.all()
    serializer_class = ListFollowingSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        """
        DELETE /app/lists_following/?lista=7&item=35
        O bien DELETE /app/lists_following/{pk}/
        """
        lista = request.query_params.get('lista')
        item  = request.query_params.get('item')

        if lista is not None and item is not None:
            # Borrado por lista+item
            qs = self.get_queryset().filter(lista=lista, item=item)
            if not qs.exists():
                return Response(
                    {"error": "No existe esa relación lista–item"},
                    status=status.HTTP_404_NOT_FOUND
                )
            qs.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # Fallback: borrado por PK
        return super().destroy(request, *args, **kwargs)


# Metodo HTTP	URL	Acción	Método en la clase
# GET	/suppliers/	Listar	list(self, request)
# POST	/suppliers/	Crear	create(self, request)
# GET	/suppliers/<id>/	Obtener uno	retrieve(self, request)
# PUT	/suppliers/<id>/	Actualizar	update(self, request)
# PATCH	/suppliers/<id>/	Actualizar parcial	partial_update()
# DELETE	/suppliers/<id>/	Eliminar	destroy(self, request)
class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]



class CategoryAmazonAPIView(APIView):
    
    permission_classes = [IsAuthenticated]  # Puedes limitar acceso si quieres

    def get(self, request):
        categories = [
            {"value": cat.value, "label": cat.label}
            for cat in CategoryAmazon
        ]
        return Response(categories)
    
class CategoryAlibabaAPIView(APIView):
    permission_classes = [IsAuthenticated]  # Puedes limitar acceso si quieres

    def get(self, request):
        categories = [
            {"value": cat.value, "label": cat.label}
            for cat in CategoryAlibaba
        ]
        return Response(categories) 

class CheckAlertsAPIView(APIView):
    permission_classes=[IsAuthenticated]
    """
    Vista DRF que chequea TODAS las alertas definidas en el modelo Alert
    y devuelve un JSON con las que se cumplen actualmente.
    """

    def get(self, request, *args, **kwargs):
        hoy = timezone.now().date()
        all_alerts = Alert.objects.filter(user=request.user)
        resultados = []

        for alerta in all_alerts:
            if hoy <= alerta.end_date:
                if alerta.item_alibaba:
                    # Verificar si la alerta de Alibaba se cumple
                    result = self.check_alibaba_alert(alerta)
                    if result:
                        resultados.append(result)
                elif alerta.item_amazon:
                    # Verificar si la alerta de Amazon se cumple
                    result = self.check_amazon_alert(alerta)
                    if result:
                        resultados.append(result)

        return Response(resultados, status=status.HTTP_200_OK)


    def check_alibaba_alert(self, alerta):
        """
        Verifica si la alerta de Alibaba se cumple:
        - Se busca el último registro de PriceHistory para item_alibaba y rango
        - Se compara con 'min_price'
        - Retorna un dict si se cumple, o None si no.
        """
        if not alerta.min_price:
            return None  # si no hay min_price no hay nada que chequear

        # Filtro por item_alibaba y rango (si existe). 
        # Si la alerta guarda la FK 'rango', podemos usar alerta.rango_id.
        ph_qs = PriceHistory.objects.filter(item_alibaba=alerta.item_alibaba)
        if alerta.rango:
            ph_qs = ph_qs.filter(rango=alerta.rango)

       

        # Obtener el más reciente (fecha mayor)
        ph = ph_qs.order_by('-date').first()
        if not ph:
            return None
       
        # Comparar
        if ph.current_price < alerta.min_price:
            
            return {
                "alert_id": alerta.pk,
                "item_alibaba": alerta.item_alibaba.pk,
                "mensaje": (
                    f"{alerta.item_alibaba.title}: Precio actual ({ph.current_price}) "
                    f"es menor que min_price ({alerta.min_price})."
                )
            }

        return None


    def check_amazon_alert(self, alerta):
        """
        Verifica si la alerta de Amazon se cumple:
        - Se busca el último registro de PriceHistory para item_amazon
        - Se compara con 'max_price'
        - Retorna un dict si se cumple, o None si no.
        """
        if not alerta.max_price:
            return None

        # Filtro por item_amazon
        ph_qs = PriceHistory.objects.filter(item_amazon=alerta.item_amazon)
        ph = ph_qs.order_by('-date').first()
        if not ph:
            return None

        if ph.current_price > alerta.max_price:
            return {
                "alert_id": alerta.pk,
                "item_amazon": alerta.item_amazon.pk,
                "mensaje": (
                    f"{alerta.item_amazon.title}: Precio actual ({ph.current_price}) "
                    f"excede max_price ({alerta.max_price})."
                )
            }

        return None


class ProductAttributesViewSet(viewsets.ModelViewSet):
    queryset = ProductAttribute.objects.all()
    serializer_class = ProductAttributeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        item_amazon_id = self.request.query_params.get('item_amazon')
        item_alibaba_id = self.request.query_params.get('item_alibaba')

        if item_amazon_id:
            queryset = queryset.filter(item_amazon_id=item_amazon_id)
        elif item_alibaba_id:
            queryset = queryset.filter(item_alibaba_id=item_alibaba_id)

        return queryset


@api_view(['GET'])
def compare_items(request):
    """
    GET /api/compare-items/?item1=37&item2=42
    Opcional: &item2_url=https://... de Alibaba
    """
    item1_id   = request.query_params.get('item1')
    item2_id   = request.query_params.get('item2')
    item2_url  = request.query_params.get('item2_url')

    if not item1_id or not (item2_id or item2_url):
        return Response({'error': 'Faltan parámetros item1 o item2'}, status=400)

    # 1) Atributos del item1 (Amazon)
    qs1   = ProductAttribute.objects.filter(item_amazon_id=item1_id)
    attrs1 = {a.name: a.value for a in qs1}


    # 2) Atributos del item2 (Alibaba o BD)
    if item2_url:
        result = scrape_alibaba.scrape_alibaba_attributes(item2_url)
        raw_attrs = result.get('attributes', [])
        attrs2 = {clean_text(k): clean_text(v) for k, v in raw_attrs}
    else:
        qs2 = ProductAttribute.objects.filter(item_alibaba_id=item2_id)
        attrs2 = {clean_text(a.name): clean_text(a.value) for a in qs2}

    # 3) Calcular features y similitud global
    features = extract_features(attrs1, attrs2)

    return Response({
        'attrs1': attrs1,
        'attrs2': attrs2,
        'features': features,
    })



class ItemInventarioViewSet(viewsets.ModelViewSet):
    queryset = ItemInventario.objects.all()
    serializer_class = ItemInventarioSerializer
    permission_classes = [IsAuthenticated]

class IncidenciaViewSet(viewsets.ModelViewSet):
    queryset = Incidencia.objects.all()
    serializer_class = IncidenciaSerializer 




class PriceForecastView(APIView):
    def get(self, request):
        id_amazon = request.query_params.get('id_item_amazon')
        id_alibaba = request.query_params.get('id_item_alibaba')
        id_rango_alibaba = request.query_params.get('id_rango')

        if not id_amazon and not id_alibaba:
            return Response(
                {"error": "Debe proporcionar al menos un id_amazon o id_alibaba"},
                status=status.HTTP_400_BAD_REQUEST
            )
        


        response = {}

        if id_amazon:
            data = PriceHistory.objects.filter(
                item_amazon=id_amazon
            ).values('current_price', 'date')
            response['amazon'] = forecast_price_json(list(data))

        if id_alibaba:
            data = PriceHistory.objects.filter(
                item_alibaba=id_alibaba
            ).values('current_price', 'date')
            response['alibaba'] = forecast_price_json(list(data))
        elif id_rango_alibaba!= None:
            data = PriceHistory.objects.filter(
                item_alibaba=id_alibaba,
                rango=id_rango_alibaba
            ).values('current_price', 'date')
            response['alibaba'] = forecast_price_json(list(data))

        return Response(response)
