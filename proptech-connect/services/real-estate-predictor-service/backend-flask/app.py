from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import pickle
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load the model
def load_model(model_path='xgboost_model.pkl'):
    try:
        with open(model_path, 'rb') as file:
            model = pickle.load(file)
        print("Model loaded successfully.")
        return model
    except Exception as e:
        print(f"Error loading model: {e}")
        return None

# Function to engineer features
def engineer_features(df):
    # Make a copy to avoid modifying the original dataframe
    df_engineered = df.copy()
    
    # Basic log transformations for input features
    df_engineered['log_living_area'] = np.log1p(df_engineered['living_area'])
    df_engineered['log_land_area'] = np.log1p(df_engineered['land_area'])
    
    # Area ratio features
    df_engineered['living_land_ratio'] = df_engineered['living_area'] / np.maximum(df_engineered['land_area'], 1)
    df_engineered['sqm_per_room'] = df_engineered['living_area'] / np.maximum(df_engineered['total_rooms'], 1)
    
    # Room-related features and interactions
    df_engineered['bed_bath'] = df_engineered['bedrooms'] * df_engineered['bathrooms']
    df_engineered['bed_living'] = df_engineered['bedrooms'] * df_engineered['living_area']
    df_engineered['bath_living'] = df_engineered['bathrooms'] * df_engineered['living_area']
    df_engineered['rooms_per_living_area'] = df_engineered['total_rooms'] / np.maximum(df_engineered['living_area'], 1)
    df_engineered['avg_room_size'] = df_engineered['living_area'] / np.maximum(df_engineered['total_rooms'], 1)
    
    # Polynomial features of key variables
    df_engineered['living_area_squared'] = df_engineered['living_area'] ** 2
    df_engineered['total_rooms_squared'] = df_engineered['total_rooms'] ** 2
    df_engineered['bedrooms_squared'] = df_engineered['bedrooms'] ** 2
    df_engineered['bathrooms_squared'] = df_engineered['bathrooms'] ** 2
    
    # Total amenities score
    amenity_columns = [col for col in df_engineered.columns if col.startswith('has_')]
    df_engineered['total_amenities'] = df_engineered[amenity_columns].sum(axis=1)
    
    # Create amenity groups
    # Basic amenities
    basic_amenities = ['has_parking', 'has_garage', 'has_interphone', 'has_kitchen_equipped']
    if all(col in df_engineered.columns for col in basic_amenities):
        df_engineered['basic_amenities'] = df_engineered[basic_amenities].sum(axis=1)
    
    # Comfort amenities
    comfort_amenities = ['has_climatisation', 'has_central_heating', 'has_electric_heating', 'has_elevator']
    if all(col in df_engineered.columns for col in comfort_amenities):
        df_engineered['comfort_amenities'] = df_engineered[comfort_amenities].sum(axis=1)
    
    # Luxury amenities
    luxury_amenities = ['has_pool', 'has_garden', 'has_terrace', 'has_sea_view']
    if all(col in df_engineered.columns for col in luxury_amenities):
        df_engineered['luxury_amenities'] = df_engineered[luxury_amenities].sum(axis=1)
    
    # Interactions with is_house
    df_engineered['house_bedrooms'] = df_engineered['is_house'] * df_engineered['bedrooms']
    df_engineered['house_living_area'] = df_engineered['is_house'] * df_engineered['living_area']
    df_engineered['house_land_area'] = df_engineered['is_house'] * df_engineered['land_area']
    
    # Neighborhood-based features
    if 'neighborhood_encoded' in df_engineered.columns and 'city_encoded' in df_engineered.columns:
        # Create neighborhood-city interaction
        df_engineered['neighborhood_city'] = df_engineered['neighborhood_encoded'] * df_engineered['city_encoded']
    
    # Additional advanced features
    df_engineered['bed_bath_ratio'] = df_engineered['bedrooms'] / np.maximum(df_engineered['bathrooms'], 1)
    df_engineered['bath_per_room'] = df_engineered['bathrooms'] / np.maximum(df_engineered['total_rooms'], 1)
    
    # Using is_house with amenities
    df_engineered['house_with_garden'] = df_engineered['is_house'] * df_engineered['has_garden']
    df_engineered['house_with_pool'] = df_engineered['is_house'] * df_engineered['has_pool']
    
    return df_engineered

# Function to preprocess user input
def preprocess_user_input(user_input):
    # Convert inputs to a DataFrame
    input_df = pd.DataFrame([user_input])
    
    # Engineer features
    engineered_df = engineer_features(input_df)
    
    return engineered_df

# Load the model when the app starts
model = load_model()

# Define city and neighborhood mappings
cities_neighborhoods = {
    'Tunis': {
        'Tunis Centre': 8.5,
        'La Goulette': 7.5,
        'La Marsa': 9.0,
        'Carthage': 9.5,
        'Le Bardo': 6.5,
        'El Menzah': 8.0,
        'El Manar': 7.8,
        'Lac 1': 8.2,
        'Lac 2': 8.4,
        'Les Berges du Lac': 9.0,
        'Other': 6.0
    },
    'Ariana': {
        'Ariana Centre': 7.0,
        'Borj Louzir': 6.5,
        'Cité Ghazela': 7.2,
        'Ennasr': 7.5,
        'Menzah 5': 7.2,
        'Menzah 6': 7.3,
        'Riadh Andalous': 7.0,
        'Soukra': 6.8,
        'Other': 5.5
    },
    'Ben Arous': {
        'Ben Arous Centre': 6.0,
        'Ezzahra': 6.2,
        'Hammam Lif': 6.3,
        'Hammam Chott': 6.0,
        'Mornag': 5.5,
        'Rades': 6.1,
        'Megrine': 6.0,
        'Other': 5.0
    },
    'Manouba': {
        'Manouba Centre': 5.5,
        'Denden': 5.0,
        'Oued Ellil': 4.8,
        'Mornaguia': 4.5,
        'Other': 4.0
    },
    'Sousse': {
        'Sousse Centre': 7.0,
        'Sousse Corniche': 7.5,
        'Khezama': 7.2,
        'Kantaoui': 8.0,
        'Hammam Sousse': 6.5,
        'Chott Meriem': 6.0,
        'Other': 5.5
    },
    'Sfax': {
        'Sfax Centre': 6.5,
        'Sfax Ville': 6.3,
        'Chihia': 5.8,
        'Gremda': 5.5,
        'Other': 5.0
    },
    'Nabeul': {
        'Nabeul Centre': 6.5,
        'Hammamet': 7.5,
        'Dar Chaabane': 6.0,
        'Korba': 6.0,
        'Kelibia': 6.2,
        'Other': 5.5
    },
    'Monastir': {
        'Monastir Centre': 6.8,
        'Skanes': 7.0,
        'Ksar Hellal': 5.5,
        'Other': 5.3
    },
    'Bizerte': {
        'Bizerte Centre': 6.0,
        'Zarzouna': 5.5,
        'Corniche': 6.3,
        'Other': 5.0
    },
    'Gabes': {
        'Gabes Centre': 5.5,
        'Gabes Sud': 5.0,
        'El Hamma': 4.5,
        'Other': 4.0
    },
    'Other': {
        'Other': 5.0
    }
}

city_encoded_values = {
    'Tunis': 8.0,
    'Ariana': 7.0,
    'Ben Arous': 6.0,
    'Manouba': 5.5,
    'Sousse': 6.5,
    'Sfax': 6.0,
    'Nabeul': 5.5,
    'Monastir': 5.8,
    'Bizerte': 5.3,
    'Gabes': 4.8,
    'Other': 5.0
}

# API routes
@app.route('/api/cities', methods=['GET'])
def get_cities():
    return jsonify({
        'cities': list(cities_neighborhoods.keys())
    })

@app.route('/api/neighborhoods', methods=['GET'])
def get_neighborhoods():
    city = request.args.get('city', 'Tunis')
    if city in cities_neighborhoods:
        return jsonify({
            'neighborhoods': list(cities_neighborhoods[city].keys())
        })
    return jsonify({'error': 'City not found'}), 400

@app.route('/api/feature_importance', methods=['GET'])
def get_feature_importance():
    # Top 5 features and their importance based on model analysis
    importance_data = [
        {'feature': 'bath_living', 'importance': 0.257661, 'description': 'Bathroom count × Living area'},
        {'feature': 'living_area_squared', 'importance': 0.179890, 'description': 'Square of living area'},
        {'feature': 'house_land_area', 'importance': 0.046006, 'description': 'Land area for houses'},
        {'feature': 'log_living_area', 'importance': 0.030825, 'description': 'Logarithm of living area'},
        {'feature': 'living_area', 'importance': 0.028531, 'description': 'Living area'}
    ]
    return jsonify(importance_data)

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        # Get JSON data from request
        data = request.get_json()
        
        # Extract inputs
        is_house = data.get('is_house', 0)
        bedrooms = data.get('bedrooms', 3)
        bathrooms = data.get('bathrooms', 2)
        total_rooms = data.get('total_rooms', 6)
        living_area = data.get('living_area', 120)
        land_area = data.get('land_area', 200)
        city = data.get('city', 'Tunis')
        neighborhood = data.get('neighborhood', 'Tunis Centre')
        
        # Get encoded values for city and neighborhood
        city_encoded = city_encoded_values.get(city, 5.0)
        neighborhood_encoded = cities_neighborhoods.get(city, {}).get(neighborhood, 5.0)
        
        # Extract amenities
        amenities = data.get('amenities', {})
        
        # Prepare user input
        user_input = {
            'is_house': is_house,
            'bedrooms': bedrooms,
            'bathrooms': bathrooms,
            'total_rooms': total_rooms,
            'living_area': living_area,
            'land_area': land_area,
            'neighborhood_encoded': neighborhood_encoded,
            'city_encoded': city_encoded,
            'has_climatisation': int(amenities.get('has_climatisation', False)),
            'has_parking': int(amenities.get('has_parking', False)),
            'has_garage': int(amenities.get('has_garage', False)),
            'has_garden': int(amenities.get('has_garden', False)),
            'has_pool': int(amenities.get('has_pool', False)),
            'has_terrace': int(amenities.get('has_terrace', False)),
            'has_elevator': int(amenities.get('has_elevator', False)),
            'has_sea_view': int(amenities.get('has_sea_view', False)),
            'has_central_heating': int(amenities.get('has_central_heating', False)),
            'has_electric_heating': int(amenities.get('has_electric_heating', False)),
            'has_kitchen_equipped': int(amenities.get('has_kitchen_equipped', False)),
            'has_interphone': int(amenities.get('has_interphone', False)),
            'has_alarm_system': int(amenities.get('has_alarm_system', False)),
            'has_internet_access': int(amenities.get('has_internet_access', False)),
            'has_parabole_tv': int(amenities.get('has_parabole_tv', False)),
            'has_handicapped_access': int(amenities.get('has_handicapped_access', False)),
            'has_fireplace': int(amenities.get('has_fireplace', False)),
            'has_furnished': int(amenities.get('has_furnished', False))
        }
        
        # Add derived features
        user_input['has_many_bedrooms'] = 1 if bedrooms >= 10 else 0  # Changed from 3 to 10
        user_input['many_bathrooms'] = 1 if bathrooms >= 6 else 0     # Changed from 2 to 6
        user_input['many_total_rooms'] = 1 if total_rooms >= 10 else 0  # Changed from 5 to 10
        user_input['area_ratio'] = user_input['living_area'] / max(user_input['land_area'], 1)
        
        # Calculate amenity count
        amenity_cols = [col for col in user_input.keys() if col.startswith('has_')]
        user_input['amenity_count'] = sum(user_input[col] for col in amenity_cols)
        
        # Calculate top amenities score
        top_amenities = ['has_pool', 'has_sea_view', 'has_garden', 'has_climatisation']
        user_input['top_amenities_score'] = sum(user_input[col] for col in top_amenities if col in user_input)
        
        # Preprocess user input
        processed_input = preprocess_user_input(user_input)
        
        # Make prediction
        if model:
            # Use the actual model for prediction
            try:
                # For models that expect log-transformed prices
                # Remove any columns that might not be expected by the model
                expected_columns = model.feature_names_in_ if hasattr(model, 'feature_names_in_') else None
                
                if expected_columns:
                    # Keep only the columns that the model expects
                    processed_input = processed_input[expected_columns]
                
                # Make prediction
                log_prediction = model.predict(processed_input)[0]
                prediction = np.expm1(log_prediction)  # Convert back from log scale
                
                # Calculate prediction range (± 15%)
                lower_bound = prediction * 0.85
                upper_bound = prediction * 1.15
                
                # Calculate feature impacts
                bath_living = user_input['bathrooms'] * user_input['living_area']
                living_area_squared = user_input['living_area'] ** 2
                house_land_area = user_input['is_house'] * user_input['land_area']
                
                feature_impacts = [
                    {
                        'feature': 'bath_living',
                        'value': f"{user_input['bathrooms']} × {user_input['living_area']} = {bath_living:.1f}",
                        'impact': bath_living * 800,
                        'description': 'Bathrooms × Living Area'
                    },
                    {
                        'feature': 'living_area_squared',
                        'value': f"({user_input['living_area']})² = {living_area_squared}",
                        'impact': living_area_squared * 0.4,
                        'description': 'Square of Living Area'
                    },
                    {
                        'feature': 'house_land_area',
                        'value': f"{is_house} × {user_input['land_area']} = {house_land_area}",
                        'impact': house_land_area * 100,
                        'description': 'Land Area for Houses'
                    },
                    {
                        'feature': 'log_living_area',
                        'value': f"log({user_input['living_area']}+1) = {np.log1p(user_input['living_area']):.2f}",
                        'impact': np.log1p(user_input['living_area']) * 15000,
                        'description': 'Logarithm of Living Area'
                    },
                    {
                        'feature': 'living_area',
                        'value': f"{user_input['living_area']}",
                        'impact': user_input['living_area'] * 500,
                        'description': 'Living Area'
                    }
                ]
                
                # Calculate total impact
                total_impact = sum(item['impact'] for item in feature_impacts)
                
                # Add percentage to each impact
                for item in feature_impacts:
                    item['percentage'] = (item['impact'] / total_impact * 100) if total_impact > 0 else 0
                
                # Sort by impact
                feature_impacts.sort(key=lambda x: x['impact'], reverse=True)
                
                # Determine key factors
                key_factors = []
                if is_house:
                    key_factors.append("Being a house")
                if living_area > 150:
                    key_factors.append("Large living area")
                if bathrooms >= 6:  # Updated threshold
                    key_factors.append("Many bathrooms")
                if bedrooms >= 10:  # Updated threshold
                    key_factors.append("Many bedrooms")
                if total_rooms >= 10:  # Updated threshold
                    key_factors.append("Many rooms")
                if user_input['has_pool']:
                    key_factors.append("Swimming pool")
                if user_input['has_sea_view']:
                    key_factors.append("Sea view")
                if user_input['has_garden']:
                    key_factors.append("Garden")
                if neighborhood_encoded > 7:
                    key_factors.append(f"Premium neighborhood ({neighborhood})")
                
                # If no special factors were found
                if not key_factors:
                    key_factors = ["Standard property features"]
                
                return jsonify({
                    'success': True,
                    'prediction': round(prediction, 2),
                    'lower_bound': round(lower_bound, 2),
                    'upper_bound': round(upper_bound, 2),
                    'currency': 'DNT',
                    'feature_impacts': feature_impacts,
                    'key_factors': key_factors,
                    'property_summary': {
                        'property_type': 'House' if is_house else 'Apartment',
                        'bedrooms': bedrooms,
                        'bathrooms': bathrooms,
                        'total_rooms': total_rooms,
                        'living_area': living_area,
                        'land_area': land_area,
                        'city': city,
                        'neighborhood': neighborhood,
                        'amenity_count': user_input['amenity_count']
                    }
                })
                
            except Exception as e:
                print(f"Error making prediction with model: {str(e)}")
                # Fall back to simplified prediction
        
        # Simplified prediction (fallback)
        bath_living = user_input['bathrooms'] * user_input['living_area']
        living_area_squared = user_input['living_area'] ** 2
        house_land_area = user_input['is_house'] * user_input['land_area']
        
        # Simple formula inspired by feature importance
        base_price = 200000  # Base price in DNT
        price_factors = [
            bath_living * 800,
            living_area_squared * 0.4,
            house_land_area * 100,
            user_input['living_area'] * 500,
            user_input['bedrooms'] * 20000,
            user_input['bathrooms'] * 30000,
            user_input['amenity_count'] * 10000,
            user_input['neighborhood_encoded'] * 15000,
            user_input['city_encoded'] * 20000
        ]
        
        # Add premium for luxury amenities
        if user_input['has_pool']:
            price_factors.append(50000)
        if user_input['has_sea_view']:
            price_factors.append(80000)
        if user_input['has_garden']:
            price_factors.append(30000)
        
        # Calculate prediction
        prediction = base_price + sum(price_factors)
        lower_bound = prediction * 0.85
        upper_bound = prediction * 1.15
        
        # Calculate feature impacts for simplified model
        feature_impacts = [
            {
                'feature': 'bath_living',
                'value': f"{user_input['bathrooms']} × {user_input['living_area']} = {bath_living:.1f}",
                'impact': bath_living * 800,
                'description': 'Bathrooms × Living Area'
            },
            {
                'feature': 'living_area_squared',
                'value': f"({user_input['living_area']})² = {living_area_squared}",
                'impact': living_area_squared * 0.4,
                'description': 'Square of Living Area'
            },
            {
                'feature': 'house_land_area',
                'value': f"{is_house} × {user_input['land_area']} = {house_land_area}",
                'impact': house_land_area * 100,
                'description': 'Land Area for Houses'
            },
            {
                'feature': 'living_area',
                'value': f"{user_input['living_area']}",
                'impact': user_input['living_area'] * 500,
                'description': 'Living Area'
            },
            {
                'feature': 'bedrooms',
                'value': f"{user_input['bedrooms']}",
                'impact': user_input['bedrooms'] * 20000,
                'description': 'Number of Bedrooms'
            }
        ]
        
        # Calculate total impact
        total_impact = sum(item['impact'] for item in feature_impacts)
        
        # Add percentage to each impact
        for item in feature_impacts:
            item['percentage'] = (item['impact'] / total_impact * 100) if total_impact > 0 else 0
        
        # Sort by impact
        feature_impacts.sort(key=lambda x: x['impact'], reverse=True)
        
        # Determine key factors
        key_factors = []
        if is_house:
            key_factors.append("Being a house")
        if living_area > 150:
            key_factors.append("Large living area")
        if bathrooms >= 6:  # Updated threshold
            key_factors.append("Many bathrooms")
        if bedrooms >= 10:  # Updated threshold
            key_factors.append("Many bedrooms")
        if total_rooms >= 10:  # Updated threshold
            key_factors.append("Many rooms")
        if user_input['has_pool']:
            key_factors.append("Swimming pool")
        if user_input['has_sea_view']:
            key_factors.append("Sea view")
        if user_input['has_garden']:
            key_factors.append("Garden")
        if neighborhood_encoded > 7:
            key_factors.append(f"Premium neighborhood ({neighborhood})")
        
        # If no special factors were found
        if not key_factors:
            key_factors = ["Standard property features"]
        
        return jsonify({
            'success': True,
            'prediction': round(prediction, 2),
            'lower_bound': round(lower_bound, 2),
            'upper_bound': round(upper_bound, 2),
            'currency': 'DNT',
            'feature_impacts': feature_impacts,
            'key_factors': key_factors,
            'fallback_model': True,
            'property_summary': {
                'property_type': 'House' if is_house else 'Apartment',
                'bedrooms': bedrooms,
                'bathrooms': bathrooms,
                'total_rooms': total_rooms,
                'living_area': living_area,
                'land_area': land_area,
                'city': city,
                'neighborhood': neighborhood,
                'amenity_count': user_input['amenity_count']
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Serve React frontend static files (if building a combined application)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # If path is empty or doesn't include a file extension, serve index.html
    if path == "" or '.' not in path:
        return send_from_directory('../frontend/build', 'index.html')
    
    # Otherwise try to serve the static file
    try:
        return send_from_directory('../frontend/build', path)
    except:
        # If file not found, return index.html (for client-side routing)
        return send_from_directory('../frontend/build', 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)