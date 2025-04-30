import React, { useContext, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Button } from "@mui/material";

import axiosPrivate from "../hooks/axiosPrivate";
const ProductoTabla = () => {


  const [selectedProducts, setSelectedProducts] = useState([]);
  
  const [cantidades, setCantidades] = useState({});
  const [importes, setImportes] = useState({});

  useEffect(() => {
    getProducts();//obtener la lista de productos
  }, []);
  const getProducts = async () => {
    const response = await axiosPrivate.get("/products/");
    if (response.status !== 200) {
      console.error("Error al obtener la lista de productos:", response.data);
      return;
    }
    setSelectedProducts(response.data);
  };
  const handleCantidadChange = (index, value, precio, envio) => {
    console.log(value, precio, envio);
    const nuevaCantidad = { ...cantidades, [index]: value };
    setCantidades(nuevaCantidad);
    setImportes({ ...importes, [index]: value * (precio + envio) });
  };

  const calcularSubtotal = () => {
    return Object.values(importes).reduce((acc, val) => acc + (val || 0), 0);
  };

  return (
    <TableContainer component={Paper} className="p-4">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Título</TableCell>
            <TableCell>Imagen</TableCell>
            <TableCell>Rango de Precios</TableCell>
            <TableCell>Coste de Envío</TableCell>
            <TableCell>Unidades</TableCell>
            <TableCell>Importe</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {console.log(selectedProducts)}
          {selectedProducts.map((producto, index) => (
            producto.rangos.map((rango, rangoIndex) => {
              const precio = parseFloat(rango.rango_precio);
              const envio = producto.coste_envio ? parseFloat(producto.coste_envio) : 0;
              return (
                <TableRow key={`${index}-${rangoIndex}`}>
                  {rangoIndex === 0 && (
                    <TableCell rowSpan={producto.rangos.length}>{producto.titulo}</TableCell>
                  )}
                  {rangoIndex === 0 && (
                    <TableCell rowSpan={producto.rangos.length}>
                      {producto.imagen ? (
                        <img src={producto.imagen} alt={producto.titulo} style={{ width: 50, height: 50 }} />
                      ):('sin imagen')}
                      </TableCell>
                  )}
                  <TableCell>{rango.rango_unidades} - €{rango.rango_precio}</TableCell>
                  
                  <TableCell>€{envio || 'A negociar'}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={cantidades[`${index}-${rangoIndex}`] || ""}
                      onChange={(e) => handleCantidadChange(`${index}-${rangoIndex}`, parseInt(e.target.value) || 0, precio, envio)}
                    />
                  </TableCell>
                  <TableCell>${importes[`${index}-${rangoIndex}`] || 0}</TableCell>
                </TableRow>
              );
            })
          ))}
          <TableRow>
            <TableCell colSpan={5} align="right">Subtotal:</TableCell>
            <TableCell>${calcularSubtotal()}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={6} align="right">
              <Button variant="contained" color="primary">Guardar Presupuesto</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProductoTabla;
