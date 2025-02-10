import React, { useContext, useState } from 'react';
import { TemaContext } from '../context/QueryContext';
import { Button } from '@mui/material';

function Searcher() {
  const { query, setQuery } = useContext(TemaContext);
  const [localQuery, setLocalQuery] = useState(query);

  const handleSearch = () => {
    setQuery(localQuery); // Actualiza el estado global para desencadenar una nueva búsqueda
  };

  return (
    <>
      <input className='searcher'
        type="search" 
        placeholder="Buscar por producto" 
        value={localQuery} 
        onChange={(e) => setLocalQuery(e.target.value)} 
      />
      <Button variant="contained" color="success" onClick={handleSearch}>
        Buscar
      </Button>
    </>
  );
}

export default Searcher;