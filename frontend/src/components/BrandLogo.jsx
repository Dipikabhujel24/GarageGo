import React from 'react';
import logoImage from '../assets/garagego-logo.png';
import './BrandLogo.css';

function BrandLogo({
  className = '',
  variant = 'default',
  showSubtitle = false,
  subtitle = 'Unified Workspace',
}) {
  const classes = ['brand-logo', `brand-logo--${variant}`, className].filter(Boolean).join(' ');

  return (
    <div className="brand-logo-wrap">
      <img src={logoImage} alt="GarageGo" className={classes} />
      {showSubtitle ? <p className="brand-logo-subtitle">{subtitle}</p> : null}
    </div>
  );
}

export default BrandLogo;
export { logoImage as garageGoLogo };
