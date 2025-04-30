import React, { useEffect, useState } from 'react';
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
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axiosPrivate from '../hooks/axiosPrivate';

const AdministrarUsers= () => {
  const [users, setUsers] = useState([]);

  const getUsers = async () => {
    try {
      const response = await axiosPrivate.get('/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await axiosPrivate.delete(`/users/${userId}/`);
      setUsers(users.filter((u) => u.id !== userId));
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
    }
  };
  const handleChangeRol =async(rol)=>{
    try{
        await axiosPrivate.patch(`users/${user.id}/cambiar-grupo/`, {
          group: newRol,
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

  useEffect(() => {
    getUsers();
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Administrar Usuarios
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Nombre</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell><strong>Tipo</strong></TableCell>
              <TableCell><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.first_name} {user.last_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Activo' : 'No Activo'}
                    color={user.is_active ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={
                      user.groups[0] === 1
                        ? 'Admin'
                        : user.groups[0] === 2
                        ? 'Básico'
                        : user.groups[0] === 3
                        ? 'Premium'
                        : 'No Definido'
                    }
                    color={
                      user.groups[0] === 1
                        ? 'warning'
                        : user.groups[0] === 2
                        ? 'primary'
                        : 'secondary'
                    }
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Eliminar usuario">
                    <IconButton onClick={() => handleDelete(user.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cambiar el rol">
                    <select
                      onChange={(e) => handleChangeRol(e.target.value)}
                      defaultValue={
                        user.groups[0] === 1
                          ? 'Admin'
                          : user.groups[0] === 2
                          ? 'Básico'
                          : user.groups[0] === 3
                          ? 'Premium'
                          : ''
                      }
                    >
                      <option value="admin">Admin</option>
                      <option value="basico">Básico</option>
                      <option value="premium">Premium</option>
                    </select>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AdministrarUsers;
