from torchvision import transforms, models
import torch
import torch.nn as nn
from PIL import Image
from ultralytics import YOLO

class_names = {
    0: 'Trans-cerebeloso',
    1: 'Trans-tálamico',
    2: 'Trans-ventricular'
}

class ModelInterface:
    def __init__(self, model_path):
        self.model_path = model_path
        self.model = None
        self.name = ""

    def preprocess(self, image_path):
        pass

    def predict(self, image_path):
        pass


class ResNet(ModelInterface):
    def __init__(self, model_path):
        super().__init__(model_path)
        self.name = "ResNet"
        self.model = models.resnet18(pretrained=False)
        self.model.fc = nn.Linear(self.model.fc.in_features, 3)
        self.model.load_state_dict(torch.load(self.model_path, map_location=torch.device('cpu')))

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)), # Redimensionar a 224x224
            transforms.ToTensor(),
            transforms.Lambda(lambda x: x.repeat(3, 1, 1))  # Repetir el canal de grayscale para simular RGB
        ])

    def preprocess(self, image_path):
            image = Image.open(image_path).convert('L')  # Convertir a escala de grises
            image_tensor = self.transform(image).unsqueeze(0)  # Añadir dimensión extra (batch)
            return image_tensor

    def predict(self, image_path):
        image_tensor = self.preprocess(image_path)

        with torch.no_grad():
            model_pred = self.model(image_tensor)

        prediction = model_pred.argmax(dim=1).item()
        return class_names[prediction]


class DenseNetForClassification(nn.Module):
    def __init__(self, densenet, num_classes):
        super(DenseNetForClassification, self).__init__()
        self.densenet = densenet
        in_features = self.densenet.classifier.in_features
        self.densenet.classifier = nn.Linear(in_features, num_classes)

    def forward(self, x):
        return self.densenet(x)


class DenseNet(ModelInterface):
    def __init__(self, model_path):
        super().__init__(model_path)
        self.name = "DenseNet"
        densenet = models.densenet121(pretrained=False)
        densenet.features.conv0 = nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
        self.model = DenseNetForClassification(densenet, len(class_names))
        self.model.load_state_dict(torch.load(self.model_path, map_location=torch.device('cpu')))
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Grayscale(num_output_channels=1),  # Mantener las imágenes en escala de grises
            transforms.Resize((224, 224)),
            transforms.ToTensor()
        ])

    def preprocess(self, image_path):
            image = Image.open(image_path).convert('L')  # Convertir a escala de grises
            image_tensor = self.transform(image).unsqueeze(0)  # Añadir dimensión extra (batch)
            return image_tensor

    def predict(self, image_path):
        image_tensor = self.preprocess(image_path)

        with torch.no_grad():
            model_pred = self.model(image_tensor)

        prediction = model_pred.argmax(dim=1).item()
        return class_names[prediction]


class Yolo(ModelInterface):
    def __init__(self, model_path):
        super().__init__(model_path)
        self.model = YOLO(model_path)
        self.name = "YOLO"

    def predict(self, image_path):
        results = self.model.predict(image_path, verbose=False)
        img_with_boxes = results[0].plot()  # Get the result with bounding boxes as a NumPy array

        # Convert the NumPy array to a PIL Image
        img_with_boxes_pil = Image.fromarray(img_with_boxes)

        # Return both the PIL image and the prediction
        predicted_classes = results[0].boxes.cls.cpu().numpy()  # Get the predicted classes from YOLO
        predicted_classes = int(predicted_classes[0]) if predicted_classes else -1

        prediction = class_names[predicted_classes] if predicted_classes in class_names else "No detection"
        print(predicted_classes)

        return img_with_boxes_pil, prediction

