import React, { useEffect, useState } from 'react';
import './ConditionsScroll.css';

const cities = [
  { name: 'Atlanta, GA', grid: ['FFC', '57', '100'] },
  { name: 'Athens, GA', grid: ['FFC', '75', '89'] },
  { name: 'Dalton, GA', grid: ['FFC', '38', '140'] },
  { name: 'Rome, GA', grid: ['FFC', '27', '114'] },
  { name: 'Gainesville, GA', grid: ['FFC', '65', '108'] },
  { name: 'Peachtree City, GA', grid: ['FFC', '56', '83'] },
];

export default function ConditionsScroll() {
  const [index, setIndex] = useState(0);
  const [data, setData] = useState([]);

  useEffect(() => {
    console.log("Fetching Weather Data...);
    const fetchAll = async () => {
      const results = await Promise.all(
        cities.map(async (city) => {
          const res = await fetch(
            `https://api.weather.gov/gridpoints/${city.grid[0]}/${city.grid[1]},${city.grid[2]}/forecast/hourly`
          );
          const json = await res.json();
          const current = json.properties.periods[0];
          const next = json.properties.periods.slice(1, 4);
          return {
            city: city.name,
            current,
            forecast: next,
          };
        })
      );
      setData(results);
    };

    fetchAll();

    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % cities.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  if (data.length === 0) {
    return <div className="conditions-box">Loading...</div>;
  }

  const item = data[index];

  return (
    <div className="conditions-container">
      <div className="conditions-box">
        <div className="location">{item.city}</div>
        <div className="current">Currently: {item.current.shortForecast}, {item.current.temperature}°F</div>
        <div className="forecast-row">
          {item.forecast.map((f, idx) => (
            <div className="forecast-hour" key={idx}>
              <div className="hour">
                {new Date(f.startTime).getHours() % 12 || 12}
                {new Date(f.startTime).getHours() >= 12 ? 'PM' : 'AM'}
              </div>
              <div>{f.shortForecast}</div>
              <div>{f.temperature}°</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
