
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Collapse, IconButton } from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";

function ListBudget(){


    const presupuestos = [
    {
        subtotal: 200,
        productos: [
        { titulo: "Oso de Peluche", unidades: 2, precio: 50, importe: 100 },
        { titulo: "Robot de Juguete", unidades: 2, precio: 50, importe: 100 }
        ]
    },
    {
        subtotal: 150,
        productos: [
        { titulo: "Muñeca de Trapo", unidades: 3, precio: 30, importe: 90 },
        { titulo: "Auto de Juguete", unidades: 2, precio: 30, importe: 60 }
        ]
    }
    ];

    const [expandido, setExpandido] = useState(null);

    const handleExpandir = (index) => {
    setExpandido(expandido === index ? null : index);
    };

    return (
    <TableContainer component={Paper} className="p-4">
        <Table>
        <TableHead>
            <TableRow>
            <TableCell>Presupuesto</TableCell>
            <TableCell>Subtotal</TableCell>
            <TableCell>Acciones</TableCell>
            </TableRow>
        </TableHead>
        <TableBody>
            {presupuestos.map((presupuesto, index) => (
            <React.Fragment key={index}>
                <TableRow>
                <TableCell>Presupuesto #{index + 1}</TableCell>
                <TableCell>${presupuesto.subtotal}</TableCell>
                <TableCell>
                    <IconButton onClick={() => handleExpandir(index)}>
                    {expandido === index ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </TableCell>
                </TableRow>
                <TableRow>
                <TableCell colSpan={3}>
                    <Collapse in={expandido === index} timeout="auto" unmountOnExit>
                    <Table>
                        <TableHead>
                        <TableRow>
                            <TableCell>Producto</TableCell>
                            <TableCell>Unidades</TableCell>
                            <TableCell>Precio Unitario</TableCell>
                            <TableCell>Importe</TableCell>
                        </TableRow>
                        </TableHead>
                        <TableBody>
                        {presupuesto.productos.map((producto, pIndex) => (
                            <TableRow key={pIndex}>
                            <TableCell>{producto.titulo}</TableCell>
                            <TableCell>{producto.unidades}</TableCell>
                            <TableCell>${producto.precio}</TableCell>
                            <TableCell>${producto.importe}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </Collapse>
                </TableCell>
                </TableRow>
            </React.Fragment>
            ))}
        </TableBody>
        </Table>
    </TableContainer>
    );
};



export default ListBudget;

