import React, { useEffect, useState } from "react";
import axiosPrivate from "../hooks/axiosPrivate";
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
    getIncidencias();
  }, []);

  const getIncidencias = async () => {
    try {
      const response = await axiosPrivate.get("/incidencias");
      setIncidencias(response.data);
    } catch (error) {
      console.error("Error al obtener las incidencias:", error);
    }
  };

  const changeEstado = (tipo,id) => {

    axiosPrivate.patch(`/incidencias/${id}/`, { estado: tipo });
    setIncidencias((prev) =>
      prev.map((inc) =>
        inc.id === id ? { ...inc, estado: tipo } : inc
      )
    );
  };

  const eliminarIncidencia = (id) => {
    axiosPrivate.delete(`/incidencias/${id}/`);
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
                <TableCell>{incidencia.creado_en}</TableCell>
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
                      <select
                        onChange={(e) => changeEstado(e.target.value, incidencia.id)}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_proceso">En proceso</option>
                        <option value="resuelto">Resuelto</option>
                        <option value="cerrada">Cerrada</option>
                      </select>
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
