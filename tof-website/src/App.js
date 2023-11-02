import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as tf from '@tensorflow/tfjs';

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  
  tf.setBackend('webgl'); // You can also try 'cpu' or 'wasm' as alternatives

  let isRecording = false;
  const recordedData = [];

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
        if (hands.length !== 0 && (isRecording)) {
          console.log("here")
          keypointsData.push(
            hands[0].keypoints3D[4].x,
            hands[0].keypoints3D[4].y,
            hands[0].keypoints3D[4].z,
            hands[0].keypoints3D[20].x,
            hands[0].keypoints3D[20].y,
            hands[0].keypoints3D[20].z,
          );
          recordedData.push(keypointsData);
        } else if (isRecording) {
          alert("No hand detected")
          stopRecording();
        }
      };
    }
    requestAnimationFrame(captureAndProcessFrame);
  };

  const startRecording = () => {
    isRecording = true;
  };
  

  const stopRecording = () => {
    isRecording = false;
    let data = {
      "landmarks": recordedData
    }
    console.log(JSON.stringify(data))
    fetch('http://35.172.96.103:3001/calculate-ratio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
    })
    // Clear the recorded data to allow the user to record again
    recordedData.length = 0;
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
      <button onClick={startRecording}>Start Recording</button>
      <button onClick={stopRecording}>Stop Recording</button>
    </div>
  );
}

export default App;
