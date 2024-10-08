from flask import Flask, request, jsonify
from flask_cors import CORS
from lib import *
import base64
import io
import os

import uuid
app = Flask(__name__)
CORS(app)

ALLOWED_EXTENSIONS = {'png', 'jpg'}
UPLOAD_FOLDER = 'uploads/'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Crear el directorio de uploads si no existe
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Cargar los modelos
models = {
    'resnet': ResNet("./models/resnet.pt"),
    'densenet': DenseNet("./models/densenet.pt"),
    'yolo': Yolo("./models/yolo.pt")
}


@app.route('/api/predict', methods=['POST'])
def predict_image():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Guardar la imagen con un nombre único en el directorio UPLOAD_FOLDER
    filename = str(uuid.uuid4()) + '.' + file.filename.rsplit('.', 1)[1].lower()
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    # Seleccionar el modelo a utilizar
    model_key = request.form['model_use']
    if model_key not in models:
        return jsonify({'error': 'Invalid model selection'}), 400

    model = models[model_key]

    try:
        # Predecir utilizando la ruta de la imagen
        prediction = model.predict(file_path)

        # Si el modelo es YOLO, puede devolver una imagen con las cajas detectadas
        if isinstance(prediction, tuple):
            img_with_boxes, predicted_class = prediction

            # Convertir la imagen a formato base64 para mandarla en la respuestas
            buffered = io.BytesIO()
            img_with_boxes.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
            img_base64 = "data:image/jpeg;base64" + img_base64 # adding header

            return jsonify({ 'prediction': predicted_class, 'image': img_base64 }), 200

        return jsonify({'prediction': prediction}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)

