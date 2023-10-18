import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';

function App() {
  const webcamRef = useRef(null);
  const [framesList, setFramesList] = useState([]);
  

  const captureFrame = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setFramesList((prevFramesList) => [...prevFramesList, imageSrc]);
  };

  return (
    <div>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
      />
      <button onClick={captureFrame}>Capture Frame</button>
      <div>
        {framesList.map((frame, index) => (
          <img
            key={index}
            src={frame}
            alt={`Frame ${index}`}
            width="320"  // You can adjust the width as needed
          />
        ))}
      </div>
    </div>
  );
}

export default App;
