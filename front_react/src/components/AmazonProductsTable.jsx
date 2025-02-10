import React, { useState, useEffect, useContext } from 'react';
import { TemaContext } from "../context/QueryContext";

function AmazonProductsTable() {
  const { query } = useContext(TemaContext);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [query]);

  const fetchProducts = () => {
    fetch(`http://127.0.0.1:8000/app/amazon/scrape/${query}/`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Error en la red al obtener los productos');
        }
        return response.json();
      })
      .then(data => setProducts(data.resultados))
      .catch(error => {
        setError(error);
        console.error('Error fetching products:', error);
      });
  };

  const handleclick = (image) =>
    {
      fetch(`http://127.0.0.1:8000/app/alibaba/scrape/compare/${image}`)
      .then(response => {
          if (!response.ok) {
          throw new Error('Error en la red al obtener los productos');
          }
          return response.json();
      })
      .then(data => setProducts(data.resultados))
      .catch(error => {
          setError(error);
          console.error('Error fetching products:', error);
      });
      
      };

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h2>Productos de Amazon</h2>
      <table className='tableamazon'>
        <thead>
          <tr>
            <th>Título</th>
            <th>Imagen</th>
            <th>Precio</th>
            <th>Nº de Reseñas</th>
            <th>Rating</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={index}>
              <td>{product.titulo}</td>
              <td>
                {product.imagen ? (
                  <a href={product.url} target="_blank" rel="noopener noreferrer">
                    <img src={product.imagen} alt={product.titulo} width="100" />
                  </a>
                ) : (
                  'Sin imagen'
                )}
              </td>
              <td>{product.precio}</td>
              <td>{product.reviews}</td>
              <td>{product.rating}</td>
              <td><button className="button" onClick={() => handleclick(product.url)}>Comparar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AmazonProductsTable;