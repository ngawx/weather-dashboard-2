import React, { useEffect, useState, useRef } from "react";
import { fetchWeatherAlerts } from "./services/weatherService";
import { motion, AnimatePresence } from "framer-motion";
import ConditionsScroll from "./components/ConditionsScroll";

function App() {
  const [alerts, setAlerts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedMap, setSelectedMap] = useState("radar");
  const [selectedBadge, setSelectedBadge] = useState(null);
  const alertsPerPage = 4;
  const resumeTimeout = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await fetchWeatherAlerts();
        setAlerts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching weather alerts:", error);
        setAlerts([]);
      }
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    const { event, senderName, effective, expires } = alert.properties;
    const isFromFFC = senderName?.toLowerCase().includes("nws peachtree city");
    const now = new Date();
    const effectiveTime = new Date(effective);
    const expiresTime = new Date(expires);
    const isActiveOrFuture = (!isNaN(effectiveTime) && effectiveTime <= now && expiresTime >= now) || effectiveTime >= now;
    return isFromFFC && isActiveOrFuture;
  });

  const hasSevereAlerts = filteredAlerts.some(alert =>
    /tornado|severe thunderstorm|watch/i.test(alert.properties.event)
  );

  const alertTypes = [
    { key: "tornado", label: "Tornado", gradient: "from-red-600 to-red-800" },
    { key: "severeWarn", label: "Svr T-Storm", gradient: "from-orange-400 to-orange-700" },
    { key: "severe", label: "Severe", gradient: "from-yellow-400 to-yellow-600" },
    { key: "flood", label: "Flood", gradient: "from-green-600 to-green-800" },
    { key: "heat", label: "Heat", gradient: "from-pink-400 to-pink-700" },
    { key: "cold", label: "Cold", gradient: "from-blue-600 to-blue-800" },
  ];

  const alertCounts = {
    tornado: 0,
    severe: 0,
    severeWarn: 0,
    flood: 0,
    heat: 0,
    cold: 0
  };

  filteredAlerts.forEach(alert => {
    const event = alert.properties.event.toLowerCase();
    if (event.includes("tornado")) alertCounts.tornado++;
    if (event.includes("severe") && event.includes("warning")) alertCounts.severeWarn++;
    if (event.includes("severe")) alertCounts.severe++;
    if (event.includes("flood")) alertCounts.flood++;
    if (event.includes("heat")) alertCounts.heat++;
    if (event.includes("cold") || event.includes("blizzard") || event.includes("freeze")) alertCounts.cold++;
  });

  const handleBadgeClick = (key) => {
    setSelectedBadge(key === selectedBadge ? null : key);
  };

  const ffcActiveAlertCount = filteredAlerts.length;

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row pt-0 px-2 sm:px-4 relative transition-colors duration-500 ${
      hasSevereAlerts ? 'bg-red-100' : 'bg-gray-900 text-white'
    }`}>

      <div className="w-full lg:w-3/4 flex flex-col">
        <div className="fixed top-2 left-2 text-sm sm:text-base font-mono z-40 bg-gray-900 px-2 py-1 rounded shadow">
          {currentTime.toLocaleTimeString()} EDT
        </div>

        <div className="flex justify-center gap-2 mb-2 mt-10 flex-wrap">
          <button onClick={() => setSelectedMap("radar")} className={`px-3 py-1 rounded text-sm ${selectedMap === "radar" ? "bg-blue-600" : "bg-gray-700"}`}>Current Radar</button>
          <button onClick={() => setSelectedMap("alerts")} className={`px-3 py-1 rounded text-sm ${selectedMap === "alerts" ? "bg-blue-600" : "bg-gray-700"}`}>Active Alerts Map</button>
          <button onClick={() => setSelectedMap("spc")} className={`px-3 py-1 rounded text-sm ${selectedMap === "spc" ? "bg-blue-600" : "bg-gray-700"}`}>SPC Map</button>
        </div>

        <div className="w-full px-4 mb-4">
          {selectedMap === "radar" && <img src={`https://radar.weather.gov/ridge/standard/KFFC_0.gif?${Date.now()}`} alt="Radar" className="w-full h-auto rounded" />}
          {selectedMap === "alerts" && <img src="https://www.weather.gov/images/ffc/big/GA_WWA.png" alt="Alerts" className="w-full h-auto rounded" />}
          {selectedMap === "spc" && <img src="https://www.spc.noaa.gov/products/activity_loop.gif" alt="SPC Map" className="w-full h-auto rounded" />}
        </div>

        {selectedMap === "spc" && (
          <div className="text-xs text-center mb-4">
            <span className="text-green-400 font-bold">Light Green</span> – General T-Storm; <span className="text-green-700 font-bold">Dark Green</span> – Marginal; <span className="text-yellow-400 font-bold">Yellow</span> – Slight; <span className="text-orange-500 font-bold">Orange</span> – Enhanced; <span className="text-red-500 font-bold">Red</span> – Moderate; <span className="text-pink-400 font-bold">Magenta</span> – High
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3 mb-4">
          {alertTypes.map(({ key, label, gradient }) => (
            <div
              key={key}
              className={`px-3 py-1 text-white text-sm rounded cursor-pointer bg-gradient-to-r ${gradient}`}
              onClick={() => handleBadgeClick(key)}
            >
              {label}: {alertCounts[key]}
            </div>
          ))}
        </div>

        {selectedBadge && (
          <div className="bg-gray-800 p-4 rounded text-white max-w-xl mx-auto">
            <h3 className="text-lg font-bold mb-2">Affected Areas for {alertTypes.find(t => t.key === selectedBadge).label}</h3>
            <ul className="list-disc list-inside text-sm space-y-1 max-h-[200px] overflow-y-auto">
              {filteredAlerts.filter(alert => alert.properties.event.toLowerCase().includes(selectedBadge)).map((alert, index) => (
                <li key={index}>{alert.properties.areaDesc}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col w-full lg:w-1/4 px-2 overflow-y-auto h-[600px] mt-8">
        <ConditionsScroll />
      </div>

      <footer className="absolute bottom-2 right-2 text-xs text-gray-500">© 2025 All Rights Reserved P.J. Gudz</footer>
    </div>
  );
}

export default App;
