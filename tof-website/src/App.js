import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as tf from '@tensorflow/tfjs';

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const [handDistanceMessage, setHandDistanceMessage] = useState('Initializaing');
  tf.setBackend('webgl'); // You can also try 'cpu' or 'wasm' as alternatives

  const isRecordingRef = useRef(false); // Use a ref to hold the isRecording value
  const [recordedData, setRecordedData] = useState([]); // Use state to store recorded data

  // Load the hand-pose detection model when the component mounts
  useEffect(() => {
    const loadHandPoseModel = async () => {
      const model = handPoseDetection.SupportedModels.MediaPipeHands;
      const detectorConfig = {
        runtime: 'tfjs',
        modelType: 'full',
      };
      const detector = await handPoseDetection.createDetector(model, detectorConfig);
      detectorRef.current = detector;
    };

    loadHandPoseModel();
  }, []);

  const captureAndProcessFrame = async () => {
    if (detectorRef.current && webcamRef.current && canvasRef.current) {
      const imageBase64 = webcamRef.current.getScreenshot();
      // Create an HTMLImageElement and set its src to the base64 image
      const img = new Image();
      img.src = imageBase64;

      img.onload = async () => {
        const hands = await detectorRef.current.estimateHands(img);

        const keypointsData = [];

        if (hands.length !== 0) {
          const thumbLandmark = hands[0].keypoints[4]; // Thumb landmark
          const pinkyLandmark = hands[0].keypoints[20]; // Pinky landmark
          const distance = Math.sqrt(
            Math.pow(thumbLandmark.x - pinkyLandmark.x, 2) +
            Math.pow(thumbLandmark.y - pinkyLandmark.y, 2)
          );

          // threshold values for detecting too close and too far
          const tooCloseThreshold = 260; // Adjust as needed
          const tooFarThreshold = 110; // Adjust as needed

          if (distance > tooCloseThreshold) {
            setHandDistanceMessage('Hand is too close');
          } else if (distance < tooFarThreshold) {
            setHandDistanceMessage('Hand is too far');
          } else {
            setHandDistanceMessage('Hand in proper location'); // Clear the message when the hand is within the acceptable range
          }
        }
        else {
          setHandDistanceMessage('No Hand Detected'); // Clear the message when no hand is detected      
        }
        
        if (hands.length !== 0 && (isRecordingRef.current)) {
          console.log("here")
          keypointsData.push(
            hands[0].keypoints3D[4].x,
            hands[0].keypoints3D[4].y,
            hands[0].keypoints3D[4].z,
            hands[0].keypoints3D[20].x,
            hands[0].keypoints3D[20].y,
            hands[0].keypoints3D[20].z,
          );
          console.log(keypointsData);
          setRecordedData(prevData => [...prevData, keypointsData]); // Update recordedData state
        } else if (isRecordingRef.current) {
          alert("No hand detected")
          stopRecording();
        }
      };
    }
    requestAnimationFrame(captureAndProcessFrame);
  };

  const startRecording = () => {
    isRecordingRef.current = true;
    console.log("Recording started");
  };
  

  const stopRecording = () => {
    isRecordingRef.current = false;
    let data = {
        "landmarks": recordedData
    };

    console.log(JSON.stringify(data));

    fetch('https://trainoffour.com:3001/calculate-ratio', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text(); // Change to response.text() to see the raw response
    })
    .then(responseText => {
        alert("Response from server: " + responseText);
        // Handle the response data as needed
    })
    .catch(error => {
        console.error('Error:', error);
    });

    // Clear the recorded data to allow the user to record again
    setRecordedData([]); // Reset recordedData after sending
};



  useEffect(() => {
    requestAnimationFrame(captureAndProcessFrame);

    return () => {
      if (detectorRef.current) {
        detectorRef.current.close();
      }
    };
  }, []);

  return (
    <div>
      <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
      />
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          color: 'black',
          fontSize: '30px',
        }}
      >
        {handDistanceMessage}
      </div>
      <button onClick={startRecording}>Start Recording</button>
      <button onClick={stopRecording}>Stop Recording</button>
    </div>
  );
}

export default App;
