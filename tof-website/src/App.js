import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as tf from '@tensorflow/tfjs';

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const [handLandmarks, setHandLandmarks] = useState(null);
  tf.setBackend('webgl'); // You can also try 'cpu' or 'wasm' as alternatives

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

  // Function to capture and process the webcam frame
  const captureAndProcessFrame = async () => {
    if (detectorRef.current && webcamRef.current && canvasRef.current) {
      const imageBase64 = webcamRef.current.getScreenshot();

      // Create an HTMLImageElement and set its src to the base64 image
      const img = new Image();
      img.src = imageBase64;

      img.onload = async () => {
        const hands = await detectorRef.current.estimateHands(img);
        console.log(hands)
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

        if (hands.length !== 0) {
          ctx.fillStyle = hands[0].handedness === 'Left' ? 'orange' : 'blue';
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;

          for (let y = 0; y < hands[0].keypoints.length; y++) {
            const keypoint = hands[0].keypoints[y];
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      };
    }
    requestAnimationFrame(captureAndProcessFrame); // Continuously request frames
  };

  // Use requestAnimationFrame to continuously run the captureAndProcessFrame function
  useEffect(() => {
    requestAnimationFrame(captureAndProcessFrame);

    // Clean up by stopping the detector when the component unmounts
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
        width={640} // Adjust the canvas width to match your webcam resolution
        height={480} // Adjust the canvas height to match your webcam resolution
      />
    </div>
  );
}

export default App;
