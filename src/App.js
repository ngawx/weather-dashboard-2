import React, { useEffect, useState, useRef } from "react";
import { fetchWeatherAlerts } from "./services/weatherService";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import ConditionsScroll from './components/ConditionsScroll';

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

  const getAlertColor = (event) => {
    const lower = event.toLowerCase();
    if (lower.includes("tornado")) return "bg-red-700";
    if (lower.includes("severe")) return "bg-orange-500";
    if (lower.includes("watch")) return "bg-yellow-500";
    if (lower.includes("flood")) return "bg-green-700";
    return "bg-gray-600";
  };

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

        <div className="w-full flex justify-center mb-6">
          <ConditionsScroll />
        </div>

        <div className="text-sm font-semibold bg-gray-800 px-4 py-2 rounded-full border-2 border-white shadow-md mb-4">
          Active Alerts: {ffcActiveAlertCount}
        </div>

        {ffcActiveAlertCount === 0 && (
          <div className="text-sm text-gray-400 mt-2">No Active Alerts</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full px-4">
          {filteredAlerts.slice(0, 8).map((alert, idx) => {
            const { event, effective, expires, areaDesc } = alert.properties;
            const colorClass = getAlertColor(event);
            return (
              <div key={idx} className={`p-4 rounded shadow ${colorClass}`}>
                <h3 className="text-lg font-bold mb-2">{event}</h3>
                <p className="text-sm">Effective: {new Date(effective).toLocaleString()}</p>
                <p className="text-sm">Expires: {new Date(expires).toLocaleString()}</p>
                <div className="text-xs mt-2 overflow-y-auto max-h-24 whitespace-pre-line">
                  <strong>Affected Areas:</strong> {areaDesc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="absolute bottom-2 left-2 text-xs text-gray-500">© 2025 All Rights Reserved P.J. Gudz</footer>
    </div>
  );
}

export default App;
