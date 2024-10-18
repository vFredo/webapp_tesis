import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload } from '@fortawesome/free-solid-svg-icons'
import axios from 'axios'

function App() {
  const [image, setImage] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const [imageClass, setImageClass] = useState<string>('')
  const [resNetPrediction, setResNetPrediction] = useState<string>('')
  const [denseNetPrediction, setDenseNetPrediction] = useState<string>('')
  const [yoloPrediction, setYoloPrediction] = useState<string>('')

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
    setResNetPrediction('')
    setDenseNetPrediction('')
    setYoloPrediction('')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png', '.jpg'] },
    maxFiles: 1,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!imageClass || !image || !file) {
      setError('Por favor, completa todos los campos y sube una imagen.')
      return
    }

    try {
      // model calls from api
      const modelCalls = ['resnet', 'densenet', 'yolo'].map((model) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('model_use', model)
        return axios.post('http://127.0.0.1:5000/api/predict', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      })

      // Execute all requests in parallel
      const [resnetRes, densenetRes, yoloRes] = await Promise.all(modelCalls)

      // Set the predictions from the responses
      setResNetPrediction(resnetRes.data.prediction)
      setDenseNetPrediction(densenetRes.data.prediction)
      setYoloPrediction(yoloRes.data.prediction)
      setImage(yoloRes.data.image as string)

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
        {/* Menú desplegable: Clase de imagen */}
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
            <option value="Trans-cerebeloso">Trans-cerebeloso</option>
            <option value="Trans-talámico">Trans-talámico</option>
            <option value="Trans-ventricular">Trans-ventricular</option>
            <option value="Desconocido">Desconocido</option>
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

        {/* Botón de submit */}
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition duration-300"
        >
          Enviar
        </button>
      </form>

      {/* Image preview before predictions */}
      {!resNetPrediction && !denseNetPrediction && !yoloPrediction && image && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Imagen:</h3>
          <img src={image} alt="Preview" className="mt-2 max-w-full border rounded-lg" />
        </div>
      )}

      {/* Flex container for predictions and image after predictions */}
      {(resNetPrediction || denseNetPrediction || yoloPrediction) && image && (
        <div className="flex mt-6 w-full max-w-3xl">
          {/* Left-hand side for predictions */}
          <div className="w-1/3 p-4">
            <h3 className="text-lg font-semibold mb-4">Prediccion modelos:</h3>
            {resNetPrediction &&
              <div>
                <h1>ResNet: </h1>
                <h2 className={`text-lg font-bold ${imageClass === resNetPrediction || imageClass === "Desconocido" ? "text-green-800" : "text-red-500"}`}>{resNetPrediction}</h2>
              </div>
            }
            {denseNetPrediction &&
              <div>
                <h1>DenseNet: </h1>
                <h2 className={`text-lg font-bold ${imageClass === denseNetPrediction || imageClass === "Desconocido" ? "text-green-800" : "text-red-500"}`}>{denseNetPrediction}</h2>
              </div>
            }
            {yoloPrediction &&
              <div>
                <h1>YOLOv8</h1>
                <h2 className={`text-lg font-bold ${imageClass === yoloPrediction || imageClass === "Desconocido" ? "text-green-800" : "text-red-500"}`}>{yoloPrediction}</h2>
              </div>
            }
          </div>

          {/* Right-hand side for the image */}
          <div className="w-2/3 p-4">
            <h3 className="text-lg font-semibold mb-2">Imagen:</h3>
            <img src={image} alt="Preview" className="max-w-full border rounded-lg" />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
