import { useState, useEffect } from "react";
import { supabase } from "@/pages/supabase"
import { useNavigate } from "react-router-dom";


const AuthPage = () => {
  const navigate = useNavigate();
  const [type, setType] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState(null);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [locationInputType, setLocationInputType] = useState("select");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available locations when the component mounts
  useEffect(() => {
    if (type === "signup") {
      fetchLocations();
    }
  }, [type]);

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('location')
        .order('location');
        
      if (error) throw error;
      
      // Extract unique locations
      const uniqueLocations = Array.from(
        new Set(data?.map(item => item.location))
      ).filter(Boolean);
      
      setAvailableLocations(uniqueLocations);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    setError(null);
    
    // Validate location is provided for signup
    if (type === "signup" && !location.trim()) {
      setError("Location is required to help farmers find you");
      return;
    }
    
    try {
      if (type === "signup") {
        // First, create auth user
        const { user, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              location: location,
              phone_number: phoneNumber,
            },
          },
        });
        
        if (authError) throw authError;
        
        // Then, add entry to vendors table to ensure they appear in searches
        if (user) {
          const { error: vendorError } = await supabase
            .from('vendors')
            .insert([
              { 
                user_id: user.id,
                name: fullName,
                location: location,
                contact: phoneNumber,
                description: `Vendor based in ${location}`,
              }
            ]);
            
          if (vendorError) throw vendorError;
        }
      } else {
        const { user, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      
      navigate("/dashboard");
    } catch (error) {
      setError(error.message);
    }
  };

  const toggleLocationInput = () => {
    setLocationInputType(prev => prev === "select" ? "custom" : "select");
    setLocation(""); // Clear location when switching input type
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-6 bg-white rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">{type === "signup" ? "Vendor Sign Up" : "Vendor Login"}</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {type === "signup" && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Full Name
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Location <span className="text-red-500">*</span>
                <span className="text-sm font-normal ml-1">(Important for farmers to find you)</span>
              </label>
              
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  {locationInputType === "select" 
                    ? "Select from existing locations" 
                    : "Enter custom location"}
                </span>
                <button 
                  type="button" 
                  onClick={toggleLocationInput}
                  className="text-sm text-blue-500 hover:underline"
                >
                  {locationInputType === "select" 
                    ? "Enter custom location" 
                    : "Select from list"}
                </button>
              </div>
              
              {locationInputType === "select" ? (
                <select 
                  className="w-full p-2 border rounded"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Select your location</option>
                  {availableLocations.map((loc, index) => (
                    <option key={index} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, District, State"
                />
              )}
              <p className="text-sm text-gray-500 mt-1">
                Use format: "City, District, State" for best visibility
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Phone Number
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Contact number for farmers"
              />
            </div>
          </>
        )}
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Email
          </label>
          <input
            type="email"
            className="w-full p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Password
          </label>
          <input
            type="password"
            className="w-full p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
          />
        </div>
        
        <button
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
          onClick={handleAuth}
        >
          {type === "signup" ? "Sign Up as Vendor" : "Login"}
        </button>
        
        <p className="mt-4 text-center">
          {type === "signup" ? (
            <>
              Already have an account?{" "}
              <button className="text-blue-500 hover:underline" onClick={() => setType("login")}>
                Login
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button className="text-blue-500 hover:underline" onClick={() => setType("signup")}>
                Sign Up
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthPage;