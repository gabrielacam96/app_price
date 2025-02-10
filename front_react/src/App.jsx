import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import AmazonProductsTable from './components/AmazonProductsTable.jsx';
import AlibabaProductsTable from './components/AlibabaProductsTable.jsx';
import Navbar from './components/Navbar.jsx';
import "bootstrap/dist/css/bootstrap.min.css";
import Searcher from './components/searcher.jsx';
import Budget from './components/Budget.jsx';
import ListBudget from './components/ListBudget.jsx';
import Grafics from './components/Grafics.jsx';
import { TemaProvider } from './context/QueryContext';
import { ProductProvider } from './context/ProductContext';

function App() {
  return (
    <TemaProvider>
      <ProductProvider>
        <Router>
          <div> <Navbar /> </div>
          <h1>Products</h1>
          <div><Searcher /> </div>
          <Routes>
            <Route path="/" element={<div className='parent-container'><AmazonProductsTable/><AlibabaProductsTable /></div>} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/list_budget" element={<ListBudget />} />
            <Route path="/grafics" element={<Grafics />} />
            <Route path="*" element={<Navigate to="/" />} /> {/* Redirige si la ruta no existe */}
          </Routes>
          <div className='footer'>
            <h3>Footer</h3>
          </div>
        </Router>
      </ProductProvider>
    </TemaProvider>
  );
}

export default App;
