import React from 'react';
import './theme.css';
import Header from './Header';

export default function Layout({children}){
  return (
    <div className="app-container">
      <Header />
      <div className="site-card">
        {children}
      </div>
    </div>
  );
}
