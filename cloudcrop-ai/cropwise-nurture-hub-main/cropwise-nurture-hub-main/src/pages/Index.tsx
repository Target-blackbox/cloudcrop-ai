import { motion } from "framer-motion";
import { Sun, Leaf, Cloud, LineChart } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Sun,
    title: "Weather Insights",
    description: "Real-time weather updates and forecasts.",
    link: "/weather",
  },
  {
    icon: Leaf,
    title: "Crop Recommendations",
    description: "AI-powered crop selection guidance.",
    link: "/crops",
  },
  {
    icon: Cloud,
    title: "Sustainability Tips",
    description: "Best practices for eco-friendly farming.",
    link: "/sustainability",
  },
  {
    icon: LineChart,
    title: "Market Trends",
    description: "Stay updated on crop prices and demand.",
    link: "/market",
  },
];

const Index = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-10">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold text-gray-800 mb-8"
        >
          Welcome to CloudCrop AI
        </motion.h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Link to={feature.link} className="block p-6 bg-white shadow-md rounded-lg hover:shadow-lg transition">
                <div className="flex items-center">
                  <feature.icon className="w-8 h-8 text-green-600 mr-4" />
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
