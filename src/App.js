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

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col lg:flex-row pt-0 px-2 sm:px-4 relative">
      <div className="w-full lg:w-1/2 pt-2 mb-4 lg:mb-0">
        <div className="flex flex-wrap justify-center gap-2 mb-2">
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
          <div className="mt-2 text-xs text-gray-300 px-2">
            <p><strong>SPC Activity Map Legend:</strong></p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span><span className="text-green-300">Green</span>: General T-storms</span>
              <span><span className="text-yellow-300">Yellow</span>: Slight Risk</span>
              <span><span className="text-orange-300">Orange</span>: Enhanced Risk</span>
              <span><span className="text-red-400">Red</span>: Moderate Risk</span>
              <span><span className="text-pink-400">Magenta</span>: High Risk</span>
              <span><span className="text-blue-300">Blue Box</span>: SVR T-storm Watch</span>
              <span><span className="text-red-300">Red Box</span>: Tornado Watch</span>
            </div>
          </div>
        )}
      </div>

      <div className="w-full lg:w-1/2 flex flex-col items-center px-2 sm:px-4">
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

        <div className="w-full flex justify-center mb-6 px-2 sm:px-0">
          <ConditionsScroll />
        </div>

        <div className="text-sm font-semibold bg-gray-800 px-4 py-2 rounded-full border-2 border-white shadow-md mb-2 text-center">
          Active Alerts: {ffcActiveAlertCount}
        </div>
        {ffcActiveAlertCount === 0 && (
          <div className="text-sm text-gray-400 mb-4 text-center">No Active Alerts</div>
        )}
      </div>

      <footer className="absolute bottom-2 left-2 text-xs text-gray-500">© 2025 All Rights Reserved P.J. Gudz</footer>

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
