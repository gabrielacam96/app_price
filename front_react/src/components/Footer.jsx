import React from "react";
import { Box, Container, Typography, Grid, Link } from "@mui/material";

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: "primary.main",
        color: "white",
        py: 3,
        mt: "auto",
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={3} justifyContent="center">
          {/* Sección de información */}
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" fontWeight="bold">
              Nuestra Empresa
            </Typography>
            <Typography variant="body2">
              Soluciones innovadoras en análisis de precios y mercado.
            </Typography>
          </Grid>

          {/* Sección de enlaces */}
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" fontWeight="bold">
              Enlaces Rápidos
            </Typography>
            <Link href="/" color="inherit" underline="hover">
              Inicio
            </Link>
            <br />
            <Link href="/budget" color="inherit" underline="hover">
              Budget
            </Link>
            <br />
            <Link href="/list_budget" color="inherit" underline="hover">
              List Budget
            </Link>
          </Grid>

          {/* Sección de contacto */}
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" fontWeight="bold">
              Contacto
            </Typography>
            <Typography variant="body2">Email: contacto@empresa.com</Typography>
            <Typography variant="body2">Teléfono: +123 456 789</Typography>
          </Grid>
        </Grid>

        {/* Copyright */}
        <Box textAlign="center" mt={2}>
          <Typography variant="body2">
            © {new Date().getFullYear()} Nombre de la Empresa. Todos los derechos reservados.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
