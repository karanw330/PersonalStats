import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import { Notifications } from '@mantine/notifications';
import App from './App';
import './styles/app.css';
import './styles/responsive.css';
import './styles/work.css';

const theme = createTheme({
  fontFamily: 'DM Sans, sans-serif', headings: { fontFamily: 'Manrope, sans-serif' },
  primaryColor: 'violet', defaultRadius: 'xl',
  colors: { violet: ['#f7f4ff','#eee9ff','#ddd3ff','#c9baff','#b6a3ff','#9a83ec','#7962d5','#5b46b8','#41338e','#30256e'] },
});
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><MantineProvider theme={theme} defaultColorScheme="dark"><Notifications position="top-right" /><App /></MantineProvider></React.StrictMode>,
);
