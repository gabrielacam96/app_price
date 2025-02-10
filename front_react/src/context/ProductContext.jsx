// filepath: /C:/Users/gabri/OneDrive/Escritorio/TFG/front_react/src/context/ProductContext.js
import React, { createContext, useState, useMemo } from 'react';

export const ProductContext = createContext();

export const ProductProvider = ({ children }) => {
  const [selectedProducts, setSelectedProducts] = useState([]);

  const value = useMemo(() => ({ selectedProducts, setSelectedProducts }), [selectedProducts, setSelectedProducts]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};