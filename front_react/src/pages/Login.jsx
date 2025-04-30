import React, { useState, useContext } from "react";
import { TextField, Button, Container, Typography, Box, Paper, AppBar, Toolbar, Grid, Alert } from "@mui/material";
import { AuthenticateContext } from "../context/AutenticateContex";
import { useNavigate } from "react-router-dom";
import axiosPrivate from "../hooks/axiosPrivate";


const LoginPage = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const {setAuthenticate,setUser,user } = useContext(AuthenticateContext);
  const navigate = useNavigate(); // Hook de React Router

  console.log("🟢 Estado inicial - Autenticado:", user); // Verificar estado inicial



  const handleLogin = async (e) => {
    if (e) e.preventDefault(); 

    setError("");


    if (!fullName || !password) {
      setError("Todos los campos son obligatorios");
      return;
    }

    try {
      console.log("🟢 Enviando solicitud a /login/");
      const response = await fetch("app/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: fullName, password: password }),
      });
      if (response.status !== 200) {
        console.error("Error en la autenticación, por favor intente nuevamente.");
        
      }
      const data = response.data;
      console.log("Datos recibidos:", data);
      setUser(data);
      setAuthenticate(true);
      setLoginSuccess(true);
      
      
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1500);

    } catch (err) {
      console.error("🔴 Error en la autenticación:", err.message);
      setError(err.message);
    }
  };

  return (
    <Container maxWidth="md">
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button color={isLogin ? "success" : "inherit"} onClick={() => setIsLogin(true)}>Login</Button>
          <Button color={!isLogin ? "success" : "inherit"} onClick={() => setIsLogin(false)}>Register</Button>
        </Toolbar>
      </AppBar>
      <Grid container spacing={2} sx={{ marginTop: 8, alignItems: "center" }}>
        <Grid item xs={12} md={6} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <img src="./logo.png" alt="Illustration" style={{ width: "80%", maxWidth: "400px", borderRadius: 10 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ padding: 4, textAlign: "center", borderRadius: 10, position: "relative" }}>
            {loginSuccess && (
              <Alert severity="success" sx={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: "90%" }}>
                Exito al loguearse
              </Alert>
            )}
            <Typography variant="h5" gutterBottom>{isLogin ? "Iniciar Sesión" : "Registro"}</Typography>
            {error && <Typography color="error">{error}</Typography>}
            <Box component="form" onSubmit={handleLogin}>
              <TextField fullWidth label="Usuario" margin="normal" variant="outlined" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <TextField fullWidth label="Contraseña" type="password" margin="normal" variant="outlined" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="submit" fullWidth variant="contained" color="success" sx={{ marginTop: 2 }}>
                Iniciar Sesión
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default LoginPage;
