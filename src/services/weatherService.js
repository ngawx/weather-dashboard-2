import axios from "axios";

const NOAA_API_URL = "https://api.weather.gov/alerts/active";

export const fetchWeatherAlerts = async () => {
  try {
    const response = await axios.get(NOAA_API_URL);
    return response.data.features;
  } catch (error) {
    console.error("Error fetching weather alerts:", error);
    return [];
  }
};
