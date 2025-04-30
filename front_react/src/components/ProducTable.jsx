import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  Box,
  TableSortLabel,
  Collapse,
  List,
  ListItem,
  TableFooter,
  TablePagination,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

/**
 * Componente que muestra productos en una tabla para pantallas grandes (>= sm),
 * y en un layout de tarjetas (Cards) para pantallas pequeñas (< sm).
 */
const ProductTable = ({ title, products, columns, action = [] }) => {
  // Estado para ordenamiento
  const [orderBy, setOrderBy] = useState("");
  const [orderDirection, setOrderDirection] = useState("asc");

  // Estado para expansión de filas (Más Info)
  const [expandedRows, setExpandedRows] = useState({});

  // Paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Tema y MediaQuery para detectar pantallas pequeñas
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // Cambia la página
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Cambia cuántos resultados se ven por página
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Ordenación
  const handleSort = (columnKey) => {
    const isAsc = orderBy === columnKey && orderDirection === "asc";
    setOrderDirection(isAsc ? "desc" : "asc");
    setOrderBy(columnKey);
  };

  // Mostrar/ocultar atributos extra
  const toggleRow = (index) => {
    setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Ordenar productos según la columna seleccionada
  const sortedProducts = [...products].sort((a, b) => {
    if (!orderBy) return 0; // sin orden especificado
    const valueA = a[orderBy];
    const valueB = b[orderBy];

    if (typeof valueA === "string") {
      return orderDirection === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    } else {
      return orderDirection === "asc" ? valueA - valueB : valueB - valueA;
    }
  });

  // Segmento de productos según la página y filas por página
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPageProducts = sortedProducts.slice(startIndex, endIndex);

  // ---------------- VISTA PARA PANTALLAS PEQUEÑAS: TARJETAS --------------
  if (isSmallScreen) {
    return (
      <Box component={Paper} sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>

        {/* Mapeamos los productos de la página actual a Cards */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            justifyContent: "center"
          }}
        >
          {currentPageProducts.map((product, index) => (
            <Card
              key={index}
              sx={{ width: 300, boxShadow: 3, borderRadius: 2 }}
            >
              {/* Si tienes alguna imagen en columns con type="image", podemos buscarla */}
              {columns.map((col) => {
                if (col.type === "image") {
                  return product[col.key] ? (
                    <CardMedia
                      key={col.key}
                      component="img"
                      alt={product.titulo}
                      image={product[col.key]}
                      sx={{ objectFit: "contain", height: 150 }}
                    />
                  ) : null;
                }
                return null;
              })}

              <CardContent>
                {/* Mostrar el resto de columnas como texto */}
                {columns.map((col) => {
                  // Ya mostramos la imagen arriba, así que la omitimos aquí
                  if (col.type === "image") return null;
                  return (
                    <Typography key={col.key} variant="body2" sx={{ mb: 1 }}>
                      <strong>{col.label}:</strong>{" "}
                      {String(product[col.key] ?? "N/A")}
                    </Typography>
                  );
                })}

                {/* Botones de acción, si existen */}
                {Array.isArray(action) && action.length > 0 && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                    {action.map((act, i) => (
                      <Button
                        key={i}
                        variant="contained"
                        color={act.color || "primary"}
                        onClick={() => act.onClick(product)}
                      >
                        {act.label}
                      </Button>
                    ))}
                  </Box>
                )}

                {/* Botón para atributos extra (if product.attributes) */}
                {product.attributes && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => toggleRow(index)}
                      fullWidth
                    >
                      {expandedRows[index] ? "Ocultar Detalles" : "Más Info"}
                    </Button>

                    <Collapse in={expandedRows[index]}>
                      <List>
                        {product.attributes.length > 0 ? (
                          product.attributes.map((attr, idx) => (
                            <ListItem key={idx}>
                              <strong>{attr.name}:</strong> {attr.value}
                            </ListItem>
                          ))
                        ) : (
                          <ListItem>No hay atributos adicionales</ListItem>
                        )}
                      </List>
                    </Collapse>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Paginación al final */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={sortedProducts.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      </Box>
    );
  }

  // ---------------- VISTA PARA PANTALLAS GRANDES: TABLA ----------------
    // Función para determinar el color de fondo basado en el margen de beneficio
    const getMarginBackgroundColor = (margin) => {
      console.log("Margen de beneficio:", margin); // Para depuración
      if (margin > 90) {
        return "#FF9800"; // Color naranjado
      } else if (margin > 50) {
        return "#FFEB3B"; // Color amarillo
      } else if (margin > 20) {
        return "#3de51f"; // Color verde
      } else {
        return "primary.main"; // Sin color de fondo especial
      }
    };
  
    return (
      <TableContainer component={Paper} sx={{ mt: 3, p: 2, maxHeight: "900px", width: "100%" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
  
        <Box sx={{ overflow: "auto", maxHeight: "800px" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((col, index) => (
                  <TableCell key={index} sx={{ fontWeight: "bold", fontSize: "12px" }}>
                    {["titulo", "precio", "valoracion", "coincidencia", "margenBeneficio"].includes(col.key) ? (
                      <TableSortLabel
                        color="black"
                        active={orderBy === col.key}
                        direction={orderBy === col.key ? orderDirection : "asc"}
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : (
                      col.label
                    )}
                  </TableCell>
                ))}
  
                {/* Columna de acciones, si procede */}
                {Array.isArray(action) && action.length > 0 && (
                  <TableCell sx={{ fontWeight: "bold", fontSize: "12px" }}>
                    Acciones
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
  
            <TableBody>
              {currentPageProducts.map((product, index) => (
                <React.Fragment key={index}>
                  <TableRow hover>
                    {columns.map((col, colIndex) => (
                      <TableCell key={colIndex} sx={{ fontSize: "12px", backgroundColor: col.key === "margenBeneficio" ? getMarginBackgroundColor(product[col.key]) : "inherit" }}>
                        {col.type === "image" ? (
                          product[col.key] ? (
                            <a
                              href={product[col.linkKey]}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={product[col.key]}
                                alt={product.titulo}
                                width="100"
                                style={{ borderRadius: "8px" }}
                              />
                            </a>
                          ) : (
                            "Sin imagen"
                          )
                        ) : (
                          String(product[col.key] ?? "N/A")
                        )}
                      </TableCell>
                    ))}
  
                    {/* Acciones */}
                    {Array.isArray(action) && action.length > 0 && (
                      <TableCell sx={{ fontSize: "12px" }}>
                        {action.map((act, actIndex) => (
                          <Button
                            key={actIndex}
                            variant="contained"
                            fullWidth
                            color={act.color || "primary"}
                            sx={{ mr: 1, mb: 1, fontSize: "10px" }}
                            onClick={() => act.onClick(product)}
                          >
                            {act.label}
                          </Button>
                        ))}
                      </TableCell>
                    )}
  
                    {/* Botón para atributos en la misma fila */}
                    {product.attributes && (
                      <TableCell>
                        <Button
                          variant="outlined"
                          onClick={() => toggleRow(index)}
                        >
                          {expandedRows[index] ? "Ocultar Detalles" : "Más Info"}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
  
                  {/* Fila extra colapsable para atributos */}
                  {product.attributes && (
                    <TableRow>
                      <TableCell colSpan={columns.length + (action.length ? 1 : 0)}>
                        <Collapse in={expandedRows[index]}>
                          <List>
                            {product.attributes.length > 0 ? (
                              product.attributes.map((attr, idx) => (
                                <ListItem key={idx}>
                                  <strong>{attr.name}:</strong> {attr.value}
                                </ListItem>
                              ))
                            ) : (
                              <ListItem>No hay atributos adicionales</ListItem>
                            )}
                          </List>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
  
            {/* Pie de tabla con paginación */}
            <TableFooter>
              <TableRow>
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50]}
                  colSpan={columns.length + (action.length ? 1 : 0)}
                  count={sortedProducts.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </TableRow>
            </TableFooter>
          </Table>
        </Box>
      </TableContainer>
    );
  };
  
  export default ProductTable;
