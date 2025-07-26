import React from "react";
import "./loaderBarras.css";

const LoaderBarras = () => {
  return (
    <div className="loader-container">
      <div className="bars">
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
      </div>
      <div className="loader-symbol">$</div>
    </div>
  );
};

export default LoaderBarras;
