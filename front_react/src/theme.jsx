import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#009688", // Verde principal del logo
      light: "#26a69a", // Verde claro
      dark: "#00796b", // Verde oscuro
      contrastText: "#ffffff", // Texto en botones
    },
    secondary: {
      main: "#004d40", // Verde más oscuro para contrastes
      light: "#39796b",
      dark: "#00251a",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f5f5f5", // Fondo gris claro para toda la app
      paper: "#ffffff", // Fondo de tarjetas y contenedores
    },
    text: {
      primary: "#212121", // Texto principal negro/gris oscuro
      secondary: "#757575", // Texto secundario gris
    },
  },
  typography: {
    fontFamily: "'Arial'", // Tipografía moderna
    fontSize: 12,
    h1: {
      fontSize: "2.5rem",
      fontWeight: 700,
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 600,
    },
    h3: {
      fontSize: "1.75rem",
      fontWeight: 500,
    },
    body1: {
      fontSize: "1rem",
      fontWeight: 400,
    },
    button: {
      textTransform: "none", // Evita que los botones estén en mayúsculas
      fontWeight: "bold",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "8px", // Bordes redondeados en botones
          padding: "10px 20px",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: "10px", // Tarjetas redondeadas
          padding: "16px",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "1rem", // Tamaño del texto
          padding: "10px 16px", // Espaciado interno
          borderRadius: "6px", // Bordes redondeados
          transition: "background-color 0.2s ease-in-out",
          "&:hover": {
            backgroundColor: "#abebc6", // Cambia de color al pasar el mouse
            color: "black", // Texto en blanco al hacer hover
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          padding: "8px 12px", // Espaciado interno
          borderBottom: "1px solid #e0e0e0", // Línea separadora
          "&:last-child": {
            borderBottom: "none", // Evita borde en el último elemento
          },
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          backgroundColor:"white",
        }
      }
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: "10px",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)", // Sombra suave
          backgroundColor: "#ffffff", // Fondo blanco
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: "12px",
          fontSize: "12px",
        },
        head: {
          fontWeight: "bold",
          backgroundColor: "#64c652", // Color del header de la tabla
          color: "white",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:nth-of-type(even)": {
            backgroundColor: "#f5f5f5", // Fondo alternado para filas
          },
          "&:hover": {
            backgroundColor: "#e0f2f1", // Color al pasar el mouse
          },
        },
      },
    },


  },
});

export default theme;
