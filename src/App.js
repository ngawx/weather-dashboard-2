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
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [showCounties, setShowCounties] = useState(null); // State to toggle counties visibility
  const alertsPerPage = 4;
  const resumeTimeout = useRef(null); // <-- make sure this line is here

  // Define alertCounts and ffcActiveAlertCount
  const alertCounts = {
    tornado: 0,
    severe: 0,
    severeWarn: 0,
    flood: 0,
    heat: 0,
    cold: 0
  };

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

  // Populate alertCounts based on filteredAlerts
  filteredAlerts.forEach(alert => {
    const event = alert.properties.event.toLowerCase();
    if (event.includes("tornado")) alertCounts.tornado++;
    if (event.includes("severe") && event.includes("warning")) alertCounts.severeWarn++;
    if (event.includes("severe")) alertCounts.severe++;
    if (event.includes("flood")) alertCounts.flood++;
    if (event.includes("heat")) alertCounts.heat++;
    if (event.includes("cold") || event.includes("blizzard") || event.includes("freeze")) alertCounts.cold++;
  });

  const ffcActiveAlertCount = filteredAlerts.length;

  const handlePrev = () => {
    setAutoScroll(false);
    setCurrentIndex((prev) => (prev - alertsPerPage + filteredAlerts.length) % filteredAlerts.length);
    resumeAutoScroll();
  };

  const handleNext = () => {
    setAutoScroll(false);
    setCurrentIndex((prev) => (prev + alertsPerPage) % filteredAlerts.length);
    resumeAutoScroll();
  };

  const getAlertStyles = (event) => {
    const lower = event.toLowerCase();
    if (lower.includes("tornado")) return "bg-red-700 border-red-900 shadow-md";
    if (lower.includes("severe")) return "bg-orange-500 border-orange-700 shadow-md";
    if (lower.includes("watch")) return "bg-yellow-500 border-yellow-700 shadow-md";
    if (lower.includes("flood")) return "bg-green-700 border-green-900 shadow-md";
    if (lower.includes("heat")) return "bg-red-500 border-red-700 shadow-md";
    return "bg-gray-600";
  };

  const visibleAlerts = filteredAlerts.slice(currentIndex, currentIndex + alertsPerPage);

  const formatTime = (time) => {
    return new Date(time).toLocaleString();
  };

  const isDaylightSaving = currentTime.toLocaleString("en-US", { timeZoneName: "short" }).includes("DT");
  const timeSuffix = isDaylightSaving ? "EDT" : "EST";

  // Define the resumeAutoScroll function
  const resumeAutoScroll = () => {
    clearTimeout(resumeTimeout.current);
    resumeTimeout.current = setTimeout(() => {
      setAutoScroll(true);
    }, 15000);  // Set to 15 seconds or adjust as needed
  };

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row pt-0 px-2 sm:px-4 relative transition-colors duration-500 bg-gray-900 text-white`}>
      <div className="w-full lg:w-1/2 pt-10 mb-4 lg:mb-0">
        <div className="flex justify-center gap-2 mb-2 flex-wrap">
          <button onClick={() => setSelectedMap("radar")} className={`px-3 py-1 rounded text-sm ${selectedMap === "radar" ? "bg-blue-600" : "bg-gray-700"}`}>Current Radar</button>
          <button onClick={() => setSelectedMap("alerts")} className={`px-3 py-1 rounded text-sm ${selectedMap === "alerts" ? "bg-blue-600" : "bg-gray-700"}`}>Active Alerts Map</button>
          <button onClick={() => setSelectedMap("spc")} className={`px-3 py-1 rounded text-sm ${selectedMap === "spc" ? "bg-blue-600" : "bg-gray-700"}`}>SPC Map</button>
          <button onClick={() => setSelectedMap("facebook")} className={`px-3 py-1 rounded text-sm ${selectedMap === "facebook" ? "bg-blue-600" : "bg-gray-700"}`}>Facebook Feed</button>
        </div>

        {selectedMap === "facebook" ? (
          <div className="w-full h-[600px]">
            <iframe
              title="Facebook Feed"
              src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2FNorthGaWxCommand&tabs=timeline&width=500&height=600&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId"
              width="125%"
              height="600"
              style={{ border: "none", overflow: "hidden" }}
              scrolling="no"
              frameBorder="0"
              allowFullScreen={true}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            ></iframe>
          </div>
        ) : (
          <img
            src={
              selectedMap === "radar"
                ? `https://radar.weather.gov/ridge/standard/KFFC_0.gif?${Date.now()}`
                : selectedMap === "alerts"
                ? "https://www.weather.gov/images/ffc/big/GA_WWA.png"
                : "https://www.spc.noaa.gov/products/activity_loop.gif"
            }
            alt="Map Display"
            className="w-full h-auto object-contain rounded"
          />
        )}

        {selectedMap === "spc" && (
          <div className="text-xs mt-2 text-center">
            <span className="text-green-400 font-bold">Light Green</span> – General T-Storm;{" "}
            <span className="text-green-700 font-bold">Dark Green</span> – Marginal;{" "}
            <span className="text-yellow-400 font-bold">Yellow</span> – Slight;{" "}
            <span className="text-orange-500 font-bold">Orange</span> – Enhanced;{" "}
            <span className="text-red-500 font-bold">Red</span> – Moderate;{" "}
            <span className="text-pink-400 font-bold">Magenta</span> – High
          </div>
        )}
      </div>

      <div className="w-full lg:w-1/2 flex flex-col md:flex-row">
        <div className="flex-1 flex flex-col items-center">
          <div className="fixed top-2 left-2 text-sm sm:text-base font-mono z-40 bg-gray-900 px-2 py-1 rounded shadow">
            {currentTime.toLocaleTimeString()} {timeSuffix}
          </div>

          <div className="w-full flex flex-wrap justify-center gap-2 px-4 mt-2">
            <div className="px-2 py-1 rounded text-white bg-gradient-to-b from-red-500 to-red-900">Tornado: {alertCounts.tornado}</div>
            <div className="px-2 py-1 rounded text-white bg-gradient-to-b from-orange-500 to-orange-900">Svr T-Storm: {alertCounts.severeWarn}</div>
            <div className="px-2 py-1 rounded text-white bg-gradient-to-b from-yellow-300 to-yellow-600 cursor-pointer" title="Tornado & Severe T-Storm Watch">Severe: {alertCounts.severe}</div>
            <div className="px-2 py-1 rounded text-white bg-gradient-to-b from-green-500 to-green-700 cursor-pointer" title="Flash Flood, Flood Watch, Flood Warning">Flood: {alertCounts.flood}</div>
            <div className="px-2 py-1 rounded text-white bg-gradient-to-b from-red-300 to-red-500 cursor-pointer" title="Excessive Heat Warning, Heat Advisory">Heat: {alertCounts.heat}</div>
            <div className="px-2 py-1 rounded text-white bg-gradient-to-b from-blue-500 to-blue-900 cursor-pointer" title="Winter Storm Warning, Blizzard Warning, Freeze Warning">Cold: {alertCounts.cold}</div>
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

          <div className="flex flex-col gap-4 w-full px-4 mb-4 min-h-[300px]">
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

  {/* Container for Counties */}
  <div className="text-sm mt-2">
    <button
      className="text-white-500"
      onClick={() => setShowCounties(!showCounties)}
    >
      {showCounties ? "Hide Affected Counties" : "Show Affected Counties"}
    </button>

    {/* Consistent width for the badge, whether counties are visible or not */}
    <div className={`mt-2 ${showCounties ? "w-full" : "min-w-[350px]"}`}>
      {showCounties && (
        <p className="text-sm mt-2">
          <strong>Counties Affected:</strong> {counties.split(", ").join(", ")}
        </p>
      )}
    </div>
  </div>
</motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col w-full md:w-[250px] px-2 overflow-y-auto h-[600px] mt-8">
          <ConditionsScroll />
        </div>
      </div>

      <footer className="absolute bottom-2 right-2 text-xs text-gray-500">© 2025 All Rights Reserved P.J. Gudz</footer>
    </div>
  );
}

export default App;
