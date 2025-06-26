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
  const [expandedIndex, setExpandedIndex] = useState(null); // Track which alert is expanded
  const [showCounties, setShowCounties] = useState({}); // Track counties visibility per alert
  const alertsPerPage = 4;
  const resumeTimeout = useRef(null);

  // Define counties for NWS Peachtree City (FFC counties)
  const countiesPeachtreeCity = [
    "Fulton", "DeKalb", "Gwinnett", "Cobb", "Clayton", "Dade", "Walker", "Catoosa", "Whitfield", "Murray",
    "Gilmer", "Fannin", "Union", "Towns", "Rabun", "Habersham", "White", "Lumpkin", "Hall", "Cherokee", "Rockdale",
    "Paulding", "Bartow", "Carroll", "Douglas", "Fayette", "Henry", "Butts", "Monroe", "Newton", "Walton", "Jackson", "Clarke", "Banks", "Walton", "Newton", "Polk", "Forsyth", "Dawson"
  ];

  // Specific counties from NWS Greenville-Spartanburg to include
  const countiesGreenvilleSpartanburg = [
    "Rabun", "Stephens", "Hart", "Elbert" // Only these counties from NWS Greenville
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await fetchWeatherAlerts(); // Fetch alerts for all counties
        setAlerts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching weather alerts:", error);
        setAlerts([]);
      }
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Filter all alerts to only include those from Peachtree City (FFC) and Greenville-Spartanburg (GSP)
  const filteredAlerts = alerts.filter((alert) => {
    const { event, senderName, effective, expires, areaDesc } = alert.properties;
    
    // Ensure the alert is active or in the future
    const now = new Date();
    const effectiveTime = new Date(effective);
    const expiresTime = new Date(expires);
    const isActiveOrFuture = (!isNaN(effectiveTime) && effectiveTime <= now && expiresTime >= now) || effectiveTime >= now;

    // Normalize senderName to lowercase for comparison (checking for Peachtree City and Greenville-Spartanburg)
    const isFromPeachtreeCity = senderName?.toLowerCase().includes("nws peachtree city");
    const isFromGreenvilleSpartanburg = senderName?.toLowerCase().includes("nws greenville-spartanburg");

    // Normalize and clean the affected counties from areaDesc
    const affectedCounties = areaDesc
      .toLowerCase() // Make case-insensitive comparison
      .split(",") // Split by comma to get each county
      .map(county => county.trim()); // Clean up spaces around county names

    // Check if any of the affected counties are in the Peachtree City or Greenville-Spartanburg lists
    const isPeachtreeCityAlert = affectedCounties.some(county => countiesPeachtreeCity.map(c => c.toLowerCase()).includes(county));
    const isGreenvilleSpartanburgAlert = affectedCounties.some(county => countiesGreenvilleSpartanburg.map(c => c.toLowerCase()).includes(county));

    // Only include alerts from Peachtree City or Greenville-Spartanburg and affecting the right counties
    return isActiveOrFuture && (isFromPeachtreeCity || (isFromGreenvilleSpartanburg && isGreenvilleSpartanburgAlert));
  });

  // Populate alertCounts based on filteredAlerts
  const alertCounts = {
    tornado: 0,
    severe: 0,
    severeWarn: 0,
    flood: 0,
    heat: 0,
    cold: 0,
    airQuality: 0,
    heatAdvisory: 0
  };

  filteredAlerts.forEach(alert => {
    const event = alert.properties.event.toLowerCase();
    if (event.includes("tornado")) alertCounts.tornado++;
    if (event.includes("severe") && event.includes("warning")) alertCounts.severeWarn++;
    if (event.includes("severe") && event.includes("watch")) alertCounts.severe++;
    if (event.includes("flood")) alertCounts.flood++;
    if (event.includes("heat advisory")) alertCounts.heatAdvisory++; // Heat Advisory Alerts
    if (event.includes("heat")) alertCounts.heat++; // For Heat Advisory
    if (event.includes("cold") || event.includes("blizzard") || event.includes("freeze")) alertCounts.cold++;
    if (event.includes("air quality")) alertCounts.airQuality++; // Air Quality Alerts
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
    if (lower.includes("heat advisory")) return "bg-red-500 border-red-700 shadow-md"; // Heat Advisory
    if (lower.includes("heat")) return "bg-red-500 border-red-700 shadow-md";
    if (lower.includes("air quality")) return "bg-blue-500 border-blue-700 shadow-md"; // Air Quality
    if (lower.includes("special weather statement")) return "bg-cyan-800 border-cyan-900 shadow-md"; 
    return "bg-gray-600 border-gray-700 shadow-md";
  };

  const visibleAlerts = filteredAlerts.slice(currentIndex, currentIndex + alertsPerPage);

  const formatTime = (time) => {
    return new Date(time).toLocaleString();
  };

  const isDaylightSaving = currentTime.toLocaleString("en-US", { timeZoneName: "short" }).includes("DT");
  const timeSuffix = isDaylightSaving ? "EDT" : "EST";

  const resumeAutoScroll = () => {
    clearTimeout(resumeTimeout.current);
    resumeTimeout.current = setTimeout(() => {
      setAutoScroll(true);
    }, 15000);  // Set to 15 seconds or adjust as needed
  };

  const toggleCounties = (index) => {
    setShowCounties((prevState) => ({
      ...prevState,
      [index]: !prevState[index] // Toggle visibility for the clicked alert
    }));
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
            <div className="px-2 py-1 rounded text-white bg-gradient-to-b from-yellow-300 to-yellow-600 cursor-pointer" title="Tornado & Severe T-Storm Watch">Severe Watches: {alertCounts.severe}</div>
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

          <div className="flex flex-col gap-.5 w-full px-4 mb-4 min-h-[300px]">
            <AnimatePresence mode="wait">
              {visibleAlerts.map((alert, index) => {
                const { event, areaDesc, effective, expires } = alert.properties;
                const alertStyle = getAlertStyles(event);
                const counties = areaDesc?.replace(/;?\s?GA/g, "").replace(/;/g, ", ") || "Unknown";
                return (
                  <motion.div
                    key={index}
                    onClick={() => setExpandedIndex(index)} // This will expand the clicked alert
                    className={`p-2 mb-2 ${alertStyle} border-l-4 rounded-md shadow-md cursor-pointer transition-transform hover:scale-[1.01] text-sm w-[400px] mx-auto relative overflow-hidden`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                  >
                    <h2 className="text-base font-bold leading-snug">{event}</h2>
                    <p className="text-[12px] mt-1 mb-1">
                       <strong>Effective:</strong> {formatTime(effective)}<br />
                       <strong>Expires:</strong> {formatTime(expires)}
<div className="flex justify-between text-xs font-medium text-gray-300 mt-1">
    <p><strong></strong> {alert.properties.senderName}<strong> | Severity:</strong> {alert.properties.severity}</p>
  </div>
                    </p>

                    {/* Always show the "Show Affected Counties" button */}
                    <div className="text-sm mt-1">
                      <button
                        className="text-white-500"
                        onClick={() => toggleCounties(index)} // Toggle counties for the clicked alert
                      >
                        {showCounties[index] ? "Hide Affected Counties" : "Show Affected Counties"}
                      </button>

                      {/* Show counties only for the expanded alert */}
                      {showCounties[index] && (
                        <div className="mt-2">
                          <p className="text-sm mt-2">
                            <strong>Counties Affected:</strong> {counties.split(", ").join(", ")}
                          </p>
                        </div>
                      )}
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
