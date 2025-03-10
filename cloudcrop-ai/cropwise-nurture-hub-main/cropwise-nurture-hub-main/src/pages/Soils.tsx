import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/router";

// API keys
const GEMINI_API_KEY = "AIzaSyAYktI0MriKwCDVU2bMwWhzEb9ARzlU6XM"; // Replace with actual Gemini API key
const WEATHER_API_KEY = "72cb03ddb9cc38658bd51e4b865978ff"; // OpenWeather API key

interface SoilOption {
  id: string;
  name: string;
  description: string;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  conditions: string;
  icon: string;
  windSpeed: number;
  pressure: number;
}

const SoilAnalysis = () => {
  const [location, setLocation] = useState("");
  const [availableSoilTypes, setAvailableSoilTypes] = useState<SoilOption[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [locationFound, setLocationFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Restore last searched location from localStorage
    const lastLocation = localStorage.getItem("lastLocationCrops");
    if (lastLocation) {
      setLocation(lastLocation);
    }
  }, []);

  // Fetch initial data when user submits location
  const fetchInitialData = async () => {
    if (!location.trim()) {
      toast({
        title: "Location Required",
        description: "Please enter a location to get soil data.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAvailableSoilTypes([]);
      
      // First, get weather data
      const weatherResult = await fetchWeatherData(location);
      
      // Then, get available soil types for this location
      await fetchAvailableSoilTypes(location);
      
      setLocationFound(true);
      localStorage.setItem("lastLocationCrops", location);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setError("Failed to fetch data for this location. Please try again or check the location name.");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch location data",
        variant: "destructive",
      });
      setLocationFound(false);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available soil types for the location from Gemini API
  const fetchAvailableSoilTypes = async (location: string) => {
    try {
      // For demonstration purposes, using a prompting approach with Gemini API
      const prompt = `Based on the geographic location ${location}, provide a JSON array of common soil types found in this region. 
                    Include at least 3-5 soil types with these fields for each: 
                    id (a short identifier), name (the soil type name), and description (brief characteristics of the soil).
                    Format as proper JSON with no markdown or explanations outside the JSON. Just return a raw JSON array.`;
      
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }
      
      const data = await response.json();
      const textResponse = data.candidates[0].content.parts[0].text;
      
      // Extract JSON from the response
      let soilTypesJson;
      try {
        // Handle cases where response might have markdown code blocks or explanations
        const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          soilTypesJson = JSON.parse(jsonMatch[0]);
        } else {
          soilTypesJson = JSON.parse(textResponse);
        }
      } catch (e) {
        console.error("Error parsing soil types JSON:", e);
        throw new Error("Error processing soil types data from Gemini API");
      }
      
      setAvailableSoilTypes(soilTypesJson);
    } catch (error) {
      console.error("Error fetching soil types from Gemini:", error);
      throw new Error("Unable to retrieve soil types for this location");
    }
  };

  // Fetch weather data from OpenWeather API
  const fetchWeatherData = async (locationQuery: string) => {
    try {
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(locationQuery)}&appid=${WEATHER_API_KEY}&units=metric`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Location not found. Please check the spelling and try again.");
        }
        throw new Error(`Weather API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      const weatherData = {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        conditions: data.weather[0].description,
        icon: data.weather[0].icon,
        windSpeed: data.wind.speed,
        pressure: data.main.pressure
      };
      
      setWeatherData(weatherData);
      return weatherData;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      throw error;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      fetchInitialData();
    }
  };

  // Handle soil type selection and redirect to crop recommendation page
  const handleSoilTypeSelect = (soil: SoilOption) => {
    // Navigate to crop recommendation page with params
    router.push({
      pathname: "/crop-recommendation",
      query: { 
        location, 
        soilId: soil.id,
        soilName: soil.name,
        soilDescription: soil.description,
        // Pass weather data as serialized JSON
        weatherData: weatherData ? JSON.stringify(weatherData) : null
      }
    });
  };

  return (
    <div className="min-h-screen pt-20 pb-10 bg-gradient-to-b from-white to-green-50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold tracking-tighter mb-2 sm:text-4xl md:text-5xl">Soil Analysis</h1>
            <p className="text-gray-500 md:text-xl">Find common soil types in your location</p>
          </motion.div>

          <div className="w-full max-w-md mb-8">
            <div className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="Enter location (city or country)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={fetchInitialData} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-gray-500">Analyzing soil types for {location}...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center bg-red-50 text-red-800 p-4 rounded-lg mb-6 w-full max-w-4xl">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {locationFound && !loading && availableSoilTypes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-4xl"
            >
              <Card>
                <CardHeader className="bg-primary text-white">
                  <CardTitle>Available Soil Types in {location}</CardTitle>
                  <CardDescription className="text-white/90">
                    Select a soil type to see crop recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {availableSoilTypes.map((soil) => (
                      <Card key={soil.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleSoilTypeSelect(soil)}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{soil.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">{soil.description}</p>
                          <Button variant="link" className="p-0 h-auto mt-2">
                            View crop recommendations
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoilAnalysis;