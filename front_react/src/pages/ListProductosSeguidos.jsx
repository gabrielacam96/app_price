
import React, { useState,useEffect } from "react";
import {Tooltip, TextField,Typography,Button,Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,Dialog, DialogTitle, DialogContent, DialogActions, IconButton ,Box,Card, CardContent} from "@mui/material";
import { Visibility, Edit, Delete, Add,} from "@mui/icons-material";
import axiosPrivate from "../hooks/axiosPrivate";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import TimelineIcon from '@mui/icons-material/Timeline';
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import axios from "axios";

function ListBudget(){
const [listaSeguimiento, setListaSeguimiento] = useState([]);
const [itemsSeguimiento, setItemsSeguimiento] = useState([]);
const [dialogOpen, setDialogOpen] = useState(false);
const [selectedLista, setSelectedLista] = useState(null);
const [editarLista, setEditarLista] = useState(false);
const [error, setError] = useState(null); // Estado para manejar errores
const [success, setSuccess] = useState(null);// Estado para manejar mensajes de éxito
const [loading, setLoading] = useState(false);
const [openDialogAddNewList, setOpenDialogAddNewList] = useState(false); // Estado para controlar el diálogo de añadir nueva lista
const [newListFavName, setNewListFavName] = useState(""); // Estado para el nombre de la nueva lista de favoritos
const [rangosItemsSelected,setRangosItemsSelected] = useState([]); //Estado para obtenr los rangos de los items de la lista de seguimiento selecionada
const [atributos,setAtributos] = useState([]);
const [rangosPreciosSelected,setRangosPreciosSelected] = useState([]);
const[isValid, setIsValid]= useState(true);

useEffect(() => {
    // Obtener la lista de seguimiento al cargar el componente
    obtenerListasSeguimiento();
}, []);

// Función para obtener la lista de seguimiento
const obtenerListasSeguimiento = async () => {
    setLoading(true);
    try {
       const response = await axiosPrivate.get("/following/");
        if (response.status === 200) {
            setListaSeguimiento(response.data);
            const idItems = response.data.map((item) => item.items);
            console.log("idItems de seguimiento",idItems); 
        }else{
            console.error("Error al obtener la lista de seguimiento:");
        }
    } catch (error) {
      console.error("Error al obtener la lista de seguimiento:", error);
      setError("Error al obtener la lista de seguimiento.");
      setTimeout(() => {
        setError(null);
      }, 1000); // Ocultar el mensaje después de 1 segundo
      
    }finally{
        setLoading(false);
    }
};

// Función para obtener los detalles de los items de la lista
const getItemsLista = async (lista) => {
    
    try {
        const idItems = lista.items;
        console.log("idItems de seguimiento",idItems);
        if (idItems.length !== 0) {
          const responses = await Promise.all(idItems.map((idItem) => axiosPrivate.get(`/items_alibaba/${idItem}/`)));
          const items = responses.map((response) => response.data);
          setItemsSeguimiento(items);
        }else{
          setItemsSeguimiento([]);
        }
      }catch (error) {
        console.error("Error al obtener los items de la lista:", error);
        setError("Error al obtener los items de la lista.");
        setTimeout(() => {
          setError(null);
        }, 1000); // Ocultar el mensaje después de 1 segundo
      }
}

// Función para manejar la apertura del diálogo de detalles de la lista
const handleVerLista = async (lista) => {
    setSelectedLista(lista);
    await getItemsLista(lista);
    getRangoUnidades(lista)
    getRangosPrecios(lista)
    getAtributos(lista)
    setDialogOpen(true);
};

console.log("precios",rangosPreciosSelected);
console.log("unidades",rangosItemsSelected);

/**
 * Función para obtener los rangos de precios de los items de la lista de seguimiento
 * seleccionada.
 *
 * @param {Object} lista - La lista de seguimiento seleccionada
 */
const getRangosPrecios = async (lista) => {
  const idItems = lista.items;
  const responses = await Promise.all(
    idItems.map((id) => axiosPrivate.get(`/price_history/?item_alibaba=${id}&date=${1}`))
  );
  const precios = responses.map((response) => response.data);
  setRangosPreciosSelected(precios);
};
//funcion para obtener los atributos de los items selecionados
const getAtributos = async (lista)=>{
  try{
    const idItems = lista.items
    const responses = await Promise.all(idItems.map((id) =>axiosPrivate.get(`/product_atributes/?item_alibaba=${id}`)));
    const atributos = responses.map((response) => response.data);
    setAtributos(atributos)
  }catch(error){
    console.error("No ha sido posible obtener los atributos", error);
  }

}
// Función para manejar la adición de una nueva lista de favoritos
const handleAddNewList = async() => {

  //comprobar que no haya ya una lista cn el mismo name
    const response = await axiosPrivate.get(`/following/?name=${newListFavName}`);
    
    if(response.data.length === 0){
   // llamar a la API para añadir la nueva lista de favoritos
      const newList = {
        name: newListFavName,
        items: [], // Inicialmente vacío, se puede añadir productos después
      }
      axiosPrivate.post("/following/", newList)
        .then((response) => {
            console.log("Lista de seguimiento creada:");
            setSuccess("Lista de seguimiento creada con éxito.");
            setTimeout(() => {
                setSuccess(null);
                obtenerListasSeguimiento();
                setOpenDialogAddNewList(false); // Cerrar el diálogo después de añadir la lista
                setNewListFavName("");
            }, 1000); // Ocultar el mensaje después de 1 segundo
            
        })
        .catch((error) => {
            console.error("Error al crear la lista de seguimiento:", error);
            setError("Error al crear la lista de seguimiento.");
            setTimeout(() => {
                setError(null);
                setOpenDialogAddNewList(false); // Cerrar el diálogo después de añadir la lista
                setNewListFavName("");
            }, 1000); // Ocultar el mensaje después de 1 segundo
        });
    }else{
      setError("Ya existe una lista con ese nombre")
      setTimeout(()=>{
        setError(null);
        setNewListFavName("");
      },1000);
    }
      
}
// Función para manejar el cierre del diálogo de añadir nueva lista
const handleCloseAddNewList = () => {
    setOpenDialogAddNewList(false);
    setNewListFavName(""); // Limpiar el nombre de la nueva lista
}
const handleCloseDialog = () => {
    setEditarLista(false)
    setDialogOpen(false);
    setSelectedLista(null);
    setItemsSeguimiento([]);
}

const handleEditarLista = async(lista) => {
  setSelectedLista(lista);
  await getItemsLista(lista);
  setEditarLista(true);
  setDialogOpen(true);
  
  
};


const getRangoUnidades=async(lista)=>{
  try{
    const idItems = lista.items
    const responses = await Promise.all(idItems.map((id) => axiosPrivate.get(`/price_range/?item=${id}`)));
    const rangos = responses.map((response) => response.data);
    setRangosItemsSelected(rangos)
  }catch(error){
    console.error("No ha sisdo posible eobtener los rangos de precios",error)
  }

}

const handleEliminarLista = async (lista) => {
    try {
        await axiosPrivate.delete(`/following/${lista.id}/`);
        console.log("Presupuesto eliminado.");
        obtenerListasSeguimiento();
    } catch (error) {
        setError("Error al eliminar la lista de seguimiento.",error);
        setTimeout(() => {
            setError(null);
        }, 1000); // Ocultar el mensaje después de 1 segundo
        console.error("Error al eliminar:");
    }
}
const handleVerHistorial = (lista) => {
    console.log("Ver historial de seguimiento:", lista);
    
}

const handleEliminarItemLista = async (itemToDelete) => {
  try {
    await axiosPrivate.delete(
      `/lists_following/?lista=${selectedLista.id}&item=${itemToDelete.id}`
    );

    console.log("Item eliminado con éxito.");

    // 1) Actualizar localmente el estado para que se rerenderice de inmediato:
    setItemsSeguimiento(prev =>
      prev.filter(i => i.id !== itemToDelete.id)
    );
    obtenerListasSeguimiento();
    setSuccess("Elimina lista");
    setTimeout(() => {
      setSuccess(null);
    }, 1000);
    
  } catch (error) {
      console.error("Error al eliminar el item",error);
      setError("Error al eliminar el item de la lista.");
      setTimeout(() => {
        setError(null);
      }, 1000); // Ocultar el mensaje después de 1 segundo
  }
};
  const isValidText = (text) => {
    const regex = /^[a-zA-Z0-9\s]+$/; // Permite letras (mayúsculas y minúsculas), números y espacios
    return regex.test(text);
  };
  const handleNewNameList=(e)=>{
    setNewListFavName(e.target.value);
    const valido = isValidText(newListFavName)
    setIsValid(valido);
    if(!valido){
    
      setError("El nombre no es valido");
      setTimeout(()=>{
        setError(null);
      },1000)
    }

  }
  const tooltipContent=(index)=>{
    return (
    <Box
      sx={{
        p: 1,
        maxWidth: 250,
        maxHeight: 250,
        display: "flex",
        flexDirection: "column", // Asegura que los elementos se apilen en columna
        overflowY: "auto", // Habilita el scroll vertical
      }}
    >
      {atributos[index]?.map((a) => (
        <Typography
          key={a.id}
          variant="body2"
          sx={{ whiteSpace: "nowrap" }} // Evita saltos de línea
        >
          <strong>{a.name}:</strong> {a.value}
        </Typography>
      ))}
    </Box>
    )
  }

console.log(listaSeguimiento);

  
const theme = useTheme();

// isSmallScreen = true cuando el viewport sea menor o igual a "sm"
const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

return (
  <>
    {/* Si NO es pantalla pequeña, se muestra la tabla.
        Si ES pantalla pequeña, se muestran las tarjetas. */}
    {!isSmallScreen ? (
      /* ================= VISTA EN TABLA (pantallas md o mayores) ================ */
      <TableContainer component={Paper} sx={{ p: "10px", overflowX: "auto",
        width: '90%',           // 🔒 se adapta al contenedor padre
        maxWidth: '100vw',
        margin: '0 auto', // Centra horizontalmente 
        }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Fecha creación</TableCell>
              <TableCell>Numero de items</TableCell>
              <TableCell> 
                          
                <Button
                  startIcon={<Add />}
                  variant="contained"
                  onClick={()=>setOpenDialogAddNewList(true)}
                >
                  Añadir
                </Button>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listaSeguimiento.length !== 0 ? (
              listaSeguimiento.map((lista, index) => (
                <React.Fragment key={lista.id}>
                  <TableRow>
                    <TableCell>{lista.name}</TableCell>
                    <TableCell>{lista.date}</TableCell>
                    <TableCell>{lista.n_items_total}</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => handleVerLista(lista)}>
                        <Visibility />
                      </IconButton>
                      <IconButton onClick={() => handleEditarLista(lista)}>
                        <Edit />
                      </IconButton>
                      <IconButton
                        onClick={() => handleEliminarLista(lista)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
          ): (
            <TableRow>
              <TableCell colSpan={3} align="center">
                <Typography variant="body2" color="textSecondary">
                  No hay listas de seguimiento disponibles.
                </Typography>
              </TableCell>
            </TableRow>
           )}
          </TableBody>
        </Table>
      </TableContainer>
    ) : (
      /* ================== VISTA EN TARJETAS (pantallas sm o menores) ================== */
      <Box sx={{ p: 1 }}>
        {listaSeguimiento.map((lista, index) => (
          <Card key={lista.id} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1">
                <strong>Nombre:</strong> {lista.name}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Fecha creación:</strong> {lista.date}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Numero de items:</strong> {lista.n_items_total}
              </Typography>
              <Box sx={{ textAlign: "right" }}>
                <Button
                  startIcon={<Add />}
                  variant="contained"
                  onClick={()=>setOpenDialogAddNewList(true)}>
                 añadir
                </Button>
                <IconButton onClick={() => handleVerLista(lista)}>
                  <Visibility />
                </IconButton>
                <IconButton onClick={() => handleEditarLista(lista)}>
                  <Edit />
                </IconButton>
                <IconButton
                  onClick={() => handleEliminarLista(lista)}
                  color="error"
                >
                  <Delete />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    )}

    {/* Dialog Detalles de la lista de seguimiento */}
    <Dialog
      open={Boolean(selectedLista) && dialogOpen}
      onClose={handleCloseDialog}
      maxWidth="md"
      fullWidth
      // fullScreen si pantalla muy pequeña
      fullScreen={useMediaQuery(theme.breakpoints.down("xs"))}
    >
      <DialogTitle>
        Detalles de la Lista de seguimiento: {selectedLista?.name}
      </DialogTitle>
      <DialogContent dividers>
        {itemsSeguimiento.length === 0 ? (
          <Typography>No hay productos para esta lista.</Typography>
        ) : (
          /* Tabla interna dentro del diálogo */
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Imagen</TableCell>
                <TableCell>Valoración</TableCell>
                <TableCell>Vendedor</TableCell>
                <TableCell>Orden mínima</TableCell>
                <TableCell>Rango de Unidades</TableCell>
                <TableCell>Rango de Precios</TableCell>
                <TableCell>Atributos</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              
              {itemsSeguimiento.map((item, index) => {
                
                return (
                    <TableRow key={item.id}>

                      <TableCell>
                        <a href={item.url}> {item.title}</a>
                      </TableCell>
                      <TableCell align="center">
                      {item.imagen !=="" ?(
                        <Box
                          component="img"
                          src={item.imagen}
                          alt={item.title}
                          sx={{
                            width:  100,           // ancho fijo en px (o usa '%')
                            height: 100,           // alto fijo
                            objectFit: 'contain',  // escala sin cortar
                            bgcolor: '#f0f0f0',    // fondo de reserva
                            borderRadius: 1,       // esquinas redondeadas
                          }}
                          onError={(e) => {
                            // si falla, muestra un placeholder
                            e.target.onerror = null;
                            e.target.src = '/placeholder.png';
                          }}
                        />
                       ):("Sin imagen")}
                      </TableCell>
                      <TableCell>{item.rating}</TableCell>
                      <TableCell>{item.supplier_name}</TableCell>
                      <TableCell>{item.min_order}</TableCell>
                      <TableCell>
                        {rangosItemsSelected && (rangosItemsSelected[index]?.map((rango) => (
                          <Button key={rango.id}>{rango.minimo_range}-{rango.maximo_range}</Button>
                        )))}
                      </TableCell>
                      <TableCell>
                        {rangosPreciosSelected && (rangosPreciosSelected[index]?.map((item) => (
                          <Button key={item.id}>{item.current_price}€</Button>)))
                        }
                      </TableCell>
                      <TableCell align="center">
                        {atributos && (
                        <Tooltip
                          arrow
                          title={tooltipContent(index)}
                          enterDelay={300}
                          leaveDelay={100}
                          placement="top"
                        >
                          <IconButton size="small">
                            <InfoOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                      {!editarLista &&(
                        <Button
                          variant="contained"
                          onClick={() => handleVerHistorial(item)}
                          title="Ver historial de precios"
                        >
                          <TimelineIcon />
                        </Button>
                      )}
                      
                        {editarLista && (
                          <Button
                              variant="contained"
                              onClick={() => handleEliminarItemLista(item)}
                              title="Eliminar producto de la lista"
                          >
                          <Delete />
                          </Button>
                      )}
                      </TableCell>


                    </TableRow>
                  );
                })
              }
              
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog} variant="contained">
          Cerrar
        </Button>
        
      </DialogActions>
    </Dialog>

    {/* Dialog para añadir nueva lista de seguimiento */}
    <Dialog
      open={openDialogAddNewList}
      onClose={() => setOpenDialogAddNewList(false)}
    >
      {error && (
        <Typography color="error" variant="body2" sx={{ p: 2 }}>
          {error}
        </Typography>
      )}
      {success && (
        <Typography color="success" variant="body2" sx={{ p: 2 }}>
          {success}
        </Typography>
      )}
      <DialogTitle>Nueva lista de favoritos</DialogTitle>
      <DialogContent dividers>
        <TextField
          label="Nombre del nueva lista favoritos"
          value={newListFavName}
          onChange={handleNewNameList}
          fullWidth
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleAddNewList} variant="contained" disabled={!isValid}>
          Añadir
        </Button>
        <Button onClick={handleCloseAddNewList} variant="contained">
          Cancelar
        </Button>
      </DialogActions>
      

    </Dialog>
  </>
);
}



export default ListBudget;
