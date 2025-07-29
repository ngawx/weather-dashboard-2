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

// Convert Celsius to Fahrenheit and round
const toFahrenheit = (tempC) => Math.round((tempC * 9) / 5 + 32);

export default function ConditionsScroll() {
  const [index, setIndex] = useState(0);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const now = new Date();
        const currentHour = now.getHours();

        const results = await Promise.all(
          cities.map(async (city) => {
            const res = await fetch(
              `https://api.weather.gov/gridpoints/${city.grid[0]}/${city.grid[1]},${city.grid[2]}/forecast/hourly`
            );
            const json = await res.json();
            const periods = json.properties.periods;

            // Find current hour forecast index
            const nowUTC = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
            const currentIndex = periods.findIndex((p) =>
              p.startTime.startsWith(nowUTC)
            );

            if (currentIndex === -1) {
              console.warn(`Skipping ${city.name} — no matching hour found`);
              return null;
            }

            const current = periods[currentIndex];
            const forecast = periods.slice(currentIndex + 1, currentIndex + 4);

            return {
              city: city.name,
              current,
              forecast,
            };
          })
        );

        // Filter out any null entries
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
        <div className="city-name text-xl font-semibold text-center mb-2">{cityData.city}</div>

        <div className="current-condition-box text-center bg-blue-700 text-white p-2 mb-4 rounded shadow border border-white">
          <div className="text-xs italic mb-1">Currently</div>
          <div className="text-base font-medium">
            {toFahrenheit(cityData.current.temperature)}°F – {cityData.current.shortForecast}
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          {cityData.forecast.map((period, idx) => (
            <div
              key={idx}
              className="forecast-hour p-2 rounded shadow text-center text-sm bg-gradient-to-b from-blue-900 to-blue-600 border border-white"
            >
              <div className="font-bold text-white mb-1 text-sm">
                {new Date(period.startTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="font-semibold text-white mb-1">{period.name}</div>
              <div className="text-white">
                {toFahrenheit(period.temperature)}°F
              </div>
              <div className="text-white">
                {typeof period.apparentTemperature?.value === 'number'
                  ? `${toFahrenheit(period.apparentTemperature.value)}°F`
                  : 'Feels like: N/A'}
              </div>
              <div className="text-white text-xs mt-1">{period.shortForecast}</div>
              {period.probabilityOfPrecipitation &&
                period.probabilityOfPrecipitation.value !== null && (
                  <div className="text-white text-xs mt-1">
                    Precip: {period.probabilityOfPrecipitation.value}%
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
