import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import './index.css';
import { logger, setupGlobalErrorHandler } from './utils/logger';

const theme = {
  token: {
    colorPrimary: '#0055B9',
    borderRadius: 6,
  },
};

setupGlobalErrorHandler();

logger.enableFileLogging().then(() => {
  logger.info('Application starting');
}).catch((error) => {
  console.error('Failed to enable file logging:', error);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
