import './main.css';
import Router from 'preact-router';
import { createHashHistory } from 'history';
import { MapPage } from './pages/map';

export const App = () => {
  return (
    <Router history={createHashHistory() as any}>
      <Home path="/" />
      <MapPage path="/an/map" />
    </Router>
  );
};

const Home = () => {
  return (
    <p>
      <a href={'/an/map'}>Map</a>
    </p>
  );
};
