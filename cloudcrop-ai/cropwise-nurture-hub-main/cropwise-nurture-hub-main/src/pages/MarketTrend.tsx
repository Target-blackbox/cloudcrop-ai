import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/pages/supabase";  // Adjust path based on your folder structure

import { Alert, AlertDescription } from "@/components/ui/alert";

const supabaseUrl = "https://lwdwmhzfznuyrpmabudj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3ZHdtaHpmem51eXJwbWFidWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NjQ3MDksImV4cCI6MjA1NjI0MDcwOX0.4wtTHFD4W4D_Pw9z2HpyS8qTlz6uNIMBmRf0HteiPZ4";

export default function ProductSearch() {
    const [cropName, setCropName] = useState("");
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchPerformed, setSearchPerformed] = useState(false);

    // Verify database connection on component mount
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const { data, error } = await supabase.from("user_products").select("count()", { count: "exact" });
                if (error) throw error;
                console.log("Database connection successful, found", data, "records");
            } catch (err) {
                console.error("Database connection error:", err.message);
                setError("Failed to connect to database. Please try again later.");
            }
        };
        
        checkConnection();
    }, []);

    const fetchProducts = async () => {
        if (!cropName.trim()) {
            setError("Please enter a crop name to search");
            return;
        }

        setLoading(true);
        setError(null);
        setSearchPerformed(true);

        try {
            const { data, error } = await supabase
                .from("user_products")
                .select("*")
                .ilike("name", `%${cropName}%`);

            if (error) throw error;
            
            console.log("Query results:", data);
            setProducts(Array.isArray(data) ? data : []);
            
            if (data && data.length === 0) {
                console.log("No products found for:", cropName);
            }
        } catch (err) {
            console.error("Error fetching products:", err.message);
            setError(`Error searching for products: ${err.message}`);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            fetchProducts();
        }
    };

    return (
        <div className="flex flex-col items-center p-6">
            <h1 className="text-2xl font-bold mb-4">Search User Products</h1>
            
            {error && (
                <Alert variant="destructive" className="mb-4 w-full max-w-md">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            <div className="flex gap-2 w-full max-w-md">
                <Input
                    type="text"
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter crop name"
                    className="flex-1"
                />
                <Button 
                    onClick={fetchProducts} 
                    disabled={loading}
                    className="whitespace-nowrap"
                >
                    {loading ? "Searching..." : "Search"}
                </Button>
            </div>

            <div className="mt-6 w-full max-w-md">
                {searchPerformed && products.length === 0 ? (
                    <p className="text-gray-500 mt-4 text-center">
                        {loading ? "Searching..." : "No products found for this search term."}
                    </p>
                ) : (
                    products.map((product, index) => (
                        <Card key={index} className="mb-4">
                            <CardContent className="pt-4">
                                <p className="font-semibold text-lg">{product.name}</p>
                                <div className="mt-2 text-sm space-y-1">
                                    {Object.entries(product)
                                        .filter(([key]) => key !== 'name')
                                        .map(([key, value]) => (
                                            <p key={key}><span className="font-medium">{key}:</span> {JSON.stringify(value)}</p>
                                        ))
                                    }
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}