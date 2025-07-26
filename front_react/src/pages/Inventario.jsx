import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import axiosPrivate from '../hooks/axiosPrivate';

const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Inventario() {
  const [tab, setTab] = useState(1); // 0: Ordenado, 1: Recibido
  const [ventaDialog, setVentaDialog] = useState({ open: false, item: null });
  const [ventaUnidades, setVentaUnidades] = useState(0);
  const [precioVenta, setPrecioVenta] = useState(0);
  const [addDialog, setAddDialog] = useState({ open: false, item: null });
  const [presupuestoSeleccionado, setPresupuestoSeleccionado] = useState('');
  const [inventarioRecibido, setInventarioRecibido] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [inventarioOrdenado, setInventarioOrdenado] = useState([]);
  const [addUnidades, setAddUnidades] = useState(0);

  const handleVenta = () => {
    const item = ventaDialog.item;
    const response = axiosPrivate.put(`/items-inventario/${item.id}/`, {
      item: item.item,
      unidades: item.unidades,
      vendidas: ventaUnidades,
      precio_venta: precioVenta,
      precio_compra: item.precio_compra,
      budget: item.budget,
      inventario: item.inventario
      
    })
    if (response.status === 200) {
      getBudgets();
      console.log('Venta realizada con éxito');
    }
    setVentaUnidades(0);
    setPrecioVenta(0);
    setVentaDialog({ open: false, item: null });
  };

  const handleAddToBudget = () => {
    const item = addDialog.item;

    const response = axiosPrivate.post(`/list_budget/`, {
      item: item.item,
      units: addUnidades,
      lista: presupuestoSeleccionado.id,
      shipping_cost: 1
      
    })
    if (response.status === 200) {
      console.log('Venta realizada con éxito');
    }else{
      console.log('error al agregar al presupuesto');
    }
    
    setPresupuestoSeleccionado('');
    setAddUnidades(0);
    setAddDialog({ open: false, item: null });
  };

  const getBudgets = async () => {
    try {
      const response = await axiosPrivate.get('/budgets/');
      const budgets = response.data;
      setPresupuestos(budgets);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  }

  const handleDeleteItem = async (item) => {
    try {
      await axiosPrivate.delete(`/items-inventario/${item.id}/`);
      getItemsRecibidos();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }
  const getItemsRecibidos = async () => {
    try {
      

      const items_recibidos = await axiosPrivate.get('/items-inventario/').then(
        (response) => {
          return response.data
        }
        
      )
      console.log("items_recibidos",items_recibidos);
      //const items_recibidos_combinados = combinarItemsDuplicados(items_recibidos);
      setInventarioRecibido(items_recibidos);
    } catch (error) {
      console.error('Error fetching received items:', error);
    }
  }
  console.log("presupuestos",presupuestos);
  console.log("inventarioRecibido",inventarioRecibido);
  console.log("inventarioOrdenado",inventarioOrdenado);
  //crear una funcion que me devuelva si hay items repetidos no duplicarlos sino aumentar la cantidad
  const combinarItemsDuplicados =(listaItems)=> {
    const combinados = {};
  
    listaItems.forEach(item => {
      const nombre = item.item_name;
      const unidades = item.unidades || 0;
  
      if (combinados[nombre]) {
        combinados[nombre].unidades += unidades;
      } else {
        combinados[nombre] = { ...item }; // copiamos el objeto original
      }
    });
    return Object.values(combinados);
  }  
  const getItemsOrdenados = async () => {
    try {
      const presupuestos_ordenados_id = presupuestos.filter(budget => budget.estado === 'ordenado').flatMap(budget => budget.id);
      console.log("presupuestos_ordenados_id",presupuestos_ordenados_id);

      const items_ordenados = await Promise.all(
        presupuestos_ordenados_id.map(async id=> {
          const itemResponse = await axiosPrivate.get(`/list_budget/?lista=${id}`);
          return Array.isArray(itemResponse.data) ? itemResponse.data : [itemResponse.data];
        })
      );
      const items_ordenados_combinados = combinarItemsDuplicados(items_ordenados.flat());
      console.log("items_ordenados_combinados",items_ordenados_combinados);
      setInventarioOrdenado(items_ordenados_combinados);
    } catch (error) {
      console.error('Error fetching ordered items:', error);
    }
  };
  useEffect(() => {
    getBudgets();
  }, []);
  
  useEffect(() => {
    getItemsOrdenados();
    getItemsRecibidos();
  }, [presupuestos]);

  const totalGasto = inventarioRecibido.reduce((acc, p) => acc + p.precio_compra * p.unidades, 0);
  const totalIngreso = inventarioRecibido.reduce((acc, p) => acc + p.precio_venta* p.vendidas, 0);
  const beneficio = totalIngreso - totalGasto;

  const pieData = inventarioRecibido.map(p => ({ name: p.item_name, value: p.unidades }));

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Inventario</Typography>

      <Tabs value={tab} onChange={(_, val) => setTab(val)} sx={{ mb: 2 }}>
        <Tab label="Ordenado" />
        <Tab label="Recibido" />
      </Tabs>

      {tab === 0 && //ordenado
        <Box>
          <Table component={Paper}>
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Unidades</TableCell>
                <TableCell>Precio Compra</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventarioOrdenado.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell>{item.units}</TableCell>
                  <TableCell>{item.price_calculated}€</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      }

      {tab === 1 && (
        <Box>
          <Table component={Paper}>
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Unidades Compradas</TableCell>
                <TableCell>Precio Compra</TableCell>
                <TableCell>Precio Venta</TableCell>
                <TableCell>Vendidos</TableCell>
                <TableCell>Disponible</TableCell>
                <TableCell>Gasto</TableCell>
                <TableCell>Ingreso</TableCell>
                <TableCell>Beneficio</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventarioRecibido.map(item => {
                const gasto = (item.unidades * item.precio_compra);
                const ingreso = (item.vendidas * item.precio_venta);
                const beneficioItem = ingreso - gasto;
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell>{item.unidades}</TableCell>
                    <TableCell>{item.precio_compra}€</TableCell>
                    <TableCell>{item.precio_venta}€</TableCell>
                    <TableCell>{item.vendidas}</TableCell>
                    
                    <TableCell style={{ color: item.unidades <= 0 ? 'red' : 'inherit' }}>{item.unidades-item.vendidas}</TableCell>
                    <TableCell>{gasto.toFixed(2)}€</TableCell>
                    <TableCell>{ingreso.toFixed(2)}€</TableCell>
                    <TableCell style={{ color: beneficioItem >= 0 ? 'green' : 'red' }}>{beneficioItem.toFixed(2)}€</TableCell>
                    <TableCell>
                      <IconButton onClick={() => setVentaDialog({ open: true, item })}><EditIcon /></IconButton>
                      <IconButton onClick={() => handleDeleteItem(item)}><DeleteIcon /></IconButton>
                      <IconButton onClick={() => setAddDialog({ open: true, item })}><AddShoppingCartIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Grid container spacing={2} mt={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Distribución Inventario</Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #ccc',
                          borderRadius: '8px',
                          boxShadow: '0px 0px 5px rgba(0,0,0,0.1)',
                        }}
                        itemStyle={{
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '10px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
          </Grid>    

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Resumen Financiero</Typography>
                  <Typography>Gastos de compra: <strong>{totalGasto.toFixed(2)}€</strong></Typography>
                  <Typography>Ingresos por ventas: <strong>{totalIngreso.toFixed(2)}€</strong></Typography>
                  <Typography>Beneficio: <strong style={{ color: beneficio >= 0 ? 'green' : 'red' }}>{beneficio.toFixed(2)}€</strong></Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Dialog
            open={ventaDialog.open}
            onClose={() => setVentaDialog({ open: false, item: null })}
          >
            <DialogTitle>Registrar venta</DialogTitle>
            <DialogContent>
              <TextField
                label="Unidades vendidas"
                type="number"
                
                value={ventaUnidades}
                sx={{ m: 1 }}
                onChange={(e) => setVentaUnidades(e.target.value)}
              />
              <TextField
                label="Precio venta"
                type="number"
                
                sx={{ m: 1 }}
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setVentaDialog({ open: false, item: null })}>Cancelar</Button>
              <Button variant="contained" onClick={handleVenta}>Confirmar</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={addDialog.open} onClose={() => setAddDialog({ open: false, item: null })}>
            <DialogTitle>   Volver a comprar  </DialogTitle>
            <DialogContent>
              <FormControl fullWidth>
                <InputLabel>Nombre del presupuesto</InputLabel>
                <Select
                  value={presupuestoSeleccionado}
                  onChange={(e) => setPresupuestoSeleccionado(e.target.value)}
                >
                  {presupuestos.map((p, index) => (
                    p.estado === 'pendiente' && (
                      <MenuItem key={index} value={p}>{p.name}</MenuItem>
                    )
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Unidades"
                type="number"
                sx={{ m: 1 }}
                value={addUnidades}
                onChange={(e) => setAddUnidades(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAddDialog({ open: false, item: null })}>Cancelar</Button>
              <Button variant="contained" onClick={handleAddToBudget} disabled={!presupuestoSeleccionado}>Añadir</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
}
