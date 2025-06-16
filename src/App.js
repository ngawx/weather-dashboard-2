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

  const visibleAlerts = filteredAlerts.slice(currentIndex, currentIndex + alertsPerPage);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col lg:flex-row pt-0 px-2 sm:px-4 relative">
      {/* Your main layout remains unchanged */}

      <div className="fixed bottom-4 right-4 z-50 max-w-md w-full">
        <ConditionsScroll />
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
