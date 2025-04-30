import React from "react";
import {
  useTheme,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Card,
  CardContent,
  Typography,
  Button,
  Box
} from "@mui/material";
import { useMediaQuery } from "@mui/material";

/**
 * Componente genérico que muestra datos en formato tabla (pantallas grandes)
 * o en tarjetas (pantallas pequeñas).
 *
 * @param {Object[]} data  - Array de datos a mostrar
 * @param {Object[]} columns - Estructura de columnas [ { field, headerName, renderCell? }, ... ]
 * @param {Function} getRowId - Función que dado un item retorna un string|number único
 * @param {Function} renderActions? - Función que retorna componentes de acción (ej. botones) a pintar en cada fila
 * @param {Function} onAdd? - Callback para botón "Añadir". Si se pasa, aparecerá
 * @param {String} title?   - Título que aparece en la cabecera de la tabla
 */
const ResponsiveTableorCard= ({
  data,
  columns,
  getRowId,
  renderActions,
  onAdd,
  title
}) => {
  const theme = useTheme();
  // Si la pantalla es menor o igual a "sm", usamos vista tipo tarjeta.
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  if (!data || data.length === 0) {
    return <Typography sx={{ m: 2 }}>No hay datos para mostrar.</Typography>;
  }

  // --- VISTA TABLA (pantallas >= sm) ---
  if (!isSmallScreen) {
    return (
      <TableContainer component={Paper} sx={{ p: 2, overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.field}>{col.headerName}</TableCell>
              ))}

              {/* Extra cell para acciones o botón "Añadir" */}
              {(onAdd || renderActions) && (
                <TableCell align="right">
                  {/* Encabezado o botón "Add" */}
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    {title && (
                      <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                        {title}
                      </Typography>
                    )}
                    {onAdd && (
                      <Button variant="contained" onClick={onAdd}>
                        Añadir
                      </Button>
                    )}
                  </Box>
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {data.map((item) => {
              const rowId = getRowId(item);
              return (
                <TableRow key={rowId}>
                  {columns.map((col) => {
                    // Si definiste "renderCell", lo llamas con (valorCampo, itemCompleto)
                    const cellValue = item[col.field];
                    return (
                      <TableCell key={col.field}>
                        {col.renderCell
                          ? col.renderCell(cellValue, item)
                          : cellValue}
                      </TableCell>
                    );
                  })}

                  {(onAdd || renderActions) && (
                    <TableCell align="right">
                      {renderActions && renderActions(item)}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  // --- VISTA TARJETAS (pantallas < sm) ---
  return (
    <Box sx={{ p: 1 }}>
      {/* Si pasamos "onAdd", mostramos botón arriba */}
      {onAdd && (
        <Box sx={{ textAlign: "end", mb: 2 }}>
          <Button variant="contained" onClick={onAdd}>
            Añadir
          </Button>
        </Box>
      )}

      {data.map((item) => {
        const rowId = getRowId(item);
        return (
          <Card key={rowId} sx={{ mb: 2 }}>
            <CardContent>
              {columns.map((col) => {
                const cellValue = item[col.field];
                return (
                  <Box key={col.field} sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      <strong>{col.headerName}: </strong>
                      {col.renderCell
                        ? col.renderCell(cellValue, item)
                        : cellValue}
                    </Typography>
                  </Box>
                );
              })}

              {renderActions && (
                <Box sx={{ textAlign: "right" }}>{renderActions(item)}</Box>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default ResponsiveTableorCard;
