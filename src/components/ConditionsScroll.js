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
    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          cities.map(async (city) => {
            const res = await fetch(
              `https://api.weather.gov/gridpoints/${city.grid[0]}/${city.grid[1]},${city.grid[2]}`
            );
            const json = await res.json();

            const apparentTemps = json.properties.apparentTemperature.values;
            const temps = json.properties.temperature.values;
            const forecasts = json.properties.shortForecast.values;
            const pops = json.properties.probabilityOfPrecipitation.values;

            // Extract the next 3 forecast periods
            const getUpcoming = (values) => {
              return values.slice(0, 3).map((v) => ({
                time: v.validTime.split("/")[0],
                value: v.value
              }));
            };

            return {
              city: city.name,
              current: {
                temperature: temps[0]?.value,
                apparentTemperature: apparentTemps[0]?.value,
                shortForecast: forecasts[0]?.value,
              },
              forecast: getUpcoming(temps).map((t, i) => ({
                time: t.time,
                temperature: t.value,
                apparentTemperature: apparentTemps[i]?.value,
                shortForecast: forecasts[i]?.value,
                probabilityOfPrecipitation: pops[i]?.value
              }))
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
    <div className="scroll-box fancy-gradient w-full">
      <div className="scroll-entry white-outline w-full">
        <div className="city-name text-xl font-semibold text-center mb-2">{cityData.city}</div>

        <div className="current-condition-box text-center bg-blue-700 text-white p-2 mb-4 rounded shadow border border-white">
          <div className="text-xs italic mb-1">Currently</div>
          <div className="text-base font-medium">
            Temp: {cityData.current.temperature}°F
          </div>
          <div className="text-sm">
            Feels Like: {cityData.current.apparentTemperature}°F
          </div>
          <div className="text-sm mt-1 italic">
            {cityData.current.shortForecast}
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          {cityData.forecast.map((period, idx) => (
            <div
              key={idx}
              className="forecast-hour p-2 rounded shadow text-center text-sm bg-gradient-to-b from-blue-900 to-blue-600 border border-white"
            >
              <div className="font-bold text-white mb-1 text-sm">
                {new Date(period.time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="text-white">Temp: {period.temperature}°F</div>
              <div className="text-white">Feels Like: {period.apparentTemperature}°F</div>
              <div className="text-white text-xs mt-1">{period.shortForecast}</div>
              {period.probabilityOfPrecipitation !== null && (
                <div className="text-white text-xs mt-1">
                  Precip: {period.probabilityOfPrecipitation}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
