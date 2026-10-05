import React from 'react';
import { SpaceCanvas } from './features/space/space.canvas.js';
import { GlobalTooltipProvider } from './features/common/app-tooltip.js';
import './styles/space.scss';

export const App: React.FC = () => {
  return (
    <>
      <GlobalTooltipProvider />
      <SpaceCanvas />
    </>
  );
};

export default App;
