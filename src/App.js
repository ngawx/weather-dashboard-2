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

  const isDaylightSaving = currentTime.toLocaleString("en-US", { timeZoneName: "short" }).includes("DT");
  const timeSuffix = isDaylightSaving ? "EDT" : "EST";

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row pt-0 px-2 sm:px-4 relative transition-colors duration-500 ${
      hasSevereAlerts ? 'bg-red-100' : 'bg-gray-900 text-white'
    }`}>

      <div className="w-full lg:w-1/2 pt-10 mb-4 lg:mb-0">
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
          <div className="text-xs mt-2 text-center">
            <span className="text-green-400 font-bold">Light Green</span> – General T-Storm. <span className="text-green-700 font-bold">Dark Green</span> – Marginal. <span className="text-yellow-400 font-bold">Yellow</span> – Slight. <span className="text-orange-500 font-bold">Orange</span> – Enhanced. <span className="text-red-500 font-bold">Red</span> – Moderate. <span className="text-pink-400 font-bold">Magenta</span> – High.
          </div>
        )}
      </div>

      <div className="w-full lg:w-1/2 flex flex-row">
        <div className="flex-1 flex flex-col items-center">
          <div className="fixed top-2 left-2 text-sm sm:text-base font-mono z-40 bg-gray-900 px-2 py-1 rounded shadow">
            {currentTime.toLocaleTimeString()} {timeSuffix}
          </div>

          <div className="w-full flex flex-wrap justify-center gap-2 px-4 mt-2">
            <div className="px-2 py-1 rounded text-white bg-red-700">Tornado: {alertCounts.tornado}</div>
            <div className="px-2 py-1 rounded text-white bg-orange-800">Svr T-Storm: {alertCounts.severeWarn}</div>
            <div className="px-2 py-1 rounded text-white bg-orange-600">Severe: {alertCounts.severe}</div>
            <div className="px-2 py-1 rounded text-white bg-green-700 cursor-pointer" title="Flash Flood, Flood Watch, Flood Warning">Flood: {alertCounts.flood}</div>
            <div className="px-2 py-1 rounded text-white bg-yellow-600 cursor-pointer" title="Excessive Heat Warning, Heat Advisory">Heat: {alertCounts.heat}</div>
            <div className="px-2 py-1 rounded text-white bg-blue-800 cursor-pointer" title="Winter Storm Warning, Blizzard Warning, Freeze Warning">Cold: {alertCounts.cold}</div>
          </div>

          <div className="text-sm font-semibold bg-gray-800 px-4 py-2 rounded-full border-2 border-white shadow-md mt-4">
            Active Alerts: {ffcActiveAlertCount}
          </div>
          {ffcActiveAlertCount === 0 && (
            <div className="text-sm text-gray-400 mt-2">No Active Alerts</div>
          )}

          <div className="flex justify-between items-center w-full px-4 mb-2">
            <button onClick={handlePrev} className="bg-gray-700 px-3 py-1 rounded">◀</button>
            <span className="text-xs text-gray-400">Showing {currentIndex + 1}–{Math.min(currentIndex + alertsPerPage, filteredAlerts.length)} of {filteredAlerts.length}</span>
            <button onClick={handleNext} className="bg-gray-700 px-3 py-1 rounded">▶</button>
          </div>

          <div className="flex flex-col gap-4 w-full px-4 mb-4 min-h-[400px]">
            <AnimatePresence mode="wait">
              {filteredAlerts.slice(currentIndex, currentIndex + alertsPerPage).map((alert, idx) => {
                const { event, effective, expires, areaDesc } = alert.properties;
                const colorClass = getAlertColor(event);
                return (
                  <motion.div key={idx} className={`p-4 rounded shadow ${colorClass} min-h-[120px]`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}>
                    <h3 className="text-lg font-bold mb-2">{event}</h3>
                    <p className="text-sm">Effective: {new Date(effective).toLocaleString()}</p>
                    <p className="text-sm">Expires: {new Date(expires).toLocaleString()}</p>
                    <div className="text-xs mt-2 overflow-x-auto whitespace-nowrap animate-marquee">
                      <strong>Affected Areas:</strong> {areaDesc}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col w-[250px] px-2 overflow-y-auto h-[600px] mt-8">
          <ConditionsScroll />
        </div>
      </div>

      <footer className="absolute bottom-2 right-2 text-xs text-gray-500">© 2025 All Rights Reserved P.J. Gudz</footer>
    </div>
  );
}

export default App;
