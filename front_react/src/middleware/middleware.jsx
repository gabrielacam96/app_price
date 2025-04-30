import React, { useContext, useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthenticateContext } from '../context/AutenticateContex.jsx';
import axiosPrivate from '../hooks/axiosPrivate';
import Cookies from 'js-cookie'; // Asegúrate de que estás usando la librería de cookies correcta

const Middleware= () => {
  const { user, setUser } = useContext(AuthenticateContext);
  const [checking, setChecking] = useState(true);
  const [failed, setFailed]     = useState(false);
  
  useEffect(() => {
    console.log('Middleware: Comprobando autenticación...',user);
      // Intentamos refrescar token
      (async () => {
        try {
          await axiosPrivate.post('/refresh_token/');
          // Si necesitas actualizar el user en el contexto:
          const response = await axiosPrivate.get('/current_user/');
          if (response.status !== 200) {
            console.error('Error al obtener el usuario autenticado', response.data);
          }else{
              setUser({
                id: response.data.id,
                username: response.data.username,
                email: response.data.email,
                last_name: response.data.last_name,
                first_name: response.data.first_name,
                groups: response.data.groups,
              });
          }
            
        } catch (err) {
          console.error('Error al renovar token:', err);
          setFailed(true);
        } finally {
          setChecking(false);
        }
        
      })();
    
  }, [window.location.pathname]); // Ejecutar solo al cargar la página o cambiar de ruta

  // 1) Mientras comprobamos el token, no renderizamos nada o un spinner
  if (checking) return null; // ó <Spinner />

  // 2) Si no hay user o el refresh falló, redirigimos al login
  if (failed) {
    return <Navigate to="/login" replace />;
  }

  // 3) Usuario autenticado y token OK → renderizamos las rutas hijas
  return <Outlet />;  // o tus componentes protegidos
};

export default Middleware;
