import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  Slider,
  LinearProgress,
  Chip,
  Tooltip,
  IconButton,
  Avatar,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge
} from '@mui/material';
import {
  Home,
  Apartment,
  KingBed,
  Bathtub,
  AspectRatio,
  Pool,
  Terrain,
  Kitchen,
  LocalParking,
  Elevator,
  AcUnit,
  Fireplace,
  Deck,
  Water,
  Healing,
  FlashOn,
  Call,
  Security,
  Wifi,
  Satellite,
  AccessibleForward,
  Weekend,
  LocationCity,
  Place,
  Info,
  DarkMode,
  LightMode,
  CurrencyExchange,
  House,
  Straighten,
  Business,
  Compare,
  History,
  Delete,
  Save,
  Download,
  Share
} from '@mui/icons-material';

// API base URL - using relative URL for proxy
const API_BASE_URL = '/api';

function App() {
  // State for light/dark mode
  const [darkMode, setDarkMode] = useState(false);

  // State for form inputs
  const [formData, setFormData] = useState({
    is_house: 0,
    bedrooms: 3,
    bathrooms: 2,
    total_rooms: 6,
    living_area: 120,
    land_area: 200,
    city: 'Tunis',
    neighborhood: 'Tunis Centre',
    amenities: {
      has_climatisation: false,
      has_parking: false,
      has_garage: false,
      has_garden: false,
      has_pool: false,
      has_terrace: false,
      has_elevator: false,
      has_sea_view: false,
      has_central_heating: false,
      has_electric_heating: false,
      has_kitchen_equipped: false,
      has_interphone: false,
      has_alarm_system: false,
      has_internet_access: false,
      has_parabole_tv: false,
      has_handicapped_access: false,
      has_fireplace: false,
      has_furnished: false
    }
  });

  // State for cities and neighborhoods
  const [cities, setCities] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [isLoadingNeighborhoods, setIsLoadingNeighborhoods] = useState(false);

  // State for prediction results
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // State for feature importance data
  const [featureImportance, setFeatureImportance] = useState([]);

  // New state for property comparison
  const [savedProperties, setSavedProperties] = useState([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState([]);

  // New state for history tracking
  const [searchHistory, setSearchHistory] = useState([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // Get the theme for responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Fetch neighborhoods function (separated to use with useCallback)
  const fetchNeighborhoods = useCallback((cityName) => {
    if (!cityName) return;

    setIsLoadingNeighborhoods(true);
    fetch(`${API_BASE_URL}/neighborhoods?city=${cityName}`)
        .then(response => response.json())
        .then(data => {
          if (data.neighborhoods && data.neighborhoods.length > 0) {
            setNeighborhoods(data.neighborhoods);
            // Set the first neighborhood as default
            setFormData(prev => ({
              ...prev,
              neighborhood: data.neighborhoods[0]
            }));
          } else {
            setNeighborhoods([]);
          }
        })
        .catch(error => {
          console.error('Error fetching neighborhoods:', error);
          setError('Failed to load neighborhoods. Please try again later.');
        })
        .finally(() => {
          setIsLoadingNeighborhoods(false);
        });
  }, []);

  // Fetch cities on component mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/cities`)
        .then(response => response.json())
        .then(data => {
          setCities(data.cities);
          // Default city is already set to Tunis
        })
        .catch(error => {
          console.error('Error fetching cities:', error);
          setError('Failed to load cities. Please try again later.');
        });

    // Fetch feature importance data
    fetch(`${API_BASE_URL}/feature_importance`)
        .then(response => response.json())
        .then(data => {
          setFeatureImportance(data);
        })
        .catch(error => {
          console.error('Error fetching feature importance:', error);
        });

    // Load saved properties from localStorage
    const savedPropsFromStorage = localStorage.getItem('savedProperties');
    if (savedPropsFromStorage) {
      try {
        setSavedProperties(JSON.parse(savedPropsFromStorage));
      } catch (e) {
        console.error('Error loading saved properties:', e);
      }
    }

    // Load search history from localStorage
    const historyFromStorage = localStorage.getItem('searchHistory');
    if (historyFromStorage) {
      try {
        setSearchHistory(JSON.parse(historyFromStorage));
      } catch (e) {
        console.error('Error loading search history:', e);
      }
    }
  }, []);

  // Fetch neighborhoods when city changes
  useEffect(() => {
    if (formData.city) {
      fetchNeighborhoods(formData.city);
    }
  }, [formData.city, fetchNeighborhoods]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle number input changes
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [name]: checked
      }
    }));
  };

  // Handle property type
  const handlePropertyTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      is_house: type
    }));
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Toggle dark/light mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.className = !darkMode ? 'dark-mode' : '';
  };

  // Save current property to comparison list
  const saveProperty = () => {
    if (!prediction) return;
    
    const newProperty = {
      id: Date.now(),
      formData: { ...formData },
      prediction: { ...prediction },
      date: new Date().toLocaleString()
    };
    
    const updatedSavedProperties = [...savedProperties, newProperty];
    setSavedProperties(updatedSavedProperties);
    
    // Save to localStorage
    localStorage.setItem('savedProperties', JSON.stringify(updatedSavedProperties));
    
    // Show confirmation
    alert('Property saved for comparison!');
  };

  // Remove property from saved list
  const removeProperty = (id) => {
    const updatedProperties = savedProperties.filter(prop => prop.id !== id);
    setSavedProperties(updatedProperties);
    localStorage.setItem('savedProperties', JSON.stringify(updatedProperties));
  };

  // Toggle property selection for comparison
  const togglePropertySelection = (id) => {
    if (selectedProperties.includes(id)) {
      setSelectedProperties(selectedProperties.filter(propId => propId !== id));
    } else {
      if (selectedProperties.length < 3) {
        setSelectedProperties([...selectedProperties, id]);
      } else {
        alert('You can compare up to 3 properties at a time');
      }
    }
  };

  // Open comparison dialog
  const openCompareDialog = () => {
    if (selectedProperties.length < 2) {
      alert('Please select at least 2 properties to compare');
      return;
    }
    setCompareDialogOpen(true);
  };

  // Clear search history
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
    setHistoryDialogOpen(false);
  };

  // Load property from history
  const loadFromHistory = (historyItem) => {
    setFormData(historyItem.formData);
    setHistoryDialogOpen(false);
  };

  // Submit form for prediction
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setPrediction(data);
            
            // Add to search history
            const historyItem = {
              id: Date.now(),
              formData: { ...formData },
              prediction: data,
              date: new Date().toLocaleString()
            };
            
            const updatedHistory = [historyItem, ...searchHistory].slice(0, 10); // Keep only last 10 searches
            setSearchHistory(updatedHistory);
            localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
            
            // Reset to the first tab to show prediction result
            setTabValue(0);
            // Scroll to top of results on mobile
            if (isMobile) {
              window.scrollTo({
                top: 0,
                behavior: 'smooth'
              });
            }
          } else {
            setError(data.error || 'Failed to make prediction. Please try again.');
          }
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error making prediction:', error);
          setError('Failed to connect to prediction service. Please try again later.');
          setIsLoading(false);
        });
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Determine UI theme classes based on dark mode
  const themeClass = darkMode ? 'dark-theme' : 'light-theme';
  const cardClass = darkMode ? 'dark-card' : 'light-card';
  const headerClass = darkMode ? 'dark-header' : 'light-header';

  return (
      <div className={themeClass}>
        {/* App Bar */}
        <AppBar position="static" color={darkMode ? 'default' : 'primary'} elevation={3}>
          <Toolbar>
            <House sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Menzli Real Estate Predictor
            </Typography>
            
            {/* History Button */}
            <Tooltip title="Search History">
              <IconButton 
                color="inherit" 
                onClick={() => setHistoryDialogOpen(true)}
                sx={{ mr: 1 }}
              >
                <Badge badgeContent={searchHistory.length} color="secondary">
                  <History />
                </Badge>
              </IconButton>
            </Tooltip>
            
            {/* Compare Button */}
            <Tooltip title="Compare Properties">
              <IconButton 
                color="inherit" 
                onClick={() => setCompareDialogOpen(true)}
                sx={{ mr: 1 }}
              >
                <Badge badgeContent={savedProperties.length} color="secondary">
                  <Compare />
                </Badge>
              </IconButton>
            </Tooltip>
            
            {/* Dark Mode Toggle */}
            <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              <IconButton color="inherit" onClick={toggleDarkMode}>
                {darkMode ? <LightMode /> : <DarkMode />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
          {/* Main content */}
          <Grid container spacing={3}>
            {/* Form section */}
            <Grid item xs={12} md={6}>
              <Paper
                  elevation={3}
                  className={`property-form-card ${cardClass}`}
              >
                <Typography variant="h5" component="h2" className={headerClass}>
                  Property Details
                </Typography>

                <form onSubmit={handleSubmit}>
                  {/* Property type selector */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Property Type
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Button
                            fullWidth
                            variant={formData.is_house === 0 ? "contained" : "outlined"}
                            startIcon={<Apartment />}
                            onClick={() => handlePropertyTypeChange(0)}
                            sx={{ py: 1.5 }}
                            color={darkMode ? "secondary" : "primary"}
                        >
                          Apartment
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        <Button
                            fullWidth
                            variant={formData.is_house === 1 ? "contained" : "outlined"}
                            startIcon={<Home />}
                            onClick={() => handlePropertyTypeChange(1)}
                            sx={{ py: 1.5 }}
                            color={darkMode ? "secondary" : "primary"}
                        >
                          House
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Basic features */}
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Rooms & Area
                    <Tooltip title="Properties with 10+ bedrooms, 6+ bathrooms, or 10+ total rooms are considered to have 'many' rooms.">
                      <Info fontSize="small" sx={{ ml: 1, color: 'text.secondary', verticalAlign: 'middle' }} />
                    </Tooltip>
                  </Typography>

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                          fullWidth
                          label="Bedrooms"
                          name="bedrooms"
                          type="number"
                          value={formData.bedrooms}
                          onChange={handleNumberChange}
                          inputProps={{ min: 1, max: 20 }}
                          InputProps={{
                            startAdornment: <KingBed sx={{ color: 'action.active', mr: 1 }} />,
                          }}
                          helperText={formData.bedrooms >= 10 ? "Many bedrooms" : ""}
                          variant="outlined"
                          color={formData.bedrooms >= 10 ? "secondary" : "primary"}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                          fullWidth
                          label="Bathrooms"
                          name="bathrooms"
                          type="number"
                          value={formData.bathrooms}
                          onChange={handleNumberChange}
                          inputProps={{ min: 1, max: 10 }}
                          InputProps={{
                            startAdornment: <Bathtub sx={{ color: 'action.active', mr: 1 }} />,
                          }}
                          helperText={formData.bathrooms >= 6 ? "Many bathrooms" : ""}
                          variant="outlined"
                          color={formData.bathrooms >= 6 ? "secondary" : "primary"}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                          fullWidth
                          label="Total Rooms"
                          name="total_rooms"
                          type="number"
                          value={formData.total_rooms}
                          onChange={handleNumberChange}
                          inputProps={{ min: 1, max: 30 }}
                          InputProps={{
                            startAdornment: <AspectRatio sx={{ color: 'action.active', mr: 1 }} />,
                          }}
                          helperText={formData.total_rooms >= 10 ? "Many rooms" : ""}
                          variant="outlined"
                          color={formData.total_rooms >= 10 ? "secondary" : "primary"}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                          fullWidth
                          label="Living Area (m²)"
                          name="living_area"
                          type="number"
                          value={formData.living_area}
                          onChange={handleNumberChange}
                          inputProps={{ min: 20, max: 1000 }}
                          helperText={formData.living_area > 150 ? "Large living area" : ""}
                          InputProps={{
                            startAdornment: <Straighten sx={{ color: 'action.active', mr: 1 }} />,
                          }}
                          variant="outlined"
                          color={formData.living_area > 150 ? "secondary" : "primary"}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                          fullWidth
                          label="Land Area (m²)"
                          name="land_area"
                          type="number"
                          value={formData.land_area}
                          onChange={handleNumberChange}
                          inputProps={{ min: 0, max: 5000 }}
                          InputProps={{
                            startAdornment: <Terrain sx={{ color: 'action.active', mr: 1 }} />,
                          }}
                          variant="outlined"
                      />
                    </Grid>
                  </Grid>

                  {/* Location */}
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Location
                    <Tooltip title="The neighborhood options will update based on the selected city">
                      <Info fontSize="small" sx={{ ml: 1, color: 'text.secondary', verticalAlign: 'middle' }} />
                    </Tooltip>
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>City</InputLabel>
                        <Select
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            label="City"
                            startAdornment={<Business sx={{ mr: 1, color: 'action.active' }} />}
                        >
                          {cities.map(city => (
                              <MenuItem key={city} value={city}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <LocationCity sx={{ mr: 1, fontSize: '0.9rem' }} />
                                  {city}
                                </Box>
                              </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Neighborhood</InputLabel>
                        <Select
                            name="neighborhood"
                            value={formData.neighborhood}
                            onChange={handleChange}
                            label="Neighborhood"
                            disabled={isLoadingNeighborhoods || neighborhoods.length === 0}
                            startAdornment={<Place sx={{ mr: 1, color: 'action.active' }} />}
                        >
                          {isLoadingNeighborhoods ? (
                              <MenuItem value="" disabled>
                                <CircularProgress size={20} /> Loading...
                              </MenuItem>
                          ) : (
                              neighborhoods.map(neighborhood => (
                                  <MenuItem key={neighborhood} value={neighborhood}>
                                    {neighborhood}
                                  </MenuItem>
                              ))
                          )}
                        </Select>
                        {neighborhoods.length === 0 && !isLoadingNeighborhoods && (
                            <Typography variant="caption" color="error">
                              No neighborhoods available for this city
                            </Typography>
                        )}
                      </FormControl>
                    </Grid>
                  </Grid>

                  {/* Amenities sections */}
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Amenities</Typography>
                  <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                          borderBottom: 1,
                          borderColor: 'divider',
                          bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                        }}
                    >
                      <Tab
                          label="Basic"
                          icon={<Home />}
                          iconPosition="start"
                      />
                      <Tab
                          label="Comfort"
                          icon={<AcUnit />}
                          iconPosition="start"
                      />
                      <Tab
                          label="Luxury"
                          icon={<Pool />}
                          iconPosition="start"
                      />
                      <Tab
                          label="Additional"
                          icon={<Weekend />}
                          iconPosition="start"
                      />
                    </Tabs>

                    <Box sx={{ p: 2 }}>
                      {/* Basic Amenities */}
                      {tabValue === 0 && (
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_parking}
                                        onChange={handleCheckboxChange}
                                        name="has_parking"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <LocalParking sx={{ mr: 1 }} />
                                      <Typography>Parking</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_garage}
                                        onChange={handleCheckboxChange}
                                        name="has_garage"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <LocalParking sx={{ mr: 1 }} />
                                      <Typography>Garage</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_kitchen_equipped}
                                        onChange={handleCheckboxChange}
                                        name="has_kitchen_equipped"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Kitchen sx={{ mr: 1 }} />
                                      <Typography>Equipped Kitchen</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_interphone}
                                        onChange={handleCheckboxChange}
                                        name="has_interphone"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Call sx={{ mr: 1 }} />
                                      <Typography>Interphone</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                          </Grid>
                      )}

                      {/* Comfort Amenities */}
                      {tabValue === 1 && (
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_climatisation}
                                        onChange={handleCheckboxChange}
                                        name="has_climatisation"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <AcUnit sx={{ mr: 1 }} />
                                      <Typography>Air Conditioning</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_central_heating}
                                        onChange={handleCheckboxChange}
                                        name="has_central_heating"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Healing sx={{ mr: 1 }} />
                                      <Typography>Central Heating</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_electric_heating}
                                        onChange={handleCheckboxChange}
                                        name="has_electric_heating"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <FlashOn sx={{ mr: 1 }} />
                                      <Typography>Electric Heating</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_elevator}
                                        onChange={handleCheckboxChange}
                                        name="has_elevator"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Elevator sx={{ mr: 1 }} />
                                      <Typography>Elevator</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                          </Grid>
                      )}

                      {/* Luxury Amenities */}
                      {tabValue === 2 && (
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_pool}
                                        onChange={handleCheckboxChange}
                                        name="has_pool"
                                        color="secondary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Pool sx={{ mr: 1 }} />
                                      <Typography>Swimming Pool</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_garden}
                                        onChange={handleCheckboxChange}
                                        name="has_garden"
                                        color="secondary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Terrain sx={{ mr: 1 }} />
                                      <Typography>Garden</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_terrace}
                                        onChange={handleCheckboxChange}
                                        name="has_terrace"
                                        color="secondary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Deck sx={{ mr: 1 }} />
                                      <Typography>Terrace</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_sea_view}
                                        onChange={handleCheckboxChange}
                                        name="has_sea_view"
                                        color="secondary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Water sx={{ mr: 1 }} />
                                      <Typography>Sea View</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                          </Grid>
                      )}

                      {/* Additional Amenities */}
                      {tabValue === 3 && (
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_alarm_system}
                                        onChange={handleCheckboxChange}
                                        name="has_alarm_system"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Security sx={{ mr: 1 }} />
                                      <Typography>Alarm System</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_internet_access}
                                        onChange={handleCheckboxChange}
                                        name="has_internet_access"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Wifi sx={{ mr: 1 }} />
                                      <Typography>Internet Access</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_parabole_tv}
                                        onChange={handleCheckboxChange}
                                        name="has_parabole_tv"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Satellite sx={{ mr: 1 }} />
                                      <Typography>Satellite TV</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_handicapped_access}
                                        onChange={handleCheckboxChange}
                                        name="has_handicapped_access"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <AccessibleForward sx={{ mr: 1 }} />
                                      <Typography>Handicapped Access</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_fireplace}
                                        onChange={handleCheckboxChange}
                                        name="has_fireplace"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Fireplace sx={{ mr: 1 }} />
                                      <Typography>Fireplace</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <FormControlLabel
                                  control={
                                    <Checkbox
                                        checked={formData.amenities.has_furnished}
                                        onChange={handleCheckboxChange}
                                        name="has_furnished"
                                        color="primary"
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Weekend sx={{ mr: 1 }} />
                                      <Typography>Furnished</Typography>
                                    </Box>
                                  }
                              />
                            </Grid>
                          </Grid>
                      )}
                    </Box>
                  </Paper>

                  {/* Submit button */}
                  <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={isLoading}
                      color={darkMode ? "secondary" : "primary"}
                      className="predict-button"
                  >
                    {isLoading ? (
                        <CircularProgress size={24} color="inherit" />
                    ) : (
                        <>
                          <CurrencyExchange sx={{ mr: 1 }} />
                          Predict Price
                        </>
                    )}
                  </Button>

                  {error && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                      </Alert>
                  )}
                </form>
              </Paper>
            </Grid>

            {/* Result section */}
            <Grid item xs={12} md={6}>
              {prediction ? (
                  <Paper
                      elevation={3}
                      className={`results-card ${cardClass}`}
                  >
                    <Typography variant="h5" component="h2" className={headerClass}>
                      Price Prediction Results
                    </Typography>

                    {/* Prediction value */}
                    <Card
                        elevation={3}
                        sx={{
                          mb: 3,
                          p: 3,
                          textAlign: 'center',
                          background: darkMode
                              ? 'linear-gradient(120deg, #303f9f, #1a237e)'
                              : 'linear-gradient(120deg, #bbdefb, #e3f2fd)',
                          borderRadius: 2,
                          boxShadow: darkMode 
                              ? '0 4px 20px rgba(0,0,0,0.3)'
                              : '0 4px 20px rgba(0,0,0,0.15)'
                        }}
                        className="prediction-card"
                    >
                      <Typography variant="h6" color={darkMode ? "#bb86fc" : "text.secondary"} gutterBottom>
                        Estimated Property Price
                      </Typography>
                      <Typography
                          variant="h3"
                          component="div"
                          sx={{
                            fontWeight: 'bold',
                            color: darkMode ? '#ffffff' : '#0D47A1',
                            textShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
                          }}
                      >
                        {formatCurrency(prediction.prediction)}
                      </Typography>
                      <Typography
                          variant="body1"
                          color={darkMode ? "rgba(255,255,255,0.8)" : "text.secondary"}
                          sx={{ mt: 1 }}
                      >
                        Range: {formatCurrency(prediction.lower_bound)} - {formatCurrency(prediction.upper_bound)}
                      </Typography>
                    </Card>

                    {/* Property summary */}
                    <Typography variant="h6" className={headerClass} sx={{ mb: 2 }}>
                      Property Summary
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={4}>
                        <Card
                            variant="outlined"
                            sx={{
                              p: 1,
                              textAlign: 'center',
                              transition: 'all 0.3s ease',
                              backgroundColor: darkMode ? '#2d2d2d' : '#ffffff',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: darkMode 
                                  ? '0 4px 8px rgba(187,134,252,0.2)' 
                                  : '0 4px 8px rgba(0,0,0,0.1)'
                              }
                            }}
                            className="summary-card"
                        >
                          <Typography variant="body2" color={darkMode ? "rgba(255,255,255,0.7)" : "text.secondary"}>Type</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                            {prediction.property_summary.property_type === 'House'
                                ? <Home color={darkMode ? "secondary" : "primary"} sx={{ mr: 1 }} />
                                : <Apartment color={darkMode ? "secondary" : "primary"} sx={{ mr: 1 }} />}
                            <Typography variant="body1" fontWeight="medium" color={darkMode ? "#ffffff" : "text.primary"}>
                              {prediction.property_summary.property_type}
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                      <Grid item xs={4}>
                        <Card
                            variant="outlined"
                            sx={{
                              p: 1,
                              textAlign: 'center',
                              transition: 'all 0.3s ease',
                              backgroundColor: darkMode ? '#2d2d2d' : '#ffffff',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: darkMode 
                                  ? '0 4px 8px rgba(187,134,252,0.2)' 
                                  : '0 4px 8px rgba(0,0,0,0.1)'
                              }
                            }}
                            className="summary-card"
                        >
                          <Typography variant="body2" color={darkMode ? "rgba(255,255,255,0.7)" : "text.secondary"}>Area</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                            <Straighten color={darkMode ? "secondary" : "primary"} sx={{ mr: 1 }} />
                            <Typography variant="body1" fontWeight="medium" color={darkMode ? "#ffffff" : "text.primary"}>
                              {prediction.property_summary.living_area} m²
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                      <Grid item xs={4}>
                        <Card
                            variant="outlined"
                            sx={{
                              p: 1,
                              textAlign: 'center',
                              transition: 'all 0.3s ease',
                              backgroundColor: darkMode ? '#2d2d2d' : '#ffffff',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: darkMode 
                                  ? '0 4px 8px rgba(187,134,252,0.2)' 
                                  : '0 4px 8px rgba(0,0,0,0.1)'
                              }
                            }}
                            className="summary-card"
                        >
                          <Typography variant="body2" color={darkMode ? "rgba(255,255,255,0.7)" : "text.secondary"}>Rooms</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                            <KingBed color={darkMode ? "secondary" : "primary"} sx={{ mr: 1 }} />
                            <Typography variant="body1" fontWeight="medium" color={darkMode ? "#ffffff" : "text.primary"}>
                              {prediction.property_summary.bedrooms >= 10 ? "Many" : prediction.property_summary.bedrooms} bed, {prediction.property_summary.bathrooms >= 6 ? "Many" : prediction.property_summary.bathrooms} bath
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card
                            variant="outlined"
                            sx={{
                              p: 1,
                              textAlign: 'center',
                              transition: 'all 0.3s ease',
                              backgroundColor: darkMode ? '#2d2d2d' : '#ffffff',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: darkMode 
                                  ? '0 4px 8px rgba(187,134,252,0.2)' 
                                  : '0 4px 8px rgba(0,0,0,0.1)'
                              }
                            }}
                            className="summary-card"
                        >
                          <Typography variant="body2" color={darkMode ? "rgba(255,255,255,0.7)" : "text.secondary"}>Location</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                            <LocationCity color={darkMode ? "secondary" : "primary"} sx={{ mr: 1 }} />
                            <Typography variant="body1" fontWeight="medium" color={darkMode ? "#ffffff" : "text.primary"}>
                              {prediction.property_summary.city}, {prediction.property_summary.neighborhood}
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card
                            variant="outlined"
                            sx={{
                              p: 1,
                              textAlign: 'center',
                              transition: 'all 0.3s ease',
                              backgroundColor: darkMode ? '#2d2d2d' : '#ffffff',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: darkMode 
                                  ? '0 4px 8px rgba(187,134,252,0.2)' 
                                  : '0 4px 8px rgba(0,0,0,0.1)'
                              }
                            }}
                            className="summary-card"
                        >
                          <Typography variant="body2" color={darkMode ? "rgba(255,255,255,0.7)" : "text.secondary"}>Amenities</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                            {prediction.property_summary.amenity_count > 5 ? (
                                <Pool color="secondary" sx={{ mr: 1 }} />
                            ) : (
                                <Home color={darkMode ? "secondary" : "primary"} sx={{ mr: 1 }} />
                            )}
                            <Typography variant="body1" fontWeight="medium" color={darkMode ? "#ffffff" : "text.primary"}>
                              {prediction.property_summary.amenity_count} features
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* Key factors */}
                    <Typography variant="h6" className={headerClass} sx={{ mb: 2 }}>
                      Key Price Factors
                    </Typography>
                    <Box sx={{ mb: 3 }}>
                      <Grid container spacing={1}>
                        {prediction.key_factors.map((factor, index) => {
                          const isPremium = factor.includes("Many") ||
                              factor.includes("Swimming pool") ||
                              factor.includes("Sea view") ||
                              factor.includes("Premium");
                          
                          return (
                            <Grid item key={index}>
                              <Chip
                                  label={factor}
                                  color={isPremium ? "secondary" : "primary"}
                                  variant={darkMode ? "outlined" : "filled"}
                                  sx={{
                                    mb: 1,
                                    fontWeight: 'medium',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    backgroundColor: darkMode 
                                      ? isPremium ? 'rgba(187,134,252,0.2)' : 'rgba(144,202,249,0.2)'
                                      : undefined,
                                    color: darkMode
                                      ? isPremium ? '#bb86fc' : '#90caf9'
                                      : undefined,
                                    borderColor: darkMode
                                      ? isPremium ? '#bb86fc' : '#90caf9'
                                      : undefined
                                  }}
                                  className="factor-chip"
                              />
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>

                    {/* Feature impacts */}
                    <Typography variant="h6" className={headerClass} sx={{ mb: 2 }}>
                      Feature Impact Analysis
                    </Typography>
                    <Box className="impact-container">
                      {prediction.feature_impacts.map((feature, index) => (
                          <Box key={index} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Tooltip title={feature.value}>
                                <Typography variant="body2" color={darkMode ? "rgba(255,255,255,0.9)" : "text.primary"}>
                                  {feature.description}
                                </Typography>
                              </Tooltip>
                              <Typography variant="body2" fontWeight="bold" color={darkMode ? "#bb86fc" : "primary.main"}>
                                {feature.percentage.toFixed(1)}%
                              </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={feature.percentage}
                                sx={{
                                  height: 10,
                                  borderRadius: 5,
                                  backgroundColor: darkMode ? 'rgba(255,255,255,0.2)' : '#e3f2fd',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: darkMode 
                                      ? feature.percentage > 20 ? '#bb86fc' : '#9575cd'
                                      : feature.percentage > 20 ? '#1976D2' : '#42a5f5',
                                    borderRadius: 5
                                  }
                                }}
                                className="impact-progress"
                            />
                          </Box>
                      ))}
                    </Box>

                    {prediction.fallback_model && (
                        <Alert severity="info" sx={{ mt: 3 }}>
                          This prediction was made using a simplified model. For more accurate results, please ensure the trained model is loaded on the server.
                        </Alert>
                    )}
                  </Paper>
              ) : (
                  <Paper
                      elevation={3}
                      className={`welcome-card ${cardClass}`}
                  >
                    {/* Welcome message */}
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                      <Typography variant="h5" component="h2" className={headerClass} sx={{ mb: 2 }}>
                        Welcome to the Real Estate Price Predictor
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Fill in the property details on the left and click "Predict Price" to get an estimated property value.
                      </Typography>
                    </Box>

                    {/* Feature importance information */}
                    <Typography variant="h6" className={headerClass} sx={{ mb: 2 }}>
                      What Impacts Property Prices?
                    </Typography>

                    <Box sx={{ mb: 4 }}>
                      {featureImportance.length > 0 ? (
                          featureImportance.map((feature, index) => (
                              <Box key={index} sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Typography variant="body2">
                                    {feature.description}
                                  </Typography>
                                  <Typography variant="body2" fontWeight="bold">
                                    {(feature.importance * 100).toFixed(1)}%
                                  </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={feature.importance * 100}
                                    sx={{
                                      height: 10,
                                      borderRadius: 5,
                                      backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#e3f2fd',
                                      '& .MuiLinearProgress-bar': {
                                        backgroundColor: darkMode ? '#bb86fc' : '#1976D2',
                                        borderRadius: 5
                                      }
                                    }}
                                    className="impact-progress"
                                />
                              </Box>
                          ))
                      ) : (
                          <Box sx={{ textAlign: 'center', p: 2 }}>
                            <CircularProgress size={20} />
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              Loading feature importance data...
                            </Typography>
                          </Box>
                      )}
                    </Box>

                    {/* Property types information */}
                    <Typography variant="h6" className={headerClass} sx={{ mb: 2 }}>
                      Special Property Classifications
                    </Typography>
                    <Box sx={{
                      mb: 4,
                      p: 2,
                      bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : '#f5f9ff',
                      borderRadius: 2,
                      border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : '#e3f2fd'}`
                    }}
                         className="property-types-info"
                    >
                      <Typography variant="body2" paragraph>
                        Our model considers these special property classifications:
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <KingBed color="secondary" sx={{ mr: 1 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'medium', color: darkMode ? '#bb86fc' : '#1976D2' }}>
                                Many Bedrooms:
                              </Typography>
                              <Typography variant="body2">
                                10 or more bedrooms
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Bathtub color="secondary" sx={{ mr: 1 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'medium', color: darkMode ? '#bb86fc' : '#1976D2' }}>
                                Many Bathrooms:
                              </Typography>
                              <Typography variant="body2">
                                6 or more bathrooms
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AspectRatio color="secondary" sx={{ mr: 1 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'medium', color: darkMode ? '#bb86fc' : '#1976D2' }}>
                                Many Rooms:
                              </Typography>
                              <Typography variant="body2">
                                10 or more total rooms
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Straighten color="secondary" sx={{ mr: 1 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'medium', color: darkMode ? '#bb86fc' : '#1976D2' }}>
                                Large Living Area:
                              </Typography>
                              <Typography variant="body2">
                                Over 150 m²
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Sample price ranges */}
                    <Typography variant="h6" className={headerClass} sx={{ mb: 2 }}>
                      Sample Price Ranges
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Card
                            variant="outlined"
                            sx={{
                              p: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                              }
                            }}
                            className="price-range-card"
                        >
                          <Typography variant="body2" color="text.secondary">Budget Apartment</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <CurrencyExchange color="primary" sx={{ mr: 1 }} />
                            <Typography variant="body1" fontWeight="medium">
                              120,000 - 200,000 DNT
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card
                            variant="outlined"
                            sx={{
                              p: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                              }
                            }}
                            className="price-range-card"
                        >
                          <Typography variant="body2" color="text.secondary">Standard Apartment</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <CurrencyExchange color="primary" sx={{ mr: 1 }} />
                            <Typography variant="body1" fontWeight="medium">
                              200,000 - 400,000 DNT
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card
                            variant="outlined"
                            sx={{
                              p: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                              }
                            }}
                            className="price-range-card"
                        >
                          <Typography variant="body2" color="text.secondary">Standard House</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <CurrencyExchange color="primary" sx={{ mr: 1 }} />
                            <Typography variant="body1" fontWeight="medium">
                              300,000 - 600,000 DNT
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card
                            variant="outlined"
                            sx={{
                              p: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                              }
                            }}
                            className="price-range-card"
                        >
                          <Typography variant="body2" color="text.secondary">Luxury Property</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <CurrencyExchange color="secondary" sx={{ mr: 1 }} />
                            <Typography variant="body1" fontWeight="medium">
                              600,000+ DNT
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                    </Grid>
                  </Paper>
              )}

              {/* Add Save to Comparison button when there's a prediction */}
              {prediction && (
                <Box mt={2}>
                  <Button
                    variant="outlined"
                    color={darkMode ? "secondary" : "primary"}
                    startIcon={<Save />}
                    onClick={saveProperty}
                    fullWidth
                  >
                    Save Property for Comparison
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>

          {/* Footer */}
          <Box sx={{ mt: 6, textAlign: 'center', color: 'text.secondary' }}>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="body2">
              © 2025 Menzli Real Estate Predictor | Built with React and Flask
            </Typography>
          </Box>
        </Container>

        {/* Property Comparison Dialog */}
        <Dialog
          open={compareDialogOpen}
          onClose={() => setCompareDialogOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            Property Comparison
            {savedProperties.length > 0 ? (
              <Typography variant="subtitle1" color="textSecondary">
                Select properties to compare (max 3)
              </Typography>
            ) : null}
          </DialogTitle>
          <DialogContent>
            {savedProperties.length === 0 ? (
              <Alert severity="info">
                No properties saved for comparison yet. Make a prediction and save properties to compare them.
              </Alert>
            ) : (
              <>
                {/* Property Selection Grid */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {savedProperties.map((property) => (
                    <Grid item xs={12} sm={6} md={4} key={property.id}>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          border: selectedProperties.includes(property.id) ? 
                            `2px solid ${darkMode ? '#bb86fc' : '#1976d2'}` : 
                            '1px solid rgba(0, 0, 0, 0.12)',
                          cursor: 'pointer'
                        }}
                        onClick={() => togglePropertySelection(property.id)}
                      >
                        <CardContent>
                          <Typography variant="h6">
                            {property.formData.is_house ? 'House' : 'Apartment'} in {property.formData.neighborhood}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {property.formData.bedrooms} bed, {property.formData.bathrooms} bath, {property.formData.living_area}m²
                          </Typography>
                          <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                            {formatCurrency(property.prediction.prediction)}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="caption" color="textSecondary">
                              {new Date(property.date).toLocaleDateString()}
                            </Typography>
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeProperty(property.id);
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {/* Comparison Table */}
                {selectedProperties.length >= 2 && (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Feature</TableCell>
                          {selectedProperties.map(id => {
                            const property = savedProperties.find(p => p.id === id);
                            return (
                              <TableCell key={id} align="center">
                                {property.formData.is_house ? 'House' : 'Apartment'} in {property.formData.neighborhood}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell component="th" scope="row">Price</TableCell>
                          {selectedProperties.map(id => {
                            const property = savedProperties.find(p => p.id === id);
                            return (
                              <TableCell key={id} align="center">
                                <Typography color="primary" fontWeight="bold">
                                  {formatCurrency(property.prediction.prediction)}
                                </Typography>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">Property Type</TableCell>
                          {selectedProperties.map(id => {
                            const property = savedProperties.find(p => p.id === id);
                            return (
                              <TableCell key={id} align="center">
                                {property.formData.is_house ? 'House' : 'Apartment'}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">Bedrooms</TableCell>
                          {selectedProperties.map(id => {
                            const property = savedProperties.find(p => p.id === id);
                            return (
                              <TableCell key={id} align="center">
                                {property.formData.bedrooms}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">Bathrooms</TableCell>
                          {selectedProperties.map(id => {
                            const property = savedProperties.find(p => p.id === id);
                            return (
                              <TableCell key={id} align="center">
                                {property.formData.bathrooms}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">Living Area</TableCell>
                          {selectedProperties.map(id => {
                            const property = savedProperties.find(p => p.id === id);
                            return (
                              <TableCell key={id} align="center">
                                {property.formData.living_area} m²
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">City</TableCell>
                          {selectedProperties.map(id => {
                            const property = savedProperties.find(p => p.id === id);
                            return (
                              <TableCell key={id} align="center">
                                {property.formData.city}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">Neighborhood</TableCell>
                          {selectedProperties.map(id => {
                            const property = savedProperties.find(p => p.id === id);
                            return (
                              <TableCell key={id} align="center">
                                {property.formData.neighborhood}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">Key Factors</TableCell>
                          {selectedProperties.map(id => {
                            const property = savedProperties.find(p => p.id === id);
                            return (
                              <TableCell key={id} align="center">
                                {property.prediction.key_factors.slice(0, 3).join(', ')}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCompareDialogOpen(false)}>Close</Button>
            {selectedProperties.length >= 2 && (
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<Download />}
                onClick={() => alert('Export functionality would be implemented here')}
              >
                Export Comparison
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Search History Dialog */}
        <Dialog
          open={historyDialogOpen}
          onClose={() => setHistoryDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Search History
          </DialogTitle>
          <DialogContent>
            {searchHistory.length === 0 ? (
              <Alert severity="info">
                No search history yet. Make predictions to build your history.
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Property</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Prediction</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{new Date(item.date).toLocaleString()}</TableCell>
                        <TableCell>
                          {item.formData.is_house ? 'House' : 'Apartment'}<br />
                          {item.formData.bedrooms} bed, {item.formData.bathrooms} bath
                        </TableCell>
                        <TableCell>
                          {item.formData.neighborhood}, {item.formData.city}
                        </TableCell>
                        <TableCell>
                          <Typography color="primary" fontWeight="bold">
                            {formatCurrency(item.prediction.prediction)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outlined" 
                            size="small"
                            onClick={() => loadFromHistory(item)}
                          >
                            Load
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={clearHistory}
              color="error"
              disabled={searchHistory.length === 0}
            >
              Clear History
            </Button>
            <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </div>
  );
}

export default App;