import './App.css';
import React, { useContext} from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Alerts from './pages/Alerts.jsx';
import Budget from './pages/Budget.jsx';
import ListBudget from './pages/ListBudget.jsx';
import Grafics from './pages/Grafics.jsx';
import Login from './pages/Login.jsx';
import SearchProduct from './pages/SearchProduct.jsx';
import CompareProduct from './pages/CompareProducts.jsx';
import Layout from './components/Layout.jsx';
import Inicio from './pages/Inicio.jsx';
import Perfil from './pages/Perfil.jsx';
import ErrorPage from './pages/ErrorPage.jsx';
import AdministrarUsers from './pages/AdministrarUsers.jsx'
import ListProductosSeguidos from './pages/ListProductosSeguidos.jsx';
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme"; // Importa el tema global
import { AuthenticateProvider } from './context/AutenticateContex.jsx'
import Middleware from './middleware/Middleware.jsx';
import DashboardAdmin from './pages/DashboardAdmin.jsx';
import IncidenciasAdmin from './pages/Incidencias.jsx';
import Inventario from './pages/Inventario.jsx';



function App() {
  return (
    <AuthenticateProvider>   
    <ThemeProvider theme={theme}>
      <CssBaseline />
        <Router>
          <Routes>
            {/* RUTA SIN LAYOUT (Solo Login) */}
            <Route path="/login" element={<Login />} />

            {/* RUTAS CON LAYOUT (Navbar + Footer) */}
            <Route element={<Layout />}>
              {/* Rutas protegidas por un middleware */}
              <Route element={<Middleware/>}>
                
                <Route path="/" element={<Inicio />} />
                <Route path="/searchProduct" element={<SearchProduct />} />
                <Route path="/compareProduct" element={<CompareProduct />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/list_budget" element={<ListBudget />} />
                <Route path="/grafics" element={<Grafics />} />
                <Route path="/list_product_seguidos" element={<ListProductosSeguidos />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/inventario" element={<Inventario />} />
                <Route path="/admin_users" element={<AdministrarUsers />} />
                <Route path="/dashboard_admin" element={<DashboardAdmin />} />
                <Route path="/incidencias_admin" element={<IncidenciasAdmin />} />
              </Route>
              {/* Ruta 404 -> redirige a login */}
              <Route path="*" element={<ErrorPage/>} />
            </Route>
          </Routes>
        </Router>
      
    </ThemeProvider>
    </AuthenticateProvider>
  );
}

export default App;