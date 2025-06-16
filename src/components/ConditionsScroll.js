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
    console.log("⏳ ConditionsScroll component is mounted");
    console.log("Fetching Weather Data...");

    const fetchAll = async () => {
      try {
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
      } catch (error) {
        console.error("Error fetching weather data:", error);
      }
    };

    fetchAll();

    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % cities.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  if (data.length === 0) {
    return <div className="scroll-box">Loading current conditions...</div>;
  }

  const cityData = data[index];

  return (
    <div className="scroll-box">
      <div className="scroll-entry">
        <div className="city-name">Currently: {cityData.city}</div>
        <div className="current">
          {cityData.current.temperature}°{cityData.current.temperatureUnit} – {cityData.current.shortForecast}
        </div>
        <div className="forecast">
          {cityData.forecast.map((period, idx) => (
            <div key={idx} className="forecast-hour">
              <div>{period.name}</div>
              <div>{period.temperature}°{period.temperatureUnit}</div>
              <div>{period.shortForecast}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
