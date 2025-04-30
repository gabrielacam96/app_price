import React, { useContext,useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import InventoryIcon from "@mui/icons-material/Inventory";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AnnouncementIcon from '@mui/icons-material/Announcement';

import { PriceChange } from "@mui/icons-material";
import { AuthenticateContext } from "../context/AutenticateContex";

const opciones = [
  { titulo: "Buscar Products", icono: <SearchIcon fontSize="large" color="primary" />, ruta: "/searchProduct" },
  { titulo: "Comparar Productos", icono: <CompareArrowsIcon fontSize="large" color="primary" />, ruta: "/compareProduct" },
  { titulo: "Presupuestos", icono: <AttachMoneyIcon fontSize="large" color="primary" />, ruta: "/list_budget" },
  { titulo: "Favoritos", icono: <InventoryIcon fontSize="large" color="primary" />, ruta: "/list_product_seguidos" },
  { titulo: "Alertas", icono: <NotificationsIcon fontSize="large" color="primary" />, ruta: "/alerts" },
  { titulo: "Historial de precios", icono: <PriceChange fontSize="large" color="primary" />, ruta: "/grafics" },
  {titulo: "Dashboard", icono: <PriceChange fontSize="large" color="primary" />, ruta: "/dashboard_admin"},
];


const Inicio = () => {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("")
  const [open, setOpen] = useState(false);
  const {user} = useContext(AuthenticateContext);

  console.log("user", user);

  
const handleCancel = () => {
  setTitulo("");
  setDescripcion("");
  setError("");
  setOpen(false);
};

const handleSubmit = () => {
  if (!titulo.trim() || !descripcion.trim()) {
    setError("Por favor, completa todos los campos.");
    setTimeout(() => setError(null), 1000);
    return;
  }

  const nuevaIncidencia = {
    id: Date.now(),
    titulo,
    descripcion,
    fecha: new Date().toISOString().split("T")[0],
    usuario: user.id,
    estado: "pendiente",
  };

  
  setTitulo("");
  setDescripcion("");
  setError("");
  setOpen(false);
};
const handleIncidentReport = () => {
  setOpen(true);
}


  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, mr: 2 }}>
        <Button variant="contained" color='warning' onClick={() => handleIncidentReport()}>
          <AnnouncementIcon />
          Reportar Incidencias
        </Button>
      </Box>
    <Container
      sx={{
        // Ajusta el relleno (padding) según el tamaño de pantalla
        py: { xs: 1, sm: 3, md: 5 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        // Usa minHeight en lugar de height para evitar problemas en pantallas pequeñas
        minHeight: "80vh",
        justifyContent: "center"
      }}
    >
      <Typography
        // Usa la variante "h4" (o la que prefieras) y ajusta tamaños por breakpoint
        variant="h4"
        sx={{
          textAlign: "center",
          fontSize: { xs: "12px", sm: "16px", md: "20px" },
          margin: "15px",
          padding: "10px"
        }}
            >
        Bienvenid@ {user ? user.username : "Invitado"}
        </Typography>


            <Grid container spacing={3}>

        {opciones.map((opcion, index) => {
          const esOpcionAdmin = opcion.ruta === "/admin_users" || opcion.ruta === "/dashboard_admin";
          const esAdmin = user?.groups?.includes('admin');
  
          // Si no es admin y la opción es de admin, no la muestres
          if (esOpcionAdmin && !esAdmin) {
                return null;
            }
          return(<Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                textAlign: "center",
                opacity: 1,
                // Ajusta la altura de forma responsive
                height: { xs: 120, sm: 140, md: 160 },
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                cursor: "pointer",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                  boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)"
                }
              }}
              onClick={() => opcion.ruta && navigate(opcion.ruta)}
            >
              <CardContent>
                {opcion.icono}
                <Typography variant="h6" sx={{ mt: 2 }}>
                  {opcion.titulo}
                </Typography>
              </CardContent>
            </Card>
          </Grid>)
        })}
      </Grid>
    </Container>

    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Reportar Incidencia</DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            fullWidth
          />
          <TextField
            label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            multiline
            rows={4}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} color="primary">
          Enviar
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default Inicio;

