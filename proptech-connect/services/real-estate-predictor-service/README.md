# 🏠 Real Estate Predictor Service

A powerful machine learning service to predict real estate prices based on property features and location data.

## 🌟 Features

- 🧠 Advanced ML model for accurate property price predictions
- 🏙️ Location-based analysis with city and neighborhood data
- 🛁 Detailed property feature analysis (bedrooms, bathrooms, amenities)
- 📊 Visual impact analysis of different property features
- 🔍 Property comparison functionality
- 📝 Search history tracking
- 🌓 Light/Dark mode support

## 🏗️ Architecture

This service consists of two main components:

### 🐍 Backend (Flask)

The backend is built with Flask and provides a RESTful API for property price predictions.

- **Model**: XGBoost-based machine learning model trained on Tunisian real estate data
- **Feature Engineering**: Automated feature transformation and preparation
- **API Endpoints**: RESTful endpoints for predictions and data retrieval
- **CORS Support**: Cross-origin resource sharing enabled for frontend integration

### ⚛️ Frontend (React)

The frontend is built with React and Material-UI for a modern, responsive user interface.

- **Material-UI**: Modern component library for consistent design
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode**: Full support for light and dark themes
- **Interactive UI**: Real-time feedback and visual data presentation
- **Local Storage**: Saves user preferences and history

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+)
- Python (v3.9+)
- pip

### 🐍 Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend-flask
   ```

2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the Flask server:
   ```bash
   python -m flask run --host=0.0.0.0 --port=5001
   ```

The backend will be available at http://localhost:5001

### ⚛️ Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend-react
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will be available at http://localhost:3000

## 🧪 Testing

### 🔍 API Testing with Postman

You can test the backend API directly using Postman:

1. **Get Cities List**
   - Method: GET
   - URL: `http://localhost:5001/api/cities`

2. **Get Neighborhoods for a City**
   - Method: GET
   - URL: `http://localhost:5001/api/neighborhoods?city=Tunis`

3. **Get Feature Importance Data**
   - Method: GET
   - URL: `http://localhost:5001/api/feature_importance`

4. **Make a Prediction**
   - Method: POST
   - URL: `http://localhost:5001/api/predict`
   - Body (JSON):
     ```json
     {
       "is_house": 1,
       "bedrooms": 3,
       "bathrooms": 2,
       "total_rooms": 6,
       "living_area": 150,
       "land_area": 300,
       "city": "Tunis",
       "neighborhood": "La Marsa",
       "amenities": {
         "has_pool": true,
         "has_garden": true,
         "has_sea_view": false
       }
     }
     ```

### 🌐 Testing via API Gateway

If using the API gateway:

1. Start the API gateway:
   ```bash
   cd api-gateway
   node server.js
   ```

2. Use the following endpoints:
   - GET `http://localhost:3000/api/predictor/cities`
   - GET `http://localhost:3000/api/predictor/neighborhoods?city=Tunis`
   - GET `http://localhost:3000/api/predictor/feature-importance`
   - POST `http://localhost:3000/api/predictor/predict` (same JSON body as above)

## 🔄 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cities` | GET | Get list of available cities |
| `/api/neighborhoods?city={city}` | GET | Get neighborhoods for a specific city |
| `/api/feature_importance` | GET | Get feature importance data |
| `/api/predict` | POST | Make a property price prediction |

## 📱 UI Features

- 🏠 Property type selection (House/Apartment)
- 🛏️ Room configuration (bedrooms, bathrooms, total rooms)
- 📏 Area measurements (living area, land area)
- 📍 Location selection (city, neighborhood)
- ✨ Amenities selection (pool, garden, etc.)
- 💰 Price prediction with confidence range
- 📊 Feature impact visualization
- 🔍 Property comparison tool
- 📜 Search history tracking

## 🔧 Configuration

The backend service can be configured using environment variables:

- `PORT`: Port for the Flask server (default: 5001)
- `DEBUG`: Enable debug mode (default: True)

## 🤝 Integration with API Gateway

This service is designed to work with the PropTech Connect API Gateway:

1. The API Gateway forwards requests to this service
2. Authentication is handled at the gateway level
3. Cross-service communication is managed through the gateway



## 🙏 Acknowledgements

- XGBoost for the machine learning model
- Flask for the backend framework
- React and Material-UI for the frontend
- The PropTech Connect team for integration support 