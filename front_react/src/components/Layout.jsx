import React from "react";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import Navbar from "../pages/Navbar";
import Footer from "./Footer";

export default function Layout() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {/* Navbar fijo en la parte superior */}
      <Navbar />

      {/* Contenido principal crece para “empujar” el footer si la página es corta */}
      <Box sx={{ flex: 1 }}>
        <Outlet />
      </Box>

      {/* Footer al final */}
      <Footer />
    </Box>
  );
}
