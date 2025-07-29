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

// Convert Celsius to Fahrenheit
const toFahrenheit = (c) => Math.round((c * 9) / 5 + 32);

export default function ConditionsScroll() {
  const [index, setIndex] = useState(0);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const now = new Date();
        now.setMinutes(0, 0, 0); // Round to top of hour
        const currentHourISO = now.toISOString();

        const results = await Promise.all(
          cities.map(async (city) => {
            try {
              const gridRes = await fetch(
                `https://api.weather.gov/gridpoints/${city.grid[0]}/${city.grid[1]},${city.grid[2]}`
              );
              const gridJson = await gridRes.json();

              const apparentTemps = gridJson.properties.apparentTemperature?.values || [];
              const temps = gridJson.properties.temperature?.values || [];
              const pops = gridJson.properties.probabilityOfPrecipitation?.values || [];

              const forecastRes = await fetch(
                `https://api.weather.gov/gridpoints/${city.grid[0]}/${city.grid[1]},${city.grid[2]}/forecast/hourly`
              );
              const forecastJson = await forecastRes.json();
              const shortForecasts = forecastJson.properties.periods || [];

              const startIndex = temps.findIndex((t) =>
                t.validTime.startsWith(currentHourISO)
              );

              if (startIndex === -1) {
                console.warn(`Skipping ${city.name} — no matching hour found`);
                return null;
              }

              const forecast = temps.slice(startIndex, startIndex + 4).map((t, i) => {
                const time = t.validTime.split('/')[0];
                return {
                  time,
                  temperature: toFahrenheit(t.value),
                  apparentTemperature:
                    apparentTemps[startIndex + i]?.value !== null
                      ? toFahrenheit(apparentTemps[startIndex + i].value)
                      : null,
                  probabilityOfPrecipitation:
                    pops[startIndex + i]?.value !== null
                      ? Math.round(pops[startIndex + i].value)
                      : null,
                  shortForecast: shortForecasts[i]?.shortForecast ?? '',
                };
              });

              return {
                city: city.name,
                current: {
                  temperature:
                    temps[startIndex]?.value !== null
                      ? toFahrenheit(temps[startIndex].value)
                      : null,
                  apparentTemperature:
                    apparentTemps[startIndex]?.value !== null
                      ? toFahrenheit(apparentTemps[startIndex].value)
                      : null,
                  shortForecast: shortForecasts[0]?.shortForecast ?? '',
                },
                forecast,
              };
            } catch (cityError) {
              console.error(`Error fetching data for ${city.name}:`, cityError);
              return null;
            }
          })
        );

        // Filter out any failed cities
        setData(results.filter(Boolean));
      } catch (error) {
        console.error('Error fetching weather data:', error);
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
        <div className="city-name text-xl font-semibold text-center mb-2">
          {cityData.city}
        </div>

        <div className="current-condition-box text-center bg-blue-700 text-white p-2 mb-4 rounded shadow border border-white">
          <div className="text-xs italic mb-1">Currently</div>
          <div className="text-base font-medium">
            Temp: {cityData.current.temperature}°F
          </div>
          <div className="text-sm">
            Feels Like: {cityData.current.apparentTemperature}°F
          </div>
          <div className="text-sm mt-1 italic">{cityData.current.shortForecast}</div>
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
                  minute: '2-digit',
                })}
              </div>
              <div className="text-white">Temp: {period.temperature}°F</div>
              <div className="text-white">
                Feels Like: {period.apparentTemperature}°F
              </div>
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
