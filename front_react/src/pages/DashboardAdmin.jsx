import React, { useState,useEffect} from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  TextField, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
  Alert
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import NotificationsIcon from '@mui/icons-material/Notifications';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import axiosPrivate from '../hooks/axiosPrivate';

const DashboardAdmin = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchUser, setSearchUser] = useState('');
  const [users, setUsers] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [presupuestosUser, setPresupuestosUser] = useState([]);
  const [alertsUser, setAlertsUser] = useState([]);
  const [favoritosUser, setFavoritosUser] = useState([]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };
  useEffect(() => {
    getUsers();
    getPresupuestos();
    getAlertas();
    getFavoritos();
  },[])

  useEffect(() => {
    if(searchUser){
      const idUser = searchUser;
      console.log("id buscado",idUser);
      getPresupuestosUser(idUser);
      getAlertasUser(idUser);
      getFavoritosUser(idUser);
    }
  },[searchUser])
  const getUsers = async () => {
    try {
      const response = await axiosPrivate.get('/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
    }
  };

  const getPresupuestos = async () => {
    try {
      const response = await axiosPrivate.get('/budgets/');
      setPresupuestos(response.data);
    } catch (error) {
      console.error('Error al obtener presupuestos:', error);
    }
  };
  const getPresupuestosUser = async (userId) => {
    try {
      const response = await axiosPrivate.get('/budgets/?usuario='+userId);
      setPresupuestosUser(response.data);
    } catch (error) {
      console.error('Error al obtener presupuestos:', error);
    }
  };

  const getAlertas = async () => {
    try {
      const response = await axiosPrivate.get('/alerts/');
      if (response.status === 200) {
        setAlerts(response.data)
      }
    } catch (error) {
      console.error('Error al obtener las alertas:', error);
    }
  };
  const getAlertasUser = async (userId) => {
    try {
      const response = await axiosPrivate.get('/alerts/?usuario='+userId);
      if (response.status === 200) {
        setAlertsUser(response.data)
      }
    } catch (error) {
      console.error('Error al obtener las alertas:', error);
    }
  };

  const getFavoritos = async () => {
    try {
      const response = await axiosPrivate.get('/following/');
      if (response.status === 200) {
        setFavoritos(response.data)
      }
    } catch (error) {
      console.error('Error al obtener los favoritos:', error);
    }
  };

  const getFavoritosUser = async (userId) => {
    try {
      const response = await axiosPrivate.get('/following/?usuario='+userId);
      if (response.status === 200) {
        setFavoritosUser(response.data)
      }
    } catch (error) {
      console.error('Error al obtener los favoritos:', error);
    }
  };

  const renderSummaryCards = () => (
    <Grid container spacing={2} sx={{ mb: 4 }}>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6"><PeopleIcon /> Usuarios</Typography>
            <Typography variant="h4">{users.length}</Typography>
            <Button variant="contained" onClick={() => window.location.href = '/admin_users'}>Manejar usuarios</Button>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6"><ReceiptIcon /> Presupuestos</Typography>
            <Typography variant="h4">{presupuestos.length}</Typography>
            <Button variant="contained" onClick={() => window.location.href = '/list_budget'}>Manejar presupuestos</Button>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6"><NotificationsIcon /> Alertas</Typography>
            <Typography variant="h4">{alerts.length}</Typography>
            <Button variant="contained" onClick={() => window.location.href = '/alerts'}>Manejar alertas</Button>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6"><FavoriteIcon /> Favoritos</Typography>
            <Typography variant="h4">{favoritos.length}</Typography>
            <Button variant="contained" onClick={() => window.location.href = '/list_product_seguidos'}>Manejar favoritos</Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

// Sección de búsqueda con mejor estilo
const renderSearchSection = () => (
  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
    <TextField
      select
      fullWidth
      label="Seleccionar usuario"
      value={searchUser}
      onChange={(e) => setSearchUser(e.target.value)}
      SelectProps={{ native: true }}
    >
      <option aria-label="None" value="" />
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.username}
        </option>
      ))}
    </TextField>
    <Button variant="contained" color="primary">
      Seleccionar
    </Button>
  </Box>
);

// Tabla con estilo y filas correctamente separadas
const renderTable = (type) => {
  const getRows = () => {
    if (type === "Presupuestos") return presupuestosUser;
    if (type === "Alertas") return alertsUser;
    if (type === "Favoritos") return favoritosUser;
    return [];
  };

  const renderRow = (item) => {
    if (type === "Presupuestos" || type === "Favoritos") {
      return (
        <>
          <TableCell>{item.name}</TableCell>
          <TableCell>{item.n_items_total}</TableCell>
        </>
      );
    }

    if (type === "Alertas") {
      return (
        <>
          <TableCell>{item.end_date}</TableCell>
          <TableCell>{item.item_alibaba_title || item.item_amazon_title}</TableCell>
        </>
      );
    }

  };

  return (
    <TableContainer component={Paper} sx={{ mt: 2, boxShadow: 3 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
            {type === "Presupuestos" && (
              <>
                <TableCell><strong>Nombre Presupuesto</strong></TableCell>
                <TableCell><strong>Nº Artículos</strong></TableCell>
              </>
            )}
            {type === "Alertas" && (
              <>
                <TableCell><strong>Fecha Fin</strong></TableCell>
                <TableCell><strong>Artículo</strong></TableCell>
              </>
            )}
            {type === "Favoritos" && (
              <>
                <TableCell><strong>Nombre Favorito</strong></TableCell>
                <TableCell><strong>Nº Artículos</strong></TableCell>
              </>
            )}
           
          </TableRow>
        </TableHead>
        <TableBody>
          {getRows().map((item) => (
            <TableRow
              key={item.id}
              hover
              sx={{
                "&:nth-of-type(odd)": { backgroundColor: "#fafafa" },
              }}
            >
              {renderRow(item)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Render principal del panel
return (
  <Box p={3}>
    <Typography variant="h4" gutterBottom>
      Panel de Administración
    </Typography>
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
      <Button variant="contained" color='warning' onClick={() => window.location.href = '/incidencias_admin'}>
        <AnnouncementIcon />
        Ver Incidencias
      </Button>
    </Box>
    {renderSummaryCards()}

    <Tabs
      value={selectedTab}
      onChange={handleTabChange}
      variant="scrollable"
      scrollButtons="auto"
      sx={{ mb: 2 }}
    >
      <Tab label="Presupuestos de Usuarios" />
      <Tab label="Alertas de Usuarios" />
      <Tab label="Favoritos de Usuarios" />
    </Tabs>

    {renderSearchSection()}

    {selectedTab === 0 && renderTable('Presupuestos')}
    {selectedTab === 1 && renderTable('Alertas')}
    {selectedTab === 2 && renderTable('Favoritos')}
  </Box>
);

};

export default DashboardAdmin;
