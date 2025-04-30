import React, { useState, useContext } from 'react';
import {Alert,MenuItem,DialogTitle,Box, Grid, Button, Typography, Avatar, TextField, Card, CardContent, CardActions, Dialog, DialogContent, FormControl, InputLabel, Select, DialogActions } from '@mui/material';

import PersonIcon from '@mui/icons-material/Person';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { AuthenticateContext } from "../context/AutenticateContex";
import axiosPrivate from '../hooks/axiosPrivate';


const Perfil = () => {
  const { user, setUser } = useContext(AuthenticateContext);
  const [section, setSection] = useState('profile');
  const [editPlan, setEditPlan] = useState(false);
  const [planes, setPlanes] = useState([
    {"title":"usuario_basico",
      "precio": 8.9
    },{"title": "usuario_premium" ,
      "precio": 19.99}
  ]);
  const [newPlan, setNewPlan] = useState('');
  const [openDialogPay, setOpenDialogPay] = useState(false);
  const [error, setError]=useState(null);
  const [success,setSuccess] =useState(null);
  const [numTarjet, setNumTarjet] = useState('');
  const [titularTarjet,setTitularTarjet] = useState('');
  const [cvnTarjet,setCvnTarjet] = useState('');
  const [openDialogEditPerfil,setOpenDialogEditPerfil] = useState(false)
  const [openDialogChangePassword,setOpenDialogChangePassword] = useState(false)
  const [newPassword,setNewPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [correo, setCorreo] = useState(user.email);
  const [firstName,setFirstName] = useState(user.first_name);
  const [lastName,setLastName] = useState(user.last_name);


  const saveChanges = () => {
    
    alert('Cambios guardados correctamente');
  };
  const soyPremium = user.tipo === 'premium' ? true : false; // Deshabilitar si no es premium
  const handleSaveChangePlan =()=>{
    setEditPlan(false);
    setOpenDialogPay(true);
  }
  const handleCloseChangePlan = ()=>{
    setEditPlan(false);
    setNewPlan(null);
  }
  const handlePay = async()=>{
    
    
    try{
        await axiosPrivate.patch(`users/${user.id}/cambiar-grupo/`, {
          group: newPlan.title,
        });
        setSuccess("Plan cambiado con exito")
        setTimeout(()=>{
          setSuccess(null)
          setOpenDialogPay(false);
        },1000)
    }catch(error){
      console.error("No ha sido posible cambiar el plan",error);
      setError("No ha sido posible cambiar el plan")
      setTimeout(()=>{
        setError(null)
        setOpenDialogPay(false);
      },1000)
    }
  }
  const handleClosePay=()=>{
    setOpenDialogPay(false);
  }

  const handleCloseEditPerfil =()=>{
    setOpenDialogEditPerfil(false)
  }

  const handleSaveEditPerfil =async()=>{
    try{
      await axiosPrivate.patch(`/users/${user.id}/`,{
        last_name: lastName,
        first_name: firstName,
        email_address: correo
      })
    }catch(error){
      console.error("error al ediatar el perfil", error)
      setError("error al ediatar el perfil")
      setTimeout(()=>{
        setError(null)
      },1000)
    }
    setOpenDialogEditPerfil(false)
  }

  const handleCloseChangePassword=()=>{
    setOpenDialogChangePassword(false)
  }
  const handleSaveChangePassword=async()=>{
    try{
      await axiosPrivate.post('/change-password/', {
        old_password: oldPassword,
        new_password: newPassword
      });
      setSuccess("Contraseña cambiada con exito")
      setTimeout(()=>{
        setSuccess(null)
        setOpenDialogChangePassword(false)
      },1000)

    }catch(error){
      console.error("no ha sido posible cmabiar de contraseña", error)
      setError("Contraseña cambiada con exito")
      setTimeout(()=>{
        setError(null)
        setOpenDialogChangePassword(false)
      },1000)
    }
    
  }
  
 

  return (
    <Grid container sx={{ minHeight: '100vh', bgcolor: '#f8f9fa', padding: 4 }}>
      {/* Menú lateral izquierdo */}
      <Grid item xs={12} md={3} sx={{ bgcolor: 'white', padding: 2, borderRadius: 2, boxShadow: 1 }}>
        <Typography variant="h6" gutterBottom>
          Bienvenido, {user.username}
        </Typography>

        <Button startIcon={<PersonIcon />} fullWidth onClick={() => setSection('profile')} sx={{ my: 1 }}>
          Ver mi perfil
        </Button>
        <Button startIcon={<CreditCardIcon />} fullWidth onClick={() => setSection('plan')} sx={{ my: 1 }}>
          Planes actuales
        </Button>
      </Grid>

    
        <Grid item xs={12} md={9} sx={{ padding: { xs: 2, md: 4 } }}>
          {section === 'profile' && (
            <Box sx={{ textAlign: 'center', bgcolor: 'white', p: 4, borderRadius: 2, boxShadow: 2 }}>
          <Avatar 
            src={"https://e7.pngegg.com/pngimages/340/946/png-clipart-avatar-user-computer-icons-software-developer-avatar-child-face-thumbnail.png"} 
            sx={{ width: 120, height: 120, margin: '0 auto', mb: 2 }} 
          />
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>Username: {user.username}</Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>Correo: {user.email}</Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>Nombre: {user.first_name}</Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>Apellido: {user.last_name}</Typography>
          <Typography variant="subtitle1" color="primary" sx={{ mt: 2, fontWeight: 'bold' }}>
            {user.tipo === 'premium' ? '🟢 Usuario Premium' : '🔵 Usuario Básico'}
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button variant="contained" color="primary" onClick={() => setOpenDialogChangePassword(true)}>
              Cambiar contraseña
            </Button>
            <Button variant="contained" color="secondary" onClick={() => setOpenDialogEditPerfil(true)}>
              Modificar perfil
            </Button>
          </Box>
            </Box>
          )}

          {section === 'plan' && (
          <Box sx={{ textAlign: 'center', bgcolor: 'white', p: 4, borderRadius: 2, boxShadow: 2 }}>
              <Box sx={{ margin: "10px", textAlign: "center" }}>
                <Button variant="contained" color="primary" onClick={() => setEditPlan(true)}>
                  Cambiar mi plan
                </Button>
              </Box>
            <Grid container spacing={4} justifyContent="center">
              <Grid item xs={12} md={5}>
                <Card elevation={4} sx={{ textAlign: 'center', py: 2, borderColor: 'primary.main', borderWidth: 2, borderStyle: 'solid', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>Plan Básico</Typography>
                <Typography variant="body1" sx={{ my: 1 }}>Historial precios</Typography>
                <Typography variant="body1" sx={{ my: 1 }}>Gestión de Alertas</Typography>
                <Typography variant="body1" sx={{ my: 1 }}>Comparar Productos</Typography>
                <Typography variant="h6" color="primary" sx={{ mt: 2, fontWeight: 'bold' }}>$7.58 / mes</Typography>
              </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={5}>
                <Card elevation={4} sx={{ textAlign: 'center', py: 2, borderColor: 'primary.main', borderWidth: 2, borderStyle: 'solid', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>Plan Premium</Typography>
                <Typography variant="body1" sx={{ my: 1 }}>Historial precios</Typography>
                <Typography variant="body1" sx={{ my: 1 }}>Gestión de Alertas</Typography>
                <Typography variant="body1" sx={{ my: 1 }}>Comparar Productos</Typography>
                <Typography variant="body1" sx={{ my: 1 }}>Previsión precios futuros</Typography>
                <Typography variant="body1" sx={{ my: 1 }}>Filtros búsqueda avanzados</Typography>
                <Typography variant="h6" color="primary" sx={{ mt: 2, fontWeight: 'bold' }}>$19.99 / mes</Typography>
              </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
          )}
        </Grid>
        {/* Dialogo para cambiar de plan  */}
      <Dialog open= {editPlan} onClose={handleCloseChangePlan}>
        {success && (
                //mostar mensaje de exito
                <Alert severity="success" sx={{ mt: 2 }}>
                    {success}
                </Alert>
        )} 
        {error && (
            //mostar mensaje de error
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <DialogTitle>
          Cambiar plan
          </DialogTitle>
          <DialogContent>
            <FormControl sx={{ minWidth: 350 }}>
            <InputLabel>Selecione el plan</InputLabel>
            <Select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
            >
              {planes.map((plan) => (
              <MenuItem key={plan.title} value={plan}>
                {plan.title}-{plan.precio}
              </MenuItem>
              ))}
            </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" color="primary" onClick={() => handleSaveChangePlan() } disabled = {!newPlan}>Cambiar mi plan</Button>
            <Button variant="contained" color="primary" onClick={() => handleCloseChangePlan()}>Cancelar</Button>
          </DialogActions>
          </Dialog>

          <Dialog open={openDialogPay} onClose={handleClosePay}
          maxWidth="md"
          fullWidth>

          {success && (
            //mostar mensaje de exito
            <Alert severity="success" sx={{ mt: 2 }}>
                {success}
            </Alert>
           )} 
          {error && (
              //mostar mensaje de error
              <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
              </Alert>
          )}
      <DialogTitle>
        Pagar con Visa
      </DialogTitle>
        <DialogContent>
          
          <TextField
            label="Ingrese numero tarjeta"
            value={numTarjet}
            onChange={(e)=>setNumTarjet(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}/>
          <TextField            
            label="Nombre del titular"
            value={titularTarjet}
            onChange={(e)=>setTitularTarjet(e.target.value)}
            fullWidth/>
          <TextField             
            label="CVN"
            value={cvnTarjet}
            type='number'
            onChange={(e)=>setCvnTarjet(e.target.value)}
            fullWidth/>
        </DialogContent>
        <DialogActions>
          <Button variant='contained' onClick={()=>handlePay()}>Pagar</Button>
          <Button variant='contained' onClick={()=>handleClosePay()}>Cancelar</Button>
          </DialogActions>
      </Dialog>
      {/* Dialogo para cambiar la contraseña*/}
      <Dialog open= {openDialogChangePassword} onClose={handleCloseChangePassword}
      maxWidth="md"
      fullWidth>

      {success && (
            //mostar mensaje de exito
            <Alert severity="success" sx={{ mt: 2 }}>
                {success}
            </Alert>
        )} 
        {error && (
            //mostar mensaje de error
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <DialogTitle>
          Cambio de contraseña
          </DialogTitle>
          <DialogContent>
            
            <TextField
            label="Ingrese la nueva contraseña"
            value={newPassword}
            onChange={(e)=>setNewPassword(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
            type="password"
            />
            <TextField            
            label="Repita la nueva contraseña"
            value={repeatPassword}
            onChange={(e)=>setRepeatPassword(e.target.value)}
            fullWidth
            type="password"
            />
            <TextField             
            label="Contraseña anterior"
            value={oldPassword}
            onChange={(e)=>setOldPassword(e.target.value)}
            fullWidth
            type="password"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={()=>handleSaveChangePassword()}>Guardar</Button>
            <Button onClick={()=>handleCloseChangePassword()}>Cancelar</Button>
            </DialogActions>
          </Dialog>
          {/* Dialogo para modificar el perfil*/}
      <Dialog open= {openDialogEditPerfil} onClose={handleCloseEditPerfil}
      maxWidth="md"
      fullWidth>

      {success && (
            //mostar mensaje de exito
            <Alert severity="success" sx={{ mt: 2 }}>
                {success}
            </Alert>
        )} 
        {error && (
            //mostar mensaje de error
            <Alert severity="error" sx={{ mt: 2 }}>
                {error}
            </Alert>
        )}
      <DialogTitle>
        Modificar Perfil
      </DialogTitle>
        <DialogContent>
          
          <TextField
            label="Ingrese el nuevo correo electronico"
            value={correo}
            onChange={(e)=>setCorreo(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}/>
          <TextField            
            label="Nombre"
            value={firstName}
            onChange={(e)=>setFirstName(e.target.value)}
            fullWidth/>
          <TextField            
            label="Apellidos"
            value={lastName}
            onChange={(e)=>setLastName(e.target.value)}
            fullWidth/>

        </DialogContent>
        <DialogActions>
          <Button onClick={()=>handleSaveEditPerfil()}>Guardar</Button>
          <Button onClick={()=>handleCloseEditPerfil()}>Cancelar</Button>
          </DialogActions>
      </Dialog>
      
    </Grid>
  );
};

export default Perfil;
