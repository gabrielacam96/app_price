import React, { useState, useEffect } from 'react'; 
import ProductTable from '../components/ProducTable';
import {
  Container,
  Grid,
  Box,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  CardMedia,
  Rating,
  Alert,
} from '@mui/material';
import axiosPrivate from '../hooks/axiosPrivate';
import { useLocation } from 'react-router-dom';
import LoaderBarras from './loaders/loaderBarras';
import SearchIcon from '@mui/icons-material/Search';

function SearchProduct() {
  const location = useLocation();
  const producto = location.state?.productCompare; // Obtener el producto de la ubicación
  const [alibabaProducts, setAlibabaProducts] = useState([]);
  const [productosAlibabaFiltrados,setProductosAlibabaFiltrados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProductCompare, setSelectedProductCompare] = useState('');
  const [productsCompare, setProductsCompare] = useState([]);
  const [OpenDialogAddBudget, setOpenDialogAddBudget] = useState(false);
  const [OpenDialogAddListSeguimiento, setOpenDialogAddListSeguimiento] = useState(false);
  const [showDialogOpen, setShowDialogOpen] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newListSeguimientoName, setNewListSeguimientoName] = useState('');
  const [presupuestos, setPresupuestos] = useState([]);
  const [product, setProduct] = useState({});
  const [selectedListSeguimiento, setSelectedListSeguimiento] = useState('');
  const [showListSeguimiento, setShowListSeguimiento] = useState(false);
  const [lists_Seguimiento, setLists_Seguimiento] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState('');
  const [unitsProduct, setUnitsProduct] = useState("");
  const [category, setCategory] = useState(null); //categoría de productos seleccionada
  const [categories, setCategories] = useState([]); //categorías de productos
  const [mode, setMode] = useState(null); //buscar por"product", "benefit""
  const [productQuery, setProductQuery] = useState("");
  const [margen, setMargen] = useState(null); // margen de beneficio seleccionado
  const margenes = [0, 5, 10, 15, 20, 25, 30]; // Opciones de márgenes de beneficio
  const [error, setError] = useState(null); // Estado para manejar errores
  const [warning, setWarning] = useState(null); // Estado para manejar advertencias
  const [success, setSuccess]=useState(null); // Estado para manejar mensajes de éxito

  //espacio para logs
  console.log("Producto recibido:", producto); // Verificar el producto recibido
  console.log("category:", category); // Verificar la categoría seleccionada
  console.log("margen:", margen); // Verificar el margen seleccionado
  console.log("query:", productQuery); // Verificar la consulta del producto
  console.log("selectedProductCompare:", selectedProductCompare); // Verificar el producto seleccionado para comparar
  console.log("productosAlibabaFiltrados:", productosAlibabaFiltrados); // Verificar los productos de Alibaba filtrados
  const handleSelectedBudget = (budget) => {
    setSelectedBudget(budget);
  };

  
  // Comprobar si hay un producto pasado por props
  useEffect(() => {
    if (producto) {
      setSelectedProductCompare(producto);
    }
  }, [producto]);

  useEffect(() => {
    if (selectedProductCompare !== '') {
      // Llamar a la función para obtener los productos de Alibaba
      AxiosProductsAlibaba();
    } else {
      AxiosProductCompare();
    }
  }, [selectedProductCompare]);

  useEffect(() => {

      getCategoriasAlibaba();
    
  }, [mode]);

  // Obtener las categorías de Alibaba al cargar el componente
  const getCategoriasAlibaba = async () => {
    try {
      const response = await axiosPrivate.get("/alibaba/categories/");
      console.log("Categorias de Alibaba:", response.data);
      setCategories(response.data);
    } catch (error) {
      console.error("Error al obtener las categorías de Alibaba:", error);
    }
  };
  const handleSaveNewBudget = async () => {
    //primero vemos si existe el proveedor, si no existe lo creamos
    const responseProveedor = await axiosPrivate.get(`/suppliers/`);
    const proveedor = responseProveedor.data.find(proveedor => proveedor.name === product.empresa);
    if (!proveedor) {
      // El proveedor no existe, lo creamos
      await axiosPrivate.post(`/suppliers/`, {
        name: product.empresa,
        country: "China",
      })
    }
    //obtemosel id del proveedor
    const responseProveedorId = await axiosPrivate.get(`/suppliers/`);
    const proveedorId = responseProveedorId.data.find(proveedor => proveedor.name === product.empresa);
    //comprobamos si el item existe, si no existe lo creamos
    const responseItem = await axiosPrivate.get(`/items_alibaba/?title=${product.titulo}`);
    const item = responseItem.data[0];
    const categoria = getCategory(selectedProductCompare.category)
    if (!item || item.length === 0) {
      // El item no existe, lo creamos
        await axiosPrivate.post(`/items_alibaba/`, {
          title: product.titulo,
          image: product.imagen,
          rating: product.rating,
          price: product.precio,
          url: product.url,
          supplier: proveedorId.id,
          category: categoria,
        });
      console.log("Guardando nuevo item...");
    }
    
    // llamar api para guardar item en el nuevo presupuesto
    await axiosPrivate.post(`/budgets/`, {
      name: newBudgetName,
      items: [item.id],
    });
    console.log("Guardando nuevo item al nuevo presupuesto...");
  };
  
  const handleSaveItemBudget = async () => {
    //primero ver si el item no existe , si no existe lo creamos , si existe sacamos su id
    const response = await axiosPrivate.get(`/items_alibaba/?title=${product.titulo}`);
    let item = response.data[0]
    if (!item || item.length === 0) {
      // El item no existe, lo creamos
      //primero vemos si existe el proveedor, si no existe lo creamos
      const responseProveedor = await axiosPrivate.get(`/suppliers/`);
      const proveedor = responseProveedor.data.find(proveedor => proveedor.name === product.empresa);
      if (!proveedor) {
        // El proveedor no existe, lo creamos
        await axiosPrivate.post(`/suppliers/`, {
          name: product.empresa,
          country:"China",
        })
      }
      //obtemosel id del proveedor
      const responseProveedorId = await axiosPrivate.get(`/suppliers/`);
      const proveedorId = responseProveedorId.data.find(proveedor => proveedor.name === product.empresa).id;
      const categoria = getCategory(selectedProductCompare.category)
      // Ahora creamos el item
        await axiosPrivate.post(`/items_alibaba/`, {
          title: product.titulo,
          imagen: product.imagen,
          supplier: proveedorId,
          min_order: product.orden_minima,
          rating: product.valoracion,
          url: product.url,
          category: categoria,
        });
    }
    
   //buscar si el item ya esta en la lista de presupuesto
    const ItemBudgetExist = await axiosPrivate.get(`/list_budget/`);
    const itemBudgetExist = ItemBudgetExist.data.find(item => item.item === item.id && item.lista === selectedBudget);
    if(itemBudgetExist){
      setWarning("El item ya existe en el presupuesto");
      setTimeout(() => {
        setWarning(null);
      }, 1000);
    }
    const responseAlibaba = await axiosPrivate.get(`/items_alibaba/?title=${product.titulo}`);
    item = responseAlibaba.data[0]

    try{
      //añadimos la relacion entre producto de amazon y item alibaba
       await axiosPrivate.post('/coincidence/',{
        id_item_alibaba: item.id,
        id_item_amazon: selectedProductCompare.id
      })
    }catch(error){
      console.error("Error al agregar el producto a coincidence", error);
    }

    // Ahora añadimos el item al presupuesto
    axiosPrivate.post(`/list_budget/`, {
      lista: selectedBudget,
      item: item.id,
      units: unitsProduct,
      shipping_cost: 1,
    })
    .then((response) => {
      if (response.status === 201) {
        setSuccess("Producto agregado al presupuesto");
        setTimeout(() => {
          setSuccess(null);
          setShowDialogOpen(false); // Cerrar el diálogo
          setUnitsProduct(""); // Limpiar el campo de texto
        }, 1000);
        console.log("Producto agregado al presupuesto:");
      }else {
        setError("Error al agregar el producto al presupuesto");
        setTimeout(() => {
          setError(null);
          setShowDialogOpen(false); // Cerrar el diálogo
          setUnitsProduct(""); // Limpiar el campo de texto
        }, 1000);
        console.error("Error al agregar el producto al presupuesto:");
      }
    })
  };

  const handleCloseAddDialog = () => setOpenDialogAddBudget(false);
  const handleCloseShowDialog = () => setShowDialogOpen(false);

  const axiosPresupuestos = async () => {
    try {
      const response = await axiosPrivate.get(`/budgets/`);
      return response;
    } catch (error) {
      console.error("Error al obtener presupuestos:", error);
      setError("Error al obtener presupuestos");
      setTimeout(()=>{
        setError(null);
      },1000);
    }
  };

  const handleUnitsProductChange = (e) => {
    const val = e.target.value;
    // 1) Valida: si no es número o ≤ 0, marca error
    const num = Number(val);
    if (Number.isNaN(num)) {
      setError("Debes introducir un número");
    } else if (num < product.orden_minima) {
      setError(`Debes indicar al menos ${product.orden_minima} unidades`);
      setTimeout(() => {
        setError(null);
      }, 1000);
      setUnitsProduct("");
    } else {
      setError("");
      setUnitsProduct(val);
    }
  };
  const handleSaveProductSeguido = async () => {
    try {
      // primero vemos si existe el proveedor, si no existe lo creamos
      const responseProveedor = await axiosPrivate.get(`/suppliers/`);
      const proveedor = responseProveedor.data.find(proveedor => proveedor.name === product.empresa);
      if (!proveedor) {
        // El proveedor no existe, lo creamos
        await axiosPrivate.post(`/suppliers/`, {
          name: product.empresa,
          country: "China",
        })
      }
      //obtemosel id del proveedor
      const responseProveedorId = await axiosPrivate.get(`/suppliers/`);
      const proveedorId = responseProveedorId.data.find(proveedor => proveedor.name === product.empresa).id;
      // Ahora creamos el item
      const responseItem = await axiosPrivate.get(`/items_alibaba/?title=${product.titulo}`);
      const item = responseItem.data[0]
      const categoria = getCategory(selectedProductCompare.category)
      if (!item || item.length === 0) {
        // El item no existe, lo creamos
        await axiosPrivate.post(`/items_alibaba/`, {
          title: product.titulo,
          image: product.imagen,
          min_order: product.orden_minima,
          rating: product.valoracion,
          url: product.url,
          supplier: proveedorId,
          category: categoria,
        });
      }
      const updatedResponseItem = await axiosPrivate.get(`/items_alibaba/?title=${product.titulo}`);
      const itemId = updatedResponseItem.data[0].id
      try{
        //añadimos la relacion entre producto de amazon y item alibaba
         await axiosPrivate.post('/coincidence/',{
          id_item_alibaba: itemId,
          id_item_amazon: selectedProductCompare.id
        })
      }catch(error){
        console.error("Error al agregar el producto a coincidence", error);
      }
      
      await axiosPrivate.post(`/lists_following/`, {
          lista: selectedListSeguimiento,
          item: itemId,
        })
        .then((response) => {
          setSuccess("Producto agregado a la lista de seguimiento");
          setTimeout(() => {
            setSuccess(null);
            setShowListSeguimiento(false); // Cerrar el diálogo
            setSelectedListSeguimiento(''); // Limpiar el campo de texto
          }, 1000);
          console.log("Producto agregado a la lista de seguimiento:");
        })
    } catch (error) {
      console.error("Error al guardar item en la lista seguimiento:", error);
      setError("Error al guardar item en la lista seguimiento");
      setTimeout(() => {
        setError(null);
        setShowListSeguimiento(false); // Cerrar el diálogo
        setSelectedListSeguimiento(''); // Limpiar el campo de texto
      }, 1000);
    }
  };
  const getCategory=(itemAmazonCategory)=>{
    switch(itemAmazonCategory){
     case("fashion"):
      return "3"
     case("kitchen"):
      return "15"
     case("beauty"):
      return("6")
     case("toys"):
      return("26")
     case("sports"):
      return("18")
     case("books"):
      return("2202")
    default:
      return(null)
    }
  }
  const handleSaveProductSeguidoNewLista = async () => {
    try {
      // primero vemos si existe el proveedor, si no existe lo creamos
      const responseProveedor = await axiosPrivate.get(`/suppliers/`);
      const proveedor = responseProveedor.data.find(proveedor => proveedor.name === product.empresa);
      if (!proveedor) {
        // El proveedor no existe, lo creamos
        await axiosPrivate.post(`/suppliers/`, {
          name: product.empresa,
          country: "China",
        })
      }
      //obtemosel id del proveedor
      const responseProveedorId = await axiosPrivate.get(`/suppliers/`);
      const proveedorId = responseProveedorId.data.find(proveedor => proveedor.name === product.empresa).id;
      // Ahora creamos el item
      const responseItem = await axiosPrivate.get(`/items_alibaba/?title=${product.titulo}`);
      const item = responseItem.data[0];
      const categoria = getCategory(selectedProductCompare.category)
      if (!item || item.length === 0) {
        // El item no existe, lo creamos
        await axiosPrivate.post(`/items_alibaba/`, {
          title: product.titulo,
          image: product.imagen,
          min_order: product.orden_minima,
          rating: product.valoracion,
          price: product.precio,
          url: product.url,
          supplier: proveedorId,
          category: categoria,
        });
      }
      const updatedResponseItem = await axiosPrivate.get(`/items_alibaba/?title=${product.titulo}`);
      const itemId = updatedResponseItem.data[0].id;
      // Ahora creamos la lista de seguimiento
      await axiosPrivate.post(`/following/`, {
        name: newListSeguimientoName,
      });
      //obtemos el id de la lista de seguimiento
      const responseListSeguimiento = await axiosPrivate.get(`/following/`);
      const listSeguimientoId = responseListSeguimiento.data.find(list => list.name === newListSeguimientoName).id;
      //añadimos el item a la lista de seguimiento
      await axiosPrivate.post(`/lists_following/`, {
          lista: listSeguimientoId,
          item: itemId,
        })
        .then((response) => {
          setSuccess("Producto agregado a la nueva lista de seguimiento");
          setTimeout(() =>{
            setSuccess(null);
          },1000);
          setOpenDialogAddListSeguimiento(false);
          setNewListSeguimientoName(''); // Limpiar el campo de texto
          console.log("Producto agregado a la nueva lista de seguimiento:");
        })
    } catch (error) {
       console.error("Error al guardar item en la nueva lista seguimiento:");

        setError("Error al guardar item en la nueva lista seguimiento");
        setTimeout(()=>{
          setError(null);
        },1000);
    }
  };
  
  const handleclickAddBudget = async (product) => {
    setProduct(product);
    const responseObtenerPresupuestos = await axiosPresupuestos();
    if (responseObtenerPresupuestos?.status !== 200) {
      setError('Error al obtener los presupuestos');
      setTimeout(() => {
        setError(null);
      }, 1000);
      console.error('Error al obtener los presupuestos');
    } else {
      if (responseObtenerPresupuestos.data.length === 0) {
        setOpenDialogAddBudget(true);
      } else {
        setPresupuestos(responseObtenerPresupuestos.data);
        setShowDialogOpen(true);
      }
    }
  };

  const handleclickAddSeguimiento = async (product) => {
    setProduct(product);
    try {
      const responseObtenerSeguidos = await axiosPrivate.get(`/following/`);
      // Nota: async/await o then/catch, pero no ambos mezclados
      if (responseObtenerSeguidos?.status !== 200) {
        setError('Error al obtener los productos comparados');
        setTimeout(()=>{
          setError(null);
        },1000);
        console.error('Error al obtener los productos comparados');
      } else {
        if (responseObtenerSeguidos.data.length === 0) {
          setOpenDialogAddListSeguimiento(true);
        } else {
          setLists_Seguimiento(responseObtenerSeguidos.data);
          setShowListSeguimiento(true);
        }
      }
    } catch (error) {
      console.error("Error al obtener los productos comparados", error);
      setError("Error al obtener los productos comparados");
      setTimeout(()=>{
        setError(null);
      },1000);

    }
  };

  const AxiosProductCompare = async () => {
    try {
      const response = await axiosPrivate.get(`/comparaciones/`);
      if (response?.status === 200) {
        const idItems = response.data[0]?.items || [];
        const responseItemsAmazon = await axiosPrivate.get(`/items_amazon/`);
        if (responseItemsAmazon?.status === 200) {
          const itemsAmazon = responseItemsAmazon.data;
          const productosComparados = itemsAmazon.filter(item => idItems.includes(item.id));
          setProductsCompare(productosComparados);
        } else {
          setError("Error al obtener los productos de Amazon");
          setTimeout(()=>{
            setError(null);
          },1000);
        }
      } else {
        setError("Error al obtener los productos comparados");
        setTimeout(()=>{
          setError(null);
        },1000);
      }
    } catch (error) {
      console.error("Error en axiosProductCompare");
      setError("Error al obtener los productos comparados");
      setTimeout(()=>{
        setError(null);
      },1000);
    }
  };
  console.log("productos aliaba sin filtarr", alibabaProducts)
  const AxiosProductsAlibaba = async () => {
    try {
      
      const response = await axiosPrivate.get(`/alibaba/scrape/?consulta=${encodeURIComponent(selectedProductCompare.title)}`);
      if (response?.status !== 200) {
        console.error('Error en la red al obtener los productos', response.statusText);
      }
      const data = await response.data;
      setAlibabaProducts(data.resultados);
    } catch (error) {
      setError("Error al obtener los productos de Alibaba");
      setTimeout(()=>{
        setError(null);
      },1000);
      console.error('Error fetching products:', error);
    } 
  };

  // Función para parsear precio y margen
  const parsePrecio = (precioStr) => {
    const precios = precioStr
      .replace(/€/g, '')
      .split('-')
      .map(p => parseFloat(p.trim()));

    if (precios.length === 1) {
      return { min: precios[0], max: null };
    }
    return { min: precios[0], max: precios[1] };
  };

  const calcularMargenBeneficio = (producto) => {
    const { min } = parsePrecio(producto.precio);
    const precioAlibaba = min; 
    const precioAmazon = selectedProductCompare.price;

    if (!precioAlibaba || !precioAmazon) return 0;
    return ((precioAmazon - precioAlibaba) / precioAlibaba) * 100;
  };
  const getPorcentajeCoincidencia = async (producto) => {
    if (!selectedProductCompare){
      setError("No hay producto seleccionado para comparar");
      setTimeout(() => {
        setError(null);
      }, 1000);
    }else {
      try {
        
        const response = await axiosPrivate.get(
          `/compare-items/?item1=${selectedProductCompare.id}&item2_url=${encodeURIComponent(producto.url)}`
        );
        if (response.status === 200) {
          // Extraemos el payload
          const data = response.data;
          const globalSim = data.features?.global_similarity;
          if (typeof globalSim === 'number') {
            return globalSim * 100;   // en porcentaje
          } else {
            console.warn('No vino global_similarity en el response', data);
            return 0;
          }
        } else {
          console.warn('Status inesperado', response.status);
          return 0;
        }
      } catch (err) {
        console.error('Error al obtener coincidencia:', err);
        return 0;
      }
    }
  };
  

const cargarProductosConDatos = async () => {
  try {
    setLoading(true)
    const productosAlibabaConDatos = await Promise.all(
      alibabaProducts.map(async (producto) => {
        const coincidencia = await getPorcentajeCoincidencia(producto);
        return {
          ...producto,
          coincidencia: coincidencia.toFixed(2),
          margenBeneficio: calcularMargenBeneficio(producto).toFixed(2),
        };
      })
    );
    setProductosAlibabaFiltrados(productosAlibabaConDatos);
  } catch (error) {
    console.error("Error al cargar productos con datos:", error);
    setError("Error al cargar productos con datos");
    setTimeout(() => {
      setError(null);
    }, 1000);
  }finally{
    setLoading(false)
  }
};

// Ejemplo en un useEffect:
useEffect(() => {
  cargarProductosConDatos();
}, [alibabaProducts]);


  // Card que muestra el producto seleccionado
  const ProductCard = () => {
    return (
      <Box sx={{ display: "flex", gap: 2, margin: "10px", padding: "10px", justifyContent: "center" }}>
        <Card sx={{ maxWidth: 345, m: 2, boxShadow: 3, borderRadius: 3 }}>
          <CardMedia
            
            component="img"
            height="100"
            image={selectedProductCompare.imagen}
            alt={selectedProductCompare.title}
            sx={{ objectFit: 'contain', p: 1}}
          />
          <CardContent>
            <Typography gutterBottom variant="h6" component="div" sx={{ height: 60, overflow: 'hidden', fontSize: '12px' }}>
              {selectedProductCompare.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1,fontSize: '12px' }}>
              Precio: <strong>{selectedProductCompare.price} €</strong>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, fontSize: '12px' }}>
              <Rating value={parseFloat(selectedProductCompare.rating)} precision={0.1} readOnly size="small" />
            </Box>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              target="_blank"
              href={selectedProductCompare.url}
              rel="noopener noreferrer"
              sx={{ fontSize: '12px' }}
            >
              Ver en Amazon
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  };



  const ProveedorBox = ({ proveedor }) => {
    return (
      <Box
        sx={{
          border: '1px solid #ccc',
          borderRadius: '8px',
          p: 2,
          m: 1,
          width: {
            xs: '80px',  // móviles
            sm: '100px',  // tablets pequeñas
            md: '120px',  // pantallas medianas
          },
          textAlign: 'center',
          transition: 'opacity 0.3s',
          opacity: proveedor.deshabilitado ? 0.5 : 1,
          cursor: proveedor.deshabilitado ? 'not-allowed' : 'pointer',
          borderColor: proveedor.deshabilitado ? '#ccc' : 'primary.main',
          borderWidth: 2,
          flexShrink: 0
        }}
      >
        <Box
          component="img"
          src={proveedor.imagen}
          alt={proveedor.nombre}
          sx={{
            width: '100%',
            height: 'auto',
            borderRadius: '4px',
            objectFit: 'contain',
          }}
        />
        <Typography
          sx={{
            fontSize: {
              xs: '8px',
              sm: '10px',
              md: '12px',
            },
            mt: 1,
            wordBreak: 'break-word',
          }}
          variant="body2"
        >
          {proveedor.nombre}
        </Typography>
      </Box>
    );
  };
  
  // Cerrar diálogos
  const handleCloseDialogAddListSeguimiento = () => {
    setOpenDialogAddListSeguimiento(false);
  };
  const handleCloseListSeguimiento = () => {
    setShowListSeguimiento(false);
  };

  const proveedores = [
    { id: 1, nombre: "Alibaba",imagen:"/alibaba_logo.png", deshabilitado: false },
    { id: 2, nombre: "1688",imagen:"/1688_logo.png",deshabilitado: true },
    { id: 3, nombre: "tabaoo",imagen:"/tabaoo_logo.png",deshabilitado: true },
  ];


  const handleSearch = async () => {
    if(!selectedProductCompare){
      setError("No hay producto seleccionado para comparar");
      setTimeout(() => {
        setError(null);
      }, 1000);
    }else {
      switch (mode) {
        case "product":
          onSearchProduct();
          break;
        case "benefit":
          onSearchBenefit();
          break;
        default:
          break;
      }
    }
  };

  const onSearchProduct = async () => {
    //llamar a api de alibaba con el producto
    const response =  await axiosPrivate.get(`/alibaba/scrape/?consulta=${productQuery}&categoria=${category}`);
    response.then((response) => {
      setAlibabaProducts(response.data.resultados);
    });
  };
  const onSearchBenefit = async () => {
    //llamar a api de alibaba con la categoria y el margen
    const response = await axiosPrivate.get(`/alibaba/scrape/?categoria=${category}&margen=${margen}`);
    response.then((response) => {
      setAlibabaProducts(response.data.resultados);
    });
  };
return (
    <>
        <Grid container spacing={2} justifyContent="center" alignItems="center" sx={{ margin: "10px", padding: "10px" }}>
            
            {(selectedProductCompare && !loading) && <ProductCard />}  {/* Mostrar la tarjeta del producto seleccionado */} 
            {/* Cargar productos de Alibaba */}
            {loading && (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: '100%' }}>
                <Typography variant="h5" sx={{ mt: 2 }}>
                  Cargando datos...
                </Typography>
                <LoaderBarras />
              </Box>

                
            )}
            {/* Mostrar item a comparar */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                m: { xs: 1, sm: 2, md: 3 },
                p: { xs: 1, sm: 2 },
                alignItems: "center",
                width: '60%',
              }}
            >
              <FormControl
                fullWidth
                sx={{
                  minWidth: { xs: '100%', sm: 200, md: 300 },
                }}
              >
                <InputLabel
                  sx={{
                    fontSize: { xs: '12px', sm: '13px', md: '14px' },
                  }}
                >
                  Seleccione el item a comparar
                </InputLabel>
                <Select
                  value={selectedProductCompare || ''}
                  onChange={(e) => setSelectedProductCompare(e.target.value)}
                  sx={{
                    fontSize: { xs: '12px', sm: '13px', md: '14px' },
                  }}
                  label="Seleccione el item a comparar"
                  variant="outlined"
                  size="small"
                >
                  {productsCompare.map((item) => (
                    <MenuItem
                      key={item.id}
                      value={item}
                      sx={{ fontSize: { xs: '12px', sm: '13px', md: '14px' } }}
                    >
                      {item.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Botones de búsqueda */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, m: 2, p: 2 }}>
                <Button
                  variant={mode === "product" ? "contained" : "outlined"}
                  startIcon={<SearchIcon />}
                  onClick={() => setMode("product")}
                >
                  Producto
                </Button>
                <Button
                  variant={mode === "benefit" ? "contained" : "outlined"}
                  startIcon={<SearchIcon />}
                  onClick={() => setMode("benefit")}
                >
                  % Beneficio
                </Button>

                {/* Campo condicional */}
                {mode === "product" && (
                  <TextField
                    label="Buscar producto"
                    variant="outlined"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    sx={{ flex: "1 1 200px" }}
                  />
                )}
                { mode === "benefit" && (
                  
                  <FormControl sx={{ flex: "1 1 200px" }}>
                    <InputLabel>Margen de beneficio</InputLabel>
                    <Select
                      label={"Seleccione el margen de beneficio"}
                      variant="outlined"
                      value={margen}
                      onChange={(e) => setMargen(e.target.value)}
                      sx={{ width: "200px" }}
                    >
                      {margenes && margenes.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                  <FormControl sx={{ flex: "1 1 200px" }}>
                    <InputLabel>Categoria</InputLabel>
                    <Select
                      label={"Seleccione la categoria"}
                      variant="outlined"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      sx={{ width: "200px" }}
                    >
                      {categories && categories.map((c) => (
                        <MenuItem key={c} value={c.value}>
                          {c.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                
                
              
            </Box>
              
            <Box sx={{ display: "flex", gap: 2, m: 2, p: 2 }}>
              {/* Botón de búsqueda */}
              <Button
                variant="contained"
                color="primary"
                disabled={!mode}
                onClick={handleSearch}
              >
                Buscar
              </Button>
            </Box>

        </Grid>

        {/* Mostrar los proveedores */}
        <Box sx={{ margin: "10px", padding: "10px"}}>
          <Typography sx={{ fontSize: "12px", margin: "10px", padding: "10px", textAlign: "center" }}>Nuestros proveedores</Typography>
          <Box display="flex" flexWrap="wrap" justifyContent="center">
            {proveedores.map((p) => (
              <ProveedorBox key={p.id} proveedor={p} />
            ))}
          </Box>
        </Box>

         {/* Tabla de productos de Alibaba */}   
        <Container sx={{ maxWidth: "3400px",padding: { xs: "0 10px", sm: "0 20px" } }}>
            {alibabaProducts.length > 0 && (
                <ProductTable
                    title="Productos de Alibaba"
                    products={productosAlibabaFiltrados}
                    columns={[
                        { key: 'titulo', label: 'Título' },
                        { key: 'imagen', label: 'Imagen', type: 'image', linkKey: 'url' },
                        { key: 'precio', label: 'Precio' },
                        { key: 'orden_minima', label: 'Orden Mínima' },
                        { key: 'empresa', label: 'Vendedor' },
                        { key: 'valoracion', label: 'Valoración' },
                        { key: 'coincidencia', label: '% Coincidencia' },
                        { key: 'margenBeneficio', label: 'Margen de Beneficio' },
                    ]}
                    action={[
                        { label: ' + Presupuesto', onClick: handleclickAddBudget },
                        { label: '+ Favoritos ', onClick: handleclickAddSeguimiento },
                    ]}
                />
            )}
        </Container>

        {/* Dialog para añadir presupuesto */}
        <Dialog open={OpenDialogAddBudget} onClose={handleCloseAddDialog}>
            {success && (
                //mostar mensaje de exito
                <Alert severity="success" sx={{ mt: 2 }}>
                    {success}
                </Alert>
            )} 
            {error && (
                //mostar mensaje de error
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}
            <DialogTitle>Añadir Presupuesto</DialogTitle>
            <DialogContent>
                <TextField
                    label="Nombre del nuevo presupuesto"
                    value={newBudgetName}
                    onChange={(e) => setNewBudgetName(e.target.value)}
                    fullWidth
                    sx={{ mt: 2 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseAddDialog}>Cancelar</Button>
                <Button onClick={handleSaveNewBudget} variant="contained">
                    Añadir
                </Button>
            </DialogActions>
        </Dialog>

        {/* Dialog para mostrar presupuesto */}
        <Dialog open={showDialogOpen} onClose={handleCloseShowDialog}>
          {success && (
                  //mostar mensaje de exito
                  <Alert severity="success" sx={{ mt: 2 }}>
                      {success}
                  </Alert>
              )} 
            {error && (
                //mostar mensaje de error
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}
            {warning && (
                //mostar mensaje de advertencia
                <Alert severity="warning" sx={{ mt: 2 }}>
                    {warning}
                </Alert>
            )}
         <DialogTitle>Seleccionar Presupuesto</DialogTitle>

            <DialogContent sx={{ minWidth: 300 }}>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Presupuesto</InputLabel>
                <Select
                  value={selectedBudget}
                  onChange={(e) => handleSelectedBudget(e.target.value)}
                  label="Presupuesto"
                >
                  {presupuestos.map((presupuesto) => (
                    <MenuItem key={presupuesto.id} value={presupuesto.id}>
                      {presupuesto.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedBudget && (
                <>
                  <TextField
                    fullWidth
                    label="Orden mínima"
                    type="number"
                    value={product.orden_minima}
                    disabled
                    sx={{ mt: 3 }}
                  />
                  <TextField
                    fullWidth
                    label="Número de unidades"
                    type="number"
                    value={unitsProduct}
                    onChange={handleUnitsProductChange}
                    sx={{ mt: 3 }}
                    
                  />
                </>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={handleCloseShowDialog}>Cancelar</Button>
              <Button onClick={handleSaveItemBudget} variant="contained">
                Guardar
              </Button>
            </DialogActions>
        </Dialog>



        {/* Dialog para añadir lista de seguimiento */}
        <Dialog open={OpenDialogAddListSeguimiento} onClose={handleCloseDialogAddListSeguimiento}>
          {success && (
                //mostar mensaje de exito
                <Alert severity="success" sx={{ mt: 2 }}>
                    {success}
                </Alert>
            )} 
            {error && (
                //mostar mensaje de error
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}
            <DialogTitle>Añadir Lista de Seguimiento</DialogTitle>
            <DialogContent>
                <TextField
                    label="Nombre de la lista"
                    value={newListSeguimientoName}
                    onChange={(e) => setNewListSeguimientoName(e.target.value)}
                    fullWidth
                    sx={{ mt: 2 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseDialogAddListSeguimiento}>Cancelar</Button>
                <Button onClick={handleSaveProductSeguidoNewLista} variant="contained">
                    Añadir
                </Button>
            </DialogActions>
        </Dialog>

        {/* Dialog para mostrar listas de seguimiento */}
        <Dialog open={showListSeguimiento} onClose={handleCloseListSeguimiento}>
          {success && (
                //mostar mensaje de exito
                <Alert severity="success" sx={{ mt: 2 }}>
                    {success}
                </Alert>
            )} 
            {error && (
                //mostar mensaje de error
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}
            <DialogTitle>Seleccionar lista de seguimiento</DialogTitle>
            <DialogContent>
                <FormControl fullWidth>
                    <InputLabel>Lista</InputLabel>
                    <Select
                        value={selectedListSeguimiento}
                        onChange={(e) => setSelectedListSeguimiento(e.target.value)}
                    >
                        {lists_Seguimiento.map((lista) => (
                            <MenuItem key={lista.id} value={lista.id}>
                                {lista.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseListSeguimiento}>Cancelar</Button>
                <Button onClick={handleSaveProductSeguido} variant="contained">
                    Seleccionar
                </Button>
            </DialogActions>
        </Dialog>

 
    </>
);
  };


export default SearchProduct;
