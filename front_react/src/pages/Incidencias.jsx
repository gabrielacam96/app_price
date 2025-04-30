import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
} from "@mui/material";

const Incidencias = () => {
  const [incidencias, setIncidencias] = useState([]);

  // Simula datos desde una API
  useEffect(() => {
    const datosSimulados = [
      {
        id: 1,
        titulo: "Error al subir presupuesto",
        descripcion: "No se puede guardar el presupuesto después de cargar productos.",
        fecha: "2025-04-29",
        usuario: "jose.garcia",
        estado: "pendiente",
      },
      {
        id: 2,
        titulo: "Problema con login",
        descripcion: "Al intentar iniciar sesión, se queda cargando.",
        fecha: "2025-04-27",
        usuario: "laura.martinez",
        estado: "resuelto",
      },
    ];
    setIncidencias(datosSimulados);
  }, []);

  const marcarComoResuelto = (id) => {
    setIncidencias((prev) =>
      prev.map((inc) =>
        inc.id === id ? { ...inc, estado: "resuelto" } : inc
      )
    );
  };

  const eliminarIncidencia = (id) => {
    setIncidencias((prev) => prev.filter((inc) => inc.id !== id));
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Gestión de Incidencias Reportadas
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Título</strong></TableCell>
              <TableCell><strong>Descripción</strong></TableCell>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell><strong>Usuario</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {incidencias.map((incidencia) => (
              <TableRow key={incidencia.id}>
                <TableCell>{incidencia.id}</TableCell>
                <TableCell>{incidencia.titulo}</TableCell>
                <TableCell>{incidencia.descripcion}</TableCell>
                <TableCell>{incidencia.fecha}</TableCell>
                <TableCell>{incidencia.usuario}</TableCell>
                <TableCell>
                  <Chip
                    label={incidencia.estado}
                    color={incidencia.estado === "resuelto" ? "success" : "warning"}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {incidencia.estado !== "resuelto" && (
                      <Button
                        variant="contained"
                        size="small"
                        color="success"
                        onClick={() => marcarComoResuelto(incidencia.id)}
                      >
                        Marcar como resuelto
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => eliminarIncidencia(incidencia.id)}
                    >
                      Eliminar
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {incidencias.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay incidencias reportadas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Incidencias;
