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
  // Estado para el botón de predicción de precios
  const [forecastSelected, setForecastSelected] = useState(false);
  // Estado para manejar la predicción de precios
  const [amazonHistoryFuture, setAmazonHistoryFuture] = useState([]);
  const [alibabaHistoryFuture, setAlibabaHistoryFuture] = useState([]);

  const handleForecastClick = () =>{
    if (!forecastSelected) setForecastSelected(true); // Cambia el estado de forecastSelected
    else setForecastSelected(false); // Resetea el estado de forecastSelected
  };



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
  const hoy = new Date();
  const fechaLimite = new Date(hoy);
  if (rangoFechas === "1m") fechaLimite.setMonth(hoy.getMonth() - 1);
  if (rangoFechas === "6m") fechaLimite.setMonth(hoy.getMonth() - 6);
  if (rangoFechas === "1y") fechaLimite.setFullYear(hoy.getFullYear() - 1);

  // ——————————————
  // 1) HISTORIAL PASADO
  // ——————————————
  let historialAmazon = generarHistorialPrecios(amazonHistory)
    .map(d => ({ fecha: new Date(d.fecha), precio: d.precio }))
    .filter(d => d.fecha >= fechaLimite);

  console.log("Historial Amazon:", historialAmazon);

  let historialAlibaba = generarHistorialPrecios(alibabaHistory)
    .map(d => ({ fecha: new Date(d.fecha), precio: d.precio, rango: d.rango }))
    .filter(d => {
      if (selectedAlibabaRange) return d.rango === selectedAlibabaRange;
      return true;
    })
    .filter(d => d.fecha >= fechaLimite);

  console.log("Historial Alibaba:", historialAlibaba);
  // ——————————————
  // 2) PREDICCIÓN FUTURA
  // ——————————————
  let historialAmazonFuture = [];
  let historialAlibabaFuture = [];
  

  if (amazonHistoryFuture?.dates && amazonHistoryFuture?.prices) {
    historialAmazonFuture = amazonHistoryFuture.dates.map((d, i) => ({
      fecha: new Date(d),
      precio: amazonHistoryFuture.prices[i] ?? null
    }));
  }

  if (alibabaHistoryFuture?.dates && alibabaHistoryFuture?.prices) {
    historialAlibabaFuture = alibabaHistoryFuture.dates.map((d, i) => ({
      fecha: new Date(d),
      precio: alibabaHistoryFuture.prices[i] ?? null
    }));
  }
  
  // ——————————————
  // 3) UNIÓN DE FECHAS
  // ——————————————
  const todasFechas = new Set();
  [
    ...historialAmazon,
    ...historialAlibaba,
    ...historialAmazonFuture,
    ...historialAlibabaFuture
  ].forEach(d => todasFechas.add(d.fecha.toISOString().slice(0,10)));
  const fechas = Array.from(todasFechas).sort();

  // ——————————————
  // 4) FUNCIÓN AUXILIAR PARA CREAR SERIES
  // ——————————————
  const buildSerie = historial =>
    fechas.map(f => {
      const rec = historial.find(d => d.fecha.toISOString().slice(0,10) === f);
      return rec ? rec.precio : null;
    });

  // ——————————————
  // 5) CREACIÓN DE DATASETS
  // ——————————————
  const datasets = [];

  if (historialAmazon.length) {
    datasets.push({
      label: "Historial Amazon",
      data: buildSerie(historialAmazon),
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59,130,246,0.2)",
      fill: true,
      tension: 0.3
    });
  }

  if (historialAlibaba.length) {
    datasets.push({
      label: "Historial Alibaba",
      data: buildSerie(historialAlibaba),
      borderColor: "#16a34a",
      backgroundColor: "rgba(22,163,74,0.2)",
      fill: true,
      tension: 0.3
    });
  }

  // ——————————————
  // 6) PREDICCIONES (líneas punteadas)
  // ——————————————
  if (historialAmazonFuture.length) {
    datasets.push({
      label: "Pronóstico Amazon (6m)",
      data: buildSerie(historialAmazonFuture),
      borderColor: "#3b82f6",
      borderDash: [5,5],
      fill: false,
      tension: 0.3
    });
  }

  if (historialAlibabaFuture.length) {
    datasets.push({
      label: "Pronóstico Alibaba (6m)",
      data: buildSerie(historialAlibabaFuture),
      borderColor: "#16a34a",
      borderDash: [5,5],
      fill: false,
      tension: 0.3
    });
  }

  // ——————————————
  // 7) LINEAS DE MÁXIMO/MÍNIMO
  // ——————————————
  const amazonVals = buildSerie(historialAmazon).filter(v=>v!=null);
  if (amazonVals.length) {
    const maxA = Math.max(...amazonVals);
    datasets.push({
      label: "Máximo Amazon",
      data: fechas.map(()=>maxA),
      borderColor: "orange",
      borderDash: [4,4],
      fill: false,
      tension: 0.1
    });
  }

  const aliVals = buildSerie(historialAlibaba).filter(v=>v!=null);
  if (aliVals.length) {
    const minB = Math.min(...aliVals);
    datasets.push({
      label: "Mínimo Alibaba",
      data: fechas.map(()=>minB),
      borderColor: "purple",
      borderDash: [4,4],
      fill: false,
      tension: 0.1
    });
  }

  // ——————————————
  // 8) ACTUALIZAR ESTADO
  // ——————————————
  setDatosGrafico({ labels: fechas, datasets });
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
              const rango = await axiosPrivate.get(`/price_range/${rango_id}/`);
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

  useEffect(() => {
    //Si Boton de calcular prediccion de precios es presionado, se actualiza la gráfica

    if(forecastSelected){
      const fetchForecast = async () => {
        try {
          const response = await axiosPrivate.get(`/forecast-price/?id_item_alibaba=${alibabaSelected}&&id_rango=${selectedAlibabaRange}&&id_item_amazon=${amazonSelected}`);
          console.log("Respuesta de la predicción:", response.data);
          if (response.status === 200) {
            
            const amazonForecast = response.data.amazon;
            const alibabaForecast = response.data.alibaba;
            // Actualizamos los historiales con las predicciones
            setAmazonHistoryFuture(amazonForecast);
            setAlibabaHistoryFuture(alibabaForecast);

            // Añade los datos de la predicción a los datasets existentes
            setForecastSelected(false); // Reseteamos el estado de predicción
            actualizarDatosGrafico(); // Actualizamos la gráfica con los nuevos datos

            

          }
        } catch (error) {
          console.error("Error al obtener predicción de precios:", error);
        }

      }
      fetchForecast();
    }
  }, [forecastSelected]);

  

  /**
   * Cada vez que cambie alguno de los historiales, el rango de fechas o el rango seleccionado para Alibaba,
   * se actualiza la gráfica.
   */
  useEffect(() => {
    actualizarDatosGrafico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amazonHistory, alibabaHistory, rangoFechas, selectedAlibabaRange,forecastSelected,amazonHistoryFuture,alibabaHistoryFuture]);

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

      {/* Botón para calcular predicción de precios */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <Button variant="contained" color="primary" onClick={() => handleForecastClick()}>
          Calcular Predicción
        </Button>
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
