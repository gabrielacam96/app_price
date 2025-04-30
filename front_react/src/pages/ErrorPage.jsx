import React, { useEffect, useState } from "react";
import { Box, Button, Container, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

function ErrorPage() {

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "80vh",
        // Un color de fondo muy suave
        backgroundColor: "#f9fafb",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: "center",
            borderRadius: "1rem",
          }}
        >
          <Typography variant="h4" gutterBottom>
            404 - Página no encontrada
          </Typography>
          <Typography variant="body1" gutterBottom>
            La ruta solicitada no existe. Por favor, verifica la URL y vuelve
            a intentarlo.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}

export default ErrorPage;
