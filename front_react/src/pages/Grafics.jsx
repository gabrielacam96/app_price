import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  Box,
  Button,
  Container,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import axiosPrivate from "../hooks/axiosPrivate";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/**
 * Propiedades:
 * - amazonItems: array con items de Amazon (cada objeto con id, title, etc.).
 * - alibabaItems: array con items de Alibaba (cada objeto con id, title, etc.).
 */
const Grafics = () => {
  const navigate = useNavigate();

  const [amazonItems, setAmazonItems] = useState([]);
  const [alibabaItems, setAlibabaItems] = useState([]);

  // Estados para los selectores de items
  const [amazonSelected, setAmazonSelected] = useState(null);
  const [alibabaSelected, setAlibabaSelected] = useState(null);
  // Estado para el select de rango (solo para items Alibaba)
  const [alibabaRanges, setAlibabaRanges] = useState([]); // array de rangos extraídos del historial
  const [selectedAlibabaRange, setSelectedAlibabaRange] = useState(null);

  // Estados para guardar el historial obtenido
  const [amazonHistory, setAmazonHistory] = useState([]);
  const [alibabaHistory, setAlibabaHistory] = useState([]);

  // Estado para el rango de fechas (filtrado global, por ejemplo "1m", "6m", "1y")
  const [rangoFechas, setRangoFechas] = useState("1m");

  // Estado para los datos a mostrar en la gráfica
  const [datosGrafico, setDatosGrafico] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const comparaciones = await axiosPrivate.get("/comparaciones/");
        const following = await axiosPrivate.get("/following/");
        //recorrer comparaciones y following para obtener los items es un array de ids
        const items_amazon_ids = comparaciones.data.flatMap(item => item.items);
        const items_alibaba_ids = following.data.flatMap(item => item.items);

        let items_amazon = [];
        for (const id_amazon of items_amazon_ids) {
          const item_amazon = await axiosPrivate.get(`/items_amazon/${id_amazon}`);
          items_amazon.push(item_amazon.data);
        }
        let items_alibaba = [];
        for (const id_alibaba of items_alibaba_ids) {
          const item_alibaba = await axiosPrivate.get(`/items_alibaba/${id_alibaba}`);
          items_alibaba.push(item_alibaba.data);
        }
        
        setAmazonItems(items_amazon);
        setAlibabaItems(items_alibaba);
        
      } catch (error) {
        console.error("Error al obtener los items:", error);
      }
    };
    fetchItems();
  }, []);

  /**
   * Función auxiliar para transformar los registros del historial en objetos {fecha, precio}
   */
  const generarHistorialPrecios = (datos) => {
    if (!Array.isArray(datos)) return [];
    return datos.map((entry) => ({
      fecha: new Date(entry.date),
      precio: parseFloat(entry.current_price),
      rango: entry.rango, // para identificar el rango en items Alibaba
    }));
  };

  /**
   * Función para actualizar la gráfica combinando los datos recibidos
   * y añadiendo líneas horizontales de:
   *  - Mínimo de Alibaba
   *  - Máximo de Amazon
   */
  const actualizarDatosGrafico = () => {
    // Fecha actual y fecha límite según el rango seleccionado
    const hoy = new Date();
    const fechaLimite = new Date();
    if (rangoFechas === "1m") fechaLimite.setMonth(hoy.getMonth() - 1);
    if (rangoFechas === "6m") fechaLimite.setMonth(hoy.getMonth() - 6);
    if (rangoFechas === "1y") fechaLimite.setFullYear(hoy.getFullYear() - 1);

    // Procesamos historial de Amazon (si existe)
    let historialAmazon = generarHistorialPrecios(amazonHistory).filter(d => d.fecha >= fechaLimite);
    // Procesamos historial de Alibaba (si existe); si se ha seleccionado rango, lo filtramos
    let historialAlibaba = generarHistorialPrecios(alibabaHistory);
    if (selectedAlibabaRange) {
      historialAlibaba = historialAlibaba.filter(d => d.rango === selectedAlibabaRange);
    }
    historialAlibaba = historialAlibaba.filter(d => d.fecha >= fechaLimite);

    // Generar etiquetas: usamos las fechas únicas entre ambos historiales ordenadas de forma ascendente
    const fechas = Array.from(
      new Set([
        ...historialAmazon.map(d => d.fecha.toISOString().split("T")[0]),
        ...historialAlibaba.map(d => d.fecha.toISOString().split("T")[0])
      ])
    ).sort();

    // Armamos los datasets principales (líneas de Amazon y Alibaba)
    const datasets = [];

    let dataAmazon = [];
    if (historialAmazon.length > 0) {
      // Ordenamos según la fecha
      dataAmazon = fechas.map(fecha => {
        // Buscamos el registro para esa fecha (o null)
        const registro = historialAmazon.find(d => d.fecha.toISOString().split("T")[0] === fecha);
        return registro ? registro.precio : null;
      });
      datasets.push({
        label: "Historial de Precios Amazon",
        data: dataAmazon,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        fill: true,
        tension: 0.3,
      });
    }

    let dataAlibaba = [];
    if (historialAlibaba.length > 0) {
      dataAlibaba = fechas.map(fecha => {
        const registro = historialAlibaba.find(d => d.fecha.toISOString().split("T")[0] === fecha);
        return registro ? registro.precio : null;
      });
      datasets.push({
        label: "Historial de Precios Alibaba",
        data: dataAlibaba,
        borderColor: "#16a34a",
        backgroundColor: "rgba(22, 163, 74, 0.2)",
        fill: true,
        tension: 0.3,
      });
    }

    // Agregamos una línea horizontal para el mínimo de Alibaba
    if (dataAlibaba.length > 0 && dataAlibaba.some(val => val !== null)) {
      const validAlibabaVals = dataAlibaba.filter(val => val !== null);
      const minAlibaba = Math.min(...validAlibabaVals);
      datasets.push({
        label: "Mínimo Alibaba",
        data: new Array(fechas.length).fill(minAlibaba),
        borderColor: "purple",
        borderDash: [5, 5],
        borderWidth: 2,
        fill: false,
        tension: 0.1,
      });
    }

    // Agregamos una línea horizontal para el máximo de Amazon
    if (dataAmazon.length > 0 && dataAmazon.some(val => val !== null)) {
      const validAmazonVals = dataAmazon.filter(val => val !== null);
      const maxAmazon = Math.max(...validAmazonVals);
      datasets.push({
        label: "Máximo Amazon",
        data: new Array(fechas.length).fill(maxAmazon),
        borderColor: "orange",
        borderDash: [5, 5],
        borderWidth: 2,
        fill: false,
        tension: 0.1,
      });
    }

    // Establecemos los datos finales
    if (fechas.length > 0 && datasets.length > 0) {
      setDatosGrafico({ labels: fechas, datasets });
    } else {
      setDatosGrafico({ labels: [], datasets: [] });
    }
  };

  /**
   * Al seleccionar un item de Amazon se consulta su historial de precios
   */
  useEffect(() => {
    if (amazonSelected) {
      axiosPrivate
        .get(`/price_history/?item_amazon=${amazonSelected}`)
        .then(response => {
          if (response.status === 200) {
            setAmazonHistory(response.data);
          }
        })
        .catch(error => {
          console.error("Error al obtener historial de precios Amazon:", error);
        });
    } else {
      setAmazonHistory([]);
    }
  }, [amazonSelected]);

  /**
   * Al seleccionar un item de Alibaba se consulta su historial de precios
   */
  useEffect(() => {
    if (alibabaSelected) {
      axiosPrivate
        .get(`/price_history/?item_alibaba=${alibabaSelected}`)
        .then(async (response) => {
          if (response.status === 200) {
            setAlibabaHistory(response.data);
            // Extraer los rangos existentes en el historial
            const rangosUnicos = Array.from(
              new Set(response.data.map(entry => entry.rango))
            );
            let rangos = [];
            for (const rango_id of rangosUnicos) {
              const rango = await axiosPrivate.get(`/price_range/${rango_id}`);
              rangos.push(rango.data);
              
            }
            
            setAlibabaRanges(rangos);
            // Por defecto seleccionamos el primer rango (si existe)
            if (rangosUnicos.length > 0) {
              setSelectedAlibabaRange(rangosUnicos[0]);
            } else {
              setSelectedAlibabaRange(null);
            }
          }
        })
        .catch(error => {
          console.error("Error al obtener historial de precios Alibaba:", error);
        });
    } else {
      setAlibabaHistory([]);
      setAlibabaRanges([]);
      setSelectedAlibabaRange(null);
    }
  }, [alibabaSelected]);

  /**
   * Cada vez que cambie alguno de los historiales, el rango de fechas o el rango seleccionado para Alibaba,
   * se actualiza la gráfica.
   */
  useEffect(() => {
    actualizarDatosGrafico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amazonHistory, alibabaHistory, rangoFechas, selectedAlibabaRange]);

  console.log(alibabaRanges,"rangos");
  return (
    <Container>
      <Typography variant="h5" sx={{ mt: 3, mb: 2, textAlign: "center" }}>
        Historial de Precios
      </Typography>

      {/* Sección de seleccion de items */}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mb: 2 }}>
        {/* Selector para items de comparación de Amazon */}
        <Select
          value={amazonSelected}
          onChange={(e) => setAmazonSelected(e.target.value)}
          displayEmpty
          renderValue={(value) => {
            if (!value) return <em>Seleccionar item Amazon</em>;
            const item = amazonItems.find(i => i.id === value);
            return item ? `Amazon: ${item.title}` : value;
          }}
          sx={{ width: 200, fontSize: "12px" }}
        >
          {amazonItems.map((item) => (
            <MenuItem key={item.id} value={item.id} sx={{ fontSize: "12px" }}>
              {item.title}
            </MenuItem>
          ))}
        </Select>

        {/* Selector para items de Alibaba */}
        <Select
          value={alibabaSelected}
          onChange={(e) => setAlibabaSelected(e.target.value)}
          displayEmpty
          renderValue={(value) => {
            if (!value) return <em>Seleccionar item Alibaba</em>;
            const item = alibabaItems.find(i => i.id === value);
            return item ? `Alibaba: ${item.title}` : value;
          }}
          sx={{ width: 200, fontSize: "12px" }}
        >
          {alibabaItems.map((item) => (
            <MenuItem key={item.id} value={item.id} sx={{ fontSize: "12px" }}>
              {item.title}
            </MenuItem>
          ))}
        </Select>

      </Box>

      {/* Si se seleccionó un item de Alibaba y hay rangos disponibles, mostramos otro selector */}
      {alibabaSelected && alibabaRanges.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 2 }}>
          {alibabaRanges.map((rango, index) => (
            <Button
              key={index}
              variant={rango.id === selectedAlibabaRange ? "contained" : "outlined"}
              onClick={() => setSelectedAlibabaRange(rango.id)}
            >
              {`Rango: ${rango.minimo_range} - ${rango.maximo_range} unidades`}
            </Button>
          ))}
        </Box>
      )}


      {/* Selector para rango de fechas global */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <Select
          value={rangoFechas}
          onChange={(e) => setRangoFechas(e.target.value)}
          sx={{ width: 200, fontSize: "12px" }}
        >
          <MenuItem value="1m" sx={{ fontSize: "12px" }}>
            Último Mes
          </MenuItem>
          <MenuItem value="6m" sx={{ fontSize: "12px" }}>
            Últimos 6 Meses
          </MenuItem>
          <MenuItem value="1y" sx={{ fontSize: "12px" }}>
            Último Año
          </MenuItem>
        </Select>
      </Box>

      {/* Gráfico de Línea */}
      {datosGrafico.labels.length > 0 ? (
        <Box sx={{ height: 350 }}>
          <Line
            data={datosGrafico}
            options={{ responsive: true, maintainAspectRatio: false, spanGaps: true }}
          />
        </Box>
      ) : (
        <Typography variant="body1" sx={{ mt: 2, textAlign: "center" }}>
          No hay datos disponibles para el rango de fechas seleccionado.
        </Typography>
      )}

      {/* Botón para Volver */}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <Button variant="contained" color="primary" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </Box>
    </Container>
  );
};

export default Grafics;
