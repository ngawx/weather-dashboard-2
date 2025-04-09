import React, { useEffect, useState, useRef } from "react";
import { fetchWeatherAlerts } from "./services/weatherService";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";

function App() {
  const [alerts, setAlerts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [selectedAlertTypes, setSelectedAlertTypes] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedMap, setSelectedMap] = useState("radar");
  const alertsPerPage = 4;
  const resumeTimeout = useRef(null);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await fetchWeatherAlerts();
        setAlerts(Array.isArray(data) ? data : []);
        setLastUpdated(new Date().toLocaleString());
      } catch (error) {
        console.error("Error fetching weather alerts:", error);
        setAlerts([]);
      }
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const allAlertTypes = Array.from(new Set(alerts.map(alert => alert.properties.event))).sort();

  const handleAlertTypeChange = (event) => {
    const value = event.target.value;
    setSelectedAlertTypes((prev) =>
      prev.includes(value) ? prev.filter((type) => type !== value) : [...prev, value]
    );
  };

  const filteredAlerts = alerts.filter((alert) => {
    const { event, senderName, effective, expires } = alert.properties;
    const isFromFFC = senderName?.toLowerCase().includes("nws peachtree city");
    const matchesType = selectedAlertTypes.length === 0 || selectedAlertTypes.includes(event);
    const now = new Date();
    const effectiveTime = new Date(effective);
    const expiresTime = new Date(expires);
    const isActiveOrFuture = (!isNaN(effectiveTime) && effectiveTime <= now && expiresTime >= now) || effectiveTime >= now;
    return isFromFFC && matchesType && isActiveOrFuture;
  });

  const ffcActiveAlertCount = filteredAlerts.length;

  const countByType = (typeKeywords) =>
    alerts.filter((alert) => {
      const { senderName, event } = alert.properties;
      return (
        senderName?.toLowerCase().includes("nws peachtree city") &&
        typeKeywords.some((kw) => event.toLowerCase().includes(kw))
      );
    }).length;

  const counts = {
    tornadoWarnings: countByType(["tornado warning"]),
    severeThunderstormWarnings: countByType(["severe thunderstorm warning"]),
    severeWatches: countByType(["tornado watch", "severe thunderstorm watch"]),
    floodWarnings: countByType(["flood warning", "flash flood warning", "flood advisory", "flash flood advisory"]),
    heatWarnings: countByType(["heat advisory", "excessive heat warning"]),
    coldWeather: countByType([
      "freeze watch",
      "freeze warning",
      "frost advisory",
      "cold weather advisory",
      "cold weather warning",
      "winter weather advisory",
      "winter storm warning",
      "blizzard warning",
"Winter Storm Watch"
    ])
  };

  const alertInfo = {
    severeWatches: "Counts Tornado Watch and Severe Thunderstorm Watch alerts from NWS Peachtree City.",
    floodWarnings: "Includes Flood Warnings, Flash Flood Warnings, and related advisories.",
    heatWarnings: "Includes Heat Advisories and Excessive Heat Warnings.",
    coldWeather: "Includes Freeze Watches/Warnings, Frost Advisories, Cold Weather Advisories, Winter Storm Warnings/Watches, and Blizzard Warnings."
  };

  const handleBannerClick = (type) => {
    if (alertInfo[type]) {
      alert(alertInfo[type]);
    }
  };

  const isDaylightSaving = currentTime.toLocaleString("en-US", { timeZoneName: "short" }).includes("DT");
  const timeSuffix = isDaylightSaving ? "EDT" : "EST";

  const formatTime = (timeString) => {
    if (!timeString) return "Unknown";
    return new Date(timeString).toLocaleString("en-US", { timeZoneName: "short" });
  };

  const getAlertStyles = (event) => {
    const colors = {
      "Tornado Warning": "bg-red-700 border-red-900 animate-pulse",
      "Tornado Watch": "bg-orange-600 border-orange-800",
      "Severe Thunderstorm Warning": "bg-orange-500 border-orange-700 animate-pulse",
      "Severe Thunderstorm Watch": "bg-yellow-500 border-yellow-700",
      "Flood Warning": "bg-green-600 border-green-800",
      "Flash Flood Warning": "bg-green-800 border-green-900",
      "Winter Storm Warning": "bg-blue-500 border-blue-700",
      "Blizzard Warning": "bg-purple-700 border-purple-900",
      "High Wind Warning": "bg-yellow-600 border-yellow-800",
      "Wind Advisory": "bg-gray-500 border-gray-700",
      "Heat Advisory": "bg-orange-400 border-orange-600",
      "Excessive Heat Warning": "bg-red-800 border-red-900",
      "Freeze Warning": "bg-blue-600 border-blue-800",
      "Frost Advisory": "bg-blue-300 border-blue-500",
      "Dense Fog Advisory": "bg-gray-700 border-gray-900",
      "Special Weather Statement": "bg-indigo-500 border-indigo-700",
      "Flood Watch": "bg-green-500 border-green-700"
    };
    return colors[event] || "bg-gray-800 border-gray-600";
  };

  const visibleAlerts = filteredAlerts.slice(currentIndex, currentIndex + alertsPerPage);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col lg:flex-row pt-0 px-2 sm:px-4">
      <div className="w-full lg:w-1/2 pt-2 mb-4 lg:mb-0">
        <div className="flex justify-center gap-2 mb-2">
          <button onClick={() => setSelectedMap("radar")} className={`px-3 py-1 rounded text-sm ${selectedMap === "radar" ? "bg-blue-600" : "bg-gray-700"}`}>Current Radar</button>
          <button onClick={() => setSelectedMap("alerts")} className={`px-3 py-1 rounded text-sm ${selectedMap === "alerts" ? "bg-blue-600" : "bg-gray-700"}`}>Active Alerts Map</button>
        </div>
        <img
          src={selectedMap === "radar" ? `https://radar.weather.gov/ridge/standard/KFFC_0.gif?${Date.now()}` : "https://www.weather.gov/images/ffc/big/GA_WWA.png"}
          alt="Map Display"
          className="w-full h-auto object-contain rounded"
        />
      </div>

      <div className="w-full lg:w-1/2 flex flex-col items-center">
        <div className="fixed top-2 left-2 text-sm sm:text-base font-mono z-50 bg-gray-900 px-2 py-1 rounded shadow">
          {currentTime.toLocaleTimeString()} {timeSuffix}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-4 mb-6 text-xs font-semibold w-full text-center">
          <div className="bg-red-700 px-2 py-1 rounded">Tornado Warnings: {counts.tornadoWarnings}</div>
          <div className="bg-orange-500 px-2 py-1 rounded">Severe T-Storm Warnings: {counts.severeThunderstormWarnings}</div>
          <div onClick={() => handleBannerClick("severeWatches")} className="bg-yellow-500 px-2 py-1 rounded cursor-pointer hover:underline">Severe Watches: {counts.severeWatches}</div>
          <div onClick={() => handleBannerClick("floodWarnings")} className="bg-green-600 px-2 py-1 rounded cursor-pointer hover:underline">Flood Alerts: {counts.floodWarnings}</div>
          <div onClick={() => handleBannerClick("heatWarnings")} className="bg-orange-400 px-2 py-1 rounded cursor-pointer hover:underline">Heat Alerts: {counts.heatWarnings}</div>
          <div onClick={() => handleBannerClick("coldWeather")} className="bg-blue-600 px-2 py-1 rounded cursor-pointer hover:underline">Cold Weather Alerts: {counts.coldWeather}</div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="text-sm font-semibold bg-gray-800 px-4 py-2 rounded-full border-2 border-white shadow-md">
            Active Alerts: {ffcActiveAlertCount}
          </div>

          <div className="relative">
            <button onClick={() => setShowFilterMenu(!showFilterMenu)} className="bg-gray-800 p-2 rounded-full border border-white hover:bg-gray-700 transition" aria-label="Toggle Filter Menu">
              <Menu className="w-5 h-5" />
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 mt-2 bg-gray-800 border border-white rounded-md shadow-md z-10 w-60 p-3">
                <p className="block text-sm mb-2 font-semibold">Filter by Alert Types:</p>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {allAlertTypes.map((type) => (
                    <label key={type} className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" value={type} checked={selectedAlertTypes.includes(type)} onChange={handleAlertTypeChange} className="form-checkbox bg-gray-700 border-white text-white" />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-400 mb-4">Last Refreshed: {lastUpdated || "Loading..."}</div>

        <div className="w-full max-w-md">
          {filteredAlerts.length === 0 ? (
            <div className="text-center text-gray-400">No active alerts from NWS Peachtree City.</div>
          ) : (
            <AnimatePresence mode="wait">
              {visibleAlerts.map((alert, index) => {
                const { event, areaDesc, effective, expires } = alert.properties;
                const alertStyle = getAlertStyles(event);
                const counties = areaDesc?.replace(/;?\s?GA/g, "").replace(/;/g, ", ") || "Unknown";
                return (
                  <motion.div
                    key={index}
                    onClick={() => setExpandedIndex(index)}
                    className={`p-2 mb-2 ${alertStyle} border-l-4 rounded-md shadow-md cursor-pointer transition-transform hover:scale-[1.01] text-sm max-w-sm mx-auto relative overflow-hidden`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                  >
                    <h2 className="text-base font-semibold leading-snug">{event}</h2>
                    <p className="text-[10px] mt-1 mb-4">
                      🕒 <strong>Effective:</strong> {formatTime(effective)}<br />
                      ⏳ <strong>Expires:</strong> {formatTime(expires)}
                    </p>
                    <div className="absolute bottom-1 left-0 w-full overflow-hidden bg-opacity-0">
                      <div className="whitespace-nowrap animate-marquee text-[10px] text-gray-300 px-2">
                        📍 <strong>Counties Affected:</strong> {counties}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        <div className="mt-4 flex gap-4">
          <button onClick={() => setCurrentIndex((prev) => prev === 0 ? Math.max(filteredAlerts.length - alertsPerPage, 0) : prev - alertsPerPage)} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-all duration-300">◀ Previous</button>
          <button onClick={() => setCurrentIndex((prev) => (prev + alertsPerPage) >= filteredAlerts.length ? 0 : prev + alertsPerPage)} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-all duration-300">Next ▶</button>
        </div>

        <footer className="text-xs text-gray-500 mb-4 mt-8 text-center px-2">© 2025 P.J. Gudz. All rights reserved.</footer>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default App;
