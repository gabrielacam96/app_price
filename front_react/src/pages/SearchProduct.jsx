import React, { useState, useEffect } from 'react';
import { TextField, Button, FormControl, InputLabel, Select, MenuItem, Container, Box, Typography } from '@mui/material';
import ProductTable from '../components/ProducTable';
import axiosPrivate from '../hooks/axiosPrivate';
import { useNavigate } from 'react-router-dom';
import LoaderBarras from './loaders/loaderBarras';


function SearchProduct(){
    const [selectedQuery, setSelectedQuery] = useState(''); // Estado para la query seleccionada
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [amazonProducts, setAmazonProducts ] = useState([])
    const [productCompare, setProductCompare] = useState(null) // Estado para almacenar los productos de Amazon
    const [loading, setLoading] = useState(false); // Estado para controlar el load
    const [selectedCategory, setSelectedCategory] = useState(null); // Estado para la categoría seleccionada     
    const [categories, setCategories] = useState([]); // Estado para almacenar las categorías
    const [error, setError] = useState(null); // Estado para almacenar el mensaje de error
    const [success, setSuccess] = useState(null); // Estado para almacenar el mensaje de éxito
    const navigate = useNavigate(); // Hook de React Router
    const [filtroTendencias, setFiltroTendencias] = useState(''); // Estado para almacenar el filtro de tendencias
    const [busqueda, setBusqueda] = useState(false); // Estado para controlar la búsqueda
    const tendecias = [{
        value: 'bestsellers', label: 'Mas vendidos',
        }, {
        value: 'new-releases', label: 'Ultimas novedades',
        }, {
        value: 'movers-and-shakers', label: 'Producto del momento',
        }]
     // Opciones de tendencias

    //espacio para el log
    console.log("query", selectedQuery, "category", categories, selectedCategory, "filtroTendencias", filtroTendencias);
    console.log("amazonProducts", amazonProducts)

    const handleSearch = () => {
        if(selectedQuery) {
            setSelectedProduct(selectedQuery); // Almacena el producto seleccionado
        }
        setBusqueda(true); // Cambia el estado de búsqueda a verdadero
    };
    
    useEffect(() => {
        if(categories.length === 0){
            // Si no hay producto seleccionado, mostramos las categorías
            axiosCategories();
        }
        if (busqueda) {
            // Si hay un producto seleccionado, buscamos los productos de Amazon
            axiosProductsAmazon();
        }
        
    }, [selectedProduct, selectedCategory, filtroTendencias, busqueda]); // Dependencias para el useEffect
    
    // Redirigir a la página de comparación si hay un producto para comparar
    useEffect(() => {
        if (productCompare) {
            navigate('/compareProduct', { state: { productCompare } });
        }
    }, [productCompare]);

    // Función para obtener las categorías de Amazon
    const axiosCategories = async () => {
        try {
            const response = await axiosPrivate.get(`/amazon/categories/`);
            if (response.status === 200) {
                setCategories(response.data);
            }
        } catch (error) {
            setError("Error al obtener las categorías");
            setTimeout(() =>{
                setError(null);
            },1000);
            console.error("Error al obtener las categorías:", error);
        }
    }
    // Función para obtener los productos de Amazon

    const axiosProductsAmazon = async () => {
        // Reiniciamos estados
        setError(null);
        setLoading(true);

        // Si no tenemos categoría, no hacemos nada
        if (!selectedCategory) {
            setBusqueda(false); // Reiniciamos el estado de búsqueda
            setLoading(false);
            setError('Por favor, selecciona una categoría');
            setTimeout(() => {
                setError(null);
            }, 1000); // Limpiamos el error después de 3 segundos
        }else{
            

            // Construimos los params en función de lo que haya
            const params = { category: selectedCategory };
            if (selectedQuery) {
                params.query = selectedQuery;
            } else if (filtroTendencias) {
                params.filtro = filtroTendencias;
            } else {
                setBusqueda(false); // Reiniciamos el estado de búsqueda
                setError('Por favor, introduce un producto o selecciona un filtro de tendencias');
                setTimeout(() => {
                    setError(null);
                    // Si no hay ni query ni filtro, vaciamos la lista
                    setAmazonProducts([]);
                    setLoading(false);
                }, 1000); // Limpiamos el error después de 3 segundos
                
            }
            if (params.query || params.filtro) {
                try {
                    const { data, status } = await axiosPrivate.get('/amazon/scrape/', { params });
                    if (status !== 200 || !data.resultados) {
                        setBusqueda(false); // Reiniciamos el estado de búsqueda
                        throw new Error('Respuesta inválida del servidor');

                    }
                    setAmazonProducts(data.resultados);
                } catch (err) {
                    console.error('Error al obtener productos de Amazon:', err);
                    setError('Error al obtener los productos de Amazon');
                    setTimeout(()=>{
                        setError(null);
                    },1000);
                    setBusqueda(false); // Reiniciamos el estado de búsqueda
                } finally {
                    setLoading(false);
                    setBusqueda(false); // Reiniciamos el estado de búsqueda
                    setSuccess('Productos obtenidos con éxito');
                    setTimeout(() => {
                        setSuccess(null);
                        setSelectedQuery(''); // Reiniciamos la query seleccionada
                        setFiltroTendencias(''); // Reiniciamos el filtro de tendencias
                    }, 1000);

                }
            }
     }
    }


    // Función para filtrar el título del producto
    const filtrarTitulo = (title) => {
        return title
          .toLowerCase() // Convierte a minúsculas
          .trim() // Elimina espacios al inicio y fin
          .replace(/[^a-z0-9\s-]/g, '') // Elimina caracteres especiales
          .replace(/\s+/g, '-') // Reemplaza espacios por guiones
          .replace(/-+/g, '-'); // Evita múltiples guiones seguidos
      };
      
    // Función para agregar un producto a la comparación
    const addItemToComparison = async (product) => {
        
        try {
            //comprobar si el producto ya existe en la tabla items_amazon
            const titulo = filtrarTitulo(product.titulo);
            const responseCheckItemAmazon = await axiosPrivate.get(`/items_amazon/?title=${encodeURIComponent(titulo)}`);
            if (responseCheckItemAmazon.data.length === 0) { // si no existe el producto
            
                // Agregar el producto a la tabla items_amazon
                const responseAddItemAmazon = await axiosPrivate.post(`/items_amazon/`, {
                    title: titulo,
                    imagen: product.imagen,
                    rating: product.rating,
                    price: product.precio,
                    url: product.url,
                    category: selectedCategory
                });
                
                if (responseAddItemAmazon.status !== 201) {
                    setError("Error al añadir el producto a items_amazon");
                    setTimeout(() =>{
                        setError(null);
                    },1000);
                    console.error('Error al añadir el producto a items_amazon');
                }

                console.log("Item de Amazon añadido con éxito");

            }else{
                console.log("El producto ya existe no lo añadimos de nuevo");
            }


            // Obtener el id del producto
            const responseGetItemAmazon = await axiosPrivate.get(`/items_amazon/?title=${titulo}/`);
            console.log("responseGetItemAmazon", responseGetItemAmazon);
            const itemId = responseGetItemAmazon.data[0].id;
            console.log("itemId", itemId);

            // Ver si el usuario ya tiene una lista de comparación
            const responseGetComparison = await axiosPrivate.get(`/comparaciones/`);
            let responseAddItemComparison;

            if (responseGetComparison.data.length > 0) {  // si tiene una comparación
                const comparisonId = responseGetComparison.data[0].id;
                responseAddItemComparison = await axiosPrivate.put(`/comparaciones/${comparisonId}/`, {
                    items: [...responseGetComparison.data[0].items, itemId]
                });
            } else {
                responseAddItemComparison = await axiosPrivate.post(`/comparaciones/`, {
                    items: [itemId]
                });
            }

            if (responseAddItemComparison.status !== 201 && responseAddItemComparison.status !== 200) {
                console.error('Error al añadir el producto a la comparación');
            }

            console.log("Producto añadido a la comparación");
            const producto = responseGetItemAmazon.data[0];
            setProductCompare(producto); // Guardar el producto en el estado


        } catch (error) {
            console.error("Error en la solicitud:", error);
            setError("Error al añadir el producto a la comparación");
            setTimeout(()=>{
                setError(null);
            },1000);
        }

    };
    
    

    return (
        <>
        {/* Cargando datos  Loader*/}
        {loading && (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: '100%' }}>
            <Typography variant="h5" sx={{ mt: 2 }}>
                Cargando datos...
            </Typography>
            <LoaderBarras />
            </Box>

            
        )}
        
        

        
        {/* Tabla de productos de Amazon */}
        <Container sx={{ maxWidth: "1700px !important" }}>
                {/* Barra de búsqueda */}
                <Box sx={{ display: "flex", gap: 2, margin: "10px", padding: "10px", justifyContent: "center" }}>
                  
                        {/* Input de búsqueda (queda grisáceo y helper) */}
                        <TextField
                        variant="outlined"
                        placeholder="Buscar por producto"
                        value={selectedQuery}
                        onChange={(e) => setSelectedQuery(e.target.value)}
                        disabled={Boolean(filtroTendencias)}
                        helperText={filtroTendencias ? "Deshabilitado mientras usas tendencias" : ""}
                        sx={{
                            width: "100%",
                            maxWidth: 300,
                            // estilo especial cuando está disabled
                            "&.Mui-disabled": {
                            bgcolor: "#ECEFF1",        // gris claro
                            "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "#B0BEC5",  // borde más suave
                            },
                            },
                        }}
                        />

                        {/* Desplegable de categorías (siempre activo) */}
                        <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel>Categoría</InputLabel>
                        <Select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            {categories.map((c) => (
                            <MenuItem key={c.value} value={c.value}>
                                {c.label}
                            </MenuItem>
                            ))}
                        </Select>
                        </FormControl>

                        {/* Desplegable de tendencias (amarillo pálido + helper) */}
                        <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel>Tendencias</InputLabel>
                        <Select
                            value={filtroTendencias}
                            onChange={(e) => setFiltroTendencias(e.target.value)}
                            disabled={Boolean(selectedQuery)}
                            sx={{
                            "&.Mui-disabled .MuiSelect-select": {
                                bgcolor: "#B0BEC5",  
                            },
                            }}
                        >
                            {tendecias.map((t) => (
                            <MenuItem key={t.label} value={t.value}>
                                {t.label}
                            </MenuItem>
                            ))}
                        </Select>
                        {selectedQuery && (
                            <Typography variant="caption" color="text.secondary">
                             Desabilitado mientras buscador esta activo
                            </Typography>
                        )}
                        </FormControl>

            
                  {/* Botón de búsqueda */}
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleSearch()}
                  >
                    Buscar
                  </Button>
                </Box>

                {error && (<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: '100%' }}>
                    <Typography variant="h5" sx={{ mt: 2, color: 'red' }}>
                        {error}
                    </Typography>
                </Box>
                )}
                
                {success && (
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: '100%' }}>
                    <Typography variant="h5" sx={{ mt: 2, color: 'green' }}>
                        {success}
                    </Typography>
                    </Box>
                )}

                {amazonProducts && (
                <ProductTable
                    title="Productos de Amazon"
                    products={amazonProducts}
                    columns={[
                    { key: 'titulo', label: 'Título' },
                    { key: 'imagen', label: 'Imagen', type: 'image', linkKey: 'url' },
                    { key: 'precio', label: 'Precio' },
                    { key: 'reviews', label: 'Nº Reseñas' },
                    { key: 'rating', label: 'Valoracion' },
                    ]}
                    action={[
                        {
                          label: 'Comparar',
                          onClick: (product) => addItemToComparison(product), // Callback para evitar problemas
                        },
                      ]}
                />
                )}


        </Container>

        </>
        );
        

}

export default SearchProduct