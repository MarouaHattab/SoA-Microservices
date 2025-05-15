import pandas as pd
import numpy as np
import pickle
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import RobustScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_percentage_error

# Function to engineer features (same as in your code)
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

# Function to preprocess data
def preprocess_data(df):
    # Make a copy to avoid modifying the original dataframe
    df_processed = df.copy()
    
    # Handle missing values
    for col in df_processed.columns:
        if df_processed[col].isnull().sum() > 0:
            if df_processed[col].dtype == 'object':
                df_processed[col].fillna('Unknown', inplace=True)
            else:
                df_processed[col].fillna(df_processed[col].median(), inplace=True)
    
    # Remove property_type since we have is_house column
    if 'property_type' in df_processed.columns:
        df_processed.drop('property_type', axis=1, inplace=True)
    
    # Handle outliers in feature variables (not price)
    for col in ['living_area', 'land_area', 'bedrooms', 'bathrooms', 'total_rooms']:
        if col in df_processed.columns:
            q1 = df_processed[col].quantile(0.01)
            q3 = df_processed[col].quantile(0.99)
            iqr = q3 - q1
            lower_bound = max(0, q1 - 1.5 * iqr)  # Ensure non-negative values
            upper_bound = q3 + 1.5 * iqr
            df_processed[col] = df_processed[col].clip(lower_bound, upper_bound)
    
    return df_processed

# Function to train and save the model
def train_and_save_model(csv_path, model_save_path='xgboost_model.pkl'):
    # Load the data
    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    print(f"Data loaded. Shape: {df.shape}")
    
    # Preprocess the data
    print("Preprocessing data...")
    df_processed = preprocess_data(df)
    
    # Engineer features
    print("Engineering features...")
    df_engineered = engineer_features(df_processed)
    
    # Split data into features and target
    print("Splitting data into features and target...")
    X = df_engineered.drop(['price'], axis=1, errors='ignore')
    y = np.log1p(df_engineered['price'])  # Log transform for training
    
    # Remove any text columns
    X = X.select_dtypes(exclude=['object'])
    
    # Split data into train and test sets
    print("Splitting data into train and test sets...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"Training set shape: {X_train.shape}")
    print(f"Test set shape: {X_test.shape}")
    
    # Define preprocessing pipeline
    numeric_features = X.select_dtypes(include=['int64', 'float64']).columns
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', Pipeline([
                ('imputer', SimpleImputer(strategy='median')),
                ('scaler', RobustScaler())
            ]), numeric_features)
        ])
    
    # Create XGBoost model
    print("Creating XGBoost model...")
    xgb_model = xgb.XGBRegressor(
        n_estimators=1000,
        learning_rate=0.01,
        max_depth=7,
        min_child_weight=1,
        subsample=0.8,
        colsample_bytree=0.8,
        gamma=0,
        reg_alpha=0.1,
        reg_lambda=1,
        random_state=42,
        n_jobs=-1
    )
    
    # Create pipeline
    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('regressor', xgb_model)
    ])
    
    # Train the model
    print("Training model...")
    pipeline.fit(X_train, y_train)
    
    # Evaluate the model
    print("Evaluating model...")
    y_pred = pipeline.predict(X_test)
    
    # Calculate metrics (log scale)
    r2 = r2_score(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    # Calculate metrics (original scale)
    y_test_orig = np.expm1(y_test)
    y_pred_orig = np.expm1(y_pred)
    r2_orig = r2_score(y_test_orig, y_pred_orig)
    rmse_orig = np.sqrt(mean_squared_error(y_test_orig, y_pred_orig))
    
    try:
        mape = mean_absolute_percentage_error(y_test_orig, y_pred_orig) * 100
    except:
        # For older scikit-learn versions
        mape = np.mean(np.abs((y_test_orig - y_pred_orig) / y_test_orig)) * 100
    
    print(f"Model performance:")
    print(f"R² (log scale): {r2:.4f}")
    print(f"RMSE (log scale): {rmse:.4f}")
    print(f"R² (original scale): {r2_orig:.4f}")
    print(f"RMSE (original scale): {rmse_orig:.4f}")
    print(f"MAPE: {mape:.2f}%")
    
    # Save the model
    print(f"Saving model to {model_save_path}...")
    with open(model_save_path, 'wb') as f:
        pickle.dump(pipeline, f)
    
    print("Model saved successfully!")
    
    return pipeline, r2_orig, rmse_orig, mape

# Function to test loading the model and making a prediction
def test_model(model_path='xgboost_model.pkl'):
    print(f"Testing loading model from {model_path}...")
    
    try:
        # Load the model
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        
        print("Model loaded successfully!")
        
        # Create a test input
        test_input = {
            'is_house': 1,
            'bedrooms': 3,
            'bathrooms': 2,
            'total_rooms': 6,
            'living_area': 150,
            'land_area': 300,
            'has_climatisation': 1,
            'has_parking': 1,
            'has_garage': 1,
            'has_garden': 1,
            'has_pool': 0,
            'has_terrace': 1,
            'has_elevator': 0,
            'has_sea_view': 0,
            'has_central_heating': 1,
            'has_electric_heating': 0,
            'has_kitchen_equipped': 1,
            'has_interphone': 1,
            'has_alarm_system': 0,
            'has_internet_access': 1,
            'has_parabole_tv': 1,
            'has_handicapped_access': 0,
            'has_fireplace': 0,
            'has_furnished': 0,
            'neighborhood_encoded': 8,
            'city_encoded': 7
        }
        
        # Add derived features
        test_input['has_many_bedrooms'] = 1 if test_input['bedrooms'] > 3 else 0
        test_input['many_bathrooms'] = 1 if test_input['bathrooms'] > 2 else 0
        test_input['many_total_rooms'] = 1 if test_input['total_rooms'] > 5 else 0
        test_input['area_ratio'] = test_input['living_area'] / max(test_input['land_area'], 1)
        
        # Calculate amenity count
        amenity_cols = [col for col in test_input.keys() if col.startswith('has_')]
        test_input['amenity_count'] = sum(test_input[col] for col in amenity_cols)
        
        # Calculate top amenities score
        top_amenities = ['has_pool', 'has_sea_view', 'has_garden', 'has_climatisation']
        test_input['top_amenities_score'] = sum(test_input[col] for col in top_amenities if col in test_input)
        
        # Convert to DataFrame
        input_df = pd.DataFrame([test_input])
        
        # Engineer features
        engineered_df = engineer_features(input_df)
        
        # Make prediction
        log_prediction = model.predict(engineered_df)[0]
        prediction = np.expm1(log_prediction)  # Convert back from log scale
        
        print(f"Predicted price: {prediction:,.2f} DNT")
        
        return True
    
    except Exception as e:
        print(f"Error testing model: {str(e)}")
        return False

# Main execution
if __name__ == "__main__":
    # Path to your CSV file
    # Use either a relative path or a proper absolute path with escaped backslashes
    # Option 1: Relative path if the file is in the same directory as this script
    # csv_path = "menzli_modeling.csv"
    
    # Option 2: Absolute path with proper escaping (double backslashes)
    csv_path = "C:\\Users\\MSI\\Desktop\\House Sale Price Prediction\\web\\menzli_modeling.csv"
    
    # Option 3: Absolute path as a raw string (prefixed with r)
    # csv_path = r"C:\Users\MSI\Desktop\House Sale Price Prediction\web\menzli_modeling.csv"
    
    # Train and save the model
    model, r2, rmse, mape = train_and_save_model(csv_path)
    
    # Test loading the model and making a prediction
    test_successful = test_model()
    
    if test_successful:
        print("Model testing successful. You can now use the model in your Streamlit app.")
    else:
        print("Model testing failed. Please check the error messages above.")