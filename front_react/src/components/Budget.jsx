import React, { useState } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Button } from "@mui/material";

const ProductoTabla = () => {
  const productos = [
    {
      "titulo": "Oso de Peluche",
      "imagen": "https://example.com/oso.jpg",
      "rangos": [
        { "rango_unidades": "20-100", "rango_precio": "30", "coste_envio": "5" },
        { "rango_unidades": "100-200", "rango_precio": "25", "coste_envio": "4" }
      ]
    },
    {
      "titulo": "Robot de Juguete",
      "imagen": "https://example.com/robot.jpg",
      "rangos": [
        { "rango_unidades": "10-50", "rango_precio": "40", "coste_envio": "6" },
        { "rango_unidades": "51-100", "rango_precio": "35", "coste_envio": "5" }
      ]
    }
  ];

  const [cantidades, setCantidades] = useState({});
  const [importes, setImportes] = useState({});

  const handleCantidadChange = (index, value, precio, envio) => {
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
          {productos.map((producto, index) => (
            producto.rangos.map((rango, rangoIndex) => {
              const precio = parseFloat(rango.rango_precio);
              const envio = parseFloat(rango.coste_envio);
              return (
                <TableRow key={`${index}-${rangoIndex}`}>
                  {rangoIndex === 0 && (
                    <TableCell rowSpan={producto.rangos.length}>{producto.titulo}</TableCell>
                  )}
                  {rangoIndex === 0 && (
                    <TableCell rowSpan={producto.rangos.length}>
                      <img src={producto.imagen} alt={producto.titulo} style={{ width: 50, height: 50 }} />
                    </TableCell>
                  )}
                  <TableCell>{rango.rango_unidades} - ${rango.rango_precio}</TableCell>
                  <TableCell>${rango.coste_envio}</TableCell>
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
