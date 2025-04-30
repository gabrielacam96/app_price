import React, { useState, useEffect } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, IconButton, TextField, Button, MenuItem,FormControl,InputLabel,Checkbox,ListItemText,
  Select,Box,Card, CardContent,Alert
} from "@mui/material";
import { Visibility, Edit, Delete, Download, Add } from "@mui/icons-material";
import axiosPrivate from "../hooks/axiosPrivate";
import { responsiveFontSizes, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

function ListBudget() {
  const [presupuestos, setPresupuestos] = useState([]);
  const [itemsBudgetSelected, setItemsBudgetSelected] = useState([]);
  const [itemsAlibabaBudgetSelected, setItemsAlibabaBudgetSelected] = useState([])

  const [selectedBudget, setSelectedBudget] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Para editar lista de presupuestos e items
  const [avaliableEditItem, setavaliableEditItem] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");

  // Para añadir
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState("");
  const [itemsSeguimiento, setItemsSeguimiento] = useState([]);
  const [newItemsSeguimientoSelected, setNewItemsSeguimientoSelected] = useState([]);
  const [addItemBudget, setAddItemBudget] = useState(false);

  //logs
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    getBudgets();
    getItemsSeguimiento();
  }, []);

  console.log("itemsSeguimiento",itemsSeguimiento);
  console.log("aliaba",itemsAlibabaBudgetSelected)

  //funcion para obtener los items 
 const getItemsSeguimiento = async () => {
  try {
    const response = await axiosPrivate.get(`/following/`);
    if (response.status === 200) {
      const itemsSeguimientoId = response.data.map((item) => item.items)  ;
      
      const itemsSeguimiento = []
      // unir los arrays de itemsSeguimientoId
      const itemsSeguimientoIdUnidos = itemsSeguimientoId.reduce((acc, val) => acc.concat(val), []);
      if (itemsSeguimientoIdUnidos.length === 0) {
        console.log("No hay items de seguimiento disponibles.");
        return;
      }
      const promises = itemsSeguimientoIdUnidos.map((item) =>
        axiosPrivate.get(`/items_alibaba/${item}`)
      );

      const responses = await Promise.all(promises);
      responses.forEach((response, index) => {
        if (response.status === 200) {
          itemsSeguimiento.push(response.data);
        } else {
          console.error("Error al obtener el item:")
        }
      });
      setItemsSeguimiento(itemsSeguimiento);
    }
  } catch (error) {
    console.error("Error al obtener items de seguimiento",error)
    setError("Error al obtener items de seguimiento. Por favor, inténtelo de nuevo más tarde.");
    setTimeout(() => {
      setError(null);
    }, 3000);
  }
 }

  //  Obtener lista de presupuestos

  const getBudgets = async () => {
    try {
      const response = await axiosPrivate.get("/budgets/");
      if (response.status === 200) {
        setPresupuestos(response.data);
      }
    } catch (error) {
      console.error("Error al obtener presupuestos",error);
      setError("Error al obtener presupuestos")
      setTimeout(()=>{
        setError(null);
      },1000);
    }
  };

 
  //  Obtener items de un presupuesto

  const getItemsBudget = async (id) => {
    try {
      const response = await axiosPrivate.get(`/list_budget/?lista=${id}`);
      if (response.status === 200) {
        const items = response.data;
        setItemsBudgetSelected(items);
        const promises = items.map((item) =>
          axiosPrivate.get(`/items_alibaba/${item.item}`)
        );
        const responses = await Promise.all(promises);
        
        const alibabaItems = responses.map((res) => res.data);
        
        setItemsAlibabaBudgetSelected(alibabaItems);
      }
    } catch (error) {
      console.error("Error al obtener items del presupuesto",error);
      setError("Error al obtener items del presupuesto")
      setTimeout(()=>{
        setError(null);
      },1000);
      
    }
  };

 
  //  Ver presupuesto (mostrar productos)
  const handleVerPresupuesto = async (budget) => {
    setSelectedBudget(budget);
    await getItemsBudget(budget.id);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedBudget(null);
    setItemsBudgetSelected([]);
  };

  const getTotalPrice = (price, units) => price * units;

  
  //  Eliminar presupuesto
  
  const handleEliminar = async (id) => {
    try {
      await axiosPrivate.delete(`/budgets/${id}/`)
      console.log("Presupuesto eliminado.");
      setSuccess("PresupuestoEliminado")
      setTimeout(()=>{
        setSuccess(null);
      },1000);
      getBudgets();
    } catch (error) {
      console.error("Error al eliminar al eliminar presupuesto",error);
      setError("error al eliminar presupuesto")
      setTimeout(()=>{
        setError(null);
      },1000);
    }
  };

  
  //  Descargar PDF
  
  const handleDownloadPDF = async (id) => {
    try {
      const response = await axiosPrivate.get(`budgets/${id}/pdf/`);
      if (response.status === 200) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `presupuesto_${id}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log("PDF descargado correctamente.");
        setSuccess("PDF descargado correctamente.")
        setTimeout(()=>{
          setSuccess(null);
        },1000);
      }
    } catch (error) {
      console.error("Error al descargar PDF:", error);
      setError("Error al descragar el pdf del presupuesto")
      setTimeout(()=>{
        setError(null);
      },1000);
    }
  };

  
  //  Editar presupuesto
  
  const handleEditar = async (budget) => {
    setSelectedBudget(budget);
    setEditName(budget.name);
    setIsValid(true);
    setEditDialogOpen(true);
  };
  const isValidText = (text) => {
    const regex = /^[a-zA-Z0-9\s]+$/; // Permite letras (mayúsculas y minúsculas), números y espacios
    return regex.test(text);
  };

  const handleNewBudgetName = (e) => {
    setNewBudgetName(e.target.value)
    const valido = isValidText(newBudgetName)
    setIsValid(valido);
    console.log("es valido", valido)
    if (!valido){
      setError("El nombre no es valido");
      setTimeout(()=>{
        setError(null);
      },1000)
      
    }
    
  }

  const handleSaveEdit = async () => {
    //ediatr el nombre del budget o añadir nuevos items
    if (!selectedBudget) return;
    try {
        if(editName != ""){
          
          
            await axiosPrivate.patch(`/budgets/${selectedBudget.id}/`, {
              name: editName,
            });
          
        }

        if(newItemsSeguimientoSelected.length !== 0){
          const promise = newItemsSeguimientoSelected.map((item)=>
            axiosPrivate.post(`/list_budget/`, {
              lista: selectedBudget.id,
              item: item.id,
              units: item.min_order,
              shipping_cost: 1,
            }))

          await Promise.all(promise)
        }
      
        
        console.log("Presupuesto actualizado con éxito.");
        setSuccess("Presupuesto actualizado con éxito.")
        setTimeout(()=>{
          setSuccess(null);
          setEditDialogOpen(false);
          setSelectedBudget(null);
          getBudgets();
          getItemsBudget(selectedBudget.id);
          setNewItemsSeguimientoSelected([]);
          setAddItemBudget(false);
          setEditName("")
        },1000);
    } catch (error) {
      console.error("Error al actualizar:", error);
      setError("Error al actualizar el presupuesto")
      setTimeout(()=>{
        setError(null);
        setNewItemsSeguimientoSelected([]);
        setAddItemBudget(false);
        setEditName("")
      },1000);
    }
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedBudget(null);
    setAddItemBudget(false);
    setNewItemsSeguimientoSelected([]);
  };

  
  //  Añadir presupuesto
  
  const handleAddBudget = () => {
    setIsValid(true);
    setNewBudgetName("");
    setAddDialogOpen(true);
  };

  const handleSaveNewBudget = async () => {
    try {
        console.log("datos a enviar",newBudgetName,[newItemsSeguimientoSelected]);

          if (newItemsSeguimientoSelected.length !== 0 && newBudgetName !== "") {
            try {
              const response = await axiosPrivate.post("/budgets/", {
                  name: newBudgetName,
                  items: [],
              });

            if (response.status === 201) {
                const getBudgetResponse = await axiosPrivate.get(`/budgets/?name=${newBudgetName}`);
                const budgetId = getBudgetResponse.data[0].id;
                console.log("get",getBudgetResponse.data)
                const promises = newItemsSeguimientoSelected.map((item) =>
                      axiosPrivate.post("/list_budget/", {
                          lista: budgetId,
                          item: item.id,
                          units: item.min_order,
                          shipping_cost: 1,
                      })
                );

                await Promise.all(promises);

                console.log("Presupuesto creado con éxito.");
                setSuccess("Presupuesto creado con éxito");
                setTimeout(() => {
                  setSuccess(null);
                  setAddDialogOpen(false);
                  getBudgets();
                  setNewItemsSeguimientoSelected([])
                }, 1000);
            }
              } catch (error) {
                console.error("Error al crear el presupuesto:", error);
                setError("Error al crear el presupuesto");
                setTimeout(() => {
                    setError(null);
                }, 1000);
              }
          
        }else if (newBudgetName !== ""){
          
              const response = await axiosPrivate.post("/budgets/",
              { name: newBudgetName });
              if (response.status === 201) {
                  console.log("Presupuesto creado con éxito.");
                  setSuccess("Presupuesto creado con éxito");
                  setTimeout(()=>{
                    setSuccess(null);
                    setAddDialogOpen(false);
                    getBudgets();
                    setNewItemsSeguimientoSelected([])
                  },1000)

              }
        }
    } catch (error) {
      console.error("Error al crear:", error);
      setError("Error al crear el presupuesto")
       setTimeout(()=>{
        setError(null);
      },1000);
    }
  };

  console.log("ItemsBudget selecionado",itemsBudgetSelected);
  const saveChangesItems = async () => {

    try {
      // Montamos todas las promesas de actualización
      const promises = itemsBudgetSelected.map(item =>
        axiosPrivate.put(
          `/list_budget/${item.id}/`, 
          {
            lista:          item.lista,
            item:           item.item,
            units:          item.units,
            shipping_cost:  item.shipping_cost,
          }
        )
      );
      // Esperamos a que todas terminen
      const responses = await Promise.all(promises);
  
      // Opcional: comprueba que todas devolvieron 2xx
      if (responses.every(res => res.status >= 200 && res.status < 300)) {
        console.log("Items actualizados con éxito.");
        setSuccess("Actualizado con exito");
        setTimeout(()=>{
          setSuccess(null);
          setavaliableEditItem(false);
          getBudgets();
          getItemsBudget(selectedBudget.id)
        },1000)

      }
    } catch (error) {
      console.error("Error al actualizar alguno de los items:", error);
      setError("Error al actualizar algunos de los items")
      setTimeout(()=>{
        setError(null);
      },1000);
    }
  };
  
  const handleChangeItem = async (id, field, value) => {

    //field como units o coste de envio modificables
    //comprobar que las unidades son mayor a cero y mayor que las minimas
    
    if(field === 'units'){
      const Item = itemsBudgetSelected.find((item) => item.id === id);
      const response = await axiosPrivate.get(`/items_alibaba/${Item.item}`)
      const orden_minima =  response.data.min_order
      console.log("orden minima",response.data)
      if(!value){
        setError("")
      }
      else if(value<0){
        setError("El valor debe ser  mayor a cero")
        setTimeout(()=>{
          setError(null)
        },1000)
      }else if(value < orden_minima){
        setError(`El valor debe ser mayor a la orden minimo ${orden_minima}`);
        setTimeout(()=>{
          setError(null)
        },1000)
      }
    }else{
      //field cost envio
      if(!value){
        setError("")
      }
      else if (value <0){
        setError("El valor debe ser  mayor a cero")
        setTimeout(()=>{
          setError(null)
        },1000)
      }
    }

    setItemsBudgetSelected((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      }
    ));
    

  };
  
  const handleDeleteItem = async (id) => {
    try {
        await axiosPrivate.delete(`/list_budget/${id}/`);
      
        console.log("Item eliminado con éxito.");
        getBudgets();
        getItemsBudget(selectedBudget.id);
    } catch (error) {
      console.error("Error al eliminar el item:", error);
      setError("Error al eliminar item del presupuesto")
      setTimeout(()=>{
        setError(null);
      },1000);
    }
      
    
  
  };

  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
  };
  const handleEditNameBudget = (e) => {
    setEditName(e.target.value);
    const valido = isValidText(editName)
    setIsValid(valido)
    
    if (!valido){
      setError("Nombre no es valido");
      setTimeout(()=>{
        setError(null);
      },1000)
    }
  }
  
   // Detectamos si la pantalla es "pequeña" (por ejemplo, menor a "md")
   const theme = useTheme();
   const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
    console.log("alibaba items", itemsAlibabaBudgetSelected)
   return (
     <>
       {/* 
         Condicional: si la pantalla es grande (>=sm), mostramos la tabla;
         si es pequeña (<sm), mostramos las tarjetas.
       */}
       { !isSmallScreen ? (
         /* ====================== VISTA EN TABLA (Pantallas grandes) ====================== */
         <TableContainer
            component={Paper}
            sx={{
              p: "10px",
              width: '90%',           // 🔒 se adapta al contenedor padre
              maxWidth: '100vw',       // 🔒 no se sale del viewport
              overflowX: 'auto',
              margin: '0 auto', // Centra horizontalmente 
            }}
          >
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
           <Table>
             <TableHead>
               <TableRow>
                 <TableCell>Presupuesto</TableCell>
                 <TableCell>Nº artículos</TableCell>
                 <TableCell>Coste Total</TableCell>
                 <TableCell>Coste envío</TableCell>
                 <TableCell align="center">
                   <Button
                     startIcon={<Add />}
                     variant="contained"
                     onClick={handleAddBudget}
                   >
                     Añadir
                   </Button>
                 </TableCell>
               </TableRow>
             </TableHead>
             <TableBody>
               {presupuestos.length != 0 ? (presupuestos.map((presupuesto) => (
                 <TableRow key={presupuesto.id}>
                   <TableCell>{presupuesto.name}</TableCell>
                   <TableCell>{presupuesto.n_items_total}</TableCell>
                   <TableCell>{presupuesto.total_amount}€</TableCell>
                   <TableCell>{presupuesto.shipping_cost_total}€</TableCell>
                   <TableCell align="center">
                     <IconButton onClick={() => handleVerPresupuesto(presupuesto)}>
                       <Visibility />
                     </IconButton>
                     <IconButton onClick={() => handleEditar(presupuesto)}>
                       <Edit />
                     </IconButton>
                     <IconButton
                       onClick={() => handleEliminar(presupuesto.id)}
                       color="error"
                     >
                       <Delete />
                     </IconButton>
                     <IconButton
                       onClick={() => handleDownloadPDF(presupuesto.id)}
                       color="primary"
                     >
                       <Download />
                     </IconButton>
                   </TableCell>
                 </TableRow>
               ))):(
               <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No hay listas de presupuestos disponibles.
                  </Typography>
                </TableCell>
              </TableRow>
              )}
             </TableBody>
           </Table>
         </TableContainer>
       ) : (
         /* ====================== VISTA EN TARJETAS (Pantallas pequeñas) ====================== */
         <Box sx={{ p: 1 }}>
           {/* Botón para añadir (equivalente al que está en la cabecera) */}
           <Box sx={{ textAlign: "end", mb: 2 }}>
             <Button
               startIcon={<Add />}
               variant="contained"
               onClick={handleAddBudget}
             >
               Añadir
             </Button>
           </Box>
 
           {presupuestos.map((presupuesto) => (
             <Card key={presupuesto.id} sx={{ mb: 2 }}>
               <CardContent>
                 <Typography variant="subtitle1">
                   <strong>Presupuesto:</strong> {presupuesto.name}
                 </Typography>
                 <Typography variant="body2">
                   <strong>Nº artículos:</strong> {presupuesto.n_items_total}
                 </Typography>
                 <Typography variant="body2">
                   <strong>Coste Total:</strong> {presupuesto.total_amount}€
                 </Typography>
                 <Typography variant="body2" sx={{ mb: 1 }}>
                   <strong>Coste envío:</strong> {presupuesto.shipping_cost_total}€
                 </Typography>
                 <Box sx={{ textAlign: "right" }}>
                   <IconButton onClick={() => handleVerPresupuesto(presupuesto)}>
                     <Visibility />
                   </IconButton>
                   <IconButton onClick={() => handleEditar(presupuesto)}>
                     <Edit />
                   </IconButton>
                   <IconButton
                     onClick={() => handleEliminar(presupuesto.id)}
                     color="error"
                   >
                     <Delete />
                   </IconButton>
                   <IconButton
                     onClick={() => handleDownloadPDF(presupuesto.id)}
                     color="primary"
                   >
                     <Download />
                   </IconButton>
                 </Box>
               </CardContent>
             </Card>
           ))}
         </Box>
       )}
 
       {/* Dialog para ver productos de un presupuesto */}
      <Dialog
         open={Boolean(selectedBudget) && dialogOpen}
         onClose={handleCloseDialog}
         maxWidth="md"
         fullWidth
       >
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
      <DialogTitle>
        Detalles del Presupuesto: {selectedBudget?.name}
      </DialogTitle>
      <DialogContent dividers>
        {itemsBudgetSelected.length === 0 ? (
          <Typography>No hay productos para este presupuesto.</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' /* para scroll horizontal si hiciera falta */ }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell>Unidades</TableCell>
                  <TableCell>Orden minima</TableCell>
                  <TableCell>Coste envío (€)</TableCell>
                  <TableCell>Precio Unitario (€)</TableCell>
                  <TableCell>Importe Total (€)</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itemsBudgetSelected.map((item, index) => {
                  const itemAlibaba = itemsAlibabaBudgetSelected[index];

                  return (
                    <TableRow key={item.id}>
                      {/* 1) Producto: texto plano */}
                      <TableCell>
                        <a href= {itemAlibaba ? itemAlibaba.url:""} >
                        
                        {item.item_name}
                        </a>
                      </TableCell>

                      {/* 2) Unidades: campo numérico editable */}
                      <TableCell>
                        {avaliableEditItem? (
                          <TextField
                            type="number"
                            variant="standard"
                            value={item.units}
                            onChange={(e) =>
                              handleChangeItem(item.id, "units", e.target.value)
                            }
                            inputProps={{ min: 0, style: { width: "4ch" } }}
                          />
                        ) : (
                          item.units
                        )}
                      </TableCell>

                      {/* 3) Mínimo de pedido desde Alibaba */}
                      <TableCell>
                        {itemAlibaba ? itemAlibaba.min_order : "-"}
                      </TableCell>

                      {/* 4) Coste envío: campo numérico editable */}
                      <TableCell>
                        {avaliableEditItem ? (
                          <TextField
                            type="number"
                            variant="standard"
                            value={item.shipping_cost}
                            onChange={(e) =>
                              handleChangeItem(item.id, "shipping_cost", e.target.value)
                            }
                            inputProps={{ min: 0, step: 0.01, style: { width: "6ch" } }}
                          />
                        ) : (
                          `${item.shipping_cost} €`
                        )}
                      </TableCell>

                      {/* 5) Precio unitario: sólo lectura */}
                      <TableCell>
                        {`${item.price_calculated} €`}
                      </TableCell>

                      {/* 6) Importe total: cálculo en tiempo real */}
                      <TableCell>
                        {`${getTotalPrice(item.price_calculated, item.units)} €`}
                      </TableCell>

                      {/* 7) Acciones: botón para eliminar */}
                      <TableCell>
                        <IconButton
                          onClick={() => handleDeleteItem(item.id)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </DialogContent>
         <DialogActions>
          {avaliableEditItem && (
          <Button onClick={() => saveChangesItems()} variant="contained">
              Guardar cambios  
            </Button>
          )}
         <Button onClick={() => setavaliableEditItem(true)} variant="contained">
             Editar
          </Button>
          <Button onClick={handleCloseDialog} variant="contained">
             Cerrar
          </Button>
         </DialogActions>
      </Dialog>
 
       {/* Dialog para editar presupuesto (solo nombre y selecion de productos) */}
       <Dialog open={editDialogOpen} onClose={handleCloseEditDialog}>
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
         <DialogTitle>Editar Presupuesto</DialogTitle>
         <DialogContent>
           <TextField
             label="Nombre del presupuesto"
             value={editName}
             onChange={handleEditNameBudget}
             fullWidth
             sx={{ mt: 2 }}
           />
           {addItemBudget && (
            <FormControl fullWidth sx={{ mt: 2 }}>
             <InputLabel id="checkbox-select-label">Seleccione los productos a añadir</InputLabel>
             <Select
               labelId="checkbox-select-label"
               multiple
               value={newItemsSeguimientoSelected}
               onChange={(e) => {
                 setNewItemsSeguimientoSelected(e.target.value);
                 }}
                 
               >
                 {itemsSeguimiento.length !==0 ?(
                 itemsSeguimiento.map((item) => (
                   <MenuItem key={item} value={item}>
                   <ListItemText primary={item.title} />
                   </MenuItem>
                 ))):(
                   <MenuItem value="" disabled={itemsSeguimiento.length === 0}>
                   <ListItemText primary="No hay productos disponibles" />
                   </MenuItem>
                 )}
               </Select>
               </FormControl>
               )}
             </DialogContent>
             <DialogActions>
                {!addItemBudget && (
                <Button onClick={() => setAddItemBudget(true)} variant="contained" disabled={!isValid}>
                    Añadir productos
                </Button>
                )}
               <Button onClick={handleCloseEditDialog}variant="contained">Cancelar</Button>
               <Button onClick={handleSaveEdit} variant="contained" disabled={!isValid}>
                  Guardar
               </Button>
             </DialogActions>
      </Dialog>
         
        {/* Dialog para añadir presupuesto Nuevo */}
       <Dialog open={addDialogOpen} onClose={handleCloseAddDialog}>
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
         <DialogTitle>Añadir nuevo presupuesto</DialogTitle>
         <DialogContent>
           <TextField
             label="Nombre del nuevo presupuesto"
             value={newBudgetName}
             onChange={handleNewBudgetName}
             fullWidth
             sx={{ mt: 2 }}
           />
           <FormControl fullWidth sx={{ mt: 2 }}>
             <InputLabel id="checkbox-select-label">Seleccione los productos favoritos a añadir</InputLabel>
             <Select
               labelId="checkbox-select-label"
               multiple
               value={newItemsSeguimientoSelected}
               onChange={(e) => {
                 setNewItemsSeguimientoSelected(e.target.value);
               }}
             >
               {itemsSeguimiento.length !==0 ?(
                 itemsSeguimiento.map((item) => (
                   <MenuItem key={item.id} value={item}>
                     <ListItemText primary={item.title} />
                   </MenuItem>
                 ))):(
                   <MenuItem value="" disabled={itemsSeguimiento.length === 0}>
                     <ListItemText primary="No hay productos disponibles" />
                   </MenuItem>
                 )}
             </Select>
           </FormControl>
         </DialogContent>
         <DialogActions>
           <Button onClick={handleCloseAddDialog}>Cancelar</Button>
           <Button onClick={handleSaveNewBudget} variant="contained" disabled={!isValid} >
             Añadir
           </Button>
         </DialogActions>
       </Dialog>
       </>
   );
 }
 export default ListBudget;