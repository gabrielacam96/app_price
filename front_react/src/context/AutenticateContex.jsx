import React, { createContext, useState, useMemo,useEffect } from 'react';

export const AuthenticateContext = createContext();
import axiosPrivate from "../hooks/axiosPrivate";

export const AuthenticateProvider = ({ children }) => {
  const [authenticate, setAuthenticate] = useState(false);
  const [user, setUser] = useState(null);
    // Al cargar la app, recuperar usuario desde backend
    useEffect(() => {
      const fetchUser = async () => {
        try {
          const response = await axiosPrivate.get("/current_user/");
          if (response.status !== 200) {
           console.error('Error al obtener el usuario autenticado', response.data);
          }
          if (response.data.is_authenticated) {
            setAuthenticate(true);
            setUser({
              id: response.data.id,
              username: response.data.username,
              email: response.data.email,
              last_name: response.data.last_name,
              first_name: response.data.first_name,
              groups: response.data.groups,
            });
          }
        } catch (error) {
          console.log("Usuario no autenticado");
        }
      };
    
      fetchUser();
    }, []);
    

  return (
    <AuthenticateContext.Provider value={{ authenticate, setAuthenticate, user, setUser }}>
      {children}
    </AuthenticateContext.Provider>
  );
};
