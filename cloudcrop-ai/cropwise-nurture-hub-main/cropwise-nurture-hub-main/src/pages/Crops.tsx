import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Leaf, Search, AlertTriangle, Cloud } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// API keys
const GEMINI_API_KEY = "AIzaSyAYktI0MriKwCDVU2bMwWhzEb9ARzlU6XM"; // Replace with actual Gemini API key
const WEATHER_API_KEY = "72cb03ddb9cc38658bd51e4b865978ff"; // OpenWeather API key

interface CropRecommendation {
  crop: string;
  suitability: string;
  description: string;
}

interface SoilData {
  type: string;
  characteristics: string;
  suitableCrops: string[];
}

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

const Crops = () => {
  const [location, setLocation] = useState("");
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [cropRecommendations, setCropRecommendations] = useState<CropRecommendation[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [availableSoilTypes, setAvailableSoilTypes] = useState<SoilOption[]>([]);
  const [selectedSoilType, setSelectedSoilType] = useState<string>("");
  const [locationFound, setLocationFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Restore last searched location from localStorage
    const lastLocation = localStorage.getItem("lastLocationCrops");
    if (lastLocation) {
      setLocation(lastLocation);
    }
  }, []);

  // Step 1: When user submits location, fetch weather and available soil types
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
      setSoilData(null);
      setCropRecommendations([]);
      setAvailableSoilTypes([]);
      setSelectedSoilType("");
      
      // First, get weather data
      await fetchWeatherData(location);
      
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

  // Step 2: Fetch available soil types for the location from Gemini API
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
      
      if (soilTypesJson.length > 0) {
        // Auto-select the first soil type
        setSelectedSoilType(soilTypesJson[0].id);
      }
    } catch (error) {
      console.error("Error fetching soil types from Gemini:", error);
      throw new Error("Unable to retrieve soil types for this location");
    }
  };

  // Step 3: When user selects a soil type, get detailed soil data
  const fetchSoilData = async (soilTypeId: string) => {
    if (!soilTypeId) return;
    
    try {
      setLoading(true);
      
      const selectedSoil = availableSoilTypes.find(soil => soil.id === soilTypeId);
      if (!selectedSoil) throw new Error("Selected soil type not found");
      
      const prompt = `Provide detailed information about ${selectedSoil.name} soil in ${location}. 
                    Give the response as a JSON object with these fields: 
                    type (full soil name), 
                    characteristics (detailed description of properties), 
                    and suitableCrops (an array of strings listing crops that grow well in this soil).
                    Format as proper JSON with no markdown or explanations outside the JSON.`;
      
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
      let soilInfoJson;
      try {
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          soilInfoJson = JSON.parse(jsonMatch[0]);
        } else {
          soilInfoJson = JSON.parse(textResponse);
        }
      } catch (e) {
        console.error("Error parsing soil data JSON:", e);
        throw new Error("Error processing soil data from Gemini API");
      }
      
      setSoilData(soilInfoJson);
      
      // Now that we have soil data and weather data, get crop recommendations
      if (weatherData) {
        fetchCropRecommendations(soilInfoJson, weatherData);
      }
    } catch (error) {
      console.error("Error fetching soil data:", error);
      setError("Failed to fetch detailed soil information. Please try again.");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch soil data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Fetch crop recommendations based on soil and weather data
  const fetchCropRecommendations = async (soilInfo: SoilData, weather: WeatherData) => {
    try {
      // Combine soil and weather data to get accurate crop recommendations
      const prompt = `Based on the following soil and weather data for ${location}, recommend 3-5 suitable crops for farming.
                    Soil type: ${soilInfo.type}
                    Soil characteristics: ${soilInfo.characteristics}
                    Current temperature: ${weather.temperature}°C
                    Current humidity: ${weather.humidity}%
                    Current weather conditions: ${weather.conditions}
                    
                    Provide the response as a JSON array of objects with these fields for each crop:
                    crop (name of the crop),
                    suitability (either "High", "Medium", or "Low" based on the match with conditions),
                    description (why this crop is suitable given the soil and current weather).
                    Format as proper JSON with no markdown or explanations outside the JSON.`;
      
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent", {
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
      let cropRecsJson;
      try {
        const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          cropRecsJson = JSON.parse(jsonMatch[0]);
        } else {
          cropRecsJson = JSON.parse(textResponse);
        }
      } catch (e) {
        console.error("Error parsing crop recommendations JSON:", e);
        throw new Error("Error processing crop recommendations from Gemini API");
      }
      
      setCropRecommendations(cropRecsJson);
      
    } catch (error) {
      console.error("Error fetching crop recommendations:", error);
      setError("Failed to fetch crop recommendations. Please try again.");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch crop recommendations",
        variant: "destructive",
      });
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
      
      setWeatherData({
        temperature: data.main.temp,
        humidity: data.main.humidity,
        conditions: data.weather[0].description,
        icon: data.weather[0].icon,
        windSpeed: data.wind.speed,
        pressure: data.main.pressure
      });
      
      return data;
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

  // Handle soil type selection
  const handleSoilTypeChange = (soilTypeId: string) => {
    setSelectedSoilType(soilTypeId);
    fetchSoilData(soilTypeId);
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
            <h1 className="text-3xl font-bold tracking-tighter mb-2 sm:text-4xl md:text-5xl">Soil & Crop Analysis</h1>
            <p className="text-gray-500 md:text-xl">Get AI-powered soil insights and crop recommendations</p>
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
              <p className="text-gray-500">Analyzing data for {location}...</p>
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
              className="w-full max-w-md mb-8"
            >
              <Card>
                <CardHeader className="bg-primary text-white">
                  <CardTitle>Select Your Soil Type</CardTitle>
                  <CardDescription className="text-white/90">
                    Choose the soil type that best matches your land
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {availableSoilTypes.map((soil) => (
                      <div key={soil.id} className="flex items-start space-x-2">
                        <input
                          type="radio"
                          id={soil.id}
                          name="soilType"
                          value={soil.id}
                          checked={selectedSoilType === soil.id}
                          onChange={() => handleSoilTypeChange(soil.id)}
                          className="mt-1"
                        />
                        <div>
                          <label htmlFor={soil.id} className="font-medium text-gray-900 block">
                            {soil.name}
                          </label>
                          <p className="text-sm text-gray-600">{soil.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {soilData && weatherData && !loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-4xl"
            >
              <Tabs defaultValue="soil" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="soil">Soil Analysis</TabsTrigger>
                  <TabsTrigger value="crops">Crop Recommendations</TabsTrigger>
                  <TabsTrigger value="weather">Weather Data</TabsTrigger>
                </TabsList>
                <TabsContent value="soil">
                  <Card>
                    <CardHeader className="bg-primary text-white">
                      <CardTitle className="text-2xl flex items-center">
                        <Leaf className="h-6 w-6 mr-2" />
                        Soil Analysis for {location}
                      </CardTitle>
                      <CardDescription className="text-white/90">
                        Based on geographical and climate data
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">Soil Type</h3>
                          <p className="text-gray-700 mt-1">{soilData.type}</p>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">Characteristics</h3>
                          <p className="text-gray-700 mt-1">{soilData.characteristics}</p>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">Suitable Crops</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {soilData.suitableCrops.map((crop, index) => (
                              <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                {crop}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="crops">
                  <Card>
                    <CardHeader className="bg-primary text-white">
                      <CardTitle className="text-2xl flex items-center">
                        <Leaf className="h-6 w-6 mr-2" />
                        Crop Recommendations for {location}
                      </CardTitle>
                      <CardDescription className="text-white/90">
                        Based on your soil type and current weather
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      {cropRecommendations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {cropRecommendations.map((recommendation, index) => (
                            <Card key={index} className="border border-green-100">
                              <CardHeader className="pb-2">
                                <CardTitle>{recommendation.crop}</CardTitle>
                                <div className={`text-sm font-medium px-2 py-1 rounded-full inline-block
                                  ${recommendation.suitability === 'High' ? 'bg-green-100 text-green-800' : 
                                    recommendation.suitability === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-red-100 text-red-800'}`}
                                >
                                  {recommendation.suitability} Suitability
                                </div>
                              </CardHeader>
                              <CardContent>
                                <p className="text-gray-700 text-sm">{recommendation.description}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center p-6">
                          <p className="text-gray-500">Select a soil type to get crop recommendations.</p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="bg-green-50 p-4">
                      <p className="text-sm text-gray-600">
                        These recommendations are based on your selected soil type, local climate patterns, and current weather conditions.
                        Consider consulting with a local agricultural expert for specific guidance.
                      </p>
                    </CardFooter>
                  </Card>
                </TabsContent>
                <TabsContent value="weather">
                  <Card>
                    <CardHeader className="bg-primary text-white">
                      <CardTitle className="text-2xl flex items-center">
                        <Cloud className="h-6 w-6 mr-2" />
                        Current Weather for {location}
                      </CardTitle>
                      <CardDescription className="text-white/90">
                        Real-time weather conditions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      {weatherData && (
                        <div className="flex flex-col md:flex-row items-center gap-6">
                          <div className="flex-shrink-0">
                            <img 
                              src={`https://openweathermap.org/img/wn/${weatherData.icon}@2x.png`} 
                              alt={weatherData.conditions}
                              className="w-20 h-20"
                            />
                          </div>
                          <div className="space-y-4 flex-grow">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-800">Temperature</h3>
                              <p className="text-3xl font-bold text-gray-900">{weatherData.temperature}°C</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800">Conditions</h3>
                                <p className="text-gray-700 capitalize">{weatherData.conditions}</p>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800">Humidity</h3>
                                <p className="text-gray-700">{weatherData.humidity}%</p>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800">Wind Speed</h3>
                                <p className="text-gray-700">{weatherData.windSpeed} m/s</p>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800">Pressure</h3>
                                <p className="text-gray-700">{weatherData.pressure} hPa</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="bg-blue-50 p-4">
                      <p className="text-sm text-gray-600">
                        Current weather conditions can impact planting decisions. Consider these factors when planning your agricultural activities.
                      </p>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Crops;