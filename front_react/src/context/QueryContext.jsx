import React, { createContext, useState } from 'react';

export const TemaContext = createContext();

export const TemaProvider = ({ children }) => {
  const [query, setQuery] = useState('iphone');

  return (
    <TemaContext.Provider value={{ query, setQuery }}>
      {children}
    </TemaContext.Provider>
  );
};