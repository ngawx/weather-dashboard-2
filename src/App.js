import React, { useEffect, useState, useRef } from "react";
import { fetchWeatherAlerts } from "./services/weatherService";
import { motion, AnimatePresence } from "framer-motion";
import ConditionsScroll from './components/ConditionsScroll';

function App() {
  const [alerts, setAlerts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedAlertTypes, setSelectedAlertTypes] = useState([]);
  const [selectedMap, setSelectedMap] = useState("radar");
  const alertsPerPage = 4;
  const resumeTimeout = useRef(null);

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
    const matchesType = selectedAlertTypes.length === 0 || selectedAlertTypes.includes(event);
    const now = new Date();
    const effectiveTime = new Date(effective);
    const expiresTime = new Date(expires);
    return isFromFFC && matchesType && (
      (effectiveTime <= now && expiresTime >= now) || effectiveTime >= now
    );
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (autoScroll && filteredAlerts.length > alertsPerPage) {
        setCurrentIndex((prev) => (prev + alertsPerPage) % filteredAlerts.length);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [filteredAlerts, autoScroll]);

  const resumeAutoScroll = () => {
    clearTimeout(resumeTimeout.current);
    resumeTimeout.current = setTimeout(() => {
      setAutoScroll(true);
    }, 15000);
  };

  const handleNext = () => {
    setAutoScroll(false);
    setCurrentIndex((prev) => (prev + alertsPerPage) % filteredAlerts.length);
    resumeAutoScroll();
  };

  const handlePrev = () => {
    setAutoScroll(false);
    setCurrentIndex((prev) =>
      (prev - alertsPerPage + filteredAlerts.length) % filteredAlerts.length
    );
    resumeAutoScroll();
  };

  const getAlertColor = (event) => {
    const lower = event.toLowerCase();
    if (lower.includes("tornado")) return "bg-red-700";
    if (lower.includes("severe")) return "bg-orange-500";
    if (lower.includes("watch")) return "bg-yellow-500";
    if (lower.includes("flood")) return "bg-green-700";
    return "bg-gray-600";
  };

  const ffcActiveAlertCount = filteredAlerts.length;

  const timeSuffix = currentTime.toLocaleString("en-US", { timeZoneName: "short" }).includes("DT") ? "EDT" : "EST";

  const alertCounts = {
    tornado: 0,
    severe: 0,
    watch: 0,
    flood: 0
  };
  filteredAlerts.forEach(alert => {
    const event = alert.properties.event.toLowerCase();
    if (event.includes("tornado")) alertCounts.tornado++;
    if (event.includes("severe")) alertCounts.severe++;
    if (event.includes("watch")) alertCounts.watch++;
    if (event.includes("flood")) alertCounts.flood++;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col lg:flex-row pt-0 px-2 sm:px-4 relative">
      <div className="w-full lg:w-1/2 pt-2 mb-4 lg:mb-0">
        <div className="flex justify-center gap-2 mb-2">
          <button onClick={() => setSelectedMap("radar")} className={`px-3 py-1 rounded text-sm ${selectedMap === "radar" ? "bg-blue-600" : "bg-gray-700"}`}>Current Radar</button>
          <button onClick={() => setSelectedMap("alerts")} className={`px-3 py-1 rounded text-sm ${selectedMap === "alerts" ? "bg-blue-600" : "bg-gray-700"}`}>Active Alerts Map</button>
          <button onClick={() => setSelectedMap("spc")} className={`px-3 py-1 rounded text-sm ${selectedMap === "spc" ? "bg-blue-600" : "bg-gray-700"}`}>SPC Map</button>
        </div>
        <img src={
          selectedMap === "radar"
            ? `https://radar.weather.gov/ridge/standard/KFFC_0.gif?${Date.now()}`
            : selectedMap === "alerts"
              ? "https://www.weather.gov/images/ffc/big/GA_WWA.png"
              : "https://www.spc.noaa.gov/products/activity_loop.gif"
        } alt="Map Display" className="w-full h-auto object-contain rounded" />
        {selectedMap === "spc" && (
          <div className="text-xs text-gray-300 mt-2 text-center">
            <p>SPC Risk Levels: Marginal (Dark Green), Slight (Yellow), Enhanced (Orange), Moderate (Red), High (Magenta)</p>
          </div>
        )}
      </div>

      <div className="w-full lg:w-1/2 flex flex-col items-center">
        <div className="fixed top-2 left-2 text-sm sm:text-base font-mono z-50 bg-gray-900 px-2 py-1 rounded shadow">
          {currentTime.toLocaleTimeString()} {timeSuffix}
        </div>

        <div className="text-sm font-semibold bg-gray-800 px-4 py-2 rounded-full border-2 border-white shadow-md mt-4">
          Active Alerts: {ffcActiveAlertCount}
        </div>
        {ffcActiveAlertCount === 0 && (
          <div className="text-sm text-gray-400 mt-2">No Active Alerts</div>
        )}

        <div className="flex gap-2 text-xs text-white mt-2">
          <div className="bg-red-700 px-2 py-1 rounded">Tornado: {alertCounts.tornado}</div>
          <div className="bg-orange-500 px-2 py-1 rounded">Severe: {alertCounts.severe}</div>
          <div className="bg-yellow-500 px-2 py-1 rounded">Watches: {alertCounts.watch}</div>
          <div className="bg-green-700 px-2 py-1 rounded">Flood: {alertCounts.flood}</div>
        </div>

        <div className="flex justify-between items-center w-full px-4 mb-2 mt-2">
          <button onClick={handlePrev} className="bg-gray-700 px-3 py-1 rounded">◀</button>
          <span className="text-xs text-gray-400">Showing {currentIndex + 1}–{Math.min(currentIndex + alertsPerPage, filteredAlerts.length)} of {filteredAlerts.length}</span>
          <button onClick={handleNext} className="bg-gray-700 px-3 py-1 rounded">▶</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full px-4 mb-4 min-h-[400px]">
          <AnimatePresence mode="wait">
            {filteredAlerts.slice(currentIndex, currentIndex + alertsPerPage).map((alert, idx) => {
              const { event, effective, expires, areaDesc } = alert.properties;
              const colorClass = getAlertColor(event);
              return (
                <motion.div key={idx} className={`p-4 rounded shadow ${colorClass} min-h-[180px]`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}>
                  <h3 className="text-lg font-bold mb-2">{event}</h3>
                  <p className="text-sm">Effective: {new Date(effective).toLocaleString()}</p>
                  <p className="text-sm">Expires: {new Date(expires).toLocaleString()}</p>
                  <div className="text-xs mt-2 overflow-y-auto max-h-24 whitespace-pre-line">
                    <strong>Affected Areas:</strong> {areaDesc}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="w-full flex justify-center mb-6 min-h-[160px]">
          <ConditionsScroll />
        </div>
      </div>

      <footer className="absolute bottom-2 right-2 text-xs text-gray-500">© 2025 All Rights Reserved P.J. Gudz</footer>
    </div>
  );
}

export default App;
