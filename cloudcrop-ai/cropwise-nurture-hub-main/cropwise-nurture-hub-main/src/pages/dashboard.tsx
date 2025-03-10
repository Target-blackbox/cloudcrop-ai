import React, { useState, useEffect } from 'react';
import { Container, Typography, TextField, Button, Table, TableBody, TableCell, TableHead, TableRow, 
  Paper, MenuItem, Select, FormControl, InputLabel, Grid, Snackbar, Alert, Box, InputAdornment } from '@mui/material';
import { supabase } from '@/pages/supabase';  // Adjust path based on your folder structure

// Initialize Supabase client
const supabaseUrl = "https://lwdwmhzfznuyrpmabudj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3ZHdtaHpmem51eXJwbWFidWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NjQ3MDksImV4cCI6MjA1NjI0MDcwOX0.4wtTHFD4W4D_Pw9z2HpyS8qTlz6uNIMBmRf0HteiPZ4";

// Define types
interface Product {
  id: number;
  name: string;
  market_price: number;
  unit: string;
  type: string;
  category: string;
  variety: string;
  description: string;
  created_at?: string;
  user_id?: string;
}

interface User {
  id: string;
  email?: string;
}

interface AlertState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

const AgricultureVendorDashboard: React.FC = () => {
  // Product state
  const [products, setProducts] = useState<Product[]>([]);
  const [productName, setProductName] = useState('');
  const [marketPrice, setMarketPrice] = useState<number | string>('');
  const [productType, setProductType] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productVariety, setProductVariety] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productUnit, setProductUnit] = useState('kg');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // User state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Check for authentication on component mount
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        setIsAuthLoading(true);
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (session) {
          setUser({
            id: session.user.id,
            email: session.user.email
          });
          
          // After confirming user is logged in, fetch their products
          fetchUserProducts(session.user.id);
        } else {
          // If no session, set loading to false and no user
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
        showAlert('Authentication error. Please try logging in again.', 'error');
        setLoading(false);
      } finally {
        setIsAuthLoading(false);
      }
    };
    
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser({
            id: session.user.id,
            email: session.user.email
          });
          
          // Fetch products when auth state changes to signed in
          fetchUserProducts(session.user.id);
        } else {
          setUser(null);
          setProducts([]);
          setLoading(false);
        }
      }
    );
    
    checkUserSession();
    
    // Clean up listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProducts = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_products')  // Changed from 'market_prices' to 'user_products'
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      showAlert('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      setIsAuthLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      showAlert('Signed in successfully', 'success');
    } catch (error: any) {
      console.error('Error signing in:', error);
      showAlert(error.message || 'Failed to sign in', 'error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      setIsAuthLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        throw error;
      }

      showAlert('Sign up successful! Please check your email for verification.', 'success');
    } catch (error: any) {
      console.error('Error signing up:', error);
      showAlert(error.message || 'Failed to sign up', 'error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      showAlert('Signed out successfully', 'success');
    } catch (error) {
      console.error('Error signing out:', error);
      showAlert('Failed to sign out', 'error');
    }
  };

  const handleAddProduct = async () => {
    if (!user) {
      showAlert('Please sign in to add products', 'warning');
      return;
    }
    
    if (productName && marketPrice && productType && productUnit) {
      try {
        const newProduct: Omit<Product, 'id' | 'created_at'> = {
          name: productName,
          market_price: Number(marketPrice),
          unit: productUnit,
          type: productType,
          category: productCategory,
          variety: productVariety,
          description: productDescription,
          user_id: user.id // Associate product with current user
        };

        // Insert the new product into Supabase
        const { data, error } = await supabase
          .from('user_products')  // Changed from 'market_prices' to 'user_products'
          .insert([newProduct])
          .select();

        if (error) {
          throw error;
        }

        if (data) {
          setProducts([...data, ...products]);
          clearForm();
          showAlert('Product added successfully!', 'success');
        }
      } catch (error) {
        console.error('Error adding product:', error);
        showAlert('Failed to add product', 'error');
      }
    } else {
      showAlert('Please fill in all required fields', 'warning');
    }
  };

  const handlePriceChange = async (id: number, price: number) => {
    if (!user) {
      showAlert('Please sign in to update prices', 'warning');
      return;
    }
    
    try {
      // First verify that this product belongs to the current user
      const { data: productData, error: fetchError } = await supabase
        .from('user_products')  // Changed from 'market_prices' to 'user_products'
        .select('user_id')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (productData && productData.user_id !== user.id) {
        showAlert('You can only update your own products', 'error');
        return;
      }
      
      const { error } = await supabase
        .from('user_products')  // Changed from 'market_prices' to 'user_products'
        .update({ market_price: price })
        .eq('id', id)
        .eq('user_id', user.id); // Additional security to ensure user owns the product

      if (error) {
        throw error;
      }

      const updatedProducts = products.map(product =>
        product.id === id ? { ...product, market_price: price } : product
      );
      setProducts(updatedProducts);
      showAlert('Price updated successfully', 'success');
    } catch (error) {
      console.error('Error updating price:', error);
      showAlert('Failed to update price', 'error');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!user) {
      showAlert('Please sign in to delete products', 'warning');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('user_products')  // Changed from 'market_prices' to 'user_products'
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only delete their own products

      if (error) {
        throw error;
      }

      setProducts(products.filter(p => p.id !== id));
      showAlert('Product deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting product:', error);
      showAlert('Failed to delete product', 'error');
    }
  };

  const clearForm = () => {
    setProductName('');
    setMarketPrice('');
    setProductType('');
    setProductCategory('');
    setProductVariety('');
    setProductDescription('');
    setProductUnit('kg');
  };

  const showAlert = (message: string, severity: AlertState['severity']) => {
    setAlert({
      open: true,
      message,
      severity
    });
  };

  const handleAlertClose = () => {
    setAlert({ ...alert, open: false });
  };

  // Get category options based on selected type
  const getCategoryOptions = () => {
    switch (productType) {
      case 'Crop':
        return ['Grain', 'Cereal', 'Pulse', 'Oilseed', 'Fiber', 'Other'];
      case 'Vegetable':
        return ['Leafy', 'Root', 'Fruit', 'Stem', 'Bulb', 'Other'];
      case 'Fruit':
        return ['Citrus', 'Berry', 'Tropical', 'Stone Fruit', 'Pome Fruit', 'Other'];
      case 'Dairy':
        return ['Milk', 'Cheese', 'Butter', 'Yogurt', 'Other'];
      case 'Livestock':
        return ['Cattle', 'Poultry', 'Swine', 'Sheep', 'Goat', 'Other'];
      default:
        return [];
    }
  };

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const renderAuthForm = () => (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        {isSignUp ? 'Create Account' : 'Sign In'}
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        {isSignUp 
          ? 'Create an account to start adding market prices'
          : 'Sign in to manage your market prices'}
      </Typography>
      
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        margin="normal"
        required
      />
      
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
        margin="normal"
        required
      />
      
      <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
        <Button 
          variant="text" 
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </Button>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => isSignUp ? handleSignUp(email, password) : handleSignIn(email, password)}
          disabled={isAuthLoading}
        >
          {isAuthLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </Button>
      </Box>
    </Paper>
  );

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" align="center" gutterBottom>
          Market Prices Dashboard
        </Typography>
        <Typography variant="subtitle1" align="center" color="textSecondary" gutterBottom>
          Current prices to purchase crops from farmers
        </Typography>
        
        {user ? (
          <>
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Typography variant="body2" color="textSecondary" sx={{ mr: 2, alignSelf: 'center' }}>
                Signed in as: {user.email}
              </Typography>
              <Button variant="outlined" onClick={handleSignOut}>
                Sign Out
              </Button>
            </Box>
            
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Add New Market Price
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Product Name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel>Product Type</InputLabel>
                    <Select
                      value={productType}
                      onChange={(e) => {
                        setProductType(e.target.value as string);
                        setProductCategory(''); // Reset category when type changes
                      }}
                    >
                      <MenuItem value="Crop">Crop</MenuItem>
                      <MenuItem value="Vegetable">Vegetable</MenuItem>
                      <MenuItem value="Fruit">Fruit</MenuItem>
                      <MenuItem value="Dairy">Dairy</MenuItem>
                      <MenuItem value="Livestock">Livestock</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value as string)}
                      disabled={!productType}
                    >
                      {getCategoryOptions().map(category => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Variety/Breed"
                    value={productVariety}
                    onChange={(e) => setProductVariety(e.target.value)}
                    fullWidth
                    margin="normal"
                    placeholder="E.g. Basmati, Roma, Jersey..."
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Market Price"
                    type="number"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }}
                    value={marketPrice}
                    onChange={(e) => setMarketPrice(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    helperText="Price offered to farmers"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel>Unit</InputLabel>
                    <Select
                      value={productUnit}
                      onChange={(e) => setProductUnit(e.target.value as string)}
                    >
                      <MenuItem value="kg">Kilogram (kg)</MenuItem>
                      <MenuItem value="g">Gram (g)</MenuItem>
                      <MenuItem value="lb">Pound (lb)</MenuItem>
                      <MenuItem value="oz">Ounce (oz)</MenuItem>
                      <MenuItem value="ton">Ton</MenuItem>
                      <MenuItem value="quintal">Quintal</MenuItem>
                      <MenuItem value="bushel">Bushel</MenuItem>
                      <MenuItem value="unit">Per Unit</MenuItem>
                      <MenuItem value="dozen">Per Dozen</MenuItem>
                      <MenuItem value="bunch">Per Bunch</MenuItem>
                      <MenuItem value="crate">Per Crate</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Notes"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    fullWidth
                    margin="normal"
                    multiline
                    rows={2}
                    placeholder="Quality standards, seasonal information, etc."
                  />
                </Grid>
              </Grid>
              
              <Box mt={2} display="flex" justifyContent="flex-end">
                <Button variant="outlined" onClick={clearForm} sx={{ mr: 2 }}>
                  Clear Form
                </Button>
                <Button variant="contained" color="primary" onClick={handleAddProduct}>
                  Add Market Price
                </Button>
              </Box>
            </Paper>
            
            <Paper>
              <Typography variant="h5" p={2} gutterBottom>
                Your Market Prices
              </Typography>
              <Typography variant="subtitle2" px={2} pb={2} color="textSecondary">
                Prices you offer to purchase crops from farmers
              </Typography>
              
              {loading ? (
                <Box p={3} textAlign="center">
                  <Typography>Loading market prices...</Typography>
                </Box>
              ) : products.length === 0 ? (
                <Box p={3} textAlign="center">
                  <Typography>No market prices available. Add your first price entry above.</Typography>
                </Box>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell>Type/Category</TableCell>
                      <TableCell>Market Price</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.id}</TableCell>
                        <TableCell>
                          <Typography fontWeight="medium">{product.name}</Typography>
                          {product.variety && (
                            <Typography variant="caption" color="textSecondary">
                              Variety: {product.variety}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.type}
                          {product.category && (
                            <Typography variant="caption" display="block" color="textSecondary">
                              {product.category}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              endAdornment: <InputAdornment position="end">/{product.unit}</InputAdornment>,
                            }}
                            value={product.market_price}
                            onChange={(e) => handlePriceChange(product.id, Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>{product.description}</TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            color="secondary"
                            size="small"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </>
        ) : (
          renderAuthForm()
        )}
      </Box>
      
      <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleAlertClose}>
        <Alert onClose={handleAlertClose} severity={alert.severity}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AgricultureVendorDashboard;