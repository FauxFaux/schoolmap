import * as L from 'leaflet';
import { MapOptions } from 'leaflet';
import { createRef, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import 'leaflet/dist/leaflet.css';

import schools from '../../schools.json';

// @ts-ignore url-loader
import marker2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore url-loader
import marker from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore url-loader
import shadow from 'leaflet/dist/images/marker-shadow.png';

// everything in leaflet is in meters
const MILES = 1609.34;

const icon = L.icon({
  iconUrl: marker,
  shadowUrl: shadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

type DofEId = number;

export const MapPage = () => {
  const mapDiv = createRef<HTMLDivElement>();
  const [map, setMap] = useState<L.Map | null>(null);
  const [centre, setCentre] = useState<[number, number] | null>(null);
  const [focused, setFocused] = useState<DofEId | null>(null);

  const INITIAL_CENTRE = [51.0876, 1.161034] as [number, number];

  const mapOptions: MapOptions = {
    center: INITIAL_CENTRE,
    zoom: 14,
  };

  useEffect(() => {
    if (!mapDiv.current) return;
    const map = L.map(mapDiv.current, mapOptions);
    const layer = new L.TileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      },
    );
    map.addLayer(layer);

    setCentre(INITIAL_CENTRE);

    const centreObj = L.marker(INITIAL_CENTRE, {
      draggable: true,
      icon,
    });

    const handleMove = (e: L.LeafletEvent) => {
      const marker = e.target;
      const position = marker.getLatLng();
      setCentre([position.lat, position.lng]);
    };
    centreObj.on('mousemove', handleMove);
    centreObj.on('touchmove', handleMove);
    centreObj.on('drag', handleMove);
    centreObj.on('dragend', handleMove);

    centreObj.addTo(map);

    setMap(map);
    return () => map.remove();
  }, [mapDiv.current]);

  let table = <p>Loading...</p>;
  if (map && centre) {
    const matches = Object.entries(schools)
      .map(([id, school]) => ({
        ...school,
        dist: map.distance(centre, [school.lat, school.lng]),
        id: parseInt(id, 10),
      }))
      .filter((school) => {
        const radius = school.miles * MILES;
        return school.dist <= radius * 2;
      })
      .sort(({ dist: a }, { dist: b }) => a - b);

    useEffect(() => {
      if (!focused || !map) return;
      const school = schools[focused.toString()];
      const mark = L.marker([school.lat, school.lng], { icon });
      mark.addTo(map);
      let circle = L.circle([school.lat, school.lng], {
        radius: school.miles * MILES,
      });
      circle.addTo(map);
      return () => {
        mark.remove();
        circle.remove();
      };
    }, [focused]);

    const rows = matches.map((school) => {
      const appsPerPlace = school.totalApplications / school.offers;
      const radius = school.miles * MILES;
      const distMatch = school.dist / radius;
      const distWarn =
        distMatch < 0.33
          ? 'great'
          : distMatch < 0.9
          ? 'okay'
          : distMatch < 1.2
          ? 'warn'
          : 'bad';
      const dateOrNa = (date: string | null | undefined) =>
        date ? new Date(date).toISOString().substring(0, 10) : 'N/A';

      return (
        <tr>
          <td>
            <img
              src={marker}
              onMouseOver={() => setFocused(school.id)}
              onClick={() => setFocused(school.id)}
            />
          </td>
          <td>{school.name}</td>
          <td class={`map-dist-match-${distWarn}`}>{km(school.dist)}</td>
          <td>
            <abbr
              title={`${school.totalApplications} applications for ${school.offers} places`}
            >
              {onedp(appsPerPlace)}
            </abbr>
          </td>
          <td>
            <a href={school?.ofsted?.url} target={'_blank'}>
              {dateOrNa(school.ofsted?.date)}
            </a>
          </td>
          <td>{school.ofsted?.rating?.toLowerCase() ?? 'N/A'}</td>
        </tr>
      );
    });
    table = (
      <table class="table map-table">
        <thead>
          <tr>
            <th>pin</th>
            <th>name</th>
            <th>dist</th>
            <th>apps plc</th>
            <th>ofsted date</th>
            <th>rating</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );
  }

  return (
    <div class={'container-fluid'}>
      <div class={'row'}>
        <div class={'col'}>
          <div ref={mapDiv} class={'map-map'} />
        </div>
      </div>
      <div class={'row'}>
        <div class={'col'}>{table}</div>
      </div>
    </div>
  );
};

const km = (meters: number): JSX.Element => {
  return <>{(meters / 1000).toFixed(1)}km</>;
};

const onedp = (n: number): string => {
  return (Math.round(n * 10) / 10).toFixed(1);
};
