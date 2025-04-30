import React, { useState, useEffect } from "react";
import {
  Alert,
  FormControl,
  InputLabel,
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
  Card,
  CardContent,
  useMediaQuery,
  Select
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useTheme } from "@mui/material/styles";
import axiosPrivate from "../hooks/axiosPrivate";

export default function AlertasPage() {
  // Ejemplo de estado local con alertas

  const [itemsAmazon, setItemsAmazon] = useState([]);
  const [itemsAlibaba, setItemsAlibaba] = useState([]);
  const [OpenaddAlerta, setOpenAddAlerta] = useState(false);
  const [menuSearchTerm, setMenuSearchTerm] = useState("");
  const [tipoAlerta, setTipoAlerta] = useState(""); // Estado para almacenar el tipo de alerta seleccionado
  const [newAlerta, setNewAlerta] = useState({
    item_alibaba: "", // Producto seleccionado
    item_amazon: "", // Producto seleccionado
    end_date: "", // Fecha de fin común
    min_price: "", // Precio mínimo
    max_price: "", // Precio máximo
  });
  const [rangos, setRangos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null); // Estado para manejar errores

  // Para el diálogo de edición
  const [openEditAlerta, setOpenEditAlerta] = useState(false);
  const [editAlerta, setEditAlerta] = useState(
    {
      item_alibaba: "",
      item_amazon_title: "",
      item_alibaba_title: "",
      item_amazon: "",
      end_date: "",
      min_price: "",
      max_price: "",
    }
  );

  // Para el menú de acciones en cada fila/tarjeta
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);

  // Campo de búsqueda
  const [searchTerm, setSearchTerm] = useState("");

  // Tema y media query para responsividad
  const theme = useTheme();
  // Si la pantalla es menor o igual a "sm", pasamos a vista tipo tarjetas
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // Funciones de edición y eliminación
  const handleEdit = (alerta) => {
    setOpenEditAlerta(true);
     let tipo = ""
    if (alerta.item_amazon) {
      tipo = "precio_maximo"
    } else if (alerta.item_alibaba) {
      tipo = "precio_minimo"
    }
    setTipoAlerta(tipo);
    const idItem = alerta.item_amazon || alerta.item_alibaba;
    axiosItems_amazon(idItem);
    setEditAlerta(alerta);
    handleCloseMenu();
  };
  const handleDelete = (alertaId) => {
    //llamar a la api para eliminar la alerta
    const response = axiosPrivate.delete(`/alerts/${alertaId}/`);
    if (response.status !== 204) {
      console.error("Error al eliminar la alerta:", response.data);
      setError("Error al eliminar la alerta. Por favor, inténtelo de nuevo.");
      setTimeout(() => {
        setError(null);
      }, 1000);
      return;
    }
    setAlertas((prev) => prev.filter((a) => a.id !== alertaId));
    handleCloseMenu();
  };

  const handleCloseEditAlerta = () => {
    setOpenEditAlerta(false);
    setEditAlerta({
      item_alibaba: "",
      item_amazon_title: "",
      item_alibaba_title: "",
      item_amazon: "",
      end_date: "",
      min_price: "",
      max_price: "",
    });
    setTipoAlerta(""); // Reiniciar tipo de alerta
  };

  const handleCloseAddAlert = () => {
    setOpenAddAlerta(false);
    setNewAlerta({
      item_alibaba: "",
      item_amazon: "",
      end_date: "",
      min_price: "",
      max_price: "",
    });

  };
  console.log("editAlerta:", editAlerta);
  const axiosItems_amazon = async (idItem="") => {
    // Si se pasa un idItem, filtrar los items de Amazon por ese id
    if (idItem) {
      const response = await axiosPrivate.get(`/items_amazon/${idItem}/`);
      setItemsAmazon([response.data]);
      return;
    }
    const response = await axiosPrivate.get("/items_amazon/");
    setItemsAmazon(response.data);
  };
  const axiosItems_alibaba = async () => {
    const response = await axiosPrivate.get("/items_alibaba/");
    setItemsAlibaba(response.data);
  };
  
  const axiosAlertas = async () => {
    const response = await axiosPrivate.get("/alerts/");
    setAlertas(response.data);
  };

  useEffect(() => {
    if(tipoAlerta === "precio_maximo"){
      axiosItems_amazon();
    }else if(tipoAlerta === "precio_minimo"){
      axiosItems_alibaba();
    }
    axiosAlertas();
  }, [tipoAlerta]);

  // Crear nueva alerta
  const handleCreate = async () => {
    //llamar a la api para crear la alerta
    const response = await axiosPrivate.post("/alerts/", newAlerta);
    if (response.status !== 201) {
      console.error("Error al crear la alerta:", response.data);
      setError("Error al crear la alerta. Por favor, inténtelo de nuevo.");
      setTimeout(() => {
        setError(null);
      }, 1000);
      return;
    }else{
      setSuccess("Alerta creada correctamente.");
      setTimeout(() => {
        setSuccess(null); // Limpiamos el mensaje luego de 3 s
        axiosAlertas();
        setNewAlerta({
          item_alibaba: "",
          item_amazon: "",
          end_date: "",
          min_price: "",
          max_price: "",
        });
        setTipoAlerta(""); // Reiniciar tipo de alerta
        setOpenAddAlerta(false);  //cerrar el diálogo de creación
      }, 1000);
    }

  };

  const handleSaveChanges = async () => {
    try {
      const response = await axiosPrivate.put(
        `/alerts/${editAlerta.id}/`,
        editAlerta
      );
      if (response.status !== 200) {
        console.error("Error al actualizar la alerta:", response.data);
        setError("Error al actualizar la alerta. Por favor, inténtelo de nuevo.");
        setTimeout(() => {
          setError(null);
        }, 1000);
        return;
      }
  
      // Mostramos el mensaje y lo mantenemos 3 s
      setSuccess("Alerta actualizada correctamente.");
      setTimeout(() => {
        setSuccess(null); // Limpiamos el mensaje después de 3 s
        setOpenEditAlerta(false);    // <-- cerramos el diálogo aquí, tras 3 s
        setEditAlerta({
          item_alibaba: "",
          item_amazon_title: "",
          item_alibaba_title: "",
          item_amazon: "",
          end_date: "",
          min_price: "",
          max_price: "",
        });
      }, 1000);
  
      // Actualizar listados inmediatamente
      setAlertas((prev) =>
        prev.map((a) => (a.id === editAlerta.id ? editAlerta : a))
      );
    } catch (err) {
      console.error("Error al actualizar la alerta:", err);
    } finally {
      setTipoAlerta("");
    }
  };
  

  // Menú de acciones
  const handleClickMenu = (event, rowId) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowId(rowId);
    setError(null); // Limpiar error al abrir el menú
  };
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedRowId(null);
    setError(null); // Limpiar error al cerrar el menú
  };
 

  // Filtro de búsqueda simple por nombre de producto
  const filteredAlertas = alertas.filter((alerta) => {
    if (!searchTerm) return true;
    return (alerta.item_amazon_title || alerta.item_alibaba_title)
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  const handleTipoAlertaChange = (tipo) => {
    setTipoAlerta(tipo);
    // Reiniciar valores al cambiar el tipo de alerta
    setNewAlerta({
      item_alibaba: "",
      item_amazon: "",
      end_date: "",
      min_price: "",
      max_price: "",
      rango: "",
    });
  };

  const filteredItems = tipoAlerta === "precio_minimo"
  ? itemsAlibaba.filter((item) =>
      item.title.toLowerCase().includes(menuSearchTerm.toLowerCase())
    )
  : itemsAmazon.filter((item) =>
      item.title.toLowerCase().includes(menuSearchTerm.toLowerCase())
    );

  const getRango = async (item_alibaba) => {
    if (tipoAlerta === "precio_minimo") {
      const rango_precios = await axiosPrivate.get(`/price_range/`)
      const rangosUnicos = rango_precios.data.filter((rango) => rango.item === item_alibaba);
      if (rangosUnicos.length > 0) {
        setRangos(rangosUnicos);
      }
    }

  };
  useEffect(() => {
    getRango(newAlerta.item_alibaba);
  }, [newAlerta.item_alibaba]);

  console.log("Nueva alerta:", newAlerta);
  console.log("alertas:", alertas);
  console.log("item_alibaba:", itemsAlibaba);
  console.log("item_amazon:", itemsAmazon);
  return (
    <Container sx={{ mt: 3 }}>
      {/* Encabezado: Título, búsqueda, y botón "Crear Alerta" */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2
        }}
      >
        <Typography variant="h4" component="h1" sx={{ mb: { xs: 1, sm: 0 } }}>
          Alertas
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          {/* Campo de búsqueda */}
          <TextField
            placeholder="Buscar alerta..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* Botón para crear una nueva alerta */}
          <Button variant="contained" onClick={() => setOpenAddAlerta(true)}>
            Crear Alerta
          </Button>
        </Box>
      </Box>

      {/* 
        Si NO es pantalla pequeña => Mostrar Tabla
        Si es pequeña => Mostrar Cards 
      */}
      {!isSmallScreen ? (
        /* ===================== VISTA EN TABLA (pantallas >= sm) ===================== */
        <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Fecha Inicio</TableCell>
                <TableCell>Fecha Fin</TableCell>
                <TableCell>Precio Mínimo</TableCell>
                <TableCell>Precio Máximo</TableCell>
                <TableCell align="center" width={50}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAlertas.map((alerta) => (
                <TableRow key={alerta.id}>
                  <TableCell>{alerta.item_alibaba_title || alerta.item_amazon_title}</TableCell>
                  <TableCell>{alerta.start_date}</TableCell>
                  <TableCell>{alerta.end_date}</TableCell>
                  <TableCell>${alerta.min_price}</TableCell>
                  <TableCell>${alerta.max_price}</TableCell>
                  <TableCell align="center">
                    {/* Menú de acciones */}
                    <IconButton
                      onClick={(e) => handleClickMenu(e, alerta.id)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                    {selectedRowId === alerta.id && (
                      <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleCloseMenu}
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "right"
                        }}
                        transformOrigin={{
                          vertical: "top",
                          horizontal: "right"
                        }}
                      >
                        <MenuItem onClick={() => handleEdit(alerta)}>
                          Editar
                        </MenuItem>
                        <MenuItem onClick={() => handleDelete(alerta.id)}>
                          Eliminar
                        </MenuItem>
                      </Menu>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {filteredAlertas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No hay alertas disponibles
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        /* ===================== VISTA EN TARJETAS (pantallas < sm) ===================== */
        <Box sx={{ mt: 2 }}>
          {filteredAlertas.length > 0 ? (
            filteredAlertas.map((alerta) => (
              <Card key={alerta.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    {alerta.item_alibaba_title || alerta.item_amazon_title}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Fecha Inicio: </strong> {alerta.start_date}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Fecha Fin: </strong> {alerta.end_date}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Precio Mín: </strong>${alerta.min_price}{" "}
                    | <strong>Máx: </strong>${alerta.max_price}
                  </Typography>

                  {/* Menú de acciones (IconButton con MoreVert) */}
                  <Box sx={{ textAlign: "right", mt: 1 }}>
                    <IconButton
                      onClick={(e) => handleClickMenu(e, alerta.id)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                    {selectedRowId === alerta.id && (
                      <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleCloseMenu}
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "right"
                        }}
                        transformOrigin={{
                          vertical: "top",
                          horizontal: "right"
                        }}
                      >
                        <MenuItem onClick={() => handleEdit(alerta)}>
                          Editar
                        </MenuItem>
                        <MenuItem onClick={() => handleDelete(alerta.id)}>
                          Eliminar
                        </MenuItem>
                      </Menu>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))
          ) : (
            <Typography align="center" variant="body1">
              No hay alertas con ese criterio.
            </Typography>
          )}
        </Box>
      )}


      {/* Dialog para crear alerta */}
      <Dialog open={OpenaddAlerta} onClose={() => setOpenAddAlerta(false)} >
        <DialogTitle>Crear Alerta</DialogTitle>
        <DialogContent>
          {/* Selección del tipo de alerta */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <Button
              sx={{ fontSize: "10px" }}
              variant={tipoAlerta === "precio_minimo" ? "contained" : "outlined"}
              color="primary"
              onClick={() => handleTipoAlertaChange("precio_minimo")}
            >
              Precio Mínimo
            </Button>
            <Button
              sx={{ fontSize: "10px" }}
              variant={tipoAlerta === "precio_maximo" ? "contained" : "outlined"}
              color="primary"
              onClick={() => handleTipoAlertaChange("precio_maximo")}
            >
              Precio Máximo
            </Button>
          </div>

          {/* Campo de búsqueda y lista de productos */}
          <TextField
          
            label="Buscar Producto"
            placeholder="Buscar..."
            value={menuSearchTerm}
            onChange={(e) => setMenuSearchTerm(e.target.value)}
            fullWidth
            style={{ marginBottom: "10px", fontSize: "10px" }}
          />
          
          
          <FormControl fullWidth margin="dense">
            <InputLabel id="select-product-label">Producto seleccionado</InputLabel>
            <Select
              labelId="select-product-label"
              id="select-product"
              label="Producto seleccionado"
              value={
                tipoAlerta === "precio_minimo"
                  ? newAlerta.item_alibaba
                  : newAlerta.item_amazon
              }
              onChange={
                tipoAlerta === "precio_minimo"
                  ? (e) =>
                      setNewAlerta({
                        ...newAlerta,
                        item_alibaba: e.target.value,
                      })
                  : (e) =>
                      setNewAlerta({
                        ...newAlerta,
                        item_amazon: e.target.value,
                      })
              }
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 400,
                    width: 250,         // ancho del desplegable
                  },
                },
                anchorOrigin: {
                  vertical: "bottom",
                  horizontal: "left",
                },
                transformOrigin: {
                  vertical: "top",
                  horizontal: "left",
                },
              }}
            >
              {filteredItems.map((item) => (
                <MenuItem key={item.id} value={item.id} sx={{ fontSize: "0.875rem" }}>
                  {item.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {tipoAlerta === "precio_minimo" && (
          <FormControl fullWidth margin="dense">
            <InputLabel id="select-range-label">Seleccionar Rango</InputLabel>
            <Select
              labelId="select-range-label"
              id="select-range"
              label="Seleccionar Rango"
              value={newAlerta.rango}
              onChange={(e) =>
                setNewAlerta({ ...newAlerta, rango: e.target.value })
              }
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 200,
                    width: 200,
                  },
                },
                anchorOrigin: {
                  vertical: "bottom",
                  horizontal: "left",
                },
                transformOrigin: {
                  vertical: "top",
                  horizontal: "left",
                },
              }}
            >
              {rangos.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.minimo_range} – {item.maximo_range}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          )}

          {/* Campos comunes para ambas alertas */}
          <TextField
            fullWidth
            margin="dense"
            label="Fecha de Fin"
            type="date"
            value={newAlerta.end_date}
            onChange={(e) => setNewAlerta({ ...newAlerta, end_date: e.target.value })}
            slotProps={{
              inputLabel: { shrink: true },
            }}
            sx={{ marginBottom: "10px", fontSize: "5px" }}
          />

          <TextField
           
            fullWidth
            margin="dense"
            label="Precio Actual"
            type="number"
            value={itemsAmazon.find(item => item.id === newAlerta.item_amazon)?.price || itemsAlibaba.find(item => item.id === newAlerta.item_alibaba)?.price || ""}
            disabled
            style={{ marginBottom: "10px", fontSize: "10px" }}
          />

          <TextField
            
            fullWidth
            margin="dense"
            label={tipoAlerta === "precio_minimo" ? "Precio Mínimo" : "Precio Máximo"}
            type="number"
            value={tipoAlerta === "precio_minimo" ? newAlerta.min_price : newAlerta.max_price}
            error={tipoAlerta === "precio_minimo" ? newAlerta.min_price < newAlerta.current_price : newAlerta.max_price > newAlerta.current_price}
            onChange={(e) =>
              setNewAlerta({
                ...newAlerta,
                min_price: tipoAlerta === "precio_minimo" ? e.target.value : newAlerta.min_price,
                max_price: tipoAlerta === "precio_maximo" ? e.target.value : newAlerta.max_price,
              })
            }
            style={{ marginBottom: "10px", fontSize: "10px" }}
          />
          {error && (
            <Alert severity="error" style={{ marginBottom: "10px" }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" style={{ marginBottom: "10px" }}>
              {success}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddAlert}>Cancelar</Button>
          <Button onClick={handleCreate}>Crear</Button>
        </DialogActions>
      </Dialog>


      {/* Dialog de Edición */}
      
        <Dialog open={Boolean(openEditAlerta)} onClose={() => openEditAlerta(false)}>
          
          <DialogTitle>Editar Alerta</DialogTitle>
          <DialogContent>
            <MuiTextField
              fullWidth
              margin="dense"
              label="Nombre del Producto"
              value={editAlerta.item_amazon_title || editAlerta.item_alibaba_title}
              disabled
            />

            <MuiTextField
              fullWidth
              margin="dense"
              label="Fecha de Fin"
              type="date"
              value={editAlerta.end_date}
              onChange={(e) =>
                setEditAlerta({ ...editAlerta, end_date: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
            />
            <MuiTextField
              fullWidth
              margin="dense"
              label="precio actual"
              type="number"
              value={itemsAmazon.find(item => item.id === editAlerta.item_amazon)?.price || itemsAlibaba.find(item => item.id === editAlerta.item_alibaba)?.price || 0}
              disabled
            />
            <MuiTextField
              fullWidth
              margin="dense"
              label={tipoAlerta === "precio_minimo" ? "Precio Mínimo" : "Precio Máximo"}
              type="number"
              value={tipoAlerta === "precio_minimo" ? editAlerta.min_price : editAlerta.max_price}
              onChange={(e) =>
                setEditAlerta({
                  ...editAlerta,
                  min_price: tipoAlerta === "precio_minimo" ? e.target.value : editAlerta.min_price,
                  max_price: tipoAlerta === "precio_maximo" ? e.target.value : editAlerta.max_price,
                })
              }
            />

          {success && 
          (
            <Alert severity="success" sx={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: "90%" }}>
              {success}
            </Alert>
          )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditAlerta}>Cancelar</Button>
            <Button onClick={handleSaveChanges} color="primary">
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      
    </Container>
  );
}
