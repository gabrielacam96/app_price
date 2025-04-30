import React from "react";
import "./LoaderBarras.css";

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
