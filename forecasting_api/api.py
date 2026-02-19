from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Global variables to hold model and data
model = None
df = None
features_to_use = []
feature_importances = {}
metric_mape = 0
metric_rmse = 0
chart_data = []
model_columns = []

def load_and_train():
    global model, df, features_to_use, feature_importances, metric_mape, metric_rmse, chart_data, model_columns
    
    print("⏳ Loading data and training forecasting model...")
    try:
        # Load dataset
        csv_path = 'cafeteria_data_full_quarter.csv'
        if not os.path.exists(csv_path):
            print(f"❌ Error: {csv_path} not found.")
            return

        df = pd.read_csv(csv_path)
        print(f"✅ Data Loaded. Total Records: {len(df)}")

        # Preprocessing
        target = 'Qty_Consumed'
        if target not in df.columns:
            print(f"❌ Error: Target column '{target}' not found.")
            return

        # Basic features
        features = ['Day_of_Week', 'Meal_Type', 'Is_Veg', 'Event_Context', 'Weather']
        
        # Feature Engineering (mimicking notebook)
        df['Is_Exam_Week'] = df.get('Event_Context', '').astype(str).str.contains('exam', case=False, na=False)
        df['Is_Holiday'] = df.get('Event_Context', '').astype(str).str.contains('holiday|break', case=False, na=False)
        df['Is_Graduation'] = df.get('Event_Context', '').astype(str).str.contains('graduation|convocation', case=False, na=False)

        additional_features = ['Is_Exam_Week', 'Is_Holiday', 'Is_Graduation']
        
        features_to_use = features + additional_features
        
        # One-Hot Encoding
        X = pd.get_dummies(df[features_to_use])
        
        # Save columns for alignment
        model_columns = X.columns.tolist()
        
        y = df[target]

        # Train/Test Split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Train Model
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        # Predictions on Test Set
        y_pred = model.predict(X_test)
        
        # Metrics
        metric_mae = mean_absolute_error(y_test, y_pred)
        # Avoid division by zero for MAPE
        y_test_safe = y_test.replace(0, 1) 
        metric_mape = np.mean(np.abs((y_test - y_pred) / y_test_safe)) * 100
        metric_rmse = np.sqrt(np.mean((y_test - y_pred)**2))

        # Calculate Importances
        importances = model.feature_importances_
        feature_names = X.columns
        feature_importances = dict(zip(feature_names, importances))
        feature_importances = dict(sorted(feature_importances.items(), key=lambda item: item[1], reverse=True))

        # Chart Data (Subset of Test Data)
        test_indices = y_test.index[:20] 
        chart_subset = []
        for idx, pred_val in zip(test_indices, y_pred[:20]):
            row = df.loc[idx]
            chart_subset.append({
                "day": str(row['Day_of_Week'])[:3], 
                "actual": float(row[target]),
                "predicted": float(pred_val)
            })
        chart_data = chart_subset

        print(f"✅ Model Trained. MAPE: {round(metric_mape, 2)}%, RMSE: {round(metric_rmse, 2)}")
        
    except Exception as e:
        print(f"❌ Error during training: {e}")

# Initial Training
load_and_train()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "Forecasting API"})

@app.route('/predict', methods=['POST'])
def predict():
    global model, df, features_to_use, model_columns
    
    if model is None:
        return jsonify({"error": "Model not trained"}), 500

    try:
        data = request.json
        if not data:
             return jsonify({"error": "No data provided"}), 400

        # Create DataFrame from input
        input_data = pd.DataFrame([data])
        
        # Basic validation/defaults
        if 'Event_Context' not in input_data.columns:
            input_data['Event_Context'] = 'NORMAL'
        
        # Re-apply Feature Engineering on input
        input_data['Is_Exam_Week'] = input_data.get('Event_Context', '').astype(str).str.contains('exam', case=False, na=False)
        input_data['Is_Holiday'] = input_data.get('Event_Context', '').astype(str).str.contains('holiday|break', case=False, na=False)
        input_data['Is_Graduation'] = input_data.get('Event_Context', '').astype(str).str.contains('graduation|convocation', case=False, na=False)

        # Align columns
        input_encoded = pd.get_dummies(input_data[features_to_use])
        input_encoded = input_encoded.reindex(columns=model_columns, fill_value=0)
        
        prediction = model.predict(input_encoded)[0]
        
        return jsonify({
            "prediction": round(prediction, 2),
            "input": data
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/scenario-stats', methods=['POST'])
def scenario_stats():
    global model, df, features_to_use, model_columns
    
    if model is None or df is None:
         return jsonify({"error": "Model not loaded"}), 500
         
    try:
        filters = request.json
        if not filters:
            return jsonify({"error": "No filters provided"}), 400
            
        # Filter historical data
        filtered_df = df.copy()
        if 'Day_of_Week' in filters:
            filtered_df = filtered_df[filtered_df['Day_of_Week'] == filters['Day_of_Week']]
        if 'Meal_Type' in filters:
            filtered_df = filtered_df[filtered_df['Meal_Type'] == filters['Meal_Type']]
            
        # Take up to 20 samples
        sample_df = filtered_df.head(20)
        
        if sample_df.empty:
            return jsonify({"message": "No data found", "chart_data": []})
            
        # Predict on these samples to compare Actual vs AI
        # Feature Engineering
        sample_df = sample_df.copy() # Avoid SettingWithCopy
        sample_df['Is_Exam_Week'] = sample_df.get('Event_Context', '').astype(str).str.contains('exam', case=False, na=False)
        sample_df['Is_Holiday'] = sample_df.get('Event_Context', '').astype(str).str.contains('holiday|break', case=False, na=False)
        sample_df['Is_Graduation'] = sample_df.get('Event_Context', '').astype(str).str.contains('graduation|convocation', case=False, na=False)
        
        # Prepare X
        X_sample = pd.get_dummies(sample_df[features_to_use])
        X_sample = X_sample.reindex(columns=model_columns, fill_value=0)
        
        # Predict
        preds = model.predict(X_sample)
        
        # Build Response
        chart_data = []
        for i, (index, row) in enumerate(sample_df.iterrows()):
            chart_data.append({
                "day": f"{str(row['Day_of_Week'])[:3]} {i+1}", # Mon 1, Mon 2... to separate
                "actual": float(row['Qty_Consumed']),
                "predicted": float(preds[i])
            })
            
        return jsonify({
            "chart_data": chart_data,
            "count": len(chart_data)
        })

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@app.route('/analytics', methods=['GET'])
def analytics():
    global feature_importances, df, metric_mape, metric_rmse, chart_data
    
    if df is None:
         return jsonify({"error": "Data not loaded"}), 500
         
    try:
        total_records = len(df)
        avg_demand = df['Qty_Consumed'].mean()
        
        try:
            top_drivers = [{"factor": k, "importance": v} for k, v in list(feature_importances.items())[:5]]
        except:
             top_drivers = []

        return jsonify({
            "total_records": total_records,
            "average_demand": round(avg_demand, 2),
            "metrics": {
                "mape": round(metric_mape, 2),
                "rmse": round(metric_rmse, 2)
            },
            "top_drivers": top_drivers,
            "chart_data": chart_data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Forecasting API on port 5001...")
    # Add error handler for port in use? No, just run.
    app.run(host='0.0.0.0', port=5001, debug=True)
