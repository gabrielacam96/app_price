import axios from 'axios';

// Crea instancia de axios configurada
const axiosPrivate = axios.create({
  baseURL:  process.env.REACT_APP_API_URL || '/app',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enviar cookies automáticamente
});

// Interceptor de REQUEST para añadir token CSRF en POST/PUT/DELETE
axiosPrivate.interceptors.request.use(
  async (config) => {
    if (['post', 'put', 'delete'].includes(config.method)) {
      // Solicitar el token CSRF solo cuando sea necesario
      const { data } = await axios.get('/app/csrf/', { withCredentials: true });
      const csrfToken = data.csrfToken;

      // Añadir el token CSRF a la cabecera de la solicitud
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de RESPONSE para manejar errores 401 y refrescar el token
axiosPrivate.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalConfig = error.config;

    // Si recibimos un 401 y no hemos reintentado aún
    if (error.response?.status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;
      try {
        // Petición para refrescar tokens (guardados en cookies)
        await axios.post('/app/refresh_token/', {}, { withCredentials: true });
        // Si tiene éxito, repetimos la petición original con axiosPrivate
        return axiosPrivate(originalConfig);
      } catch (refreshError) {
        // Si falla el refresh, rechazamos el error final
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosPrivate;
