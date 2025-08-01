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
              `https://api.weather.gov/gridpoints/${city.grid[0]}/${city.grid[1]},${city.grid[2]}/forecast/hourly`
            );
            const json = await res.json();
            const periods = json.properties.periods;

            // Find the index of the forecast for the current hour (Eastern Time)
            const startIndex = periods.findIndex((t) => {
              const tHour = new Date(t.startTime).getHours();
              const tDate = new Date(t.startTime).toLocaleDateString('en-US', {
                timeZone: 'America/New_York',
              });

              const now = new Date();
              const currentHour = now.toLocaleString('en-US', {
                timeZone: 'America/New_York',
                hour: '2-digit',
                hour12: false,
              });
              const currentDate = now.toLocaleDateString('en-US', {
                timeZone: 'America/New_York',
              });

              return (
                tHour === parseInt(currentHour) && tDate === currentDate
              );
            });

            if (startIndex === -1) {
              console.warn(`Skipping ${city.name} — no matching hour found`);
              return null;
            }

            const forecast = periods.slice(startIndex, startIndex + 4).map((t) => ({
              time: new Date(t.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              temperature: Math.round(t.temperature),
              apparentTemperature:
  typeof t.apparentTemperature === 'number'
    ? Math.round(t.apparentTemperature)
    : null,
              probabilityOfPrecipitation:
                t.probabilityOfPrecipitation?.value !== null
                  ? Math.round(t.probabilityOfPrecipitation.value)
                  : null,
              shortForecast: t.shortForecast,
              name: t.name,
            }));

            return {
              city: city.name,
              current: forecast[0],
              forecast: forecast.slice(1),
            };
          })
        );

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
            {cityData.current.temperature}°F – {cityData.current.shortForecast}
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          {cityData.forecast.map((period, idx) => (
            <div
              key={idx}
              className="forecast-hour p-2 rounded shadow text-center text-sm bg-gradient-to-b from-blue-900 to-blue-600 border border-white"
            >
              <div className="font-bold text-white mb-1 text-sm">{period.time}</div>
              <div className="font-semibold text-white mb-1">{period.name}</div>
              <div className="text-white">{period.temperature}°F</div>
              <div className="text-white">
                {period.apparentTemperature !== null
                  ? `Feels like: ${period.apparentTemperature}°F`
                  : 'Feels like: N/A'}
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
