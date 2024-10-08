import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload } from '@fortawesome/free-solid-svg-icons'
import axios from 'axios'

function App() {
  const [image, setImage] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [imageClass, setImageClass] = useState<string>('')

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError('')

    if (fileRejections.length > 0) {
      setError('Solo se permiten archivos en formato PNG o JPG')
      setImage(null)
      return
    }

    const file = acceptedFiles[0]
    const reader = new FileReader()

    reader.onload = () => {
      setImage(reader.result as string)
      setFile(file) // Save the file to send it to the backend
    }
    reader.readAsDataURL(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png', '.jpg'] },
    maxFiles: 1,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedModel || !imageClass || !image || !file) {
      setError('Por favor, completa todos los campos y sube una imagen.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('model_use', selectedModel)

    try {
      const response = await axios.post('http://127.0.0.1:5000/api/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // You can handle the response here, like displaying the prediction
      console.log('Prediction:', response.data.prediction)
      if (selectedModel === "yolo"){
        console.log('Image predicted: ', response.data.image)
        setImage(response.data.image as string)
      }
    } catch (error) {
      console.error('Error sending the request:', error)
      setError('Hubo un error al enviar la solicitud.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Clasificación de imágenes ecográficas de planos prenatales del cráneo</h1>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        {/* Menú desplegable: Seleccionar modelo */}
        <div>
          <label htmlFor="model" className="block mb-2 text-sm font-medium text-gray-700">
            Modelo a utilizar
          </label>
          <select
            id="model"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="" disabled>Elige un modelo</option>
            <option value="resnet">ResNet</option>
            <option value="densenet">DenseNet</option>
            <option value="yolo">YOLOv8</option>
          </select>
        </div>

        {/* Menú desplegable: Tipo de imagen */}
        <div>
          <label htmlFor="imageClass" className="block mb-2 text-sm font-medium text-gray-700">
            Clase de imagen
          </label>
          <select
            id="imageClass"
            value={imageClass}
            onChange={(e) => setImageClass(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="" disabled>Selecciona clase real de la imagen</option>
            <option value="0">Trans-cerebeloso</option>
            <option value="1">Trans-talámico</option>
            <option value="2">Trans-ventricular</option>
            <option value="3">Desconocido</option>
          </select>
        </div>

        {/* Campo de drag and drop */}
        <div
          {...getRootProps()}
          className={`w-full p-6 border-2 border-dashed rounded-lg cursor-pointer
            ${isDragActive ? 'border-blue-400 bg-blue-100' : 'border-gray-400 bg-gray-200'}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center">
            <FontAwesomeIcon icon={faUpload} className="h-10 w-10 text-gray-500 mb-2" />
            <p className="text-gray-600">
              <span className="font-semibold text-gray-700">Elige una imagen</span> o arrástrala aquí.
            </p>
          </div>
        </div>

        {error && <p className="text-red-500 mt-2 font-bold">{error}</p>}

        {image && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Vista previa:</h3>
            <img src={image} alt="Preview" className="mt-2 max-w-full border rounded-lg" />
          </div>
        )}

        {/* Botón de submit */}
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition duration-300"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}

export default App
