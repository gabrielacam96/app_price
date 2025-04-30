import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Container,
  Button,
  Stack,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Drawer,
  useMediaQuery,
  Divider,
} from "@mui/material";
import {
  Home as HomeIcon,
  Search as SearchIcon,
  Compare as CompareIcon,
  AttachMoney as AttachMoneyIcon,
  Favorite as FavoriteIcon,
  NotificationsActive as NotificationsActiveIcon,
  ShowChart as ShowChartIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Menu as MenuIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
} from "@mui/icons-material";

import { useTheme } from "@mui/material/styles";
import axiosPrivate from "../hooks/axiosPrivate";
import { AuthenticateContext } from "../context/AutenticateContex";
import Cookies from "js-cookie";
const Navbar = () => {
  const { user, setUser,setAuthenticate } = useContext(AuthenticateContext); // Contexto para autenticación
  // States para menús desplegables
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [budgetAnchorEl, setBudgetAnchorEl] = useState(null);
  const [seguimientoAnchorEl, setSeguimientoAnchorEl] = useState(null);
  const [alertCount, setAlertCount] = useState(0); // Simulación de alertas
  const [alertasActivas, setAlertasActivas] = useState([]);
  const navigate = useNavigate(); // Hook de React Router
  const ruta = window.location.pathname; // Obtener la ruta actual

  // States para Drawer en mobile
  const [mobileOpen, setMobileOpen] = useState(false);

  // Para saber si estamos en pantallas chicas (menor que "md")
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Handlers para menús
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleNotifOpen = (event) => setNotifAnchorEl(event.currentTarget);
  const handleBudgetOpen = (event) => setBudgetAnchorEl(event.currentTarget);
  const handleSeguimientoOpen = (event) => setSeguimientoAnchorEl(event.currentTarget);

  const handleClose = () => {
    setAnchorEl(null);
    setNotifAnchorEl(null);
    setBudgetAnchorEl(null);
    setSeguimientoAnchorEl(null);
  };

  // Handler para Drawer mobile
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  const handleLogout = async() => {
    // Llamar a la API para cerrar sesión
    const response = await axiosPrivate.delete("login/");
    if (response.status === 200) {
      setUser(null); // Limpiar el estado del usuario
      setAuthenticate(false);
      Cookies.remove('userId');
      Cookies.remove('userName');
      // Redirigir a la página de inicio de sesión
      window.location.href = "/login";
    }
    else {
      console.error("Error al cerrar sesión:", response.statusText);
    }

  };


  const handlePerfil = () => {
    // Redirigir a la página de perfil
    navigate("/perfil");
  };

  const getAlertas = async () => {
    try {
      const response = await axiosPrivate.get("/check-alerts/");
      if (response.status === 200) {
        setAlertCount(response.data.length); // Actualiza el contador de alertas
        setAlertasActivas(response.data);
      }
      } catch (error) {
        console.error("Error al obtener las alertas:", error);
      }
  };
  useEffect(() => {
    getAlertas();
  }, []);


  const drawerItems = [
    { label: "Inicio", path: "/", icon: <HomeIcon /> },
    { label: "Buscar productos", path: "/searchProduct", icon: <SearchIcon /> },
    { label: "Comparar productos", path: "/compareProduct", icon: <CompareIcon /> },
    { label: "Presupuesto", path: "/list_budget", icon: <AttachMoneyIcon /> },
    { label: "Favoritos", path: "/list_product_seguidos", icon: <FavoriteIcon /> },
    { label: "Alertas", path: "/alerts", icon: <NotificationsActiveIcon /> },
    { label: "Historial precios", path: "/grafics", icon: <ShowChartIcon /> },
  ];

  const drawerContent = (
    <Box sx={{ width: 260, bgcolor: "#f5f5f5", height: "100%", py: 2 }}>
      <List>
        {drawerItems.map((item) => (
          <ListItemButton
            key={item.label}
            component={Link}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            sx={{
              borderRadius: 2,
              mx: 1,
              mb: 1,
              color: "text.primary",
              "&:hover": {
                bgcolor: "primary.light",
                color: "white",
                boxShadow: 2,
              },
            }}
          >
            <ListItemIcon sx={{ color: "inherit" }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
    </Box>

  );
  
  console.log("alertasActivas",alertasActivas);
  return (
    <AppBar position="static" sx={{ backgroundColor: "primary.main" }}>
      <Container maxWidth="xl">
        <Toolbar sx={{ justifyContent: "space-between", py: 2 }}>
          
          {/* LOGO */}
          <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <img src="/logo_sin_fondo.png" alt="Logo" style={{ width: 48, height: 48 }} />
              {/*<Typography variant="h6" sx={{ ml: 1, fontWeight: "bold" }}>
                Costrack
              </Typography>*/}
            </Box>
          </Link>

          {/* MENÚ DESKTOP */}
          {!isMobile && ruta !== "/" && (
            <Stack direction="row" spacing={2} alignItems="center">
              <Button component={Link} to="/" startIcon={<HomeIcon />} color="inherit">
                Inicio
              </Button>
              <Button component={Link} to="/list_budget" startIcon={<AttachMoneyIcon />} color="inherit">
               Presupuesto
              </Button>
              <Button component={Link} to="/list_product_seguidos" startIcon={<FavoriteIcon  />} color="inherit">
                Favoritos
              </Button>

              <Button component={Link} to="/alerts" startIcon={<NotificationsActiveIcon />} color="inherit">
                Alertas
              </Button>

              <Button component={Link} to="/grafics" startIcon={<TimelineIcon />} color="inherit">
                Historial de precios
              </Button>

              <Button component={Link} to="/searchProduct" startIcon={<SearchIcon />} color="inherit">
                Buscar producto
              </Button>

              <Button component={Link} to="/compareProduct" startIcon={<CompareIcon />} color="inherit">
                Comparar producto
              </Button>
            </Stack>
          )}

          {/* MENÚ MÓVIL */}
          {isMobile && ruta !== "/" && (
            <IconButton color="inherit" onClick={handleDrawerToggle}>
              <MenuIcon />
            </IconButton>
          )}

          {/* NOTIFICACIONES Y USUARIO */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton color="inherit" onClick={handleNotifOpen}>
              <Badge badgeContent={alertCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <Menu anchorEl={notifAnchorEl} open={Boolean(notifAnchorEl)} onClose={handleClose}>
              {Array.isArray(alertasActivas) && alertasActivas.map((alerta) => (
                <MenuItem key={alerta.alert_id} sx={{ fontSize: 12 }} onClick={handleClose}>
                  {alerta.mensaje}
                </MenuItem>
              ))}
            </Menu>

            <IconButton color="inherit" onClick={handleMenuOpen}>
              <AccountCircleIcon />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
              <MenuItem onClick={handlePerfil}>
                <PersonIcon sx={{ mr: 1 }} /> Perfil
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} /> Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>

      {/* Drawer para versión mobile */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}

        ModalProps={{
          keepMounted: true // mejora la performance en móviles
        }}
        sx={{
          "& .MuiDrawer-paper": {
            backgroundColor: "#abebc6", // amarillo-verdoso
            color: "#212121",
            width: 300,
        }}}
      >
        {drawerContent}
      </Drawer>
    </AppBar>
  );
};

export default Navbar;
